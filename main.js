const { app, BrowserWindow, ipcMain, Menu, Tray, dialog } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;
const fs = require('fs');
const DatabaseManager = require('./database');
const ExcelJS = require('exceljs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Initialize the database
const db = new DatabaseManager();

let mainWindow;
let tray = null;
let isQuitting = false;

// Prevent multiple instances — focus the existing window if a second launch happens
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

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
    const indexPath = path.join(__dirname, 'build', 'index.html');
    startUrl = `file://${indexPath}`;
    mainWindow.loadURL(startUrl);
  }
    
  console.log('Loading URL:', startUrl);

  // Hide window instead of closing when user clicks the close button (prod only)
  mainWindow.on('close', (event) => {
    if (!isQuitting && !isDev) {
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
  if (isDev) {
    console.log('Geliştirme modunda tray simgesi oluşturulmuyor.');
    return;
  }
  let iconPath = path.join(__dirname, 'icon.ico');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, 'build', 'icon.ico');
  }
  if (!fs.existsSync(iconPath)) {
    console.warn('Custom tray icon not found, using default Electron icon.');
    iconPath = undefined;
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

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify().catch(err => log.error('updater:', err));
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

autoUpdater.on('update-downloaded', async () => {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    buttons: ['Şimdi Yeniden Başlat', 'Daha Sonra'],
    defaultId: 0,
    title: 'Güncelleme Hazır',
    message: 'Yeni bir sürüm indirildi. Uygulamayı yeniden başlatmak ister misiniz?',
  });
  if (response === 0) {
    isQuitting = true;
    autoUpdater.quitAndInstall();
  }
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
    if (!invoice || typeof invoice !== 'object') {
      throw new Error('Invalid invoice data');
    }
    return db.addInvoice(invoice);
  } catch (error) {
    console.error('Error in add-invoice:', error);
    throw error;
  }
});

ipcMain.handle('update-invoice', async (event, id, invoice) => {
  try {
    if (id === undefined || id === null) {
      throw new Error('Invoice ID is required');
    }
    if (!invoice || typeof invoice !== 'object') {
      throw new Error('Invalid invoice data');
    }
    return db.updateInvoice(id, invoice);
  } catch (error) {
    console.error('Error in update-invoice:', error);
    throw error;
  }
});

ipcMain.handle('delete-invoice', async (event, id) => {
  try {
    if (id === undefined || id === null) {
      throw new Error('Invoice ID is required');
    }
    return db.deleteInvoice(id);
  } catch (error) {
    console.error('Error in delete-invoice:', error);
    throw error;
  }
});

ipcMain.handle('get-invoice-by-id', async (event, id) => {
  try {
    if (id === undefined || id === null) {
      throw new Error('Invoice ID is required');
    }
    return db.getInvoiceById(id);
  } catch (error) {
    console.error('Error in get-invoice-by-id:', error);
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
    if (!fxRate || typeof fxRate !== 'object') {
      throw new Error('Invalid FX rate data');
    }
    return db.addFxRate(fxRate);
  } catch (error) {
    console.error('Error in add-fx-rate:', error);
    throw error;
  }
});

ipcMain.handle('update-fx-rate', async (event, id, fxRate) => {
  try {
    if (id === undefined || id === null) {
      throw new Error('FX rate ID is required');
    }
    if (!fxRate || typeof fxRate !== 'object') {
      throw new Error('Invalid FX rate data');
    }
    return db.updateFxRate(id, fxRate);
  } catch (error) {
    console.error('Error in update-fx-rate:', error);
    throw error;
  }
});

ipcMain.handle('delete-fx-rate', async (event, id) => {
  try {
    if (id === undefined || id === null) {
      throw new Error('FX rate ID is required');
    }
    return db.deleteFxRate(id);
  } catch (error) {
    console.error('Error in delete-fx-rate:', error);
    throw error;
  }
});

ipcMain.handle('get-kdv-rates', async () => {
  try { return db.getKdvRates(); }
  catch (error) { console.error('Error in get-kdv-rates:', error); throw error; }
});

ipcMain.handle('add-kdv-rate', async (event, rate) => {
  try {
    if (!rate || typeof rate !== 'object') throw new Error('Invalid KDV rate data');
    return db.addKdvRate(rate);
  } catch (error) { console.error('Error in add-kdv-rate:', error); throw error; }
});

ipcMain.handle('update-kdv-rate', async (event, id, rate) => {
  try {
    if (id === undefined || id === null) throw new Error('KDV rate ID is required');
    if (!rate || typeof rate !== 'object') throw new Error('Invalid KDV rate data');
    return db.updateKdvRate(id, rate);
  } catch (error) { console.error('Error in update-kdv-rate:', error); throw error; }
});

ipcMain.handle('delete-kdv-rate', async (event, id) => {
  try {
    if (id === undefined || id === null) throw new Error('KDV rate ID is required');
    return db.deleteKdvRate(id);
  } catch (error) { console.error('Error in delete-kdv-rate:', error); throw error; }
});

ipcMain.handle('check-for-updates', async () => {
  if (isDev) return { dev: true };
  return autoUpdater.checkForUpdates();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  try {
    const targetWindow = mainWindow || BrowserWindow.getFocusedWindow();
    if (!targetWindow) throw new Error('No window available for save dialog');
    const result = await dialog.showSaveDialog(targetWindow, options);
    return result.filePath || null;
  } catch (error) {
    console.error('Error in show-save-dialog:', error);
    throw error;
  }
});

