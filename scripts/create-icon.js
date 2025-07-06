const fs = require('fs');
const path = require('path');

// Define paths
const publicDir = path.join(__dirname, '..', 'public');
const buildDir = path.join(__dirname, '..', 'build');
const assetsDir = path.join(__dirname, '..', 'assets');

// Create directories if they don't exist
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
}

// Create a simple 256x256 icon using a basic ICO format
function createSimpleIcon() {
  // This is a minimal 256x256 ICO file structure
  const iconData = Buffer.from([
    // ICO header
    0x00, 0x00,  // Reserved
    0x01, 0x00,  // Type (1 = ICO)
    0x01, 0x00,  // Number of images
    
    // Directory entry
    0x00,        // Width (0 = 256)
    0x00,        // Height (0 = 256)
    0x00,        // Color count
    0x00,        // Reserved
    0x01, 0x00,  // Color planes
    0x20, 0x00,  // Bits per pixel
    0x00, 0x00, 0x00, 0x00,  // Size (will be filled)
    0x16, 0x00, 0x00, 0x00,  // Offset
    
    // PNG data (minimal 256x256 transparent PNG)
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  // IHDR chunk
    0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00,  // 256x256
    0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  // RGBA
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  // CRC placeholder
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,  // IEND
    0xAE, 0x42, 0x60, 0x82   // CRC
  ]);
  
  return iconData;
}

// Function to create icon file
function createIconFile(targetPath) {
  const iconData = createSimpleIcon();
  
  try {
    fs.writeFileSync(targetPath, iconData);
    console.log(`Created icon file at: ${targetPath}`);
    return true;
  } catch (err) {
    console.error(`Failed to create icon file at ${targetPath}:`, err);
    return false;
  }
}

// Ensure directories exist
ensureDirectoryExists(publicDir);
ensureDirectoryExists(buildDir);
ensureDirectoryExists(assetsDir);

// Create icon files in all necessary locations
console.log('Creating icon files...');
const publicSuccess = createIconFile(path.join(publicDir, 'favicon.ico'));
const buildSuccess = createIconFile(path.join(buildDir, 'favicon.ico'));
const assetsSuccess = createIconFile(path.join(assetsDir, 'icon.ico'));

// Also create icon.ico in build directory for electron-builder
createIconFile(path.join(buildDir, 'icon.ico'));
createIconFile(path.join(__dirname, '..', 'icon.ico'));

console.log('Icon creation completed.');

if (publicSuccess && buildSuccess && assetsSuccess) {
  console.log('All icon files created successfully.');
} else {
  console.error('Some icon files could not be created.');
} 