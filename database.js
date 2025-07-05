const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    // Ensure the data directory exists
    this.userDataPath = app.getPath('userData');
    this.dbPath = path.join(this.userDataPath, 'taxtracker-data');
    
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
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
      return true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
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
      
      const newInvoice = { id, ...invoice };
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
        this.invoices[index] = { id: Number(id), ...invoice };
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
      const { startDate, endDate } = filters;
      
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
      
      // Calculate VAT by month and currency
      const vatByMonth = [];
      const monthCurrencyMap = new Map();
      
      filteredInvoices.forEach(invoice => {
        const date = new Date(invoice.date);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const key = `${month}-${invoice.currency}`;
        
        if (!monthCurrencyMap.has(key)) {
          monthCurrencyMap.set(key, {
            month,
            currency: invoice.currency,
            vat_amount: 0,
            invoice_count: 0
          });
        }
        
        const entry = monthCurrencyMap.get(key);
        entry.vat_amount += invoice.subtotal * (invoice.vat_rate / 100);
        entry.invoice_count += 1;
      });
      
      monthCurrencyMap.forEach(value => vatByMonth.push(value));
      
      // Calculate currency distribution
      const currencyMap = new Map();
      
      filteredInvoices.forEach(invoice => {
        if (!currencyMap.has(invoice.currency)) {
          currencyMap.set(invoice.currency, {
            currency: invoice.currency,
            count: 0,
            total_amount: 0
          });
        }
        
        const entry = currencyMap.get(invoice.currency);
        entry.count += 1;
        entry.total_amount += invoice.total;
      });
      
      const currencyDistribution = [];
      currencyMap.forEach(value => currencyDistribution.push(value));
      
      // Calculate monthly totals
      const monthMap = new Map();
      
      filteredInvoices.forEach(invoice => {
        const date = new Date(invoice.date);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthMap.has(month)) {
          monthMap.set(month, {
            month,
            total_amount: 0,
            invoice_count: 0
          });
        }
        
        const entry = monthMap.get(month);
        entry.total_amount += invoice.total;
        entry.invoice_count += 1;
      });
      
      const monthlyTotals = [];
      monthMap.forEach(value => monthlyTotals.push(value));
      
      // Sort by month
      monthlyTotals.sort((a, b) => a.month.localeCompare(b.month));
      
      return {
        vatByMonth,
        currencyDistribution,
        monthlyTotals
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }
}

module.exports = DatabaseManager; 