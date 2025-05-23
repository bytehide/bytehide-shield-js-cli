import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Check if a file exists
 * @param {string} filePath - Path to the file
 * @returns {boolean} - True if the file exists
 */
export function fileExists(filePath) {
  return existsSync(filePath);
}

/**
 * Create a backup of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Path to the backup file
 */
export async function createBackup(filePath) {
  const backupPath = `${filePath}.backup`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

/**
 * Read a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - File content
 */
export async function readFile(filePath) {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Write to a file
 * @param {string} filePath - Path to the file
 * @param {string|Buffer} content - Content to write (string or Buffer)
 * @returns {Promise<void>}
 */
export async function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  
  // Ensure directory exists
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
  
  // If content is a string and not a Buffer, use utf-8 encoding
  if (!(content instanceof Buffer)) {
    return fs.writeFile(filePath, content, 'utf-8');
  }
  
  // Otherwise write the buffer directly
  return fs.writeFile(filePath, content);
} 