const fs = require('fs').promises;
const path = require('path');
const { existsSync } = require('fs');
const chalk = require('chalk');

// Default configuration for ByteHide Shield
const DEFAULT_CONFIG = {
  controlFlowFlattening: true,
  debugProtection: false,
  devtoolsBlocking: true
};

// Default config file name
const DEFAULT_CONFIG_FILE = 'shield.config.json';

/**
 * Find the config file in the specified directories
 * @param {string[]} directories - Directories to search for config file
 * @returns {string|null} - Path to the config file or null if not found
 */
function findConfigInDirectories(directories) {
  // Remove duplicates and non-existent directories
  const uniqueDirs = [...new Set(directories)].filter(dir => existsSync(dir));
  
  for (const dir of uniqueDirs) {
    const configPath = path.join(dir, DEFAULT_CONFIG_FILE);
    if (existsSync(configPath)) {
      return configPath;
    }
  }
  
  return null;
}

/**
 * Find the default config file in the current working directory
 * @returns {string|null} - Path to the config file or null if not found
 */
function findDefaultConfigFile() {
  const defaultPath = path.join(process.cwd(), DEFAULT_CONFIG_FILE);
  if (existsSync(defaultPath)) {
    return defaultPath;
  }
  return null;
}

/**
 * Get a list of directories from file paths
 * @param {string[]} filePaths - List of file paths
 * @returns {string[]} - List of unique directories
 */
function getDirectoriesFromFiles(filePaths) {
  return [...new Set(filePaths.map(file => path.dirname(file)))];
}

/**
 * Extracts token from config if present
 * @param {Object} config - Configuration object
 * @returns {string|null} - Project token if found, null otherwise
 */
function extractTokenFromConfig(config) {
  return config.ProjectToken || config.projectToken || null;
}

/**
 * Get token from environment or config
 * @param {string|null} cliToken - Token provided via CLI
 * @param {Object} config - Configuration object
 * @returns {string|null} - Project token if found, null otherwise
 */
function getToken(cliToken, config) {
  // Priority: CLI token > Environment variable > Config file
  if (cliToken) {
    return cliToken;
  }
  
  // Check environment variables
  if (process.env.BYTEHIDE_SHIELD_TOKEN) {
    return process.env.BYTEHIDE_SHIELD_TOKEN;
  }
  
  if (process.env.BYTEHIDE_TOKEN) {
    return process.env.BYTEHIDE_TOKEN;
  }
  
  // Check config file
  return extractTokenFromConfig(config);
}

/**
 * Validate if config exists and if not, throw error when required
 * @param {string|null} configPath - Path to configuration file
 * @param {string[]} filePaths - File paths to check for config
 * @param {boolean} required - Whether config is required
 * @returns {Promise<string|null>} - Path to validated config file or null
 */
async function validateConfigRequirement(configPath, filePaths, required = false) {
  // If config path is provided and exists, return it
  if (configPath && existsSync(configPath)) {
    return configPath;
  }
  
  // If config path is provided but doesn't exist
  if (configPath) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  // Look for config in the current directory
  const cwdConfig = findDefaultConfigFile();
  if (cwdConfig) {
    return cwdConfig;
  }
  
  // Look for config in file directories
  if (filePaths && filePaths.length > 0) {
    const dirs = getDirectoriesFromFiles(filePaths);
    const foundConfig = findConfigInDirectories(dirs);
    if (foundConfig) {
      return foundConfig;
    }
  }
  
  // If we reach here, no config was found
  if (required) {
    console.error(chalk.red('Error: No configuration file found.'));
    console.error(chalk.yellow('A configuration file is required. You can:'));
    console.error('  1. Create a shield.config.json file in your current directory');
    console.error('  2. Create a shield.config.json file in the directory of your JavaScript files');
    console.error('  3. Specify a configuration file with --config option');
    process.exit(1);
  }
  
  return null;
}

/**
 * Loads configuration from a file or returns default configuration
 * @param {string|null} configPath - Path to configuration file
 * @param {string[]} filePaths - File paths to check for config
 * @param {boolean} required - Whether config is required
 * @returns {Promise<Object>} - Configuration object
 */
async function loadConfig(configPath = null, filePaths = [], required = false) {
  // Validate and find config file
  const validatedConfigPath = await validateConfigRequirement(configPath, filePaths, required);
  
  // If no config file found and not required, return default config
  if (!validatedConfigPath) {
    return DEFAULT_CONFIG;
  }
  
  try {
    // Read and parse configuration file
    const configContent = await fs.readFile(validatedConfigPath, 'utf-8');
    let config;
    
    if (validatedConfigPath.endsWith('.json')) {
      config = JSON.parse(configContent);
    } else if (validatedConfigPath.endsWith('.js')) {
      // For .js files, we need to use dynamic import
      const configModule = require(path.resolve(validatedConfigPath));
      config = configModule;
    } else {
      throw new Error('Configuration file must be either .json or .js');
    }
    
    // Extract any non-obfuscation config properties
    const { ProjectToken, projectToken, ...obfuscationConfig } = config;
    
    // Merge with default config to ensure all necessary properties exist
    return { ...DEFAULT_CONFIG, ...obfuscationConfig, ProjectToken, projectToken };
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error.message}`);
  }
}

module.exports = {
  findConfigInDirectories,
  findDefaultConfigFile,
  getDirectoriesFromFiles,
  extractTokenFromConfig,
  getToken,
  validateConfigRequirement,
  loadConfig
}; 