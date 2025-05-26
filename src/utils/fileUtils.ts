/**
 * File Utility Functions
 * 
 * This module provides utility functions for working with files in the browser.
 */

/**
 * Reads a file and returns its contents as text
 * 
 * @param file The file to read
 * @returns A promise that resolves with the file contents as text
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file contents'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Error reading file: ${file.name}`));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Extracts text content from a PDF file
 * 
 * @param file The PDF file to extract text from
 * @returns A promise that resolves with the extracted text
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
  // This function should be implemented with PDF.js
  // For now, we'll use readFileAsText as a placeholder
  return readFileAsText(file);
};