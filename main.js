const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

let mainWindow;

function sanitizeFilename(name) {
  const base = String(name || 'tiktok-download').trim() || 'tiktok-download';
  return base.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 180);
}

function uniqueDownloadPath(filename) {
  const downloadsDir = app.getPath('downloads');
  const safeName = sanitizeFilename(filename);
  const parsed = path.parse(safeName);
  let nextPath = path.join(downloadsDir, safeName);
  let counter = 1;

  while (fs.existsSync(nextPath)) {
    nextPath = path.join(downloadsDir, `${parsed.name} (${counter})${parsed.ext}`);
    counter += 1;
  }

  return nextPath;
}

function downloadFile(url, filename) {
  const destPath = uniqueDownloadPath(filename);

  return new Promise((resolve, reject) => {
    const requestOnce = (targetUrl, depth) => {
      if (depth > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      const client = targetUrl.startsWith('https') ? https : http;
      const req = client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://www.tiktok.com/'
        }
      }, (res) => {
        const status = res.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
          const nextUrl = new URL(res.headers.location, targetUrl).toString();
          res.resume();
          requestOnce(nextUrl, depth + 1);
          return;
        }

        if (status !== 200) {
          res.resume();
          reject(new Error(`HTTP ${status}`));
          return;
        }

        const file = fs.createWriteStream(destPath);
        res.pipe(file);

        file.on('finish', () => file.close(() => resolve({ path: destPath })));
        file.on('error', (err) => {
          fs.unlink(destPath, () => reject(err));
        });
      });

      req.on('error', reject);
    };

    requestOnce(url, 0);
  });
}

async function fetchTikwm(tiktokUrl) {
  const body = new URLSearchParams({ url: tiktokUrl, hd: '1' });
  const res = await fetch('https://tikwm.com/api/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(json.msg || 'API error');
  }

  return json.data;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#0b1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
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

ipcMain.handle('tikwm-fetch', async (_event, url) => {
  if (!url) throw new Error('Missing TikTok URL');
  return fetchTikwm(url);
});

ipcMain.handle('download-file', async (_event, payload) => {
  if (!payload || !payload.url) throw new Error('Missing file URL');
  return downloadFile(payload.url, payload.filename || 'tiktok-download');
});
