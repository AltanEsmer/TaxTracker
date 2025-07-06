const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to create autostart shortcut on Windows
function setupWindowsAutostart() {
  try {
    console.log('Setting up autostart for Windows...');
    
    // Get the current user's startup folder
    const startupFolder = path.join(process.env.APPDATA, '\\Microsoft\\Windows\\Start Menu\\Programs\\Startup');
    
    // Get the application executable path
    const appPath = process.execPath;
    
    // Create a VBS script to create the shortcut
    const vbsScript = `
      Set WshShell = CreateObject("WScript.Shell")
      Set shortcut = WshShell.CreateShortcut("${startupFolder}\\Tax Tracker.lnk")
      shortcut.TargetPath = "${appPath.replace(/\\/g, '\\\\')}"
      shortcut.WorkingDirectory = "${path.dirname(appPath).replace(/\\/g, '\\\\')}"
      shortcut.Description = "Tax Tracker - Fatura ve KDV Takip Uygulaması"
      shortcut.Save
    `;
    
    // Write the VBS script to a temporary file
    const tempVbsPath = path.join(__dirname, 'create-shortcut.vbs');
    fs.writeFileSync(tempVbsPath, vbsScript);
    
    // Execute the VBS script
    execSync(`cscript //nologo "${tempVbsPath}"`);
    
    // Delete the temporary VBS script
    fs.unlinkSync(tempVbsPath);
    
    console.log('Autostart setup completed successfully!');
    console.log(`Shortcut created in: ${startupFolder}`);
    
    return true;
  } catch (error) {
    console.error('Error setting up autostart:', error);
    return false;
  }
}

// Function to remove autostart shortcut on Windows
function removeWindowsAutostart() {
  try {
    console.log('Removing autostart for Windows...');
    
    // Get the current user's startup folder
    const startupFolder = path.join(process.env.APPDATA, '\\Microsoft\\Windows\\Start Menu\\Programs\\Startup');
    
    // Path to the shortcut file
    const shortcutPath = path.join(startupFolder, 'Tax Tracker.lnk');
    
    // Check if the shortcut exists
    if (fs.existsSync(shortcutPath)) {
      // Delete the shortcut
      fs.unlinkSync(shortcutPath);
      console.log('Autostart shortcut removed successfully!');
    } else {
      console.log('Autostart shortcut not found.');
    }
    
    return true;
  } catch (error) {
    console.error('Error removing autostart:', error);
    return false;
  }
}

// Export functions for use in other files
module.exports = {
  setupWindowsAutostart,
  removeWindowsAutostart
};

// If this script is run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--install') || args.includes('-i')) {
    setupWindowsAutostart();
  } else if (args.includes('--uninstall') || args.includes('-u')) {
    removeWindowsAutostart();
  } else {
    console.log('Usage: node autostart-setup.js [--install|-i] [--uninstall|-u]');
    console.log('  --install, -i     Set up autostart');
    console.log('  --uninstall, -u   Remove autostart');
  }
} 