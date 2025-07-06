const { app, BrowserWindow, ipcMain, Menu, Tray, dialog } = require('electron');
const path = require('path');
const isDev = process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath);
const fs = require('fs');
const DatabaseManager = require('./database');

// Initialize the database
const db = new DatabaseManager();

let mainWindow;
let tray = null;
let isQuitting = false;

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
    // In production, load from build directory inside asar/resources
    const indexPath = path.join(process.resourcesPath, 'build', 'index.html');
    startUrl = `file://${indexPath}`;
    mainWindow.loadURL(startUrl);
  }
    
  console.log('Loading URL:', startUrl);

  // Hide window instead of closing when user clicks the close button
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  let iconPath;
  if (isDev) {
    iconPath = path.join(__dirname, './public/favicon.ico');
  } else {
    iconPath = path.join(__dirname, './build/favicon.ico');
  }

  // Fallback: If icon does not exist, use Electron's default icon
  if (!fs.existsSync(iconPath)) {
    console.warn('Custom tray icon not found, using default Electron icon.');
    iconPath = undefined; // Electron will use its default icon if undefined
  }

  try {
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Aç', 
        click: () => {
          if (mainWindow === null) {
            createWindow();
          } else {
            mainWindow.show();
          }
        } 
      },
      { 
        label: 'Bilgisayar başlangıcında çalıştır', 
        type: 'checkbox',
        checked: isAutostartEnabled(),
        click: (menuItem) => {
          toggleAutostart(menuItem.checked);
        }
      },
      { type: 'separator' },
      { 
        label: 'Çıkış', 
        click: () => {
          isQuitting = true;
          app.quit();
        } 
      }
    ]);
    
    tray.setToolTip('Tax Tracker');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow === null) {
        createWindow();
      } else {
        mainWindow.show();
      }
    });
  } catch (error) {
    console.error('Error creating tray:', error);
    dialog.showErrorBox('Hata', 'Sistem tepsi simgesi oluşturulurken bir hata oluştu.');
  }
}

function isAutostartEnabled() {
  try {
    if (process.platform === 'win32') {
      const startupPath = path.join(process.env.APPDATA, '\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\Tax Tracker.lnk');
      return fs.existsSync(startupPath);
    }
    return false;
  } catch (error) {
    console.error('Error checking autostart status:', error);
    return false;
  }
}

function toggleAutostart(enable) {
  try {
    const autostartModule = require('./scripts/autostart-setup');
    
    if (enable) {
      autostartModule.setupWindowsAutostart();
    } else {
      autostartModule.removeWindowsAutostart();
    }
    
    // Update the menu
    if (tray) {
      const contextMenu = Menu.buildFromTemplate([
        { 
          label: 'Aç', 
          click: () => {
            if (mainWindow === null) {
              createWindow();
            } else {
              mainWindow.show();
            }
          } 
        },
        { 
          label: 'Bilgisayar başlangıcında çalıştır', 
          type: 'checkbox',
          checked: enable,
          click: (menuItem) => {
            toggleAutostart(menuItem.checked);
          }
        },
        { type: 'separator' },
        { 
          label: 'Çıkış', 
          click: () => {
            isQuitting = true;
            app.quit();
          } 
        }
      ]);
      
      tray.setContextMenu(contextMenu);
    }
  } catch (error) {
    console.error('Error toggling autostart:', error);
    dialog.showErrorBox('Hata', 'Otomatik başlatma ayarı değiştirilirken bir hata oluştu.');
  }
}

app.whenReady().then(() => {
  createWindow();
  try {
    createTray();
  } catch (error) {
    console.error('Error creating tray:', error);
  }
  
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

// Handle the 'before-quit' event to allow the app to quit properly
app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit the app when all windows are closed
    // The app will continue running in the system tray
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