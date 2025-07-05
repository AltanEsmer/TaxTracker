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
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied ${file} to build directory`);
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

fs.writeFileSync(
  path.join(buildDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

console.log('Created package.json in build directory');
console.log('All files copied successfully!'); 