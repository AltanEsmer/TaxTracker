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
    deleteFxRate: (id) => ipcRenderer.invoke('delete-fx-rate', id),
    
    // Dashboard data
    getDashboardData: (filters) => ipcRenderer.invoke('get-dashboard-data', filters),

    // Single invoice lookup
    getInvoiceById: (id) => ipcRenderer.invoke('get-invoice-by-id', id),

    // File dialogs
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

    // Excel export (main process)
    exportToExcel: (data, filePath) => ipcRenderer.invoke('export-to-excel', data, filePath),

    // KDV rate operations
    getKdvRates: () => ipcRenderer.invoke('get-kdv-rates'),
    addKdvRate: (rate) => ipcRenderer.invoke('add-kdv-rate', rate),
    updateKdvRate: (id, rate) => ipcRenderer.invoke('update-kdv-rate', id, rate),
    deleteKdvRate: (id) => ipcRenderer.invoke('delete-kdv-rate', id),

    // Auto-updater
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  }
);