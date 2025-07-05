const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Invoice operations
    getInvoices: (filters) => ipcRenderer.invoke('get-invoices', filters),
    addInvoice: (invoice) => ipcRenderer.invoke('add-invoice', invoice),
    updateInvoice: (id, invoice) => ipcRenderer.invoke('update-invoice', id, invoice),
    deleteInvoice: (id) => ipcRenderer.invoke('delete-invoice', id),
    
    // FX Rate operations
    getFxRates: (year, month) => ipcRenderer.invoke('get-fx-rates', year, month),
    addFxRate: (fxRate) => ipcRenderer.invoke('add-fx-rate', fxRate),
    updateFxRate: (id, fxRate) => ipcRenderer.invoke('update-fx-rate', id, fxRate),
    
    // Dashboard data
    getDashboardData: (filters) => ipcRenderer.invoke('get-dashboard-data', filters)
  }
); 