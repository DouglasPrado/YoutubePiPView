// Loader for Electron with ES modules support
// This file uses CommonJS to properly load the ES module main process

const path = require('path');
const fs = require('fs');

// Determine the correct path to main.js
// In development: dist-electron/main/main.js (from project root)
// In production: main/main.js (from asar root where this file is located)
let mainPath;
if (fs.existsSync(path.join(__dirname, 'main/main.js'))) {
  // Production: we're in the asar, main.js is in main/main.js
  mainPath = path.join(__dirname, 'main/main.js');
} else if (fs.existsSync(path.join(__dirname, 'dist-electron/main/main.js'))) {
  // Development: we're in project root, main.js is in dist-electron/main/main.js
  mainPath = path.join(__dirname, 'dist-electron/main/main.js');
} else {
  console.error('Could not find main.js');
  process.exit(1);
}

// Import the ES module main process
import(mainPath)
  .catch(err => {
    console.error('Failed to load main process:', err);
    process.exit(1);
  });
