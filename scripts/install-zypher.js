#!/usr/bin/env node

/**
 * Postinstall script to install @zypher/agent from JSR
 * This script attempts to install the package using various methods
 * On Vercel/CI environments without Deno, it will skip installation gracefully
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGE_NAME = '@zypher/agent';
const PACKAGE_VERSION = '^0.7.3';
const JSR_PACKAGE = `jsr:@zypher/agent@${PACKAGE_VERSION.replace('^', '')}`;

// Check if we're in a CI/Vercel environment where Deno isn't available
const isCI = process.env.CI === 'true' || process.env.VERCEL === '1' || process.env.VERCEL_ENV;

// Create a stub module for CI/Vercel environments so the build succeeds
function createStubModule() {
  try {
    console.log(`📦 Creating stub module for @zypher/agent (CI/Vercel environment)`);
    
    const nodeModulesPath = path.join(process.cwd(), 'node_modules', PACKAGE_NAME);
    const packageJsonPath = path.join(nodeModulesPath, 'package.json');
    const modJsPath = path.join(nodeModulesPath, 'mod.js');
    const modDtsPath = path.join(nodeModulesPath, 'mod.d.ts');
    
    // Create directory
    if (!fs.existsSync(nodeModulesPath)) {
      fs.mkdirSync(nodeModulesPath, { recursive: true });
    }
    
    // Create package.json
    const packageJson = {
      name: PACKAGE_NAME,
      version: PACKAGE_VERSION.replace('^', ''),
      type: 'module',
      main: 'mod.js',
      types: 'mod.d.ts',
      exports: {
        '.': './mod.js'
      }
    };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    // Create stub implementation (will fail at runtime with helpful error)
    const modJs = `// Stub module for @zypher/agent
// This package requires Deno runtime and is not available in Node.js/Vercel environments
// For production use, deploy with Deno Deploy or a Deno-compatible host

const ERROR_MSG = '@zypher/agent requires Deno runtime. This is a stub module for build purposes only. The application will not function correctly in Node.js/Vercel environments.';

export class AnthropicModelProvider {
  constructor(options) {
    throw new Error(ERROR_MSG);
  }
}

export async function createZypherContext(cwd) {
  throw new Error(ERROR_MSG);
}

export class ZypherAgent {
  constructor(context, provider) {
    throw new Error(ERROR_MSG);
  }
  
  get mcp() {
    throw new Error(ERROR_MSG);
  }
  
  runTask(task, model) {
    throw new Error(ERROR_MSG);
  }
}
`;
    fs.writeFileSync(modJsPath, modJs);
    
    // Create TypeScript definitions
    const modDts = `// Type definitions for @zypher/agent stub
export declare class AnthropicModelProvider {
  constructor(options: { apiKey: string });
}

export declare function createZypherContext(cwd: string): Promise<any>;

export declare class ZypherAgent {
  constructor(context: any, provider: AnthropicModelProvider);
  mcp: {
    registerServer(options: {
      id: string;
      type: string;
      command: {
        command: string;
        args: string[];
        env: Record<string, string>;
      };
    }): Promise<void>;
  };
  runTask(task: string, model: string): any;
}
`;
    fs.writeFileSync(modDtsPath, modDts);
    
    console.log(`⚠️  Note: @zypher/agent requires Deno runtime and won't work at runtime in this environment`);
    console.log(`   For production use, consider deploying with Deno Deploy or a Deno-compatible host`);
    return true;
  } catch (error) {
    console.error('Failed to create stub module:', error.message);
    return false;
  }
}

if (isCI) {
  createStubModule();
  process.exit(0);
}

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

