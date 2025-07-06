const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const { createIconFromPNG } = require('png-to-ico');

async function createIcon() {
  try {
    console.log('Creating icon files...');
    
    // Create build directory if it doesn't exist
    const buildDir = path.join(__dirname, '..', 'build');
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // Create a simple PNG icon
    const canvas = createCanvas(256, 256);
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TT', 128, 128);
    
    // Save as PNG
    const pngBuffer = canvas.toBuffer('image/png');
    const pngPath = path.join(buildDir, 'icon.png');
    fs.writeFileSync(pngPath, pngBuffer);
    console.log(`Created ${pngPath}`);
    
    // Convert PNG to ICO
    const icoBuffer = await createIconFromPNG(pngBuffer, { sizes: [16, 24, 32, 48, 64, 128, 256] });
    const icoPath = path.join(buildDir, 'favicon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`Created ${icoPath}`);
    
    console.log('Icon creation completed successfully!');
  } catch (error) {
    console.error('Error creating icons:', error);
  }
}

createIcon(); 