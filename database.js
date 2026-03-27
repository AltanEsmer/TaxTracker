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
    
    this.invoices = [];
    this.fxRates = [];
    
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
        
        this.saveInvoices();
      } else {
        this.invoices = [];
        this.saveInvoices();
      }
      
      if (fs.existsSync(this.fxRatesPath)) {
        const data = fs.readFileSync(this.fxRatesPath, 'utf8');
        this.fxRates = JSON.parse(data);
      } else {
        this.fxRates = [];
        this.saveFxRates();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.invoices = [];
      this.fxRates = [];
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
      // Create a sample invoice
      const sampleInvoice = {
        id: 1,
        date: new Date().toISOString().split('T')[0],
        company: 'Örnek Şirket A.Ş.',
        amount: 1000,
        vat_rate: 18,
        vat_amount: 180,
        currency: 'TRY',
        invoice_type: 'Alış',
        description: 'Örnek fatura'
      };
      
      this.invoices.push(sampleInvoice);
      this.saveInvoices();
      
      // Create a sample FX rate
      const today = new Date();
      const sampleFxRate = {
        id: 1,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        usd_rate: 30.5,
        eur_rate: 33.2
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
    if (!isFinite(invoice.vat_rate) || invoice.vat_rate < 0) {
      throw new Error('Invoice vat_rate must be a finite number >= 0');
    }
    if (!isFinite(invoice.total) || invoice.total < 0) {
      throw new Error('Invoice total must be a finite number >= 0');
    }
    if (!['Alış', 'Satış'].includes(invoice.invoice_type)) {
      throw new Error("Invoice invoice_type must be one of 'Alış', 'Satış'");
    }
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

  addInvoice(invoice) {
    try {
      this._validateInvoice(invoice);
      const id = this.invoices.length > 0 
        ? Math.max(...this.invoices.map(inv => inv.id)) + 1 
        : 1;
      
      // Ensure invoice_type is set, default to 'Alış' if not provided
      const newInvoice = { 
        id, 
        ...invoice,
        invoice_type: invoice.invoice_type || 'Alış'
      };
      
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
      this._validateInvoice(invoice);
      const index = this.invoices.findIndex(inv => inv.id === Number(id));
      
      if (index !== -1) {
        this.invoices[index] = { 
          id: Number(id), 
          ...invoice,
          invoice_type: invoice.invoice_type || 'Alış'
        };
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

  recomputeAllTryEquivalents() {
    this.invoices = this.invoices.map(invoice => {
      if (invoice.currency === 'TRY') {
        invoice.try_equivalent = {
          subtotal: invoice.subtotal,
          vat_amount: invoice.subtotal * (invoice.vat_rate / 100),
          total: invoice.total
        };
        return invoice;
      }
      const invoiceDate = new Date(invoice.date);
      const year = invoiceDate.getFullYear();
      const month = invoiceDate.getMonth() + 1;
      const fxRate = this.fxRates.find(r => r.year === year && r.month === month);
      if (fxRate) {
        let rate = 1;
        if (invoice.currency === 'USD' && fxRate.usd_to_try) rate = fxRate.usd_to_try;
        else if (invoice.currency === 'EUR' && fxRate.eur_to_try) rate = fxRate.eur_to_try;
        invoice.try_equivalent = {
          subtotal: invoice.subtotal * rate,
          vat_amount: (invoice.subtotal * (invoice.vat_rate / 100)) * rate,
          total: invoice.total * rate,
          rate
        };
      } else {
        invoice.try_equivalent = null;
      }
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
        entry.vat_amount += invoice.subtotal * (invoice.vat_rate / 100);
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