ipcMain.handle('export-to-excel', async (event, data, filePath) => {
  try {
    if (!filePath || !data) throw new Error('File path and data are required');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TaxTracker';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(data.sheetName || 'Faturalar', {
      views: [{ state: 'frozen', ySplit: 2 }],
    });

    // ── Theme ────────────────────────────────────────────────────────────────────
    const NAVY  = 'FF1F3864';
    const BLUE  = 'FF2E75B6';
    const LBLUE = 'FFDCE6F1';
    const WHITE = 'FFFFFFFF';
    const BLACK = 'FF000000';
    const NAVY_BORDER  = 'FF1A5276';
    const LIGHT_BORDER = 'FFB8B8B8';

    const colDefs = [
      { key: 'Tarih',             width: 14 },
      { key: 'Fatura Tip',        width: 13 },
      { key: 'Şirket',            width: 24 },
      { key: 'Fatura No',         width: 16 },
      { key: 'Para Birim',        width: 12 },
      { key: 'Ara Toplam',        width: 15 },
      { key: 'KDV Oranı',         width: 14 },
      { key: 'KDV Tutar',         width: 15 },
      { key: 'Genel Toplam',      width: 16 },
      { key: 'Ara Toplam (TL)',   width: 18 },
      { key: 'KDV Tutar (TL)',    width: 18 },
      { key: 'Genel Toplam (TL)', width: 20 },
    ];
    const headers = [
      'Tarih', 'Fatura Tip', 'Şirket', 'Fatura No', 'Para Birim',
      'Ara Toplam', 'KDV Oranı (%)', 'KDV Tutar', 'Genel Toplam',
      'Ara Toplam (TL)', 'KDV Tutar (TL)', 'Genel Toplam (TL)',
    ];
    const numCols = colDefs.length;

    // Number format: currency columns (indices 1-based)
    const currencyFmt = '#,##0.00';
    const pctFmt = '0.00"%"';
    const currencyCols = [6, 8, 9, 10, 11, 12];
    const pctCols = [7];

    const toNum = (val) => (typeof val === 'string' ? parseFloat(val) || 0 : (val || 0));

    // ── Row 1: Report title ──────────────────────────────────────────────────────
    const exportDate = new Date().toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const titleRow = worksheet.addRow([`FATURA RAPORU — ${exportDate}`]);
    titleRow.height = 30;
    worksheet.mergeCells(1, 1, 1, numCols);
    const titleCell = titleRow.getCell(1);
    titleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    titleCell.font      = { bold: true, size: 14, color: { argb: WHITE }, name: 'Calibri' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // ── Row 2: Column headers ────────────────────────────────────────────────────
    worksheet.columns = colDefs;
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 22;
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
      cell.font      = { bold: true, size: 10, color: { argb: WHITE }, name: 'Calibri' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border    = {
        top:    { style: 'medium', color: { argb: NAVY } },
        left:   { style: 'thin',   color: { argb: NAVY_BORDER } },
        bottom: { style: 'medium', color: { argb: NAVY } },
        right:  { style: 'thin',   color: { argb: NAVY_BORDER } },
      };
    });

    // ── Data rows ────────────────────────────────────────────────────────────────
    data.rows.forEach((row, index) => {
      const bg = index % 2 === 0 ? WHITE : LBLUE;
      const dataRow = worksheet.addRow([
        row['Tarih'],
        row['Fatura Tip'],
        row['Şirket'],
        row['Fatura No'],
        row['Para Birim'],
        toNum(row['Ara Toplam']),
        toNum(row['KDV Oranı']),
        toNum(row['KDV Tutar']),
        toNum(row['Genel Toplam']),
        toNum(row['Ara Toplam (TL)']),
        toNum(row['KDV Tutar (TL)']),
        toNum(row['Genel Toplam (TL)']),
      ]);
      dataRow.height = 18;
      dataRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font   = { size: 10, name: 'Calibri', color: { argb: BLACK } };
        cell.border = {
          top:    { style: 'thin', color: { argb: LIGHT_BORDER } },
          left:   { style: 'thin', color: { argb: LIGHT_BORDER } },
          bottom: { style: 'thin', color: { argb: LIGHT_BORDER } },
          right:  { style: 'thin', color: { argb: LIGHT_BORDER } },
        };
        if (currencyCols.includes(col)) {
          cell.numFmt    = currencyFmt;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (pctCols.includes(col)) {
          cell.numFmt    = pctFmt;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // ── Spacer row ───────────────────────────────────────────────────────────────
    const spacer = worksheet.addRow([]);
    spacer.height = 8;

    // ── Totals row ───────────────────────────────────────────────────────────────
    const totalsRow = worksheet.addRow([
      'TOPLAM', '', '', '', '', '', '', '', '',
      toNum(data.totalRow['Ara Toplam (TL)']),
      toNum(data.totalRow['KDV Tutar (TL)']),
      toNum(data.totalRow['Genel Toplam (TL)']),
    ]);
    totalsRow.height = 24;
    totalsRow.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
      cell.font   = { bold: true, size: 11, name: 'Calibri', color: { argb: WHITE } };
      cell.border = {
        top:    { style: 'medium', color: { argb: NAVY } },
        left:   { style: 'thin',   color: { argb: NAVY_BORDER } },
        bottom: { style: 'medium', color: { argb: NAVY } },
        right:  { style: 'thin',   color: { argb: NAVY_BORDER } },
      };
      if ([10, 11, 12].includes(col)) {
        cell.numFmt    = currencyFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });

    await workbook.xlsx.writeFile(filePath);
    return true;
  } catch (error) {
    console.error('Error in export-to-excel:', error);
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