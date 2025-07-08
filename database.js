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
  
  saveInvoices() {
    try {
      fs.writeFileSync(this.invoicesPath, JSON.stringify(this.invoices, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving invoices:', error);
    }
  }
  
  saveFxRates() {
    try {
      fs.writeFileSync(this.fxRatesPath, JSON.stringify(this.fxRates, null, 2), 'utf8');
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

  addInvoice(invoice) {
    try {
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
        return this.fxRates[existingIndex];
      } else {
        // Add new rate
        const id = this.fxRates.length > 0 
          ? Math.max(...this.fxRates.map(rate => rate.id)) + 1 
          : 1;
        
        const newRate = { id, ...fxRate };
        this.fxRates.push(newRate);
        this.saveFxRates();
        
        return newRate;
      }
    } catch (error) {
      console.error('Error adding FX rate:', error);
      throw error;
    }
  }

  updateFxRate(id, fxRate) {
    try {
      const index = this.fxRates.findIndex(rate => rate.id === Number(id));
      
      if (index !== -1) {
        this.fxRates[index] = { id: Number(id), ...fxRate };
        this.saveFxRates();
        return this.fxRates[index];
      } else {
        throw new Error(`FX rate with ID ${id} not found`);
      }
    } catch (error) {
      console.error('Error updating FX rate:', error);
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