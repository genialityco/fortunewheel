const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist');

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
  fs.writeFileSync(path.join(distPath, 'index.html'), '<!DOCTYPE html><html><body><h1>Fallback page</h1></body></html>');
  console.log('Created fallback dist directory');
}