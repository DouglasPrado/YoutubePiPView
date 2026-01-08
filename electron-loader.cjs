// Loader for Electron with ES modules support
// This file uses CommonJS to properly load the ES module main process

const path = require('path');

// Import the ES module main process
import(path.join(__dirname, 'dist-electron/main/main.js'))
  .catch(err => {
    console.error('Failed to load main process:', err);
    process.exit(1);
  });
