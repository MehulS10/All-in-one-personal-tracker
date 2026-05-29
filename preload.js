const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Frameless Window Controls
  minimize: () => ipcRenderer.invoke('win-minimize'),
  maximize: () => ipcRenderer.invoke('win-maximize'),
  close: () => ipcRenderer.invoke('win-close'),

  // Link Preview Scraper
  scrapeLink: (url) => ipcRenderer.invoke('scrape-link', url),

  // File Attachments Management
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveAttachment: (srcPath) => ipcRenderer.invoke('save-attachment', srcPath),
  openAttachment: (filePath) => ipcRenderer.invoke('open-attachment', filePath),

  // Spreadsheet and PDF parsers
  parseExcel: (filePath) => ipcRenderer.invoke('parse-excel', filePath),
  parsePdf: (filePath) => ipcRenderer.invoke('parse-pdf', filePath),

  // Native Save File & Export channels
  saveDialog: (options) => ipcRenderer.invoke('save-dialog', options),
  writeFileBinary: (filePath, base64Data) => ipcRenderer.invoke('write-file-binary', filePath, base64Data),
  writeFileText: (filePath, textData) => ipcRenderer.invoke('write-file-text', filePath, textData),

  // Synchronous dialog overrides
  showAlert: (message, title) => ipcRenderer.sendSync('show-alert-sync', { message, title }),
  showConfirm: (message, title) => ipcRenderer.sendSync('show-confirm-sync', { message, title }),
});
