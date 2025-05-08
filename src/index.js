// Export main functionalities for programmatic usage
import { obfuscateFile } from './utils/obfuscate.js';
import { 
  loadConfig, 
  getToken, 
  findDefaultConfigFile, 
  extractTokenFromConfig,
  findConfigInDirectories,
  getDirectoriesFromFiles,
  validateConfigRequirement
} from './utils/config.js';
import { fileExists, createBackup, readFile, writeFile } from './utils/files.js';

export {
  obfuscateFile,
  loadConfig,
  getToken,
  findDefaultConfigFile,
  extractTokenFromConfig,
  findConfigInDirectories,
  getDirectoriesFromFiles,
  validateConfigRequirement,
  fileExists,
  createBackup,
  readFile,
  writeFile
};

/**
 * Obfuscate JavaScript code using ByteHide Shield
 * @param {string} code - JavaScript code to obfuscate
 * @param {string} token - ByteHide Shield project token
 * @param {Object} config - Obfuscation configuration
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.includeSourceMap] - Whether to include source map in result
 * @param {boolean} [options.includeSymbols] - Whether to include symbols in result
 * @returns {Promise<string|Object>} - Obfuscated code or full result object
 */
export async function obfuscate(code, token, config = {}, options = {}) {
  if (!code || typeof code !== 'string') {
    throw new Error('Code must be a non-empty string');
  }
  
  if (!token || typeof token !== 'string') {
    throw new Error('ByteHide Shield project token is required');
  }
  
  const { includeSourceMap = false, includeSymbols = false } = options;
  const returnFullResult = includeSourceMap || includeSymbols;
  
  // Use the internal obfuscation function but return just the code or full result
  const result = await obfuscateFile({
    // Create a temporary file path that won't be used
    filePath: 'temp.js',
    token,
    config,
    // This is a fake operation, we just want the obfuscated code
    outputExtension: '',
    // Override the file operations to just return the code or full result
    _returnCodeOnly: returnFullResult ? 'full' : true,
    _code: code
  });
  
  // If we're returning the full result, include only requested fields
  if (returnFullResult) {
    const finalResult = { 
      output: result.output 
    };
    
    if (includeSourceMap && result.sourceMap) {
      finalResult.sourceMap = result.sourceMap;
    }
    
    if (includeSymbols && result.symbols) {
      finalResult.symbols = result.symbols;
    }
    
    return finalResult;
  }
  
  // Otherwise just return the output string
  return result;
} 