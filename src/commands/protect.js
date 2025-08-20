const glob = require('glob');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');
const { loadConfig, getToken } = require('../utils/config.js');
const { obfuscateFile, validateToken } = require('../utils/obfuscate.js');
const { fileExists, createBackup } = require('../utils/files.js');
const logSymbols = require('log-symbols');
const boxen = require('boxen');
const cliProgress = require('cli-progress');
const gradient = require('gradient-string');

// Create a purple gradient for the title
const purpleGradient = gradient('#8A2BE2', '#9370DB', '#9400D3', '#800080');

// Create a beautiful header with gradient
const createHeader = (text) => {
  return boxen(purpleGradient(text), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'magenta'
  });
};

/**
 * Validates output path options based on input files
 * @param {Array} files - Array of input files
 * @param {Object} options - CLI options
 * @returns {boolean} - True if valid, exits process otherwise
 */
function validateOutputOptions(files, options) {
  // Single file special handling with output path
  if (files.length === 1 && options.output) {
    // Ensure the output directory exists
    const outputDir = path.dirname(options.output);
    if (!existsSync(outputDir)) {
      console.error(chalk.red(`${logSymbols.error} Error: Output directory does not exist: ${outputDir}`));
      process.exit(1);
    }
    return true;
  }

  // Multiple files with output path (not allowed)
  if (files.length > 1 && options.output) {
    console.error(chalk.red(`${logSymbols.error} Error: --output can only be used with a single input file.`));
    console.log(chalk.yellow(`${logSymbols.warning} Use --output-dir to specify an output directory for multiple files.`));
    process.exit(1);
  }
  
  // Custom source map path only for single file
  if (files.length > 1 && options.sourceMapPath) {
    console.error(chalk.red(`${logSymbols.error} Error: --source-map-path can only be used with a single input file.`));
    process.exit(1);
  }
  
  // Custom symbols path only for single file
  if (files.length > 1 && options.symbolsPath) {
    console.error(chalk.red(`${logSymbols.error} Error: --symbols-path can only be used with a single input file.`));
    process.exit(1);
  }

  // Output directory validation
  if (options.outputDir) {
    if (!existsSync(options.outputDir)) {
      console.error(chalk.red(`${logSymbols.error} Error: Output directory does not exist: ${options.outputDir}`));
      process.exit(1);
    }
    return true;
  }

  return true;
}

/**
 * Determines the output path for an obfuscated file
 * @param {string} inputFile - Original file path
 * @param {Object} options - CLI options
 * @returns {string} - Output file path
 */
function getOutputPath(inputFile, options) {
  // If specific output file specified (single file mode)
  if (options.output) {
    return options.output;
  }

  const filename = path.basename(inputFile);
  const ext = path.extname(inputFile);
  
  // If output directory specified, use it
  if (options.outputDir) {
    const newFilename = filename.replace(ext, `${options.outputExt}${ext}`);
    return path.join(options.outputDir, newFilename);
  }
  
  // Default: modify the extension in the same directory
  return inputFile.replace(ext, `${options.outputExt}${ext}`);
}

