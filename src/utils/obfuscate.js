import https from 'https';
import crypto from 'crypto';
import path from 'path';
import { readFile, writeFile } from './files.js';

/**
 * Generates a unique random ID
 * @returns {string} - Random ID
 */
function generateRandomID() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Generates a unique watermark
 * @returns {string} - Random WaterMark
 */
function generateWatermark() {
  const uniqueId = crypto.randomBytes(4).toString('hex');
  return `// _0xBHSHLD_${uniqueId}_marker`;
}

/**
 * Get a friendly error message based on the HTTP status code
 * @param {number} statusCode - HTTP response code
 * @returns {string} - Friendly error message
 */
function getFriendlyErrorMessage(statusCode) {
  switch (statusCode) {
    case 400:
      return 'Request contains invalid data. Check your configuration and source code.';
    case 401:
    case 403:
    case 404:
      return 'Authentication error. Verify that your project token is valid. For more information visit: docs.bytehide.com/platforms/javascript/products/shield/configuration-project-token';
    case 429:
        return 'Protection skipped to avoid performance issues in final build. Reducing file size...';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Service error. Please try again later.';
    default:
      return 'Error processing the request. Check your configuration and try again.';
  }
}

/**
 * Validates a ByteHide Shield project token
 * @param {string} token - ByteHide Shield project token
 * @returns {Promise<boolean>} - True if token is valid
 */
export function validateToken(token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      code: '',
      config: {}
    });
    const options = {
      hostname: 'shield.microservice.bytehide.com',
      port: 443,
      path: `/api/start/${token}/js`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload, 'utf8')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
            console.log(data);
          const friendlyMessage = getFriendlyErrorMessage(res.statusCode);
          reject(new Error(friendlyMessage));
        }
      });
    });

    req.on('error', () => {
      reject(new Error('Connection error: Check your internet connection and try again.'));
    });

    req.write(payload, 'utf8');
    req.end();
  });
}

/**
 * Calls the ByteHide Shield API to obfuscate code
 * @param {string} code - Code to obfuscate
 * @param {string} token - ByteHide Shield project token
 * @param {object} config - Obfuscation configuration
 * @returns {Promise<Object>} - Obfuscation result with output, sourceMap, and symbols
 */
function callBytehideShieldAPI(code, token, config) {
  return new Promise((resolve, reject) => {
    const obfuscationID = generateRandomID();
    
    const payload = JSON.stringify({
      code,
      obfuscationID,
      projectToken: token,
      config
    });

    const options = {
      hostname: 'shield.microservice.bytehide.com',
      port: 443,
      path: `/api/start/${token}/js`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload, 'utf8')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Handle non-200 status codes
          if (res.statusCode !== 200) {
            const friendlyMessage = getFriendlyErrorMessage(res.statusCode);
            
            try {
              const result = JSON.parse(data);
              if (result.error) {
                if(result.error === 'Internal Server Error')
                    return reject(new Error(`Protection error: ${result.message}`));
                return reject(new Error(`Protection error: ${result.error}`));
              }
            } catch (e) {
              // If we can't parse the response, use the friendly message
            }
            
            return reject(new Error(friendlyMessage));
          }
          
          // Parse successful response
          const result = JSON.parse(data);
          
          if (result.output) {
            const watermark = generateWatermark();
            const outputWithWatermark = `${watermark}\n${result.output}`;
            
            // Return the complete result with output, sourceMap, and symbols
            resolve({
              output: outputWithWatermark,
              sourceMap: result.sourceMap || null,
              symbols: result.symbols || null
            });
          } else {
            reject(new Error('No protected code received in response.'));
          }
        } catch (e) {
          reject(new Error(`Error processing response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Connection error: Check your internet connection and try again.`));
    });

    req.write(payload, 'utf8');
    req.end();
  });
}

/**
 * Checks if a file is already obfuscated
 * @param {string} content - File content
 * @returns {boolean} - True if the file is already obfuscated
 */
function isAlreadyObfuscated(content) {
  const watermarkPattern = /\/\/ _0xBHSHLD_[a-f0-9]{8}_marker/;
  return watermarkPattern.test(content);
}

