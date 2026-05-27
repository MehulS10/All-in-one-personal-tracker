import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use createRequire to import CommonJS modules in ESM context
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const { PDFParse } = require('pdf-parse');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false, // frameless window for premium design
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // Don't show the window until it's ready-to-show
  });

  // Enable webContents to open links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load Vite dev server in development, or index.html in production
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler - Frameless Window Controls
ipcMain.handle('win-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('win-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow?.maximize();
    return true;
  }
});

ipcMain.handle('win-close', () => {
  mainWindow?.close();
});

// IPC Handler - Link Preview Scraper
ipcMain.handle('scrape-link', async (event, url) => {
  try {
    // Validate URL
    new URL(url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const html = await response.text();

    const getMetaTag = (propertyOrName) => {
      // Find property="..." content="..."
      const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${propertyOrName}["'][^>]+content=["']([^"']+)["']`, 'i');
      const match1 = html.match(regex1);
      if (match1) return match1[1];

      // Find content="..." property="..."
      const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propertyOrName}["']`, 'i');
      const match2 = html.match(regex2);
      return match2 ? match2[1] : null;
    };

    const getTitle = () => {
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return match ? match[1] : null;
    };

    const title = getMetaTag('og:title') || getTitle() || '';
    const description = getMetaTag('og:description') || getMetaTag('description') || '';
    const image = getMetaTag('og:image') || '';
    
    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch (e) {}

    return { 
      title: title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim(), 
      description: description.replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim(), 
      image, 
      hostname 
    };
  } catch (error) {
    return { title: '', description: '', image: '', hostname: '', error: error.message };
  }
});

// Attachments Folder Configuration
const attachmentsDir = path.join(app.getPath('userData'), 'attachments');
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

// IPC Handler - Select File using Windows native explorer
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const stats = fs.statSync(filePath);
  return {
    name: path.basename(filePath),
    path: filePath,
    size: stats.size,
    type: path.extname(filePath).toLowerCase().substring(1)
  };
});

// IPC Handler - Save File to persistent local folder
ipcMain.handle('save-attachment', async (event, srcPath) => {
  try {
    if (!fs.existsSync(srcPath)) throw new Error('Source file does not exist');
    
    const fileName = path.basename(srcPath);
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    // Add timestamp to avoid naming conflict
    const uniqueFileName = `${baseName}_${Date.now()}${ext}`;
    const destPath = path.join(attachmentsDir, uniqueFileName);

    await fs.promises.copyFile(srcPath, destPath);
    const stats = fs.statSync(destPath);

    return {
      name: fileName,
      path: destPath,
      size: stats.size,
      type: ext.toLowerCase().substring(1)
    };
  } catch (error) {
    console.error('Failed to save attachment:', error);
    return { error: error.message };
  }
});

// IPC Handler - Open Attachment natively using Windows Shell
ipcMain.handle('open-attachment', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist or has been moved' };
    }
    const errorMsg = await shell.openPath(filePath);
    if (errorMsg) {
      return { success: false, error: errorMsg };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC Handler - Read Excel File data
ipcMain.handle('parse-excel', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) throw new Error('File does not exist');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    return { success: true, rawRows, data };
  } catch (error) {
    console.error('Failed to parse Excel:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler - Parse PDF Text (pdf-parse v2.x API)
ipcMain.handle('parse-pdf', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) throw new Error('File does not exist');
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    await parser.destroy();
    return { success: true, text: result.text };
  } catch (error) {
    console.error('Failed to parse PDF:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler - Show Native Save Dialog
ipcMain.handle('save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || 'Save File',
    defaultPath: options.defaultPath || '',
    filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
  });
  return result.canceled ? null : result.filePath;
});

// IPC Handler - Write Binary File (Base64 data)
ipcMain.handle('write-file-binary', async (event, filePath, base64Data) => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true };
  } catch (error) {
    console.error('Failed to write binary file:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler - Write Text File
ipcMain.handle('write-file-text', async (event, filePath, textData) => {
  try {
    fs.writeFileSync(filePath, textData, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to write text file:', error);
    return { success: false, error: error.message };
  }
});
