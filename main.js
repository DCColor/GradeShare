/**
 * GradeShare — main.js
 * Electron main process.
 * - Creates the app window
 * - Spawns the Python sidecar
 * - Routes IPC between renderer and Python
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path   = require('path');
const { spawn } = require('child_process');
const theme  = require('./config/theme');

// ── Python sidecar ────────────────────────────────────────────────────────

let pythonProcess = null;
let mainWindow    = null;
const pendingRequests = new Map(); // id → { resolve, reject }
let requestId = 0;

function startPython() {
  const scriptPath = path.join(__dirname, 'python', 'gradeshare_bridge.py');

  pythonProcess = spawn('python3', [scriptPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Receive JSON responses from Python line by line
  let buffer = '';
  pythonProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        handlePythonMessage(msg);
      } catch (e) {
        console.error('[Python] JSON parse error:', e.message, '|', line);
      }
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error('[Python stderr]', data.toString());
  });

  pythonProcess.on('close', (code) => {
    console.log('[Python] process exited with code', code);
    pythonProcess = null;
    if (mainWindow) {
      mainWindow.webContents.send('python-status', { ready: false });
    }
  });

  pythonProcess.on('error', (err) => {
    console.error('[Python] failed to start:', err);
  });
}

function sendToPython(command, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!pythonProcess) {
      return reject(new Error('Python sidecar not running'));
    }
    const id = ++requestId;
    pendingRequests.set(id, { resolve, reject });
    const msg = JSON.stringify({ id, command, payload }) + '\n';
    pythonProcess.stdin.write(msg);

    // Timeout after 15s
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Timeout waiting for Python response to: ${command}`));
      }
    }, 15000);
  });
}

function handlePythonMessage(msg) {
  // Startup ready signal
  if (msg.event === 'ready') {
    console.log('[Python] sidecar ready');
    if (mainWindow) {
      mainWindow.webContents.send('python-status', { ready: true });
    }
    return;
  }

  // Response to a pending request
  if (msg.id !== undefined) {
    const pending = pendingRequests.get(msg.id);
    if (pending) {
      pendingRequests.delete(msg.id);
      if (msg.error) {
        pending.reject(new Error(msg.error));
      } else {
        pending.resolve(msg.result);
      }
    }
    return;
  }

  // Unsolicited events from Python (e.g. Resolve disconnected)
  if (msg.event && mainWindow) {
    mainWindow.webContents.send('python-event', msg);
  }
}

// ── IPC handlers ──────────────────────────────────────────────────────────
// Renderer calls these via preload.js window.gradeshare.*

ipcMain.handle('resolve:connect', async () => {
  try {
    const result = await sendToPython('connect');
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('resolve:getProject', async () => {
  try {
    const result = await sendToPython('get_project');
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('resolve:getAlbums', async () => {
  try {
    const result = await sendToPython('get_albums');
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('resolve:getStills', async (event, { albumIndex, albumType }) => {
  try {
    const result = await sendToPython('get_stills', { albumIndex, albumType });
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('resolve:refresh', async () => {
  try {
    const result = await sendToPython('refresh');
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('resolve:createAlbum', async (event, { name }) => {
  console.log('ipcMain createAlbum received: ' + JSON.stringify({ name }));
  try {
    const result = await sendToPython('create_album', { name });
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('resolve:exportStills', async (event, { albumIndex, albumType, exportPath, format, prefix }) => {
  try {
    const result = await sendToPython('export_stills', {
      albumIndex, albumType, exportPath, format, prefix
    });
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled) return { ok: false };
  return { ok: true, path: result.filePaths[0] };
});

ipcMain.handle('dialog:saveFile', async (event, { defaultName, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters || [{ name: 'Images', extensions: ['jpg', 'png', 'tif'] }],
  });
  if (result.canceled) return { ok: false };
  return { ok: true, path: result.filePath };
});

// ── Window ────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1100,
    height:          720,
    minWidth:        900,
    minHeight:       600,
    titleBarStyle:   'hiddenInset',  // macOS native traffic lights
    backgroundColor: '#181614',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  startPython();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});
