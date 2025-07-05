const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const DatabaseManager = require('./database');

// Initialize the database
const db = new DatabaseManager();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the React app
  let startUrl;
  
  if (isDev) {
    // In development, load from React dev server
    startUrl = 'http://localhost:3000';
    mainWindow.loadURL(startUrl);
  } else {
    // In production, load from the build directory
    const indexPath = path.join(__dirname, './build/index.html');
    const indexPathAlt = path.join(process.resourcesPath, 'app/build/index.html');
    
    if (fs.existsSync(indexPath)) {
      startUrl = `file://${indexPath}`;
      mainWindow.loadFile(indexPath);
    } else if (fs.existsSync(indexPathAlt)) {
      startUrl = `file://${indexPathAlt}`;
      mainWindow.loadFile(indexPathAlt);
    } else {
      console.error('Could not find index.html');
      app.quit();
      return;
    }
  }
    
  console.log('Loading URL:', startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Initialize the database
  try {
    db.initDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for database operations
ipcMain.handle('get-invoices', async (event, filters) => {
  try {
    return db.getInvoices(filters);
  } catch (error) {
    console.error('Error in get-invoices:', error);
    throw error;
  }
});

ipcMain.handle('add-invoice', async (event, invoice) => {
  try {
    return db.addInvoice(invoice);
  } catch (error) {
    console.error('Error in add-invoice:', error);
    throw error;
  }
});

ipcMain.handle('update-invoice', async (event, id, invoice) => {
  try {
    return db.updateInvoice(id, invoice);
  } catch (error) {
    console.error('Error in update-invoice:', error);
    throw error;
  }
});

ipcMain.handle('delete-invoice', async (event, id) => {
  try {
    return db.deleteInvoice(id);
  } catch (error) {
    console.error('Error in delete-invoice:', error);
    throw error;
  }
});

ipcMain.handle('get-fx-rates', async (event, year, month) => {
  try {
    return db.getFxRates(year, month);
  } catch (error) {
    console.error('Error in get-fx-rates:', error);
    throw error;
  }
});

ipcMain.handle('add-fx-rate', async (event, fxRate) => {
  try {
    return db.addFxRate(fxRate);
  } catch (error) {
    console.error('Error in add-fx-rate:', error);
    throw error;
  }
});

ipcMain.handle('update-fx-rate', async (event, id, fxRate) => {
  try {
    return db.updateFxRate(id, fxRate);
  } catch (error) {
    console.error('Error in update-fx-rate:', error);
    throw error;
  }
});

ipcMain.handle('get-dashboard-data', async (event, filters) => {
  try {
    return db.getDashboardData(filters);
  } catch (error) {
    console.error('Error in get-dashboard-data:', error);
    throw error;
  }
}); 