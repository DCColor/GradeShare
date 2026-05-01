/**
 * GradeShare — state.js
 * Central application state and data model.
 * Single source of truth for all runtime data.
 * 
 * Usage (main/renderer process):
 *   const { getState, setState, resetState } = require('../config/state');
 */

// ── Initial state shape ───────────────────────────────────────────────────
// All keys and their default values defined here.
// Never add ad-hoc state elsewhere in the app.

const initialState = {

  // ── Resolve connection ──────────────────────────────────────────────────
  resolve: {
    connected:      false,
    version:        null,       // e.g. "20.3.1.6"
    productName:    null,       // "DaVinci Resolve Studio"
    pythonReady:    false,      // Python sidecar is running
  },

  // ── Current project ─────────────────────────────────────────────────────
  project: {
    name:           null,       // e.g. "TEST PROBE"
    uniqueId:       null,
    timelineName:   null,
    stillAlbums:    [],         // [{ name, stillCount, albumRef }]
    powerGradeAlbums: [],       // [{ name, stillCount, albumRef }]
  },

  // ── Gallery / album selection ────────────────────────────────────────────
  gallery: {
    selectedAlbumIndex:   null,   // index into project.stillAlbums
    selectedAlbumType:    null,   // 'still' | 'powergrade'
    stills:               [],     // [StillMetadata] from DRX parser
    selectedStillIds:     [],     // indices of selected stills
    loading:              false,
    error:                null,
  },

  // ── Layout ──────────────────────────────────────────────────────────────
  layout: {
    platformId:     'ig-portrait',  // matches theme.platforms[].id
    gridId:         '2x2',          // matches theme.grids[].id
    captionProject: '',             // free text
    captionStudio:  '',             // free text
    showFilename:   false,
    showWatermark:  true,
  },

  // ── Contact sheet ───────────────────────────────────────────────────────
  contactSheet: {
    gridId:         '3x2',         // matches theme.contactSheetGrids[].id
    studioName:     '',
    confidentiality: 'Confidential',
    showLogo:       true,
    fields: {                       // which metadata fields to show
      label:          true,
      record_tc:      true,
      source_tc:      true,
      timeline_name:  false,
      resolution:     true,
      bit_depth:      false,
      create_time:    false,
    },
  },

  // ── Export ──────────────────────────────────────────────────────────────
  export: {
    format:         'JPEG',         // 'JPEG' | 'PNG' | 'TIFF'
    quality:        95,             // 75 | 85 | 95
    resolution:     1080,           // px on longest edge
    destination:    'disk',         // 'disk' | 'clipboard' | 'portal'
    filename:       '',             // auto-generated if empty
    outputPath:     '',             // last used output folder

    colorScience: {
      sourceId:     'rec709-24',    // matches theme.colorScience.sources[].id
      outputId:     'srgb',         // matches theme.colorScience.outputs[].id
      hdrCandidate: false,          // flagged from DRX bit depth
    },
  },

  // ── UI ──────────────────────────────────────────────────────────────────
  ui: {
    activeScreen:   'connect',      // 'connect' | 'gallery' | 'layout' | 'contactsheet' | 'export'
    sidebarWidth:   192,
    notification:   null,           // { type: 'success'|'error'|'info', message, timeout }
  },

};

// ── State container ───────────────────────────────────────────────────────

let _state = deepClone(initialState);

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Get current state or a specific path within it.
 * 
 * getState()                    → full state object
 * getState('resolve')           → state.resolve
 * getState('resolve.connected') → state.resolve.connected
 */
function getState(path) {
  if (!path) return _state;
  return path.split('.').reduce((obj, key) => {
    return obj != null ? obj[key] : undefined;
  }, _state);
}

/**
 * Update state at a specific path.
 * Merges objects, replaces primitives and arrays.
 * 
 * setState('resolve.connected', true)
 * setState('gallery.stills', [...])
 * setState('export.colorScience', { sourceId: 'rec2020-pq', outputId: 'hdr-heic', hdrCandidate: true })
 */
function setState(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((obj, key) => obj[key], _state);

  if (
    typeof target[last] === 'object' &&
    target[last] !== null &&
    !Array.isArray(target[last]) &&
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  ) {
    // Deep merge for objects
    target[last] = { ...target[last], ...value };
  } else {
    // Direct replace for primitives and arrays
    target[last] = value;
  }

  // Notify listeners
  _listeners.forEach(fn => fn(path, value, _state));
}

/**
 * Reset state to initial values.
 * Optionally reset only a specific top-level key.
 * 
 * resetState()           → full reset
 * resetState('gallery')  → reset gallery only
 */
function resetState(key) {
  if (key) {
    _state[key] = deepClone(initialState[key]);
  } else {
    _state = deepClone(initialState);
  }
  _listeners.forEach(fn => fn(key || 'root', null, _state));
}

// ── Change listeners ──────────────────────────────────────────────────────

const _listeners = [];

/**
 * Subscribe to state changes.
 * Returns an unsubscribe function.
 * 
 * const unsub = onStateChange((path, value, state) => {
 *   console.log(`${path} changed to`, value);
 * });
 */
function onStateChange(fn) {
  _listeners.push(fn);
  return () => {
    const i = _listeners.indexOf(fn);
    if (i > -1) _listeners.splice(i, 1);
  };
}

// ── Derived / computed helpers ────────────────────────────────────────────

/**
 * Returns the currently selected album object or null.
 */
function getSelectedAlbum() {
  const { selectedAlbumIndex, selectedAlbumType } = _state.gallery;
  if (selectedAlbumIndex === null) return null;
  const list = selectedAlbumType === 'powergrade'
    ? _state.project.powerGradeAlbums
    : _state.project.stillAlbums;
  return list[selectedAlbumIndex] || null;
}

/**
 * Returns only the selected stills from the gallery.
 */
function getSelectedStills() {
  const { stills, selectedStillIds } = _state.gallery;
  return selectedStillIds.map(i => stills[i]).filter(Boolean);
}

/**
 * Auto-generates an export filename from current state.
 * e.g. "TESTPROBE_ForSocial_ig-portrait_2x2"
 */
function generateFilename() {
  const project = (_state.project.name || 'project')
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 20);
  const album = (getSelectedAlbum()?.name || 'album')
    .replace(/\s+/g, '');
  const platform = _state.layout.platformId;
  const grid = _state.layout.gridId;
  return `${project}_${album}_${platform}_${grid}`;
}

/**
 * Returns true if the current export config involves an HDR transform.
 */
function isHDRExport() {
  const { sourceId, outputId } = _state.export.colorScience;
  const hdrSources = ['rec2020-pq', 'rec2020-hlg'];
  const hdrOutputs = ['hdr-heic'];
  return hdrSources.includes(sourceId) || hdrOutputs.includes(outputId);
}

// ── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  getState,
  setState,
  resetState,
  onStateChange,
  getSelectedAlbum,
  getSelectedStills,
  generateFilename,
  isHDRExport,
};
