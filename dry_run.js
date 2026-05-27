import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const res = {
  success: true,
  rawRows: XLSX.utils.sheet_to_json(XLSX.readFile('C:\\Users\\18fas\\Downloads\\Job Tracker.xlsx').Sheets['Job Tracker'], { header: 1, defval: '' })
};

const rawRows = res.rawRows;
console.log('rawRows length:', rawRows.length);

const jobKeywords = ['company', 'job position', 'position', 'job title', 'title', 'status', 'date applied', 'jd link', 'apply site', 'follow up date', 'interview date', 'salary', 'contact person'];
let headerRowIndex = -1;

for (let i = 0; i < rawRows.length; i++) {
  const row = rawRows[i];
  if (!Array.isArray(row)) continue;
  
  // Count how many keywords match this row
  const matchCount = row.filter(cell => {
    if (cell === null || cell === undefined || cell === '') return false;
    const cellStr = cell.toString().toLowerCase().trim().replace(/_/g, ' ');
    if (cellStr === '') return false;
    return jobKeywords.some(keyword => cellStr.includes(keyword) || keyword.includes(cellStr));
  }).length;

  if (matchCount >= 2) {
    headerRowIndex = i;
    break;
  }
}

console.log('headerRowIndex found:', headerRowIndex);

let headers = [];
let dataRows = [];

if (headerRowIndex !== -1) {
  headers = rawRows[headerRowIndex].map(h => (h || '').toString().toLowerCase().trim().replace(/_/g, ' '));
  dataRows = rawRows.slice(headerRowIndex + 1);
} else {
  headers = rawRows[0].map(h => (h || '').toString().toLowerCase().trim().replace(/_/g, ' '));
  dataRows = rawRows.slice(1);
}

console.log('Headers:', headers);
console.log('DataRows count:', dataRows.length);

let importedCount = 0;
let duplicateCount = 0;
let skippedIncomplete = 0;

for (const row of dataRows) {
  if (!Array.isArray(row) || row.every(cell => cell === null || cell === undefined || cell === '')) continue; // Skip empty rows

  const getVal = (possibleHeaders) => {
    const idx = headers.findIndex(h => possibleHeaders.some(ph => h.includes(ph) || ph.includes(h)));
    return idx !== -1 && row[idx] !== undefined && row[idx] !== null ? row[idx].toString().trim() : '';
  };

  const companyVal = getVal(['company', 'company name', 'employer']);
  const titleVal = getVal(['job position', 'position', 'job title', 'title', 'role']);

  if (!titleVal || !companyVal) {
    skippedIncomplete++;
    continue;
  }

  importedCount++;
}

console.log('Result of dry run:');
console.log('imported:', importedCount);
console.log('skippedIncomplete:', skippedIncomplete);
