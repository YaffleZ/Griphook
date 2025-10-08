const fs = require('fs');
const path = require('path');

// Copy .next/static to .next/standalone/.next/static so the standalone server can serve static files
const staticSource = path.join(__dirname, '../.next/static');
const staticDest = path.join(__dirname, '../.next/standalone/.next/static');
const publicSource = path.join(__dirname, '../public');
const publicDest = path.join(__dirname, '../.next/standalone/public');

console.log('Preparing Electron build...');

// Copy static files
if (fs.existsSync(staticSource)) {
  console.log('Copying .next/static to .next/standalone/.next/static...');
  fs.cpSync(staticSource, staticDest, { recursive: true });
  console.log('✓ Static files copied');
} else {
  console.warn('Warning: .next/static not found');
}

// Copy public files
if (fs.existsSync(publicSource)) {
  console.log('Copying public to .next/standalone/public...');
  fs.cpSync(publicSource, publicDest, { recursive: true });
  console.log('✓ Public files copied');
} else {
  console.warn('Warning: public folder not found');
}

console.log('Electron build preparation complete!');
