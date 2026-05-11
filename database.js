const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    // Ensure the data directory exists
    this.userDataPath = app.getPath('userData');
    this.dbPath = path.join(this.userDataPath, 'taxtracker-data');
    
    // MIGRATION: If this is the first run in production, copy dev data if it exists
    const devDataPath = path.join(app.getPath('appData'), 'Electron', 'taxtracker-data');
    if (!fs.existsSync(this.dbPath)) {
      if (fs.existsSync(devDataPath)) {
        fs.mkdirSync(this.dbPath, { recursive: true });
        const devInvoices = path.join(devDataPath, 'invoices.json');
        const devFxRates = path.join(devDataPath, 'fxrates.json');
        if (fs.existsSync(devInvoices)) {
          fs.copyFileSync(devInvoices, path.join(this.dbPath, 'invoices.json'));
          console.log('Migrated invoices.json from dev folder.');
        }
        if (fs.existsSync(devFxRates)) {
          fs.copyFileSync(devFxRates, path.join(this.dbPath, 'fxrates.json'));
          console.log('Migrated fxrates.json from dev folder.');
        }
      } else {
        fs.mkdirSync(this.dbPath, { recursive: true });
      }
    }
    
    this.invoicesPath = path.join(this.dbPath, 'invoices.json');
    this.fxRatesPath = path.join(this.dbPath, 'fxrates.json');
    this.kdvRatesPath = path.join(this.dbPath, 'kdv-rates.json');

    this.invoices = [];
    this.fxRates = [];
    this.kdvRates = [];

    // Load data if exists
    this.loadData();
  }
  
  loadData() {
    try {
      if (fs.existsSync(this.invoicesPath)) {
        const data = fs.readFileSync(this.invoicesPath, 'utf8');
        this.invoices = JSON.parse(data);
        
        // Ensure all invoices have an invoice_type field
        this.invoices = this.invoices.map(invoice => {
          if (!invoice.invoice_type) {
            return { ...invoice, invoice_type: 'Alış' };
          }
          return invoice;
        });

        // Migration: fix invoices that used the old 'amount' field instead of 'subtotal'
        this.invoices = this.invoices.map(invoice => {
          if (invoice.amount !== undefined && invoice.subtotal === undefined) {
            const subtotal = invoice.amount;
            const vatAmount = subtotal * ((invoice.vat_rate || 0) / 100);
            const total = invoice.total !== undefined ? invoice.total : subtotal + vatAmount;
            return {
              ...invoice,
              subtotal,
              total,
              invoice_no: invoice.invoice_no || 'FAT-MIGRATED',
              amount: undefined
            };
          }
          return invoice;
        });

        // Migration: synthesize a single line_items entry from legacy single-rate invoices,
        // then always re-derive invoice-level aggregates from line_items (idempotent, self-healing).
        this.invoices = this.invoices.map(invoice => {
          let lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : null;
          if (!lineItems || lineItems.length === 0) {
            const subtotal = Number(invoice.subtotal) || 0;
            const vatRate = Number(invoice.vat_rate) || 0;
            lineItems = [{
              id: 1,
              description: invoice.description || '',
              subtotal,
              vat_rate: vatRate,
              vat_amount: subtotal * (vatRate / 100),
            }];
          } else {
            // Ensure every existing line has an id and normalized numeric fields
            lineItems = lineItems.map((li, idx) => {
              const subtotal = Number(li.subtotal) || 0;
              const vatRate = Number(li.vat_rate) || 0;
              return {
                id: Number.isFinite(li.id) ? li.id : idx + 1,
                description: li.description || '',
                subtotal,
                vat_rate: vatRate,
                vat_amount: Number.isFinite(li.vat_amount) ? li.vat_amount : subtotal * (vatRate / 100),
              };
            });
          }
          const totals = this._computeInvoiceTotals(lineItems);
          // Preserve any pre-existing manual `total` override only for single-line invoices
          // where the stored total differs from the derived total (legacy edge case).
          const storedTotal = Number(invoice.total);
          const preserveManual =
            lineItems.length === 1 &&
            Number.isFinite(storedTotal) &&
            Math.abs(storedTotal - totals.total) > 0.005;
          return {
            ...invoice,
            line_items: lineItems,
            subtotal: totals.subtotal,
            vat_amount: totals.vat_amount,
            vat_rate: totals.vat_rate,
            total: preserveManual ? storedTotal : totals.total,
          };
        });

        this.saveInvoices();
      } else {
        this.invoices = [];
        this.saveInvoices();
      }
      
      if (fs.existsSync(this.fxRatesPath)) {
        const data = fs.readFileSync(this.fxRatesPath, 'utf8');
        this.fxRates = JSON.parse(data);

        // Migration: fix FX rates that used old usd_rate/eur_rate field names
        this.fxRates = this.fxRates.map(rate => {
          if (rate.usd_rate !== undefined && rate.usd_to_try === undefined) {
            return {
              ...rate,
              usd_to_try: rate.usd_rate,
              eur_to_try: rate.eur_rate,
              usd_rate: undefined,
              eur_rate: undefined
            };
          }
          return rate;
        });
      } else {
        this.fxRates = [];
        this.saveFxRates();
      }

      // Backfill: any foreign invoice missing try_equivalent gets it computed if FX rate exists
      let _backfilled = false;
      for (const inv of this.invoices) {
        if (!inv.try_equivalent) {
          const te = this._computeTryEquivalent(inv);
          if (te) {
            inv.try_equivalent = te;
            _backfilled = true;
          }
        }
      }
      if (_backfilled) this.saveInvoices();

      if (fs.existsSync(this.kdvRatesPath)) {
        const data = fs.readFileSync(this.kdvRatesPath, 'utf8');
        this.kdvRates = JSON.parse(data);
      } else {
        // Seed Turkish standard KDV rates so existing users see no UI change
        this.kdvRates = [
          { id: 1, rate: 0,  label: '' },
          { id: 2, rate: 5,  label: '' },
          { id: 3, rate: 10, label: '' },
          { id: 4, rate: 16, label: '' },
          { id: 5, rate: 20, label: '' },
        ];
        this.saveKdvRates();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.invoices = [];
      this.fxRates = [];
      this.kdvRates = [];
    }
  }
  
  _atomicWrite(filePath, data) {
    const json = JSON.stringify(data, null, 2);
    const tmpPath = filePath + '.tmp';
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, filePath + '.bak');
    }
    fs.writeFileSync(tmpPath, json, 'utf8');
    fs.renameSync(tmpPath, filePath);
  }

  saveInvoices() {
    try {
      this._atomicWrite(this.invoicesPath, this.invoices);
    } catch (error) {
      console.error('Error saving invoices:', error);
    }
  }
  
  saveFxRates() {
    try {
      this._atomicWrite(this.fxRatesPath, this.fxRates);
    } catch (error) {
      console.error('Error saving FX rates:', error);
    }
  }

  saveKdvRates() {
    try {
      this._atomicWrite(this.kdvRatesPath, this.kdvRates);
    } catch (error) {
      console.error('Error saving KDV rates:', error);
    }
  }

  initDatabase() {
    try {
      // Just make sure the files exist
      this.loadData();
      
      // Check if both dev and production data folders are empty
      const devDataPath = path.join(app.getPath('appData'), 'Electron', 'taxtracker-data');
      const devInvoicesPath = path.join(devDataPath, 'invoices.json');
      const devFxRatesPath = path.join(devDataPath, 'fxrates.json');
      
      const noDevData = !fs.existsSync(devInvoicesPath) && !fs.existsSync(devFxRatesPath);
      const noProdData = this.invoices.length === 0 && this.fxRates.length === 0;
      
      // If both locations are empty, create sample data
      if (noDevData && noProdData) {
        console.log('No data found in either location. Creating sample data...');
        this.createSampleData();
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }
  
  createSampleData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const subtotal = 1000;
      const vatRate = 20;
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;

      const sampleInvoice = {
        id: 1,
        date: today,
        company: 'Örnek Şirket A.Ş.',
        invoice_no: 'FAT-0001',
        subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total,
        currency: 'TRY',
        invoice_type: 'Alış',
        description: 'Örnek fatura',
        line_items: [
          { id: 1, description: 'Örnek ürün', subtotal, vat_rate: vatRate, vat_amount: vatAmount },
        ],
        try_equivalent: {
          subtotal,
          vat_amount: vatAmount,
          total,
          line_items: [{ id: 1, subtotal, vat_amount: vatAmount }],
        },
      };
      
      this.invoices.push(sampleInvoice);
      this.saveInvoices();
      
      const now = new Date();
      const sampleFxRate = {
        id: 1,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        usd_to_try: 30.5,
        eur_to_try: 33.2
      };
      
      this.fxRates.push(sampleFxRate);
      this.saveFxRates();
      
      console.log('Sample data created successfully');
    } catch (error) {
      console.error('Error creating sample data:', error);
    }
  }

  _validateInvoice(invoice) {
    if (!invoice.date || typeof invoice.date !== 'string' || invoice.date.trim() === '') {
      throw new Error('Invoice date must be a non-empty string');
    }
    if (!invoice.company || typeof invoice.company !== 'string' || invoice.company.trim() === '') {
      throw new Error('Invoice company must be a non-empty string');
    }
    if (!invoice.invoice_no || typeof invoice.invoice_no !== 'string' || invoice.invoice_no.trim() === '') {
      throw new Error('Invoice invoice_no must be a non-empty string');
    }
    if (!['TRY', 'USD', 'EUR'].includes(invoice.currency)) {
      throw new Error("Invoice currency must be one of 'TRY', 'USD', 'EUR'");
    }
    if (!isFinite(invoice.subtotal) || invoice.subtotal < 0) {
      throw new Error('Invoice subtotal must be a finite number >= 0');
    }
    // vat_rate may be `null` when an invoice has lines at different KDV rates (mixed/"Karışık")
    if (invoice.vat_rate !== null && (!isFinite(invoice.vat_rate) || invoice.vat_rate < 0)) {
      throw new Error('Invoice vat_rate must be a finite number >= 0 or null (mixed rates)');
    }
    if (!isFinite(invoice.total) || invoice.total < 0) {
      throw new Error('Invoice total must be a finite number >= 0');
    }
    if (!['Alış', 'Satış'].includes(invoice.invoice_type)) {
      throw new Error("Invoice invoice_type must be one of 'Alış', 'Satış'");
    }
    if (!Array.isArray(invoice.line_items) || invoice.line_items.length === 0) {
      throw new Error('Invoice must contain at least one line item');
    }
    invoice.line_items.forEach((li, idx) => {
      if (li.description !== undefined && li.description !== null && typeof li.description !== 'string') {
        throw new Error(`Line item ${idx + 1} description must be a string`);
      }
      if (!isFinite(li.subtotal) || li.subtotal < 0) {
        throw new Error(`Line item ${idx + 1} subtotal must be a finite number >= 0`);
      }
      if (!isFinite(li.vat_rate) || li.vat_rate < 0) {
        throw new Error(`Line item ${idx + 1} vat_rate must be a finite number >= 0`);
      }
    });
  }

  _validateFxRate(fxRate) {
    if (!Number.isInteger(fxRate.year)) {
      throw new Error('FX rate year must be an integer');
    }
    if (!Number.isInteger(fxRate.month) || fxRate.month < 1 || fxRate.month > 12) {
      throw new Error('FX rate month must be an integer between 1 and 12');
    }
    if (!isFinite(fxRate.usd_to_try) || fxRate.usd_to_try < 0) {
      throw new Error('FX rate usd_to_try must be a finite number >= 0');
    }
    if (!isFinite(fxRate.eur_to_try) || fxRate.eur_to_try < 0) {
      throw new Error('FX rate eur_to_try must be a finite number >= 0');
    }
  }

  _validateKdvRate(kdvRate) {
    if (!isFinite(kdvRate.rate) || kdvRate.rate < 0 || kdvRate.rate > 100) {
      throw new Error('KDV rate must be a finite number between 0 and 100');
    }
    if (kdvRate.label !== undefined && kdvRate.label !== null && typeof kdvRate.label !== 'string') {
      throw new Error('KDV rate label must be a string');
    }
  }

  // Invoice operations
  getInvoices(filters = {}) {
    try {
      let result = [...this.invoices];
      
      // Apply filters if provided
      if (filters) {
        if (filters.startDate && filters.endDate) {
          result = result.filter(invoice => 
            invoice.date >= filters.startDate && invoice.date <= filters.endDate
          );
        } else if (filters.startDate) {
          result = result.filter(invoice => invoice.date >= filters.startDate);
        } else if (filters.endDate) {
          result = result.filter(invoice => invoice.date <= filters.endDate);
        }
        
        if (filters.company) {
          const companyLower = filters.company.toLowerCase();
          result = result.filter(invoice => 
            invoice.company.toLowerCase().includes(companyLower)
          );
        }
        
        if (filters.currency) {
          result = result.filter(invoice => invoice.currency === filters.currency);
        }
        
        if (filters.invoice_type) {
          result = result.filter(invoice => invoice.invoice_type === filters.invoice_type);
        }
      }
      
      // Sort by date descending
      result.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return result;
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw error;
    }
  }

  getInvoiceById(id) {
    const invoice = this.invoices.find(inv => inv.id === Number(id));
    return invoice || null;
  }

  // Normalize an incoming invoice payload: synthesize a single line from flat fields if
  // line_items is missing, assign per-line ids, and recompute invoice-level aggregates from
  // the line items so cached fields are always trustworthy.
  _normalizeInvoicePayload(invoice) {
    const allowManualTotal =
      Array.isArray(invoice.line_items) &&
      invoice.line_items.length === 1 &&
      Number.isFinite(Number(invoice.total));
    const manualTotal = allowManualTotal ? Number(invoice.total) : null;

    let lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : null;
    if (!lineItems || lineItems.length === 0) {
      const subtotal = Number(invoice.subtotal) || 0;
      const vatRate = Number(invoice.vat_rate) || 0;
      lineItems = [{
        id: 1,
        description: invoice.description || '',
        subtotal,
        vat_rate: vatRate,
        vat_amount: subtotal * (vatRate / 100),
      }];
    } else {
      lineItems = lineItems.map((li, idx) => {
        const subtotal = Number(li.subtotal) || 0;
        const vatRate = Number(li.vat_rate) || 0;
        return {
          id: idx + 1,
          description: li.description || '',
          subtotal,
          vat_rate: vatRate,
          vat_amount: subtotal * (vatRate / 100),
        };
      });
    }

    const totals = this._computeInvoiceTotals(lineItems);
    // Preserve a manual total override only when the invoice has a single line — keeps the
    // legacy "round up the total by a few kuruş" workflow working without breaking the
    // sum-of-lines invariant for multi-line invoices.
    const preserveManual =
      manualTotal !== null &&
      lineItems.length === 1 &&
      Math.abs(manualTotal - totals.total) > 0.005;

    return {
      ...invoice,
      line_items: lineItems,
      subtotal: totals.subtotal,
      vat_amount: totals.vat_amount,
      vat_rate: totals.vat_rate,
      total: preserveManual ? manualTotal : totals.total,
      invoice_type: invoice.invoice_type || 'Alış',
    };
  }

  addInvoice(invoice) {
    try {
      const normalized = this._normalizeInvoicePayload(invoice);
      this._validateInvoice(normalized);
      const id = this.invoices.length > 0
        ? Math.max(...this.invoices.map(inv => inv.id)) + 1
        : 1;

      const newInvoice = { id, ...normalized };
      newInvoice.try_equivalent = this._computeTryEquivalent(newInvoice);

      this.invoices.push(newInvoice);
      this.saveInvoices();

      return newInvoice;
    } catch (error) {
      console.error('Error adding invoice:', error);
      throw error;
    }
  }

  updateInvoice(id, invoice) {
    try {
      const normalized = this._normalizeInvoicePayload(invoice);
      this._validateInvoice(normalized);
      const index = this.invoices.findIndex(inv => inv.id === Number(id));

      if (index !== -1) {
        this.invoices[index] = { id: Number(id), ...normalized };
        this.invoices[index].try_equivalent = this._computeTryEquivalent(this.invoices[index]);
        this.saveInvoices();
        return this.invoices[index];
      } else {
        throw new Error(`Invoice with ID ${id} not found`);
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  deleteInvoice(id) {
    try {
      const index = this.invoices.findIndex(inv => inv.id === Number(id));
      
      if (index !== -1) {
        this.invoices.splice(index, 1);
        this.saveInvoices();
        return { id: Number(id) };
      } else {
        throw new Error(`Invoice with ID ${id} not found`);
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }

  // Aggregate a line_items array into invoice-level totals. `vat_rate` is the single shared
  // rate (when all lines agree, rounded to 2 dp) or `null` for mixed-rate ("Karışık") invoices.
  _computeInvoiceTotals(lineItems) {
    let subtotal = 0;
    let vatAmount = 0;
    const rateSet = new Set();
    for (const li of lineItems) {
      const liSubtotal = Number(li.subtotal) || 0;
      const liRate = Number(li.vat_rate) || 0;
      subtotal += liSubtotal;
      vatAmount += liSubtotal * (liRate / 100);
      rateSet.add(Math.round(liRate * 100) / 100);
    }
    const vatRate = rateSet.size === 1 ? [...rateSet][0] : null;
    return {
      subtotal,
      vat_amount: vatAmount,
      total: subtotal + vatAmount,
      vat_rate: vatRate,
    };
  }

  _computeTryEquivalent(invoice) {
    const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];

    if (invoice.currency === 'TRY') {
      return {
        subtotal: invoice.subtotal,
        vat_amount: lineItems.reduce(
          (acc, li) => acc + (Number(li.subtotal) || 0) * ((Number(li.vat_rate) || 0) / 100),
          0,
        ),
        total: invoice.total,
        line_items: lineItems.map(li => ({
          id: li.id,
          subtotal: Number(li.subtotal) || 0,
          vat_amount: (Number(li.subtotal) || 0) * ((Number(li.vat_rate) || 0) / 100),
        })),
      };
    }
    const d = new Date(invoice.date);
    const fx = this.fxRates.find(r => r.year === d.getFullYear() && r.month === d.getMonth() + 1);
    if (!fx) return null;
    let rate = null;
    if (invoice.currency === 'USD' && fx.usd_to_try) rate = fx.usd_to_try;
    else if (invoice.currency === 'EUR' && fx.eur_to_try) rate = fx.eur_to_try;
    if (!rate) return null;
    const totalVatInForeign = lineItems.reduce(
      (acc, li) => acc + (Number(li.subtotal) || 0) * ((Number(li.vat_rate) || 0) / 100),
      0,
    );
    return {
      subtotal: invoice.subtotal * rate,
      vat_amount: totalVatInForeign * rate,
      total: invoice.total * rate,
      rate,
      line_items: lineItems.map(li => {
        const liSubtotal = Number(li.subtotal) || 0;
        const liVat = liSubtotal * ((Number(li.vat_rate) || 0) / 100);
        return {
          id: li.id,
          subtotal: liSubtotal * rate,
          vat_amount: liVat * rate,
        };
      }),
    };
  }

  recomputeAllTryEquivalents() {
    this.invoices = this.invoices.map(invoice => {
      invoice.try_equivalent = this._computeTryEquivalent(invoice);
      return invoice;
    });
    this.saveInvoices();
  }

  // FX Rate operations
  getFxRates(year, month) {
    try {
      let result = [...this.fxRates];
      
      if (year && month) {
        result = result.filter(rate => rate.year === Number(year) && rate.month === Number(month));
      } else if (year) {
        result = result.filter(rate => rate.year === Number(year));
      }
      
      // Sort by year and month descending
      result.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      
      return result;
    } catch (error) {
      console.error('Error getting FX rates:', error);
      throw error;
    }
  }

  addFxRate(fxRate) {
    try {
      this._validateFxRate(fxRate);
      // Check if rate for this month/year already exists
      const existingIndex = this.fxRates.findIndex(
        rate => rate.month === fxRate.month && rate.year === fxRate.year
      );
      
      if (existingIndex !== -1) {
        // Update existing rate
        this.fxRates[existingIndex] = {
          id: this.fxRates[existingIndex].id,
          ...fxRate
        };
        this.saveFxRates();
        this.recomputeAllTryEquivalents();
        return this.fxRates[existingIndex];
      } else {
        // Add new rate
        const id = this.fxRates.length > 0 
          ? Math.max(...this.fxRates.map(rate => rate.id)) + 1 
          : 1;
        
        const newRate = { id, ...fxRate };
        this.fxRates.push(newRate);
        this.saveFxRates();
        this.recomputeAllTryEquivalents();
        return newRate;
      }
    } catch (error) {
      console.error('Error adding FX rate:', error);
      throw error;
    }
  }

  updateFxRate(id, fxRate) {
    try {
      this._validateFxRate(fxRate);
      const index = this.fxRates.findIndex(rate => rate.id === Number(id));
      
      if (index !== -1) {
        this.fxRates[index] = { id: Number(id), ...fxRate };
        this.saveFxRates();
        this.recomputeAllTryEquivalents();
        return this.fxRates[index];
      } else {
        throw new Error(`FX rate with ID ${id} not found`);
      }
    } catch (error) {
      console.error('Error updating FX rate:', error);
      throw error;
    }
  }

  deleteFxRate(id) {
    try {
      const index = this.fxRates.findIndex(rate => rate.id === Number(id));
      
      if (index !== -1) {
        const deletedRate = this.fxRates[index];
        
        // Check if any invoices exist for this month/year
        const invoicesForMonth = this.invoices.filter(invoice => {
          const invoiceDate = new Date(invoice.date);
          return invoiceDate.getFullYear() === deletedRate.year && 
                 (invoiceDate.getMonth() + 1) === deletedRate.month;
        });
        
        this.fxRates.splice(index, 1);
        this.saveFxRates();
        this.recomputeAllTryEquivalents();
        
        return { 
          id: Number(id), 
          hasInvoices: invoicesForMonth.length > 0,
          invoiceCount: invoicesForMonth.length
        };
      } else {
        throw new Error(`FX rate with ID ${id} not found`);
      }
    } catch (error) {
      console.error('Error deleting FX rate:', error);
      throw error;
    }
  }

  // KDV rate operations
  getKdvRates() {
    try {
      return [...this.kdvRates].sort((a, b) => a.rate - b.rate);
    } catch (error) {
      console.error('Error getting KDV rates:', error);
      throw error;
    }
  }

  addKdvRate(kdvRate) {
    try {
      this._validateKdvRate(kdvRate);
      // Reject duplicates by rate value
      if (this.kdvRates.some(r => r.rate === kdvRate.rate)) {
        throw new Error(`KDV oranı %${kdvRate.rate} zaten mevcut`);
      }
      const id = this.kdvRates.length > 0
        ? Math.max(...this.kdvRates.map(r => r.id)) + 1
        : 1;
      const newRate = { id, rate: kdvRate.rate, label: kdvRate.label || '' };
      this.kdvRates.push(newRate);
      this.saveKdvRates();
      return newRate;
    } catch (error) {
      console.error('Error adding KDV rate:', error);
      throw error;
    }
  }

  updateKdvRate(id, kdvRate) {
    try {
      this._validateKdvRate(kdvRate);
      const index = this.kdvRates.findIndex(r => r.id === Number(id));
      if (index === -1) throw new Error(`KDV rate with ID ${id} not found`);
      // Reject if updating to a rate value that already exists on a different row
      if (this.kdvRates.some(r => r.rate === kdvRate.rate && r.id !== Number(id))) {
        throw new Error(`KDV oranı %${kdvRate.rate} zaten mevcut`);
      }
      this.kdvRates[index] = { id: Number(id), rate: kdvRate.rate, label: kdvRate.label || '' };
      this.saveKdvRates();
      return this.kdvRates[index];
    } catch (error) {
      console.error('Error updating KDV rate:', error);
      throw error;
    }
  }

  deleteKdvRate(id) {
    try {
      const index = this.kdvRates.findIndex(r => r.id === Number(id));
      if (index === -1) throw new Error(`KDV rate with ID ${id} not found`);
      this.kdvRates.splice(index, 1);
      this.saveKdvRates();
      return { id: Number(id) };
    } catch (error) {
      console.error('Error deleting KDV rate:', error);
      throw error;
    }
  }

  // Dashboard data
  getDashboardData(filters = {}) {
    try {
      const { startDate, endDate, invoice_type } = filters;
      
      // Filter invoices by date if specified
      let filteredInvoices = [...this.invoices];
      
      if (startDate && endDate) {
        filteredInvoices = filteredInvoices.filter(invoice => 
          invoice.date >= startDate && invoice.date <= endDate
        );
      } else if (startDate) {
        filteredInvoices = filteredInvoices.filter(invoice => 
          invoice.date >= startDate
        );
      } else if (endDate) {
        filteredInvoices = filteredInvoices.filter(invoice => 
          invoice.date <= endDate
        );
      }
      
      // Filter by invoice type if specified
      if (invoice_type) {
        filteredInvoices = filteredInvoices.filter(invoice => 
          invoice.invoice_type === invoice_type
        );
      }
      
      // Calculate VAT by month, currency, and invoice type
      const vatByMonth = [];
      const monthCurrencyTypeMap = new Map();
      
      filteredInvoices.forEach(invoice => {
        const date = new Date(invoice.date);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const invoiceType = invoice.invoice_type || 'Alış';
        const key = `${month}-${invoice.currency}-${invoiceType}`;
        
        if (!monthCurrencyTypeMap.has(key)) {
          monthCurrencyTypeMap.set(key, {
            month,
            currency: invoice.currency,
            invoice_type: invoiceType,
            vat_amount: 0,
            invoice_count: 0
          });
        }
        
        const entry = monthCurrencyTypeMap.get(key);
        entry.vat_amount += Number(invoice.vat_amount) || 0;
        entry.invoice_count += 1;
      });
      
      monthCurrencyTypeMap.forEach(value => vatByMonth.push(value));
      
      // Calculate currency and type distribution
      const currencyTypeMap = new Map();
      
      filteredInvoices.forEach(invoice => {
        const invoiceType = invoice.invoice_type || 'Alış';
        const key = `${invoice.currency}-${invoiceType}`;
        
        if (!currencyTypeMap.has(key)) {
          currencyTypeMap.set(key, {
            currency: invoice.currency,
            invoice_type: invoiceType,
            count: 0,
            total_amount: 0
          });
        }
        
        const entry = currencyTypeMap.get(key);
        entry.count += 1;
        entry.total_amount += invoice.total;
      });
      
      const currencyDistribution = [];
      currencyTypeMap.forEach(value => currencyDistribution.push(value));
      
      // Calculate monthly totals by invoice type
      const monthTypeMap = new Map();
      
      filteredInvoices.forEach(invoice => {
        const date = new Date(invoice.date);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const invoiceType = invoice.invoice_type || 'Alış';
        const key = `${month}-${invoiceType}`;
        
        if (!monthTypeMap.has(key)) {
          monthTypeMap.set(key, {
            month,
            invoice_type: invoiceType,
            total_amount: 0,
            invoice_count: 0
          });
        }
        
        const entry = monthTypeMap.get(key);
        entry.total_amount += invoice.total;
        entry.invoice_count += 1;
      });
      
      const monthlyTotals = [];
      monthTypeMap.forEach(value => monthlyTotals.push(value));
      
      // Sort by month
      monthlyTotals.sort((a, b) => a.month.localeCompare(b.month));
      
      return {
        vatByMonth,
        currencyDistribution,
        monthlyTotals,
        rawInvoices: filteredInvoices // Add this line for dashboard raw data
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }
}

module.exports = DatabaseManager; 