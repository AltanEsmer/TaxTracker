const fs = require('fs');
const path = require('path');

// Files to copy to build directory
const filesToCopy = [
  'main.js',
  'preload.js',
  'database.js',
];

// Create build directory if it doesn't exist
const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Copy each file
filesToCopy.forEach(file => {
  const sourcePath = path.join(__dirname, '..', file);
  const destPath = path.join(buildDir, file);
  
  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${file} to build directory`);
    } else {
      console.error(`Source file not found: ${sourcePath}`);
    }
  } catch (err) {
    console.error(`Error copying ${file}:`, err);
  }
});

// Create a package.json in the build directory
const packageJson = {
  name: 'tax-tracker',
  version: '1.0.0',
  description: 'Fatura Kayıt ve KDV Takip Uygulaması',
  main: 'main.js',
  author: '',
  license: 'MIT'
};

try {
  fs.writeFileSync(
    path.join(buildDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  console.log('Created package.json in build directory');
} catch (err) {
  console.error('Error creating package.json:', err);
}

// Ensure favicon.ico exists in build directory
const faviconSrc = path.join(__dirname, '..', 'public', 'favicon.ico');
const faviconDest = path.join(buildDir, 'favicon.ico');
const iconDest = path.join(buildDir, 'icon.ico');

try {
  // Create icon.ico if it doesn't exist
  if (!fs.existsSync(faviconSrc)) {
    console.log('Running icon creation script...');
    require('./create-icon');
  } else {
    // Copy favicon.ico to build directory
    fs.copyFileSync(faviconSrc, faviconDest);
    console.log('Copied favicon.ico to build directory');
    
    // Also copy as icon.ico for electron-builder
    fs.copyFileSync(faviconSrc, iconDest);
    console.log('Copied icon.ico to build directory');
  }
} catch (err) {
  console.error('Error handling icons:', err);
}

// Copy autostart-setup.js to build directory
try {
  const autostartSrc = path.join(__dirname, 'autostart-setup.js');
  const autostartDest = path.join(buildDir, 'scripts');
  
  // Create scripts directory if it doesn't exist
  if (!fs.existsSync(autostartDest)) {
    fs.mkdirSync(autostartDest, { recursive: true });
  }
  
  fs.copyFileSync(autostartSrc, path.join(autostartDest, 'autostart-setup.js'));
  console.log('Copied autostart-setup.js to build directory');
} catch (err) {
  console.error('Error copying autostart-setup.js:', err);
}

console.log('All files copied successfully!'); 