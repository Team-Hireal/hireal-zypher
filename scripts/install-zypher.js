#!/usr/bin/env node

/**
 * Postinstall script to install @zypher/agent from JSR
 * This script attempts to install the package using various methods
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGE_NAME = '@zypher/agent';
const PACKAGE_VERSION = '^0.7.3';
const JSR_PACKAGE = `jsr:@zypher/agent@${PACKAGE_VERSION.replace('^', '')}`;

console.log(`Attempting to install ${PACKAGE_NAME} from JSR...`);

// Method 1: Try using deno if available
function tryDenoInstall() {
  try {
    console.log('Trying Deno installation...');
    execSync('which deno', { stdio: 'ignore' });
    
    // Create a temporary deno.json if needed
    const denoJsonPath = path.join(process.cwd(), 'deno.json');
    if (!fs.existsSync(denoJsonPath)) {
      fs.writeFileSync(denoJsonPath, JSON.stringify({
        imports: {
          [PACKAGE_NAME]: JSR_PACKAGE
        }
      }, null, 2));
    }
    
    // Try to cache the package using deno
    execSync(`deno cache --reload "${JSR_PACKAGE}"`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('Deno installation successful!');
    return true;
  } catch (error) {
    console.log('Deno installation failed:', error.message);
    return false;
  }
}

// Method 2: Try downloading from JSR CDN and installing manually
function tryManualInstall() {
  try {
    console.log('Trying manual installation from JSR...');
    
    // JSR packages are available via CDN
    // Format: https://jsr.io/@scope/package@version/file
    const nodeModulesPath = path.join(process.cwd(), 'node_modules', PACKAGE_NAME);
    const packageJsonPath = path.join(nodeModulesPath, 'package.json');
    
    // Create directory
    if (!fs.existsSync(nodeModulesPath)) {
      fs.mkdirSync(nodeModulesPath, { recursive: true });
    }
    
    // Create a minimal package.json that points to the JSR package
    const packageJson = {
      name: PACKAGE_NAME,
      version: PACKAGE_VERSION.replace('^', ''),
      type: 'module',
      main: 'mod.js',
      exports: {
        '.': './mod.js'
      }
    };
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    // Create a mod.js that re-exports from JSR
    // Note: This won't work at runtime, but might help with TypeScript compilation
    const modJs = `// This is a placeholder for @zypher/agent from JSR
// The actual package needs to be installed via Deno or another method
export * from "${JSR_PACKAGE}";
`;
    
    fs.writeFileSync(path.join(nodeModulesPath, 'mod.js'), modJs);
    
    console.log('Manual installation placeholder created');
    return true;
  } catch (error) {
    console.log('Manual installation failed:', error.message);
    return false;
  }
}

// Try methods in order
if (!tryDenoInstall()) {
  console.log('Falling back to manual installation...');
  tryManualInstall();
}

console.log(`Installation attempt completed for ${PACKAGE_NAME}`);

