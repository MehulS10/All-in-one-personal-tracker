import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const fs = require('fs');

function inspectFile(filePath) {
  console.log(`=== Inspecting File: ${filePath} ===`);
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist');
    return;
  }
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet Names:', workbook.SheetNames);
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    console.log(`Total raw rows: ${rawRows.length}`);
    console.log('First 10 rows:');
    rawRows.slice(0, 15).forEach((row, idx) => {
      console.log(`Row ${idx}:`, row);
    });
  });
}

inspectFile('C:\\Users\\18fas\\Downloads\\Job Tracker.xlsx');
inspectFile('C:\\Users\\18fas\\Downloads\\Job Tracker (1).xlsx');
