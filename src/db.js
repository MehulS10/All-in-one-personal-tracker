import Dexie from 'dexie';

// Initialize the IndexedDB Database
export const db = new Dexie('OmniTrackDB');

// Define database schemas with versions for clean migrations
db.version(1).stores({
  leads: '++id, name, company, status, value, createdDate',
  sales: '++id, leadId, title, stage, amount, closeDate, updatedDate',
  projects: '++id, leadId, name, status, dueDate',
  jobs: '++id, title, company, status, salary, dateApplied'
});

db.version(2).stores({
  leads: '++id, name, company, status, value, createdDate',
  projects: '++id, leadId, name, status, dueDate',
  jobs: '++id, title, company, status, salary, dateApplied',
  notesPages: '++id, title, updatedDate'
});
