const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const releaseDir = path.join(__dirname, '..', 'release');

// Function to delete a directory recursively
function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    try {
      fs.readdirSync(directoryPath).forEach((file) => {
        const curPath = path.join(directoryPath, file);
        
        if (fs.lstatSync(curPath).isDirectory()) {
          // Recursive call for directories
          deleteFolderRecursive(curPath);
        } else {
          // Delete file
          try {
            fs.unlinkSync(curPath);
          } catch (err) {
            console.error(`Could not delete file ${curPath}:`, err.message);
          }
        }
      });
      
      // Now directory should be empty, so delete it
      try {
        fs.rmdirSync(directoryPath);
      } catch (err) {
        console.error(`Could not delete directory ${directoryPath}:`, err.message);
      }
      
      console.log(`Deleted directory: ${directoryPath}`);
    } catch (err) {
      console.error(`Error while cleaning directory ${directoryPath}:`, err.message);
    }
  } else {
    console.log(`Directory does not exist: ${directoryPath}`);
  }
}

console.log('Cleaning output directories...');
deleteFolderRecursive(distDir);
deleteFolderRecursive(releaseDir);
console.log('Clean completed.'); 