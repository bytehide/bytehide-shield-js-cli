#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { protect } from './commands/protect.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer el package.json directamente
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf8')
);
const { version } = packageJson;

const program = new Command();

program
  .name('shield')
  .description('ByteHide Shield JavaScript obfuscation CLI')
  .version(version, '-v, --version')
  .helpOption('-h, --help', 'Display help for command');

program
  .command('protect')
  .description('Obfuscate JavaScript files using ByteHide Shield')
  .argument('<patterns...>', 'File patterns to obfuscate (glob patterns supported)')
  .option('-t, --token <token>', 'ByteHide Shield project token', process.env.BYTEHIDE_SHIELD_TOKEN || process.env.BYTEHIDE_TOKEN)
  .option('-c, --config <path>', 'Path to custom configuration file (default: shield.config.json)')
  .option('-o, --output-ext <extension>', 'Extension for obfuscated files', '')
  .option('-d, --dry-run', 'Show which files would be obfuscated without making changes', false)
  .option('-b, --backup', 'Create backup of original files before obfuscation', true)
  .option('--no-backup', 'Disable backup creation even if enabled in config')
  .option('-O, --output <path>', 'Output file path for single file obfuscation')
  .option('-D, --output-dir <directory>', 'Output directory for obfuscated files')
  .option('--source-map', 'Generate source map files (.map)', false)
  .option('--source-map-path <path>', 'Custom path for source map file (single file only)')
  .option('--symbols', 'Save identifier names cache (.symbols.json)', false)
  .option('--symbols-path <path>', 'Custom path for symbols cache file (single file only)')
  .action(protect);

program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan('\n🛡️  ByteHide Shield JavaScript CLI 🛡️\n'));
  program.help();
} 