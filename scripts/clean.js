const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');
const releaseDir = path.join(__dirname, '..', 'release');
const buildDir = path.join(__dirname, '..', 'build');

// Function to check if a file is locked
function isFileLocked(filePath) {
  try {
    // Try to open the file for writing (will fail if locked)
    const fd = fs.openSync(filePath, 'r+');
    fs.closeSync(fd);
    return false;
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      console.log(`File is locked: ${filePath}`);
      return true;
    }
    return false;
  }
}

// Function to delete a directory recursively with retry mechanism
function deleteFolderRecursive(directoryPath, retries = 3) {
  if (!fs.existsSync(directoryPath)) {
    console.log(`Directory does not exist: ${directoryPath}`);
    return;
  }
  
  console.log(`Attempting to delete directory: ${directoryPath}`);
  
  // Try rimraf first (more robust for Windows)
  try {
    if (process.platform === 'win32') {
      execSync(`rmdir /s /q "${directoryPath}"`, { stdio: 'ignore' });
      console.log(`Deleted directory using Windows command: ${directoryPath}`);
      return;
    }
  } catch (err) {
    console.log(`Windows rmdir command failed, falling back to manual deletion: ${err.message}`);
  }
  
  // Manual deletion as fallback
  try {
    const files = fs.readdirSync(directoryPath);
    
    for (const file of files) {
      const curPath = path.join(directoryPath, file);
      
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursive call for directories
        deleteFolderRecursive(curPath);
      } else {
        // Delete file with retry mechanism
        let deleted = false;
        let attempts = 0;
        
        while (!deleted && attempts < retries) {
          try {
            if (!isFileLocked(curPath)) {
              fs.unlinkSync(curPath);
              deleted = true;
            } else {
              console.log(`File is locked, retrying (${attempts + 1}/${retries}): ${curPath}`);
              // Wait a bit before retrying
              setTimeout(() => {}, 500);
            }
          } catch (err) {
            console.error(`Could not delete file ${curPath} (attempt ${attempts + 1}/${retries}):`, err.message);
          }
          attempts++;
        }
      }
    }
    
    // Now directory should be empty, so delete it
    try {
      fs.rmdirSync(directoryPath);
      console.log(`Deleted directory: ${directoryPath}`);
    } catch (err) {
      console.error(`Could not delete directory ${directoryPath}:`, err.message);
    }
  } catch (err) {
    console.error(`Error while cleaning directory ${directoryPath}:`, err.message);
  }
}

// Preserve the build/static directory if it exists
function preserveStaticDirectory() {
  const staticDir = path.join(buildDir, 'static');
  const tempDir = path.join(__dirname, '..', 'temp_static');
  
  if (fs.existsSync(staticDir)) {
    console.log('Preserving static directory...');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Copy static files to temp directory
    try {
      copyFolderRecursive(staticDir, tempDir);
      console.log('Static directory preserved.');
    } catch (err) {
      console.error('Failed to preserve static directory:', err.message);
    }
  }
}

// Restore the static directory
function restoreStaticDirectory() {
  const staticDir = path.join(buildDir, 'static');
  const tempDir = path.join(__dirname, '..', 'temp_static');
  
  if (fs.existsSync(tempDir)) {
    console.log('Restoring static directory...');
    
    // Create build directory if it doesn't exist
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // Copy static files back to build directory
    try {
      copyFolderRecursive(tempDir, buildDir);
      console.log('Static directory restored.');
      
      // Clean up temp directory
      deleteFolderRecursive(tempDir);
    } catch (err) {
      console.error('Failed to restore static directory:', err.message);
    }
  }
}

// Function to copy a folder recursively
function copyFolderRecursive(source, target) {
  // Check if folder exists
  if (!fs.existsSync(source)) {
    return;
  }
  
  // Create target folder if it doesn't exist
  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }
  
  // Copy each file in the source folder
  const files = fs.readdirSync(source);
  files.forEach(file => {
    const curSource = path.join(source, file);
    const curTarget = path.join(targetFolder, file);
    
    if (fs.lstatSync(curSource).isDirectory()) {
      // Recursively copy subdirectories
      copyFolderRecursive(curSource, targetFolder);
    } else {
      // Copy file
      fs.copyFileSync(curSource, curTarget);
    }
  });
}

console.log('Cleaning output directories...');

// Clean directories
deleteFolderRecursive(distDir);
deleteFolderRecursive(releaseDir);

console.log('Clean completed.'); 