async function protect(patterns, options) {
  // Display a nice header
  console.log(createHeader('ByteHide Shield JavaScript Protector'));
  
  // Find matching files from all patterns first to use for config search
  let allFiles = [];
  const fileSpinner = ora('Finding files to protect...').start();
  
  try {
    for (const pattern of patterns) {
      const files = glob.sync(pattern, { nodir: true });
      allFiles = [...allFiles, ...files];
    }
    
    // Remove duplicates
    allFiles = [...new Set(allFiles)];
    
    // Filter JavaScript files
    allFiles = allFiles.filter(file => file.endsWith('.js') || file.endsWith('.mjs'));
    
    if (allFiles.length === 0) {
      fileSpinner.fail(chalk.yellow(`${logSymbols.warning} No JavaScript files found matching the provided patterns.`));
      process.exit(0);
    }
    
    fileSpinner.succeed(chalk.green(`${logSymbols.success} Found ${chalk.bold(allFiles.length)} JavaScript file(s) to protect.`));
    
    // Load configuration with required flag set to true if no explicit config provided
    const configSpinner = ora('Loading configuration...').start();
    const config = await loadConfig(options.config, allFiles, !options.config);
    configSpinner.succeed(chalk.green(`${logSymbols.success} Configuration loaded successfully.`));
    
    // Get token with priority: CLI > env var > config file
    const tokenSpinner = ora('Validating ByteHide Shield token...').start();
    const token = getToken(options.token, config);
    
    // Validate token
    if (!token) {
      tokenSpinner.fail(chalk.red(`${logSymbols.error} Error: ByteHide Shield project token is required.`));
      console.log(chalk.yellow(`${logSymbols.warning} You can provide a token in one of these ways:`));
      console.log('  1. Use --token flag');
      console.log('  2. Set BYTEHIDE_SHIELD_TOKEN environment variable');
      console.log('  3. Set BYTEHIDE_TOKEN environment variable');
      console.log('  4. Add ProjectToken field in shield.config.json');
      console.log('\nFor more information, visit: docs.bytehide.com/platforms/javascript/products/shield/configuration-project-token');
      process.exit(1);
    }
    
    // Validate token with API call
    try {
      await validateToken(token);
      tokenSpinner.succeed(chalk.green(`${logSymbols.success} Token validated successfully.`));
    } catch (error) {
      tokenSpinner.fail(chalk.red(`${logSymbols.error} Token validation failed: ${error.message}`));
      process.exit(1);
    }
    
    // Validate output options
    validateOutputOptions(allFiles, options);
    
    // In dry run mode, just list the files
    if (options.dryRun) {
      console.log(boxen(chalk.cyan('DRY RUN MODE - No files will be modified'), {
        padding: 1,
        borderColor: 'yellow',
        margin: 1
      }));
      
      console.log(chalk.cyan('\nFiles that would be protected:'));
      
      allFiles.forEach(file => {
        const outputPath = getOutputPath(file, options);
        let outputInfo = `${chalk.blue(logSymbols.info)} ${file} ${chalk.gray('→')} ${chalk.green(outputPath)}`;
        
        if (options.sourceMap) {
          const sourceMapPath = options.sourceMapPath && allFiles.length === 1 
            ? options.sourceMapPath 
            : `${outputPath}.map`;
          outputInfo += ` ${chalk.gray('+')} ${chalk.yellow(sourceMapPath)}`;
        }
        
        if (options.symbols) {
          const symbolsPath = options.symbolsPath && allFiles.length === 1
            ? options.symbolsPath
            : `${outputPath}.symbols.json`;
          outputInfo += ` ${chalk.gray('+')} ${chalk.magenta(symbolsPath)}`;
        }
        
        console.log(outputInfo);
      });
      
      process.exit(0);
    }
    
    // Process each file with a nice progress bar
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    const failedFiles = [];
    const skippedFiles = [];
    
    // Configure progress bar
    const progressBar = new cliProgress.SingleBar({
      format: `${chalk.cyan('Progress')} |${chalk.magenta('{bar}')}| {percentage}% | {value}/{total} Files | ETA: {eta}s`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    }, cliProgress.Presets.shades_classic);
    
    console.log(chalk.cyan('\nProtecting files...'));
    progressBar.start(allFiles.length, 0);
    
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const outputPath = getOutputPath(file, options);
      
      try {
        if (!fileExists(file)) {
          failedFiles.push({ file, error: 'File not found' });
          failCount++;
          progressBar.update(i + 1);
          continue;
        }
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!existsSync(outputDir)) {
          await fs.mkdir(outputDir, { recursive: true });
        }
        
        // Create backup of original file before obfuscation if needed
        if (options.backup) {
          await createBackup(file);
        }
        
        // Only use custom paths for source maps and symbols if we're processing a single file
        const sourceMapPath = allFiles.length === 1 ? options.sourceMapPath : null;
        const symbolsPath = allFiles.length === 1 ? options.symbolsPath : null;
        
        // Obfuscate the file
        await obfuscateFile({
          filePath: file,
          token,
          config,
          outputPath,
          generateSourceMap: options.sourceMap,
          saveSymbols: options.symbols,
          sourceMapPath,
          symbolsPath
        });
        
        successCount++;
      } catch (error) {
        // Check if the error is about the file already being protected
        if (error.message === 'The file has already been protected.') {
          skippedFiles.push({ file, reason: 'Already protected' });
          skippedCount++;
        } else {
          failedFiles.push({ file, error: error.message });
          failCount++;
        }
      }
      
      progressBar.update(i + 1);
    }
    
    progressBar.stop();
    
    // Summary with attractive formatting
    console.log('\n' + boxen(
      chalk.bold.magenta('Protection Summary') + '\n\n' +
      `${chalk.white('Total files:')} ${chalk.bold(allFiles.length)}\n` +
      `${chalk.green(`${logSymbols.success} Success:`)} ${chalk.bold.green(successCount)}\n` +
      (skippedCount > 0 ? `${chalk.blue(`${logSymbols.info} Skipped:`)} ${chalk.bold.blue(skippedCount)}\n` : '') +
      (failCount > 0 ? `${chalk.red(`${logSymbols.error} Failed:`)} ${chalk.bold.red(failCount)}\n` : '') +
      (options.sourceMap ? `${chalk.yellow('Source maps:')} ${chalk.bold('Generated')}\n` : '') +
      (options.symbols ? `${chalk.magenta('Symbols cache:')} ${chalk.bold('Saved')}\n` : ''),
      { padding: 1, margin: 1, borderColor: 'magenta' }
    ));
    
    // Show skipped files if any
    if (skippedCount > 0) {
      console.log(chalk.blue('\nSkipped files:'));
      skippedFiles.forEach(({ file, reason }) => {
        console.log(`${chalk.blue(logSymbols.info)} ${file}: ${chalk.cyan(reason)}`);
      });
    }
    
    // Show failed files if any
    if (failCount > 0) {
      console.log(chalk.red('\nFailed files:'));
      failedFiles.forEach(({ file, error }) => {
        console.log(`${chalk.red(logSymbols.error)} ${file}: ${chalk.yellow(error)}`);
      });
    }
    
  } catch (error) {
    if (fileSpinner.isSpinning) fileSpinner.fail(chalk.red(`${logSymbols.error} Error: ${error.message}`));
    else     console.error(chalk.red(`${logSymbols.error} Error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { protect }; 