/**
 * Add UTF-8 BOM to ensure proper encoding
 * @param {string} content - Content to add BOM to
 * @returns {Buffer} - Content with BOM
 */
function addBOM(content) {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  const contentBuffer = Buffer.concat([bom, Buffer.from(content, 'utf8')]);
  return contentBuffer;
}

/**
 * Gets the source map output path from JavaScript file path
 * @param {string} jsFilePath - JavaScript file path
 * @param {string|null} customPath - Custom source map path
 * @returns {string} - Source map file path
 */
function getSourceMapPath(jsFilePath, customPath = null) {
  if (customPath) {
    return customPath;
  }
  return `${jsFilePath}.map`;
}

/**
 * Gets the symbols cache output path from JavaScript file path
 * @param {string} jsFilePath - JavaScript file path
 * @param {string|null} customPath - Custom symbols path
 * @returns {string} - Symbols cache file path
 */
function getSymbolsPath(jsFilePath, customPath = null) {
  if (customPath) {
    return customPath;
  }
  return `${jsFilePath}.symbols.json`;
}

/**
 * Obfuscates a JavaScript file
 * @param {Object} options - Obfuscation options
 * @param {string} options.filePath - Path to the file
 * @param {string} options.token - ByteHide Shield project token
 * @param {Object} options.config - Obfuscation configuration
 * @param {string} [options.outputPath] - Direct output path (takes precedence)
 * @param {string} [options.outputExtension] - Extension for obfuscated files (if outputPath not specified)
 * @param {boolean} [options.generateSourceMap] - Whether to generate source map file
 * @param {boolean} [options.saveSymbols] - Whether to save symbols cache
 * @param {string} [options.sourceMapPath] - Custom path for source map file
 * @param {string} [options.symbolsPath] - Custom path for symbols cache file
 * @param {boolean} [options._returnCodeOnly] - For internal use - just return the code
 * @param {string} [options._code] - For internal use - code to obfuscate
 * @returns {Promise<string|Object>} - Path to the obfuscated file or obfuscation result
 */
export async function obfuscateFile({ 
  filePath, 
  token, 
  config,
  outputPath = null,
  outputExtension = '',
  generateSourceMap = false,
  saveSymbols = false,
  sourceMapPath = null,
  symbolsPath = null,
  _returnCodeOnly = false,
  _code = null
}) {
  // Handle programmatic usage where code is passed directly
  let fileContent;
  
  if (_returnCodeOnly && _code !== null) {
    fileContent = _code;
  } else {
    // Read file content
    fileContent = await readFile(filePath);
    
    // Check if file is already obfuscated
    if (isAlreadyObfuscated(fileContent)) {
      throw new Error('The file has already been protected.');
    }
  }
  
  // Call ByteHide Shield API
  const obfuscationResult = await callBytehideShieldAPI(fileContent, token, config);
  
  // If this is programmatic usage, just return the result
  if (_returnCodeOnly) {
    return _returnCodeOnly === 'full' ? obfuscationResult : obfuscationResult.output;
  }
  
  // Determine output path
  let finalOutputPath;
  if (outputPath) {
    finalOutputPath = outputPath;
  } else {
    const ext = path.extname(filePath);
    finalOutputPath = filePath.replace(ext, `${outputExtension}${ext}`);
  }
  
  // Add BOM to ensure proper encoding and write to file
  const contentWithBOM = addBOM(obfuscationResult.output);
  await writeFile(finalOutputPath, contentWithBOM);
  
  // Generate source map if needed
  if (generateSourceMap && obfuscationResult.sourceMap) {
    const sourceMapFilePath = getSourceMapPath(finalOutputPath, sourceMapPath);
    await writeFile(sourceMapFilePath, obfuscationResult.sourceMap);
  }
  
  // Save symbols cache if needed
  if (saveSymbols && obfuscationResult.symbols) {
    const symbolsFilePath = getSymbolsPath(finalOutputPath, symbolsPath);
    await writeFile(symbolsFilePath, JSON.stringify(obfuscationResult.symbols, null, 2));
  }
  
  return finalOutputPath;
} 