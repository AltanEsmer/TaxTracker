const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting fresh build process...');

// Define paths
const rootDir = path.join(__dirname);
const releaseDir = path.join(rootDir, 'release');

// Function to run a command with error handling
function runCommand(command, errorMessage) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { 
      cwd: rootDir, 
      stdio: 'inherit',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    return true;
  } catch (error) {
    console.error(`${errorMessage}: ${error.message}`);
    return false;
  }
}

// Function to check if the installer was created
function checkInstallerExists() {
  if (!fs.existsSync(releaseDir)) {
    console.error('Release directory does not exist!');
    return false;
  }

  const files = fs.readdirSync(releaseDir);
  const installerFile = files.find(file => file.endsWith('.exe'));
  
  if (installerFile) {
    console.log(`Installer created successfully: ${installerFile}`);
    return true;
  } else {
    console.error('No installer (.exe) file found in the release directory!');
    return false;
  }
}

// Main build process
async function buildFresh() {
  try {
    // 1. Kill any processes that might be locking files
    if (process.platform === 'win32') {
      try {
        console.log('Attempting to kill any processes that might be locking files...');
        execSync('taskkill /f /im electron.exe', { stdio: 'ignore' });
        execSync('taskkill /f /im Tax*.exe', { stdio: 'ignore' });
      } catch (error) {
        // Ignore errors - processes might not be running
      }
    }

    // 2. Create icon files
    console.log('Creating icon files...');
    runCommand('node scripts/create-icon.js', 'Failed to create icon files');

    // 3. Clean previous build artifacts
    console.log('Cleaning previous build artifacts...');
    runCommand('node scripts/clean.js', 'Failed to clean build artifacts');

    // 4. Build React app
    console.log('Building React app...');
    if (!runCommand('npm run react-build', 'Failed to build React app')) {
      return false;
    }

    // 5. Copy necessary files
    console.log('Copying necessary files...');
    if (!runCommand('node scripts/copy-files.js', 'Failed to copy files')) {
      return false;
    }

    // 6. Build the installer with portable option
    console.log('Building the portable executable...');
    if (!runCommand('electron-builder --config electron-builder.yml --win portable', 'Failed to build portable executable')) {
      return false;
    }

    // 7. Create a StartTaxTracker.bat file in the release directory
    console.log('Creating startup batch file...');
    const portablePath = path.join(releaseDir, 'Tax Tracker.exe');
    
    if (fs.existsSync(portablePath)) {
      console.log('Portable executable found. Creating launcher batch file...');
      
      const batchContent = `@echo off
echo Tax Tracker uygulaması başlatılıyor...
start "" "%~dp0\\Tax Tracker.exe"
exit`;
      
      fs.writeFileSync(path.join(releaseDir, 'StartTaxTracker.bat'), batchContent);
      console.log('Created StartTaxTracker.bat in release directory');
      
      // Also copy to root directory for convenience
      fs.writeFileSync(path.join(rootDir, 'StartTaxTracker.bat'), batchContent);
      console.log('Created StartTaxTracker.bat in root directory');
      
      return true;
    } else {
      console.error('Portable executable not found in release directory!');
      return false;
    }
  } catch (error) {
    console.error('Build process failed:', error.message);
    return false;
  }
}

// Run the build process
buildFresh()
  .then(success => {
    if (success) {
      console.log('Build completed successfully!');
      process.exit(0);
    } else {
      console.error('Build failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Build process failed with an error:', error);
    process.exit(1);
  }); 