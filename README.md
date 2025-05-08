# ByteHide Shield JavaScript CLI

A command-line interface for using ByteHide Shield's JavaScript obfuscation service.

## Installation

```bash
# Install globally
npm install -g @bytehide/shield-cli

# Or install locally in your project
npm install --save-dev @bytehide/shield-cli
```

## Usage

```bash
# Basic usage
shield protect "src/**/*.js" --token YOUR_PROJECT_TOKEN

# Protect multiple patterns
shield protect "src/main.js" "src/utils/*.js" --token YOUR_PROJECT_TOKEN

# Use a custom configuration file
shield protect "src/**/*.js" --config ./shield.config.json

# Add an extension to obfuscated files
shield protect "src/**/*.js" --output-ext ".obf"

# Specify output file for a single file
shield protect "src/main.js" --output "dist/main.obfuscated.js"

# Specify output directory for multiple files
shield protect "src/**/*.js" --output-dir "dist/obfuscated"

# Generate source maps
shield protect "src/**/*.js" --source-map

# Generate source maps with custom path (single file only)
shield protect "src/main.js" --source-map --source-map-path "dist/maps/main.js.map"

# Save identifier names cache (for consistent obfuscation)
shield protect "src/**/*.js" --symbols

# Save symbols with custom path (single file only)
shield protect "src/main.js" --symbols --symbols-path "dist/symbols/main.symbols.json"

# Create backups of original files
shield protect "src/**/*.js" --backup

# Explicitly disable backups
shield protect "src/**/*.js" --no-backup

# Dry run (preview which files would be obfuscated)
shield protect "src/**/*.js" --dry-run

# Display help
shield --help
shield protect --help

# Display version
shield --version
```

## Options

| Option | Description |
|--------|-------------|
| `-t, --token <token>` | ByteHide Shield project token |
| `-c, --config <path>` | Path to custom configuration file (default: shield.config.json) |
| `-o, --output-ext <extension>` | Extension for obfuscated files (default: "") |
| `-O, --output <path>` | Output file path for single file obfuscation |
| `-D, --output-dir <directory>` | Output directory for obfuscated files |
| `--source-map` | Generate source map files (.map) |
| `--source-map-path <path>` | Custom path for source map file (single file only) |
| `--symbols` | Save identifier names cache (.symbols.json) |
| `--symbols-path <path>` | Custom path for symbols cache file (single file only) |
| `-b, --backup` | Create backup of original files before obfuscation |
| `--no-backup` | Disable backup creation even if enabled in config |
| `-d, --dry-run` | Show which files would be obfuscated without making changes |
| `-v, --version` | Display version number |
| `-h, --help` | Display help for command |

## Token Configuration

You can provide your ByteHide Shield project token in multiple ways (in order of priority):

1. Using the `--token` flag
   ```bash
   shield protect "src/**/*.js" --token YOUR_PROJECT_TOKEN
   ```

2. Setting the `BYTEHIDE_SHIELD_TOKEN` environment variable
   ```bash
   export BYTEHIDE_SHIELD_TOKEN=YOUR_PROJECT_TOKEN
   shield protect "src/**/*.js"
   ```

3. Setting the `BYTEHIDE_TOKEN` environment variable (backward compatibility)
   ```bash
   export BYTEHIDE_TOKEN=YOUR_PROJECT_TOKEN
   shield protect "src/**/*.js"
   ```

4. Adding it to your `shield.config.json` file
   ```json
   {
     "ProjectToken": "YOUR_PROJECT_TOKEN",
     "controlFlowFlattening": true,
     // ...other options
   }
   ```

## Configuration

A configuration file is required unless specified with the `--config` option. The CLI will look for a `shield.config.json` file in the following locations (in order):

1. The path specified with `--config` option
2. The current working directory
3. The directory of the JavaScript files being obfuscated

If no configuration file is found, the CLI will exit with an error.

Example configuration file (`shield.config.json`):

```json
{
  "ProjectToken": "YOUR_PROJECT_TOKEN",
  "controlFlowFlattening": true,
  "debugProtection": false,
  "devtoolsBlocking": true,
  "deadCodeInjection": false,
  "selfDefending": true,
  "stringArray": true,
  "stringArrayEncoding": ["base64"],
  "stringArrayThreshold": 0.8,
  "transformObjectKeys": true,
  "unicodeEscapeSequence": false
}
```

For a complete list of configuration options, see the [official ByteHide Shield documentation](https://docs.bytehide.com/platforms/javascript/products/shield/configuration-files).

## Programmatic Usage

You can also use ByteHide Shield programmatically in your Node.js applications:

```javascript
import { obfuscate } from '@bytehide/shield-cli';

const code = `function hello() { console.log("Hello world!"); }`;
const token = 'YOUR_PROJECT_TOKEN';
const config = { 
  controlFlowFlattening: true,
  stringArray: true 
};

// Basic usage - returns obfuscated code string
const obfuscatedCode = await obfuscate(code, token, config);
console.log(obfuscatedCode);

// Advanced usage - returns object with output, sourceMap, and symbols
const result = await obfuscate(code, token, config, {
  includeSourceMap: true,
  includeSymbols: true
});

console.log(result.output);      // Obfuscated code
console.log(result.sourceMap);   // Source map (if enabled in config)
console.log(result.symbols);     // Identifier names cache
```

## Advanced API Options

You can use the full API for more control:

```javascript
import { obfuscateFile, loadConfig } from '@bytehide/shield-cli';

// Load config from file
const config = await loadConfig('./shield.config.json');

// Process a file with custom options
await obfuscateFile({
  filePath: 'src/main.js',
  token: 'YOUR_PROJECT_TOKEN',
  config,
  outputPath: 'dist/main.obfuscated.js',
  generateSourceMap: true,
  sourceMapPath: 'dist/maps/main.js.map',
  saveSymbols: true,
  symbolsPath: 'dist/symbols/main.symbols.json'
});
```

## Publishing to npm

This package is published to npm under the `@bytehide` scope. To install it:

```bash
npm install -g @bytehide/shield-cli
```

After installation, you can use the `shield` command directly:

```bash
shield protect "src/**/*.js"
```

## Features

- Supports glob patterns for selecting files
- UTF-8 with BOM encoding for proper file encoding
- Project token configuration from multiple sources
- Custom output paths for source files, source maps, and symbol files
- Backup file creation (optional)
- Source map generation for debugging
- Symbols cache for consistent identifier naming
- Watermarking of obfuscated files to prevent re-obfuscation
- Detailed progress with success/failure reporting
- Colorful CLI interface with progress bars and symbols
- Looks for configuration files in multiple locations

## Official Documentation

For more information about ByteHide Shield, visit the official documentation:

- [ByteHide Shield CLI Installation](https://docs.bytehide.com/platforms/javascript/products/shield/cli-install)
- [ByteHide Shield Configuration Options](https://docs.bytehide.com/platforms/javascript/products/shield/configuration-files)

## License

MIT 