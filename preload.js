/**
 * GradeShare — preload.js
 * Secure IPC bridge between Electron main process and renderer.
 * Exposes a clean window.gradeshare API to the renderer.
 * Nothing from Node/Electron leaks into the renderer directly.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gradeshare', {

  // ── Resolve API ───────────────────────────────────────────────────────

  /** Connect to running Resolve instance */
  connect: () =>
    ipcRenderer.invoke('resolve:connect'),

  /** Get current project info */
  getProject: () =>
    ipcRenderer.invoke('resolve:getProject'),

  /** Get all still albums and PowerGrade albums */
  getAlbums: () =>
    ipcRenderer.invoke('resolve:getAlbums'),

  /** Get stills from a specific album */
  getStills: (albumIndex, albumType) =>
    ipcRenderer.invoke('resolve:getStills', { albumIndex, albumType }),

  /** Re-fetch album lists without reconnecting */
  refresh: () =>
    ipcRenderer.invoke('resolve:refresh'),

  /** Force-refresh gallery and album object references from Resolve */
  refreshAlbums: () =>
    ipcRenderer.invoke('resolve:refreshAlbums'),

  /** Create a new named still album in Resolve */
  createAlbum: (name) => {
    console.log('createAlbum called with: ' + name);
    return ipcRenderer.invoke('resolve:createAlbum', { name });
  },

  /** Export stills from an album to disk */
  exportStills: (albumIndex, albumType, exportPath, format, prefix) =>
    ipcRenderer.invoke('resolve:exportStills', {
      albumIndex, albumType, exportPath, format, prefix
    }),

  // ── Session management ────────────────────────────────────────────────
  session: {
    save:         (projectName, sessionName, state) =>
      ipcRenderer.invoke('session:save', { projectName, sessionName, state }),
    loadAutosave: (projectName) =>
      ipcRenderer.invoke('session:loadAutosave', { projectName }),
    listNamed:    (projectName) =>
      ipcRenderer.invoke('session:listNamed', { projectName }),
    loadNamed:    (filePath) =>
      ipcRenderer.invoke('session:loadNamed', { path: filePath }),
    deleteNamed:  (filePath) =>
      ipcRenderer.invoke('session:deleteNamed', { path: filePath }),
  },

  // ── Watermark library ─────────────────────────────────────────────────
  watermark: {
    saveToLibrary: (dataUrl, filename) =>
      ipcRenderer.invoke('watermark:saveToLibrary', { dataUrl, filename }),
    list:          () =>
      ipcRenderer.invoke('watermark:list'),
    delete:        (filename) =>
      ipcRenderer.invoke('watermark:delete', { filename }),
  },

  // ── Dialogs ───────────────────────────────────────────────────────────

  /** Open a folder picker dialog */
  selectFolder: () =>
    ipcRenderer.invoke('dialog:selectFolder'),

  /** Open a save file dialog */
  saveFile: (defaultName, filters) =>
    ipcRenderer.invoke('dialog:saveFile', { defaultName, filters }),

  // ── Events from main/Python ───────────────────────────────────────────

  /** Listen for Python sidecar status changes */
  onPythonStatus: (callback) =>
    ipcRenderer.on('python-status', (event, data) => callback(data)),

  /** Listen for unsolicited events from Python (e.g. Resolve disconnect) */
  onPythonEvent: (callback) =>
    ipcRenderer.on('python-event', (event, data) => callback(data)),

  /** Remove all listeners for a channel */
  removeAllListeners: (channel) =>
    ipcRenderer.removeAllListeners(channel),

});
