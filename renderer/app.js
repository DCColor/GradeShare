'use strict';

// ── Inlined theme data ─────────────────────────────────────────────────────
// require() is unavailable in the renderer (contextIsolation: true).
// These arrays mirror config/theme.js exactly.

const PLATFORMS = [
  { id: 'ig-square',    label: 'IG Square',   width: 1080, height: 1080 },
  { id: 'ig-portrait',  label: 'IG Portrait', width: 1080, height: 1350 },
  { id: 'ig-landscape', label: 'IG Landscape',width: 1080, height:  566 },
  { id: 'ig-stories',   label: 'IG Stories',  width: 1080, height: 1920 },
  { id: 'tiktok',       label: 'TikTok',      width: 1080, height: 1920 },
  { id: 'fb-feed',      label: 'FB Feed',     width: 1080, height: 1350 },
  { id: 'fb-story',     label: 'FB Story',    width: 1080, height: 1920 },
  { id: 'youtube',      label: 'YouTube',     width: 1280, height:  720 },
  { id: 'linkedin',     label: 'LinkedIn',    width: 1200, height:  627 },
  { id: 'x',            label: 'X',           width: 1600, height:  900 },
];

const GRIDS = [
  { id: '1x1', label: '1×1', cols: 1, rows: 1 },
  { id: '2x2', label: '2×2', cols: 2, rows: 2 },
  { id: '3x1', label: '3×1', cols: 1, rows: 3 },
  { id: '1x3', label: '1×3', cols: 3, rows: 1 },
  { id: '2x3', label: '2×3', cols: 2, rows: 3 },
  { id: 'ba',  label: 'B/A', cols: 2, rows: 1 },
];

const CONTACT_GRIDS = [
  { id: '2x2', label: '2×2', cols: 2, rows: 2 },
  { id: '3x2', label: '3×2', cols: 3, rows: 2 },
  { id: '4x2', label: '4×2', cols: 4, rows: 2 },
  { id: '3x3', label: '3×3', cols: 3, rows: 3 },
  { id: '4x3', label: '4×3', cols: 4, rows: 3 },
  { id: '1x4', label: '1×4', cols: 1, rows: 4 },
];

const CONTACT_FIELDS = [
  { id: 'label',         label: 'Clip label'    },
  { id: 'record_tc',     label: 'Record TC'     },
  { id: 'source_tc',     label: 'Source TC'     },
  { id: 'timeline_name', label: 'Timeline name' },
  { id: 'resolution',    label: 'Resolution'    },
  { id: 'bit_depth',     label: 'Bit depth'     },
  { id: 'create_time',   label: 'Date created'  },
];

const EXPORT_FORMATS     = ['JPEG', 'PNG', 'TIFF'];
const EXPORT_QUALITIES   = ['95%', '85%', '75%'];
const EXPORT_RESOLUTIONS = [
  { label: '1080px', value: 1080 },
  { label: '2160px', value: 2160 },
  { label: '4K',     value: 3840 },
];

const COLOR_SOURCES = [
  { id: 'rec709-24',   label: 'Rec.709 2.4',  hdr: false },
  { id: 'rec709-22',   label: 'Rec.709 2.2',  hdr: false },
  { id: 'rec2020-pq',  label: 'Rec.2020 PQ',  hdr: true  },
  { id: 'rec2020-hlg', label: 'Rec.2020 HLG', hdr: true  },
  { id: 'p3-d65',      label: 'P3-D65',       hdr: false },
];

const COLOR_OUTPUTS = [
  { id: 'srgb',     label: 'sRGB (web)',    hdr: false },
  { id: 'p3',       label: 'Display P3',   hdr: false },
  { id: 'hdr-heic', label: 'HDR HEIC',     hdr: true  },
  { id: 'none',     label: 'No transform', hdr: false },
];

// ── App state ──────────────────────────────────────────────────────────────
// Renderer-local mirror of config/state.js. No subscription system needed
// here — each handler mutates state and calls the relevant render function.

const state = {
  resolve: {
    connected:   false,
    version:     null,
    productName: null,
    pythonReady: false,
  },
  project: {
    name:             null,
    stillAlbums:      [],
    powerGradeAlbums: [],
  },
  gallery: {
    selectedAlbumIndex: null,
    selectedAlbumType:  null,
    stills:             [],
    selectedStillIds:   [],
    selectedStills:     [],
    loading:            false,
    albumHealth:        {},
    zoomLevel:          3,
  },
  layout: {
    platformId:     'ig-portrait',
    gridId:         '2x2',
    captionProject: '',
    captionStudio:  '',
    showFilename:      false,
    showWatermark:     true,
    captionMode:       'none',
    watermarkDataUrl:  null,
    watermarkFilename: null,
    watermarkCorner:   'br',
    watermarkMode:     'canvas',
    watermarkSize:     15,
    watermarkOpacity:  1.0,
    cellStills:        [],
    cellOffsets:    [],
    cellScales:     [],
    cellLocked:     [],
    cellBackgrounds:       [],
    globalBackground:      true,
    globalBackgroundColor: '#000000',
    tweakScope:     'all',
    tweakActiveCell: 0,
    cellTweaks:     [],
  },
  contactSheet: {
    gridId:          '3x2',
    studioName:      '',
    confidentiality: 'Confidential',
    showLogo:        true,
    fields: {
      label:          true,
      record_tc:      true,
      source_tc:      true,
      timeline_name:  false,
      resolution:     true,
      bit_depth:      false,
      create_time:    false,
    },
  },
  export: {
    format:      'JPEG',
    quality:     95,
    resolution:  1080,
    destination: 'disk',
    outputPath:  '',
    colorScience: {
      sourceId: 'rec709-24',
      outputId: 'srgb',
    },
  },
  ui: {
    activeScreen: 'connect',
  },
  layoutTabs:     [],  // initialised in init()
  activeTabIndex: 0,
};

// ── DOM helper ─────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

// ── Tab navigation ─────────────────────────────────────────────────────────

function switchScreen(id) {
  state.ui.activeScreen = id;

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === id);
  });
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.toggle('active', el.id === `screen-${id}`);
  });

  if (id === 'social') {
    needsCanvasRefresh = false;
    updateLayoutCanvas();
  }

  if (id === 'gallery') {
    const { selectedAlbumIndex, selectedAlbumType, stills, loading } = state.gallery;
    if (selectedAlbumIndex !== null && stills.length === 0 && !loading) {
      loadStills(selectedAlbumIndex, selectedAlbumType);
    }
  }

  if (id === 'export') {
    renderExportThumbnails();
  }
}

function setupTabNav() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
  });
}

// ── Status box ─────────────────────────────────────────────────────────────

function setStatusBox(type, text) {
  const box = $('connection-status');
  box.className = 'status-box';
  if (type === 'connected') box.classList.add('connected');
  if (type === 'error')     box.classList.add('error');
  if (type === 'warning')   box.classList.add('warning');
  $('status-text').textContent = text;
}

// ── Connect screen ─────────────────────────────────────────────────────────

async function handleConnect() {
  const btn = $('btn-connect');
  btn.disabled = true;
  btn.textContent = 'Connecting…';
  setStatusBox('connecting', 'Connecting to DaVinci Resolve…');

  try {
    const res = await window.gradeshare.connect();
    if (!res.ok) throw new Error(res.error || 'Connection failed');

    state.resolve.connected   = true;
    state.resolve.version     = res.data?.version     ?? null;
    state.resolve.productName = res.data?.productName ?? 'DaVinci Resolve';
    state.project.name        = res.data?.projectName ?? res.data?.project ?? null;

    const versionStr = state.resolve.version ? ` ${state.resolve.version}` : '';
    const projectStr = state.project.name    ? ` — ${state.project.name}`  : '';
    setStatusBox('connected', `${state.resolve.productName}${versionStr}${projectStr}`);

    btn.textContent = 'Connected';
    btn.classList.add('btn-connected');
    $('btn-disconnect').hidden = false;

    await loadAlbums();
    await loadSessionsPanel();
    // Stay on connect screen — user chooses action from sessions panel
  } catch (err) {
    setStatusBox('error', err.message);
    btn.disabled = false;
    btn.textContent = 'Connect to Resolve';
    btn.classList.remove('btn-connected');
  }
}

function handleDisconnect() {
  state.resolve.connected   = false;
  state.resolve.version     = null;
  state.resolve.productName = null;
  state.project.name        = null;
  state.project.stillAlbums      = [];
  state.project.powerGradeAlbums = [];
  state.gallery.selectedAlbumIndex = null;
  state.gallery.selectedAlbumType  = null;
  state.gallery.stills             = [];
  state.gallery.selectedStillIds   = [];
  state.gallery.selectedStills     = [];

  renderSidebarList('still',      []);
  renderSidebarList('powergrade', []);

  $('still-grid').innerHTML = '';
  updateGalleryCount();

  const btn = $('btn-connect');
  btn.disabled = false;
  btn.textContent = 'Connect to Resolve';
  btn.classList.remove('btn-connected');
  $('btn-disconnect').hidden = true;

  setStatusBox('', 'Not connected to DaVinci Resolve');
  $('sessions-panel').hidden = true;
  switchScreen('connect');
}

function setupConnectScreen() {
  $('btn-connect').addEventListener('click', handleConnect);
  $('btn-disconnect').addEventListener('click', handleDisconnect);
}

// ── Albums ─────────────────────────────────────────────────────────────────

async function loadAlbums() {
  const res = await window.gradeshare.getAlbums();
  if (!res.ok) return;

  state.project.stillAlbums      = res.data?.stillAlbums      ?? [];
  state.project.powerGradeAlbums = res.data?.powerGradeAlbums ?? [];

  renderSidebarList('still',      state.project.stillAlbums);
  renderSidebarList('powergrade', state.project.powerGradeAlbums);
}

function renderSidebarList(type, albums) {
  const listId = type === 'still' ? 'still-albums-list' : 'powergrade-albums-list';
  const list   = $(listId);
  list.innerHTML = '';

  if (!albums.length) {
    const li = document.createElement('li');
    li.style.color    = 'var(--color-text-faint)';
    li.style.cursor   = 'default';
    li.style.fontSize = 'var(--font-size-xs)';
    li.textContent = 'No albums';
    list.appendChild(li);
    return;
  }

  albums.forEach((album, index) => {
    const li       = document.createElement('li');
    li.className   = 'album-item';
    li.dataset.albumIndex = String(index);
    li.dataset.albumType  = type;

    const isActive = state.gallery.selectedAlbumType === type &&
                     state.gallery.selectedAlbumIndex === index;
    if (isActive) li.classList.add('active');

    const name  = document.createElement('span');
    name.className   = 'sidebar-album-name';
    name.textContent = album.name ?? `Album ${index + 1}`;

    const count = document.createElement('span');
    count.className   = 'sidebar-album-count';
    count.textContent = album.stillCount != null ? String(album.stillCount) : '';

    li.appendChild(name);
    li.appendChild(count);

    const health = state.gallery.albumHealth[`${type}-${index}`];
    if (health && health !== 'unknown') {
      const dot     = document.createElement('span');
      dot.className = `album-health-dot health-${health}`;
      li.appendChild(dot);
    }

    list.appendChild(li);
  });

  const scrollEl = document.querySelector('.sidebar-scroll');
  if (scrollEl) scrollEl.dispatchEvent(new Event('scroll'));
}

// ── Album health ───────────────────────────────────────────────────────────

function updateAlbumHealthDot(albumType, albumIndex, health) {
  state.gallery.albumHealth[`${albumType}-${albumIndex}`] = health;

  // Prefer the currently active item; fall back to attribute match
  const item = document.querySelector('.album-item.active')
    ?? document.querySelector(`.album-item[data-album-type="${albumType}"][data-album-index="${albumIndex}"]`);

  console.log('[health] updateAlbumHealthDot', { albumType, albumIndex, health, itemFound: !!item });
  if (!item) return;

  let dot = item.querySelector('.album-health-dot');
  if (health === 'unknown') {
    if (dot) dot.remove();
    return;
  }
  if (!dot) {
    dot = document.createElement('span');
    item.appendChild(dot);
  }
  dot.className = `album-health-dot health-${health}`;
}

function showHealthNotice(health, missingCount, message) {
  const notice = $('gallery-health-notice');
  console.log('[health] showHealthNotice', { health, missingCount, message, noticeEl: !!notice });
  if (!health || health === 'green' || health === 'unknown') {
    notice.hidden = true;
    return;
  }
  notice.hidden    = false;
  notice.className = `gallery-health-notice health-${health}`;
  notice.querySelector('.health-notice-text').textContent =
    message || `${missingCount} stills unavailable — image data may be stored on another workstation`;
}

// ── Gallery ────────────────────────────────────────────────────────────────

async function loadStills(albumIndex, albumType) {
  console.log('loadStills called', { albumIndex, albumType });

  state.gallery.loading          = true;
  state.gallery.stills           = [];
  state.gallery.selectedStillIds = [];
  state.gallery.selectedStills   = [];

  // Immediately wipe the notice bar so a stale red/yellow banner from the
  // previous album never persists while the new IPC call is in flight.
  const _notice = $('gallery-health-notice');
  _notice.hidden = true;
  _notice.className = 'gallery-health-notice';
  _notice.querySelector('.health-notice-text').textContent = '';
  if (!_restoringSession) switchScreen('gallery');

  const grid = $('still-grid');
  grid.innerHTML = 'Loading stills...';
  updateGalleryCount();

  const res = await window.gradeshare.getStills(albumIndex, albumType);
  console.log('[loadStills] Raw IPC response:', JSON.stringify(res));
  console.log('[loadStills] response.ok:', res.ok);
  console.log('[loadStills] response.data:', JSON.stringify(res.data));
  console.log('[loadStills] stills count:', res.data?.stills?.length);
  if (!res.ok) console.log('[loadStills] Error:', res.error);
  state.gallery.loading = false;

  if (!res.ok) {
    grid.innerHTML = res.error ?? 'Failed to load stills';
    updateGalleryCount();
    return false;
  }

  const health  = res.data?.health       ?? 'unknown';
  const message = res.data?.message      ?? '';
  const missing = res.data?.missingCount ?? 0;
  updateAlbumHealthDot(albumType, albumIndex, health);
  showHealthNotice(health, missing, message);

  let stills = res.data?.stills ?? res.data ?? [];

  // Recovery: if the export produced no stills, force-refresh album references
  // in Python and retry once — stale handles are the most common cause.
  if (Array.isArray(stills) && stills.length === 0) {
    console.log('[loadStills] Empty stills on first attempt — retrying after refreshAlbums');
    const refreshRes = await window.gradeshare.refreshAlbums();
    if (refreshRes.ok) {
      state.project.stillAlbums      = refreshRes.data?.stillAlbums      ?? [];
      state.project.powerGradeAlbums = refreshRes.data?.powerGradeAlbums ?? [];
      renderSidebarList('still',      state.project.stillAlbums);
      renderSidebarList('powergrade', state.project.powerGradeAlbums);
    }
    const res2 = await window.gradeshare.getStills(albumIndex, albumType);
    console.log('[loadStills] Retry response:', JSON.stringify(res2));
    if (res2.ok) {
      stills = res2.data?.stills ?? res2.data ?? [];
      console.log(`[loadStills] Retry produced ${stills.length} stills`);
    }
  } else if (Array.isArray(stills) && stills.length > 0) {
    console.log(`Rendering ${stills.length} stills`);
    console.log('First still object:', JSON.stringify(stills[0]));
  }

  state.gallery.stills           = stills;
  state.gallery.selectedStillIds = [];
  renderStillGrid(state.gallery.stills);
  updateGalleryCount();
  return true;
}

function renderStillGrid(stills) {
  const grid = $('still-grid');
  grid.innerHTML = '';

  stills.forEach((still, index) => {
    const card      = document.createElement('div');
    card.className  = 'still-card';
    card.dataset.index = String(index);

    if (state.gallery.selectedStillIds.includes(index)) {
      card.classList.add('selected');
    }

    const imagePath = still.path ?? still.imagePath ?? still.filePath ?? null;
    if (imagePath) {
      const img       = document.createElement('img');
      img.className   = 'still-card-image';
      img.src         = imagePath;
      img.alt         = still.filename ?? '';
      card.appendChild(img);
    } else {
      const ph      = document.createElement('div');
      ph.className  = 'still-card-placeholder';
      card.appendChild(ph);
    }

    const meta      = document.createElement('div');
    meta.className  = 'still-card-meta';
    const label     = still.filename ?? still.label ?? `Still ${index + 1}`;
    const tc        = still.record_tc ?? still.recordTc ?? '';
    meta.textContent = tc ? `${label} — ${tc}` : label;
    card.appendChild(meta);

    const check     = document.createElement('div');
    check.className = 'still-card-check';
    card.appendChild(check);

    card.addEventListener('click', () => { handleStillClick(index); triggerAutoSave(); });
    grid.appendChild(card);
  });

  applyGalleryZoom();
}

function syncSelectedStills() {
  state.gallery.selectedStills = state.gallery.selectedStillIds
    .map(i => state.gallery.stills[i])
    .filter(Boolean);
}

function handleStillClick(index) {
  const ids = state.gallery.selectedStillIds;
  const pos = ids.indexOf(index);
  if (pos === -1) {
    ids.push(index);
  } else {
    ids.splice(pos, 1);
  }

  const card = $('still-grid').querySelector(`[data-index="${index}"]`);
  if (card) card.classList.toggle('selected', ids.includes(index));
  syncSelectedStills();
  updateGalleryCount();
  updateSocialFromGallery();
}

function handleSelectAll() {
  state.gallery.selectedStillIds = state.gallery.stills.map((_, i) => i);
  $('still-grid').querySelectorAll('.still-card').forEach(c => c.classList.add('selected'));
  syncSelectedStills();
  updateGalleryCount();
  updateSocialFromGallery();
  triggerAutoSave();
}

function handleClearSelection() {
  state.gallery.selectedStillIds = [];
  $('still-grid').querySelectorAll('.still-card').forEach(c => c.classList.remove('selected'));
  syncSelectedStills();
  updateGalleryCount();
  updateSocialFromGallery();
  triggerAutoSave();
}

function updateGalleryCount() {
  const total    = state.gallery.stills.length;
  const selected = state.gallery.selectedStillIds.length;
  const el       = $('gallery-count');
  el.textContent = selected > 0
    ? `${selected} of ${total} selected`
    : `${total} still${total !== 1 ? 's' : ''}`;

  const goBtn = $('btn-go-social');
  if (goBtn) {
    goBtn.style.display = selected === 0 ? 'none' : '';
    goBtn.textContent   = `${selected} ready for Social →`;
  }
}

function setupGalleryToolbar() {
  $('btn-select-all').addEventListener('click', handleSelectAll);
  $('btn-clear-selection').addEventListener('click', handleClearSelection);
  $('btn-go-social').addEventListener('click', () => switchScreen('social'));

  const zoomSlider = $('gallery-zoom-slider');
  if (zoomSlider) {
    zoomSlider.value = String(state.gallery.zoomLevel);
    zoomSlider.addEventListener('input', () => {
      state.gallery.zoomLevel = parseFloat(zoomSlider.value);
      applyGalleryZoom();
      triggerAutoSave();
    });
  }
}

// ── Generic picker ─────────────────────────────────────────────────────────
// Renders a row of toggle-button pills inside a container.
// items: array of { id, label, hdr? } or plain strings.
// activeId: the id that starts active (compared as strings).

function renderPicker(containerId, items, activeId, onSelect) {
  const container = $(containerId);
  container.innerHTML = '';

  items.forEach(item => {
    const itemId    = String(item.id ?? item.value ?? item);
    const itemLabel = item.label ?? item;

    const btn       = document.createElement('button');
    btn.className   = 'picker-btn';
    btn.dataset.id  = itemId;
    if (itemId === String(activeId)) btn.classList.add('active');

    btn.textContent = itemLabel;

    if (item.hdr) {
      const badge       = document.createElement('span');
      badge.className   = 'badge-hdr';
      badge.textContent = 'HDR';
      btn.appendChild(badge);
    }

    btn.addEventListener('click', () => {
      container.querySelectorAll('.picker-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(itemId, item);
    });

    container.appendChild(btn);
  });
}

// ── Toggle utility ─────────────────────────────────────────────────────────

function setupToggle(id, onChange) {
  const btn = $(id);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const on = btn.dataset.state !== 'on';
    btn.dataset.state = on ? 'on' : 'off';
    btn.setAttribute('aria-checked', String(on));
    onChange(on);
  });
}

// ── Layout screen ──────────────────────────────────────────────────────────

let _dragState       = null;  // active pan drag
let _activeCellIndex = 0;    // last interacted cell (for per-cell background)
let _zoomTimers   = {};    // per-cell timeout ids for zoom badge fade
let _autoSaveTimer   = null;
let _saveStatusTimer = null;
let watermarkLibrary    = []; // cached list from watermark:list
let needsCanvasRefresh  = false;
let _restoringSession   = false;

function resetLayoutCellState(cellCount) {
  const sel = state.gallery.selectedStills;
  const bg  = state.layout.globalBackgroundColor || '#000000';
  state.layout.cellStills      = Array.from({ length: cellCount }, (_, i) => sel[i] ?? null);
  state.layout.cellOffsets     = Array.from({ length: cellCount }, () => ({ x: 0, y: 0 }));
  state.layout.cellScales      = Array.from({ length: cellCount }, () => 1.0);
  state.layout.cellLocked      = Array.from({ length: cellCount }, () => false);
  state.layout.cellBackgrounds = Array.from({ length: cellCount }, () => bg);
  state.layout.cellTweaks      = Array.from({ length: cellCount }, () => ({ lift: 0, gamma: 0, gain: 0, saturation: 0 }));
}

function updateSocialFromGallery() {
  const sel = state.gallery.selectedStills;

  // Update the live layout state (active tab)
  const grid       = GRIDS.find(g => g.id === state.layout.gridId);
  const cellCount  = grid ? grid.cols * grid.rows : Math.max(state.layout.cellStills.length, 1);
  const prevLocked = state.layout.cellLocked;

  state.layout.cellStills      = Array.from({ length: cellCount }, (_, i) => sel[i] ?? null);
  state.layout.cellOffsets     = Array.from({ length: cellCount }, () => ({ x: 0, y: 0 }));
  state.layout.cellScales      = Array.from({ length: cellCount }, () => 1.0);
  state.layout.cellLocked      = Array.from({ length: cellCount }, (_, i) => prevLocked[i] ?? false);
  state.layout.cellBackgrounds = Array.from({ length: cellCount }, (_, i) => state.layout.cellBackgrounds[i] ?? state.layout.globalBackgroundColor ?? '#000000');
  state.layout.cellTweaks      = Array.from({ length: cellCount }, (_, i) => state.layout.cellTweaks[i] ?? { lift: 0, gamma: 0, gain: 0, saturation: 0 });

  // Propagate same stills to all inactive tabs (pan/zoom/lock stays per-tab)
  state.layoutTabs.forEach((tab, i) => {
    if (i === state.activeTabIndex) return;
    const tabGrid  = GRIDS.find(g => g.id === tab.gridId);
    const tabCells = tabGrid ? tabGrid.cols * tabGrid.rows : Math.max(tab.cellStills.length, 1);
    tab.cellStills      = Array.from({ length: tabCells }, (_, j) => sel[j] ?? null);
    tab.cellOffsets     = Array.from({ length: tabCells }, () => ({ x: 0, y: 0 }));
    tab.cellScales      = Array.from({ length: tabCells }, () => 1.0);
    tab.cellLocked      = Array.from({ length: tabCells }, (_, j) => tab.cellLocked[j] ?? false);
    tab.cellBackgrounds = Array.from({ length: tabCells }, (_, j) => tab.cellBackgrounds[j] ?? tab.globalBackgroundColor ?? '#000000');
    tab.cellTweaks      = Array.from({ length: tabCells }, (_, j) => tab.cellTweaks[j] ?? { lift: 0, gamma: 0, gain: 0, saturation: 0 });
  });

  if (state.ui.activeScreen === 'social') {
    updateLayoutCanvas();
  } else {
    needsCanvasRefresh = true;
  }
}

// ── Tab management ─────────────────────────────────────────────────────────

function tabLabel(platformId, gridId) {
  const p = PLATFORMS.find(p => p.id === platformId);
  const g = GRIDS.find(g => g.id === gridId);
  return `${p?.label ?? platformId} ${g?.label ?? gridId}`;
}

function makeNewTab(platformId = 'ig-portrait', gridId = '1x1') {
  return {
    id:              Date.now(),
    label:           tabLabel(platformId, gridId),
    platformId,
    gridId,
    captionMode:     'none',
    captionProject:  '',
    captionStudio:   '',
    showFilename:    false,
    showWatermark:   true,
    watermarkDataUrl:  null,
    watermarkFilename: null,
    watermarkCorner:   'br',
    watermarkMode:     'canvas',
    watermarkSize:     15,
    watermarkOpacity:  1.0,
    cellStills:  [],
    cellOffsets: [],
    cellScales:  [],
    cellLocked:  [],
    cellBackgrounds:       [],
    globalBackground:      true,
    globalBackgroundColor: '#000000',
    tweakScope:     'all',
    tweakActiveCell: 0,
    cellTweaks:     [],
  };
}

function saveCurrentTabState() {
  const tab = state.layoutTabs[state.activeTabIndex];
  if (!tab) return;
  tab.platformId      = state.layout.platformId;
  tab.gridId          = state.layout.gridId;
  tab.captionMode     = state.layout.captionMode;
  tab.captionProject  = state.layout.captionProject;
  tab.captionStudio   = state.layout.captionStudio;
  tab.showFilename    = state.layout.showFilename;
  tab.showWatermark   = state.layout.showWatermark;
  tab.watermarkDataUrl  = state.layout.watermarkDataUrl;
  tab.watermarkFilename = state.layout.watermarkFilename;
  tab.watermarkCorner   = state.layout.watermarkCorner;
  tab.watermarkMode     = state.layout.watermarkMode;
  tab.watermarkSize     = state.layout.watermarkSize;
  tab.watermarkOpacity  = state.layout.watermarkOpacity;
  tab.cellStills       = state.layout.cellStills.slice();
  tab.cellOffsets      = state.layout.cellOffsets.map(o => ({ ...o }));
  tab.cellScales       = state.layout.cellScales.slice();
  tab.cellLocked       = state.layout.cellLocked.slice();
  tab.cellBackgrounds       = state.layout.cellBackgrounds.slice();
  tab.globalBackground      = state.layout.globalBackground;
  tab.globalBackgroundColor = state.layout.globalBackgroundColor;
  tab.tweakScope      = state.layout.tweakScope;
  tab.tweakActiveCell = state.layout.tweakActiveCell;
  tab.cellTweaks      = state.layout.cellTweaks.map(t => ({ ...t }));
  tab.label           = tabLabel(state.layout.platformId, state.layout.gridId);
}

function loadTabState(idx) {
  const tab = state.layoutTabs[idx];
  if (!tab) return;
  state.layout.platformId      = tab.platformId;
  state.layout.gridId          = tab.gridId;
  state.layout.captionMode     = tab.captionMode;
  state.layout.captionProject  = tab.captionProject;
  state.layout.captionStudio   = tab.captionStudio;
  state.layout.showFilename    = tab.showFilename;
  state.layout.showWatermark   = tab.showWatermark;
  state.layout.watermarkDataUrl  = tab.watermarkDataUrl;
  state.layout.watermarkFilename = tab.watermarkFilename;
  state.layout.watermarkCorner   = tab.watermarkCorner;
  state.layout.watermarkMode     = tab.watermarkMode;
  state.layout.watermarkSize     = tab.watermarkSize;
  state.layout.watermarkOpacity  = tab.watermarkOpacity;
  state.layout.cellStills       = tab.cellStills.slice();
  state.layout.cellOffsets      = tab.cellOffsets.map(o => ({ ...o }));
  state.layout.cellScales       = tab.cellScales.slice();
  state.layout.cellLocked       = tab.cellLocked.slice();
  state.layout.cellBackgrounds       = (tab.cellBackgrounds ?? []).slice();
  state.layout.globalBackground      = tab.globalBackground      ?? true;
  state.layout.globalBackgroundColor = tab.globalBackgroundColor ?? '#000000';
  state.layout.tweakScope      = tab.tweakScope      ?? 'all';
  state.layout.tweakActiveCell = tab.tweakActiveCell ?? 0;
  state.layout.cellTweaks      = (tab.cellTweaks ?? []).map(t => ({ ...t }));
}

function renderTabBar() {
  const bar = $('layout-tab-bar');
  if (!bar) return;
  bar.innerHTML = '';

  state.layoutTabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = 'layout-tab-btn' + (i === state.activeTabIndex ? ' active' : '');

    const labelSpan = document.createElement('span');
    labelSpan.textContent = tab.label;
    btn.appendChild(labelSpan);

    if (i > 0) {
      const closeEl = document.createElement('span');
      closeEl.className   = 'layout-tab-close';
      closeEl.textContent = '×';
      closeEl.addEventListener('click', e => { e.stopPropagation(); closeTab(i); });
      btn.appendChild(closeEl);
    }

    btn.addEventListener('click', () => switchToTab(i));
    bar.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.className   = 'layout-tab-add';
  addBtn.textContent = '+';
  addBtn.title       = 'New tab';
  addBtn.addEventListener('click', addTab);
  bar.appendChild(addBtn);
}

function switchToTab(idx) {
  if (idx === state.activeTabIndex) return;
  saveCurrentTabState();
  state.activeTabIndex = idx;
  loadTabState(idx);
  renderTabBar();
  syncRestoredControls(state.layout);
  updateLayoutCanvas();
  triggerAutoSave();
}

function addTab() {
  saveCurrentTabState();
  const tab = makeNewTab('ig-portrait', '1x1');
  // New tab starts with the same selected stills (1 cell = first still)
  const sel = state.gallery.selectedStills;
  tab.cellStills  = [sel[0] ?? null];
  tab.cellOffsets = [{ x: 0, y: 0 }];
  tab.cellScales  = [1.0];
  tab.cellLocked  = [false];
  state.layoutTabs.push(tab);
  state.activeTabIndex = state.layoutTabs.length - 1;
  loadTabState(state.activeTabIndex);
  renderTabBar();
  syncRestoredControls(state.layout);
  updateLayoutCanvas();
  triggerAutoSave();
}

function closeTab(idx) {
  if (idx === 0 || idx >= state.layoutTabs.length) return;
  const wasActive = idx === state.activeTabIndex;
  state.layoutTabs.splice(idx, 1);
  if (wasActive || state.activeTabIndex >= state.layoutTabs.length) {
    state.activeTabIndex = Math.max(0, Math.min(state.activeTabIndex, state.layoutTabs.length - 1));
    loadTabState(state.activeTabIndex);
    syncRestoredControls(state.layout);
    updateLayoutCanvas();
  } else if (state.activeTabIndex > idx) {
    state.activeTabIndex--;
  }
  renderTabBar();
  triggerAutoSave();
}

// ── Gallery zoom ────────────────────────────────────────────────────────────

function applyGalleryZoom() {
  const grid = $('still-grid');
  if (grid) {
    const cols = Math.round(6 - state.gallery.zoomLevel);
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  }
}

function clampOffset(val, imgSize, cellSize) {
  return imgSize >= cellSize
    ? Math.max(cellSize - imgSize, Math.min(0, val))
    : Math.max(0, Math.min(cellSize - imgSize, val));
}

function updateCellBgSwatch() {
  const color = state.layout.globalBackground
    ? (state.layout.globalBackgroundColor || '#000000')
    : (state.layout.cellBackgrounds[_activeCellIndex] || '#000000');
  const swatch = $('btn-cell-bg-swatch');
  const input  = $('input-cell-bg-color');
  if (swatch) swatch.style.backgroundColor = color;
  if (input)  input.value = color;
}

function assignStillToCell(cellIndex) {
  const used = new Set(state.layout.cellStills.filter(Boolean));
  const next = state.gallery.selectedStills.find(s => !used.has(s));
  if (!next) return;
  state.layout.cellStills[cellIndex] = next;
  updateLayoutCanvas();
}

function buildLayoutCell(i, cellW, cellH, canvasW) {
  const cell   = document.createElement('div');
  cell.className = 'layout-cell';
  cell.dataset.cellIndex = String(i);

  // Apply cell background color
  const cellBg = state.layout.globalBackground
    ? (state.layout.globalBackgroundColor || '#000000')
    : (state.layout.cellBackgrounds[i] || '#000000');
  cell.style.backgroundColor = cellBg;

  const still  = state.layout.cellStills[i];
  const locked = state.layout.cellLocked[i];

  if (still) {
    const rawPath = still.imagePath ?? still.image_path ?? still.path ?? null;
    if (rawPath) {
      const img = document.createElement('img');
      img.className = 'layout-cell-img';
      img.src = rawPath.startsWith('file://') || rawPath.startsWith('http')
        ? rawPath
        : `file://${rawPath}`;
      img.alt = '';
      img.draggable = false;

      img.style.left = '0px';
      img.style.top  = '0px';

      img.onload = () => {
        const natW  = img.naturalWidth;
        const natH  = img.naturalHeight;
        const cover = Math.max(cellW / natW, cellH / natH);
        const scale = cover * 1.4 * (state.layout.cellScales[i] ?? 1.0);
        const imgW  = Math.round(natW * scale);
        const imgH  = Math.round(natH * scale);

        img.style.width  = `${imgW}px`;
        img.style.height = `${imgH}px`;

        const saved = state.layout.cellOffsets[i];
        let x, y;
        if (saved.x === 0 && saved.y === 0) {
          // Center: -Math.round((imgW - cellW) / 2) works for both large and small images
          x = -Math.round((imgW - cellW) / 2);
          y = -Math.round((imgH - cellH) / 2);
        } else {
          x = clampOffset(saved.x, imgW, cellW);
          y = clampOffset(saved.y, imgH, cellH);
        }
        state.layout.cellOffsets[i] = { x, y };
        img.style.left = `${x}px`;
        img.style.top  = `${y}px`;

        // Apply tweaks filter (contrast / lift / saturation)
        const tweaks = state.layout.cellTweaks[i] ?? { lift: 0, gamma: 0, gain: 0, saturation: 0 };
        img.style.filter = buildTweaksFilter(tweaks);
      };

      cell.appendChild(img);

      // Zoom badge
      const zoomBadge = document.createElement('span');
      zoomBadge.className = 'layout-cell-zoom';
      cell.appendChild(zoomBadge);

      // Scroll-to-zoom
      cell.addEventListener('wheel', e => {
        e.preventDefault();
        const natW  = img.naturalWidth;
        const natH  = img.naturalHeight;
        if (!natW || !natH) return;
        const cover    = Math.max(cellW / natW, cellH / natH);
        const delta    = -e.deltaY * 0.001;
        const newScale = Math.max(0.5, Math.min(3.0, (state.layout.cellScales[i] ?? 1.0) + delta));
        state.layout.cellScales[i] = newScale;
        const imgW = Math.round(natW * cover * 1.4 * newScale);
        const imgH = Math.round(natH * cover * 1.4 * newScale);
        img.style.width  = `${imgW}px`;
        img.style.height = `${imgH}px`;
        const cur = state.layout.cellOffsets[i];
        const x   = clampOffset(cur.x, imgW, cellW);
        const y   = clampOffset(cur.y, imgH, cellH);
        state.layout.cellOffsets[i] = { x, y };
        img.style.left = `${x}px`;
        img.style.top  = `${y}px`;
        zoomBadge.textContent = `${newScale.toFixed(1)}×`;
        zoomBadge.classList.add('visible');
        if (_zoomTimers[i]) clearTimeout(_zoomTimers[i]);
        _zoomTimers[i] = setTimeout(() => zoomBadge.classList.remove('visible'), 1500);
        triggerAutoSave();
      }, { passive: false });

      // Per-cell watermark
      if (state.layout.showWatermark && state.layout.watermarkDataUrl &&
          state.layout.watermarkMode === 'each') {
        cell.appendChild(buildCellWatermark(canvasW));
      }

      cell.style.cursor = locked ? 'default' : 'grab';

      if (!locked) {
        cell.addEventListener('mousedown', e => {
          if (e.button !== 0) return;
          e.preventDefault();
          _activeCellIndex = i;
          state.layout.tweakActiveCell = i;
          updateCellBgSwatch();
          syncTweakSliders();
          _dragState = {
            img, cellEl: cell, cellIndex: i, cellW, cellH,
            startX: e.clientX, startY: e.clientY,
            startOX: state.layout.cellOffsets[i].x,
            startOY: state.layout.cellOffsets[i].y,
          };
          cell.style.cursor = 'grabbing';
        });
      }
    }

    // Per-cell filename label (overlay mode only)
    if (state.layout.captionMode === 'overlay' && state.layout.showFilename) {
      const filenameEl = document.createElement('div');
      filenameEl.className = 'layout-cell-filename';
      const label = still.label ?? still.displayLabel ?? `Still ${i + 1}`;
      const tc    = still.recordTc ?? still.record_tc ?? '';
      filenameEl.textContent = tc ? `${label}  ${tc}` : label;
      cell.appendChild(filenameEl);
    }

    const stillIdx  = state.gallery.selectedStills.indexOf(still);
    const numLabel  = document.createElement('span');
    numLabel.className   = 'layout-cell-num';
    numLabel.textContent = String(stillIdx >= 0 ? stillIdx + 1 : i + 1);
    cell.appendChild(numLabel);
  } else {
    cell.classList.add('layout-cell-empty');
    cell.addEventListener('click', () => {
      _activeCellIndex = i;
      state.layout.tweakActiveCell = i;
      updateCellBgSwatch();
      syncTweakSliders();
      assignStillToCell(i);
    });
  }

  const lockBtn = document.createElement('button');
  lockBtn.className   = `layout-cell-lock${locked ? ' locked' : ''}`;
  lockBtn.title       = locked ? 'Unlock position' : 'Lock position';
  lockBtn.innerHTML   = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;
  lockBtn.addEventListener('click', e => {
    e.stopPropagation();
    state.layout.cellLocked[i] = !state.layout.cellLocked[i];
    updateLayoutCanvas();
    triggerAutoSave();
  });
  cell.appendChild(lockBtn);

  return cell;
}

function initDocumentDragHandlers() {
  document.addEventListener('mousemove', e => {
    if (!_dragState) return;
    const { img, cellW, cellH, cellIndex, startX, startY, startOX, startOY } = _dragState;
    const imgW = img.offsetWidth;
    const imgH = img.offsetHeight;
    const newX = clampOffset(startOX + e.clientX - startX, imgW, cellW);
    const newY = clampOffset(startOY + e.clientY - startY, imgH, cellH);
    state.layout.cellOffsets[cellIndex] = { x: newX, y: newY };
    img.style.left = `${newX}px`;
    img.style.top  = `${newY}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!_dragState) return;
    if (!state.layout.cellLocked[_dragState.cellIndex]) {
      _dragState.cellEl.style.cursor = 'grab';
    }
    _dragState = null;
    triggerAutoSave();
  });
}

// ── Caption builders ───────────────────────────────────────────────────────

function buildCaptionBar(w, barH) {
  const bar = document.createElement('div');
  bar.className = 'layout-caption-bar';
  bar.style.width  = `${w}px`;
  bar.style.height = `${barH}px`;

  const left = document.createElement('div');
  left.className = 'caption-bar-left';

  const project = state.layout.captionProject.trim();
  const studio  = state.layout.captionStudio.trim();

  if (project) {
    const pEl = document.createElement('div');
    pEl.className   = 'caption-text-project';
    pEl.textContent = project;
    left.appendChild(pEl);
  }
  if (studio) {
    const sEl = document.createElement('div');
    sEl.className   = 'caption-text-studio';
    sEl.textContent = studio;
    left.appendChild(sEl);
  }
  bar.appendChild(left);

  if (state.layout.showFilename) {
    const firstStill = state.layout.cellStills[0];
    if (firstStill) {
      const right = document.createElement('div');
      right.className = 'caption-bar-right';
      const label = firstStill.label ?? firstStill.displayLabel ?? '';
      const tc    = firstStill.recordTc ?? firstStill.record_tc ?? '';
      right.textContent = tc ? `${label} — ${tc}` : label;
      bar.appendChild(right);
    }
  }

  return bar;
}

function buildCaptionOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'layout-caption-overlay';

  const project = state.layout.captionProject.trim();
  const studio  = state.layout.captionStudio.trim();

  if (!project && !studio) {
    overlay.style.display = 'none';
    return overlay;
  }
  if (project) {
    const pEl = document.createElement('div');
    pEl.className   = 'caption-text-project';
    pEl.textContent = project;
    overlay.appendChild(pEl);
  }
  if (studio) {
    const sEl = document.createElement('div');
    sEl.className   = 'caption-text-studio';
    sEl.textContent = studio;
    overlay.appendChild(sEl);
  }
  return overlay;
}

function renderCaption() {
  const canvasEl = $('layout-canvas');
  if (!canvasEl) return;
  const mode    = state.layout.captionMode;
  const project = state.layout.captionProject.trim();
  const studio  = state.layout.captionStudio.trim();

  if (mode === 'bar') {
    const bar = canvasEl.querySelector('.layout-caption-bar');
    if (!bar) return;
    const left = bar.querySelector('.caption-bar-left');
    if (left) {
      left.innerHTML = '';
      if (project) {
        const pEl = document.createElement('div');
        pEl.className   = 'caption-text-project';
        pEl.textContent = project;
        left.appendChild(pEl);
      }
      if (studio) {
        const sEl = document.createElement('div');
        sEl.className   = 'caption-text-studio';
        sEl.textContent = studio;
        left.appendChild(sEl);
      }
    }
    let right = bar.querySelector('.caption-bar-right');
    if (state.layout.showFilename) {
      const firstStill = state.layout.cellStills[0];
      if (firstStill) {
        if (!right) {
          right = document.createElement('div');
          right.className = 'caption-bar-right';
          bar.appendChild(right);
        }
        const label = firstStill.label ?? firstStill.displayLabel ?? '';
        const tc    = firstStill.recordTc ?? firstStill.record_tc ?? '';
        right.textContent = tc ? `${label} — ${tc}` : label;
      }
    } else if (right) {
      right.remove();
    }
  } else if (mode === 'overlay') {
    const overlay = canvasEl.querySelector('.layout-caption-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    if (!project && !studio) {
      overlay.style.display = 'none';
      return;
    }
    overlay.style.display = '';
    if (project) {
      const pEl = document.createElement('div');
      pEl.className   = 'caption-text-project';
      pEl.textContent = project;
      overlay.appendChild(pEl);
    }
    if (studio) {
      const sEl = document.createElement('div');
      sEl.className   = 'caption-text-studio';
      sEl.textContent = studio;
      overlay.appendChild(sEl);
    }
  }
}

// ── Watermark builders ─────────────────────────────────────────────────────

function buildCanvasWatermark(w, h) {
  const url = state.layout.watermarkDataUrl;
  console.log('[Watermark] Canvas img src:', url);
  const wm = document.createElement('img');
  wm.className    = 'layout-watermark';
  wm.src          = url;
  wm.alt          = '';
  const sz        = Math.round(w * state.layout.watermarkSize / 100);
  wm.style.width  = `${sz}px`;
  wm.style.height = 'auto';
  wm.style.opacity = String(state.layout.watermarkOpacity);
  _applyWatermarkCorner(wm, state.layout.watermarkCorner, 10);
  return wm;
}

function buildCellWatermark(canvasW) {
  const url = state.layout.watermarkDataUrl;
  console.log('[Watermark] Cell img src:', url);
  const wm = document.createElement('img');
  wm.className    = 'layout-watermark';
  wm.src          = url;
  wm.alt          = '';
  const sz        = Math.round(canvasW * state.layout.watermarkSize / 100);
  wm.style.width  = `${sz}px`;
  wm.style.height = 'auto';
  wm.style.opacity = String(state.layout.watermarkOpacity);
  _applyWatermarkCorner(wm, state.layout.watermarkCorner, 5);
  return wm;
}

function _applyWatermarkCorner(el, corner, margin) {
  el.style.top    = corner.startsWith('t') ? `${margin}px` : 'auto';
  el.style.bottom = corner.startsWith('b') ? `${margin}px` : 'auto';
  el.style.left   = corner.endsWith('l')   ? `${margin}px` : 'auto';
  el.style.right  = corner.endsWith('r')   ? `${margin}px` : 'auto';
}

// ── Watermark controls setup ───────────────────────────────────────────────

function setupWatermarkControls() {
  // ── Library add button ────────────────────────────────────────────────
  $('btn-add-logo').addEventListener('click', () => {
    $('input-watermark-file').click();
  });

  $('input-watermark-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    console.log('[Watermark] File selected:', file.name, file.type, file.size, 'bytes');
    const reader = new FileReader();
    reader.onerror = err => console.error('[Watermark] FileReader error:', err);
    reader.onload  = async ev => {
      const dataUrl = ev.target.result;
      console.log('[Watermark] dataURL loaded, length:', dataUrl.length);
      const res = await window.gradeshare.watermark.saveToLibrary(dataUrl, file.name);
      if (!res.ok) { console.error('[Watermark] saveToLibrary failed:', res.error); return; }
      console.log('[Watermark] Saved to library:', res.filename);
      await loadWatermarkLibrary();
      const item = watermarkLibrary.find(w => w.filename === res.filename);
      if (item) selectWatermarkFromLibrary(item);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  });

  // ── Corner picker ─────────────────────────────────────────────────────
  const cornerEl = $('watermark-corner-picker');
  [
    { id: 'tl', label: '↖' },
    { id: 'tr', label: '↗' },
    { id: 'bl', label: '↙' },
    { id: 'br', label: '↘' },
  ].forEach(c => {
    const btn = document.createElement('button');
    btn.className      = `corner-btn${state.layout.watermarkCorner === c.id ? ' active' : ''}`;
    btn.dataset.corner = c.id;
    btn.textContent    = c.label;
    btn.addEventListener('click', () => {
      cornerEl.querySelectorAll('.corner-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.layout.watermarkCorner = c.id;
      updateLayoutCanvas();
      triggerAutoSave();
    });
    cornerEl.appendChild(btn);
  });

  renderPicker('watermark-mode-picker', [
    { id: 'canvas', label: 'Canvas'    },
    { id: 'each',   label: 'Each cell' },
  ], state.layout.watermarkMode, id => {
    state.layout.watermarkMode = id;
    updateLayoutCanvas();
    triggerAutoSave();
  });

  const sizeSlider = $('watermark-size-slider');
  const sizeValue  = $('watermark-size-value');
  sizeSlider.addEventListener('input', () => {
    state.layout.watermarkSize = parseFloat(sizeSlider.value);
    sizeValue.textContent = `${state.layout.watermarkSize}%`;
    updateLayoutCanvas();
    triggerAutoSave();
  });
}

function setupResizeListener() {
  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (state.ui.activeScreen === 'social') {
        state.layout.cellOffsets = state.layout.cellOffsets.map(() => ({ x: 0, y: 0 }));
        state.layout.cellScales  = state.layout.cellScales.map(() => 1.0);
        updateLayoutCanvas();
      }
    }, 150);
  });
}

function updateLayoutCanvas() {
  const platform = PLATFORMS.find(p => p.id === state.layout.platformId);
  const grid     = GRIDS.find(g => g.id === state.layout.gridId);
  if (!platform || !grid) return;

  const canvasEl = $('layout-canvas');
  const labelEl  = $('layout-label');
  if (!canvasEl) return;

  const { cols, rows } = grid;
  const cellCount = cols * rows;

  // Fit platform ratio within available space
  const wrapEl = canvasEl.closest('.layout-preview-wrap');
  const maxW   = (wrapEl?.clientWidth  ?? 600) - 40;
  const maxH   = Math.min((wrapEl?.clientHeight ?? 500) - 40 - 26, window.innerHeight * 0.8);
  if (maxW <= 0 || maxH <= 0) return;

  const ratio = platform.width / platform.height;
  const w = maxW / ratio <= maxH ? Math.floor(maxW) : Math.floor(maxH * ratio);
  const h = maxW / ratio <= maxH ? Math.floor(maxW / ratio) : Math.floor(maxH);

  const GAP  = 4;
  const barH = state.layout.captionMode === 'bar' ? 60 : 0;
  const gridH = h - barH;
  const cellW = Math.floor((w - GAP * (cols - 1)) / cols);
  const cellH = Math.floor((gridH - GAP * (rows - 1)) / rows);

  // Canvas wrapper
  canvasEl.style.width         = `${w}px`;
  canvasEl.style.height        = `${h}px`;
  canvasEl.style.display       = 'flex';
  canvasEl.style.flexDirection = 'column';
  canvasEl.innerHTML           = '';

  // Inner CSS grid
  const gridInnerEl = document.createElement('div');
  gridInnerEl.className                 = 'layout-grid';
  gridInnerEl.style.width               = `${w}px`;
  gridInnerEl.style.height              = `${gridH}px`;
  gridInnerEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridInnerEl.style.gridTemplateRows    = `repeat(${rows}, 1fr)`;
  canvasEl.appendChild(gridInnerEl);

  // Initialise cell state if needed
  if (state.layout.cellStills.length !== cellCount) {
    resetLayoutCellState(cellCount);
  }

  for (let i = 0; i < cellCount; i++) {
    gridInnerEl.appendChild(buildLayoutCell(i, cellW, cellH, w));
  }

  // Caption
  if (state.layout.captionMode === 'bar') {
    canvasEl.appendChild(buildCaptionBar(w, barH));
  } else if (state.layout.captionMode === 'overlay') {
    canvasEl.appendChild(buildCaptionOverlay());
  }

  // Canvas-level watermark
  if (state.layout.showWatermark && state.layout.watermarkDataUrl &&
      state.layout.watermarkMode === 'canvas') {
    canvasEl.appendChild(buildCanvasWatermark(w, h));
  }

  if (labelEl) {
    labelEl.textContent = `${platform.label} — ${platform.width} × ${platform.height}`;
  }
}

// ── Tweaks helpers ─────────────────────────────────────────────────────────

function formatTweakValue(v) {
  if (v === 0) return '0';
  return v > 0 ? `+${v}` : String(v);
}

function buildTweaksFilter(tweaks) {
  const { lift = 0, gamma = 0, gain = 0, saturation = 0 } = tweaks;
  const liftVal       = (lift / 200) + 1.0;
  const gainVal       = 1.0 + (gain / 100);
  const gammaContrast = 1.0 - (gamma * 0.002);
  const satVal        = (saturation + 100) / 100;
  if (liftVal === 1.0 && gainVal === 1.0 && gammaContrast === 1.0 && satVal === 1.0) return '';
  return `brightness(${liftVal.toFixed(3)}) brightness(${gainVal.toFixed(3)}) contrast(${gammaContrast.toFixed(3)}) saturate(${satVal.toFixed(3)})`;
}

function applyTweaksToCell(cellIndex) {
  const canvasEl = $('layout-canvas');
  if (!canvasEl) return;
  const imgEl = canvasEl.querySelector(`.layout-cell[data-cell-index="${cellIndex}"] .layout-cell-img`);
  if (!imgEl) return;
  const tweaks = state.layout.cellTweaks[cellIndex] ?? { lift: 0, gamma: 0, gain: 0, saturation: 0 };
  imgEl.style.filter = buildTweaksFilter(tweaks);
}

function syncTweakSliders() {
  const idx    = state.layout.tweakScope === 'cell'
    ? (state.layout.tweakActiveCell ?? 0)
    : 0;
  const tweaks = state.layout.cellTweaks[idx] ?? { lift: 0, gamma: 0, gain: 0, saturation: 0 };

  [
    { sliderId: 'tweak-lift-slider',       valueId: 'tweak-lift-value',       labelId: 'tweak-lift-label',       key: 'lift'       },
    { sliderId: 'tweak-gamma-slider',      valueId: 'tweak-gamma-value',      labelId: 'tweak-gamma-label',      key: 'gamma'      },
    { sliderId: 'tweak-gain-slider',       valueId: 'tweak-gain-value',       labelId: 'tweak-gain-label',       key: 'gain'       },
    { sliderId: 'tweak-saturation-slider', valueId: 'tweak-saturation-value', labelId: 'tweak-saturation-label', key: 'saturation' },
  ].forEach(({ sliderId, valueId, labelId, key }) => {
    const v       = tweaks[key] ?? 0;
    const slider  = $(sliderId);
    const valueEl = $(valueId);
    const labelEl = $(labelId);
    if (slider)  slider.value = String(v);
    if (valueEl) {
      valueEl.textContent = formatTweakValue(v);
      valueEl.style.color = v !== 0 ? 'var(--color-text-mid)' : '';
    }
    if (labelEl) labelEl.style.color = v !== 0 ? 'var(--color-text-primary)' : '';
  });

  const allBtn  = $('tweak-scope-all');
  const cellBtn = $('tweak-scope-cell');
  if (allBtn)  allBtn.classList.toggle('active',  state.layout.tweakScope !== 'cell');
  if (cellBtn) cellBtn.classList.toggle('active', state.layout.tweakScope === 'cell');
}

function setupLayoutScreen() {
  const platformEl = $('platform-picker');
  platformEl.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:var(--space-xs)';
  renderPicker('platform-picker', PLATFORMS, state.layout.platformId, id => {
    state.layout.platformId  = id;
    state.layout.cellOffsets = state.layout.cellOffsets.map(() => ({ x: 0, y: 0 }));
    state.layout.cellScales  = state.layout.cellScales.map(() => 1.0);
    if (state.layoutTabs[state.activeTabIndex]) {
      state.layoutTabs[state.activeTabIndex].label = tabLabel(id, state.layout.gridId);
      renderTabBar();
    }
    updateLayoutCanvas();
    triggerAutoSave();
  });

  const gridEl = $('grid-picker');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-xs)';
  renderPicker('grid-picker', GRIDS, state.layout.gridId, id => {
    state.layout.gridId = id;
    const g = GRIDS.find(gr => gr.id === id);
    if (g) resetLayoutCellState(g.cols * g.rows);
    if (state.layoutTabs[state.activeTabIndex]) {
      state.layoutTabs[state.activeTabIndex].label = tabLabel(state.layout.platformId, id);
      renderTabBar();
    }
    updateLayoutCanvas();
    triggerAutoSave();
  });

  // ── Cell background controls ──────────────────────────────────────────────
  const cellBgSwatch = $('btn-cell-bg-swatch');
  const cellBgInput  = $('input-cell-bg-color');
  const cellBgReset  = $('btn-cell-bg-reset');

  function applyCellBgColor(color) {
    if (state.layout.globalBackground) {
      state.layout.globalBackgroundColor = color;
      state.layout.cellBackgrounds = state.layout.cellBackgrounds.map(() => color);
    } else {
      state.layout.cellBackgrounds[_activeCellIndex] = color;
    }
    updateLayoutCanvas();
    triggerAutoSave();
  }

  if (cellBgSwatch) {
    cellBgSwatch.style.backgroundColor = state.layout.globalBackgroundColor || '#000000';
    cellBgSwatch.addEventListener('click', () => cellBgInput?.click());
  }
  if (cellBgInput) {
    cellBgInput.value = state.layout.globalBackgroundColor || '#000000';
    cellBgInput.addEventListener('input', e => {
      if (cellBgSwatch) cellBgSwatch.style.backgroundColor = e.target.value;
      applyCellBgColor(e.target.value);
    });
  }
  if (cellBgReset) {
    cellBgReset.addEventListener('click', () => {
      applyCellBgColor('#000000');
      updateCellBgSwatch();
    });
  }
  setupToggle('toggle-cell-bg-global', on => {
    state.layout.globalBackground = on;
    updateCellBgSwatch();
    updateLayoutCanvas();
    triggerAutoSave();
  });

  // ── Tweaks section ────────────────────────────────────────────────────────
  function getTweakWriteTargets() {
    if (state.layout.tweakScope === 'all') {
      return state.layout.cellTweaks.map((_, i) => i);
    }
    return [state.layout.tweakActiveCell ?? 0];
  }

  [$('tweak-scope-all'), $('tweak-scope-cell')].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      state.layout.tweakScope = btn.dataset.scope;
      syncTweakSliders();
      triggerAutoSave();
    });
  });

  [
    { sliderId: 'tweak-lift-slider',       valueId: 'tweak-lift-value',       labelId: 'tweak-lift-label',       key: 'lift'       },
    { sliderId: 'tweak-gamma-slider',      valueId: 'tweak-gamma-value',      labelId: 'tweak-gamma-label',      key: 'gamma'      },
    { sliderId: 'tweak-gain-slider',       valueId: 'tweak-gain-value',       labelId: 'tweak-gain-label',       key: 'gain'       },
    { sliderId: 'tweak-saturation-slider', valueId: 'tweak-saturation-value', labelId: 'tweak-saturation-label', key: 'saturation' },
  ].forEach(({ sliderId, valueId, labelId, key }) => {
    const slider  = $(sliderId);
    const valueEl = $(valueId);
    const labelEl = $(labelId);
    if (!slider) return;
    slider.addEventListener('input', () => {
      const v = parseInt(slider.value, 10);
      if (valueEl) {
        valueEl.textContent = formatTweakValue(v);
        valueEl.style.color = v !== 0 ? 'var(--color-text-mid)' : '';
      }
      if (labelEl) labelEl.style.color = v !== 0 ? 'var(--color-text-primary)' : '';
      getTweakWriteTargets().forEach(idx => {
        if (!state.layout.cellTweaks[idx]) state.layout.cellTweaks[idx] = { lift: 0, gamma: 0, gain: 0, saturation: 0 };
        state.layout.cellTweaks[idx][key] = v;
        applyTweaksToCell(idx);
      });
      triggerAutoSave();
    });
  });

  const tweakResetBtn = $('btn-tweak-reset');
  if (tweakResetBtn) {
    tweakResetBtn.addEventListener('click', () => {
      getTweakWriteTargets().forEach(idx => {
        if (!state.layout.cellTweaks[idx]) state.layout.cellTweaks[idx] = { lift: 0, gamma: 0, gain: 0, saturation: 0 };
        state.layout.cellTweaks[idx].lift        = 0;
        state.layout.cellTweaks[idx].gamma       = 0;
        state.layout.cellTweaks[idx].gain        = 0;
        state.layout.cellTweaks[idx].saturation  = 0;
        applyTweaksToCell(idx);
      });
      syncTweakSliders();
      triggerAutoSave();
    });
  }

  renderPicker('caption-mode-picker', [
    { id: 'none',    label: 'None'    },
    { id: 'bar',     label: 'Bar'     },
    { id: 'overlay', label: 'Overlay' },
  ], state.layout.captionMode, id => {
    state.layout.captionMode = id;
    updateLayoutCanvas();
    triggerAutoSave();
  });

  $('caption-project').addEventListener('input', e => {
    state.layout.captionProject = e.target.value;
    renderCaption();
    triggerAutoSave();
  });
  $('caption-studio').addEventListener('input', e => {
    state.layout.captionStudio = e.target.value;
    renderCaption();
    triggerAutoSave();
  });

  setupToggle('toggle-filename', on => {
    state.layout.showFilename = on;
    updateLayoutCanvas();
    triggerAutoSave();
  });
  setupToggle('toggle-watermark', on => {
    state.layout.showWatermark = on;
    $('watermark-controls').hidden = !on;
    updateLayoutCanvas();
    triggerAutoSave();
  });

  setupWatermarkControls();
}

// ── Contact Sheet screen ───────────────────────────────────────────────────

function setupContactSheetScreen() {
  renderPicker('contact-grid-picker', CONTACT_GRIDS, state.contactSheet.gridId, id => {
    state.contactSheet.gridId = id;
  });

  $('cs-studio-name').addEventListener('input', e => {
    state.contactSheet.studioName = e.target.value;
  });
  $('cs-confidentiality').addEventListener('input', e => {
    state.contactSheet.confidentiality = e.target.value;
  });

  renderContactFields();

  setupToggle('toggle-cs-logo', on => { state.contactSheet.showLogo = on; });
}

function renderContactFields() {
  const container = $('cs-fields');
  container.innerHTML = '';

  CONTACT_FIELDS.forEach(field => {
    const row         = document.createElement('div');
    row.className     = 'field-toggle-row';

    const label       = document.createElement('span');
    label.className   = 'field-toggle-label';
    label.textContent = field.label;

    const on          = state.contactSheet.fields[field.id] ?? false;
    const toggle      = document.createElement('button');
    toggle.className  = 'toggle';
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', String(on));
    toggle.dataset.state = on ? 'on' : 'off';

    toggle.addEventListener('click', () => {
      const next = toggle.dataset.state !== 'on';
      toggle.dataset.state = next ? 'on' : 'off';
      toggle.setAttribute('aria-checked', String(next));
      state.contactSheet.fields[field.id] = next;
    });

    row.appendChild(label);
    row.appendChild(toggle);
    container.appendChild(row);
  });
}

// ── Export screen ──────────────────────────────────────────────────────────

function setupExportScreen() {
  renderPicker(
    'export-format-picker',
    EXPORT_FORMATS.map(f => ({ id: f, label: f })),
    state.export.format,
    id => { state.export.format = id; },
  );

  renderPicker(
    'export-quality-picker',
    EXPORT_QUALITIES.map(q => ({ id: q, label: q })),
    state.export.quality + '%',
    id => { state.export.quality = parseInt(id); },
  );

  renderPicker(
    'export-resolution-picker',
    EXPORT_RESOLUTIONS.map(r => ({ id: String(r.value), label: r.label })),
    String(state.export.resolution),
    id => { state.export.resolution = parseInt(id); },
  );

  renderPicker(
    'export-dest-picker',
    [{ id: 'disk', label: 'Disk' }, { id: 'clipboard', label: 'Clipboard' }],
    state.export.destination,
    id => {
      state.export.destination = id;
      $('output-path-row').style.display = id === 'disk' ? '' : 'none';
    },
  );

  $('btn-browse-folder').addEventListener('click', async () => {
    const res = await window.gradeshare.selectFolder();
    if (!res.ok) return;
    state.export.outputPath = res.path;
    $('export-output-path').textContent = res.path;
  });

  renderPicker('export-source-picker', COLOR_SOURCES, state.export.colorScience.sourceId, id => {
    state.export.colorScience.sourceId = id;
  });
  renderPicker('export-output-picker', COLOR_OUTPUTS, state.export.colorScience.outputId, id => {
    state.export.colorScience.outputId = id;
  });

  $('btn-export').addEventListener('click', handleExport);
}

function renderExportThumbnails() {
  const row      = $('export-thumbnail-row');
  row.innerHTML  = '';
  const selected = state.gallery.selectedStillIds
    .map(i => state.gallery.stills[i])
    .filter(Boolean);

  selected.forEach((still, i) => {
    const thumb       = document.createElement('div');
    thumb.className   = `export-thumb${i === 0 ? ' active' : ''}`;

    const imagePath = still.path ?? still.imagePath ?? still.filePath ?? null;
    if (imagePath) {
      const img     = document.createElement('img');
      img.src       = imagePath;
      img.alt       = still.filename ?? '';
      thumb.appendChild(img);
    }

    thumb.addEventListener('click', () => {
      row.querySelectorAll('.export-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });

    row.appendChild(thumb);
  });
}

async function handleExport() {
  console.log('Export requested', {
    stills:       state.gallery.selectedStillIds,
    format:       state.export.format,
    quality:      state.export.quality,
    resolution:   state.export.resolution,
    destination:  state.export.destination,
    outputPath:   state.export.outputPath,
    colorScience: state.export.colorScience,
  });
}

// ── Sidebar — refresh ──────────────────────────────────────────────────────

async function handleRefresh(btn, refreshType) {
  btn.classList.add('spinning');
  btn.disabled = true;

  try {
    const res = await window.gradeshare.refresh();
    if (!res.ok) return;

    state.project.stillAlbums      = res.data?.stillAlbums      ?? [];
    state.project.powerGradeAlbums = res.data?.powerGradeAlbums ?? [];

    renderSidebarList('still',      state.project.stillAlbums);
    renderSidebarList('powergrade', state.project.powerGradeAlbums);

    // Only reload stills if the active album matches the section that was refreshed
    const { selectedAlbumIndex, selectedAlbumType } = state.gallery;
    if (selectedAlbumIndex !== null && selectedAlbumType === refreshType) {
      await loadStills(selectedAlbumIndex, selectedAlbumType);
    }
  } finally {
    btn.classList.remove('spinning');
    btn.disabled = false;
  }
}

// ── New album modal ────────────────────────────────────────────────────────

function showNewAlbumModal() {
  const modal = $('modal-new-album');
  const input = $('input-album-name');
  modal.hidden = false;
  input.value  = '';
  // Defer focus so the element is visible before focusing
  requestAnimationFrame(() => input.focus());
}

function hideNewAlbumModal() {
  $('modal-new-album').hidden = true;
  $('input-album-name').value = '';
}

async function submitNewAlbum() {
  const name = $('input-album-name').value.trim();
  if (!name) return;

  console.log('Calling createAlbum with: ' + name);
  hideNewAlbumModal();

  try {
    const res = await window.gradeshare.createAlbum(name);
    console.log('createAlbum result:', res);

    if (!res.ok) {
      console.error('createAlbum returned error:', res.error);
      return;
    }
    await loadAlbums();
  } catch (err) {
    console.error('createAlbum threw:', err);
  }
}

function setupNewAlbumModal() {
  $('btn-modal-cancel').addEventListener('click', hideNewAlbumModal);
  $('btn-modal-create').addEventListener('click', submitNewAlbum);

  $('input-album-name').addEventListener('keydown', e => {
    if (e.key === 'Enter')  submitNewAlbum();
    if (e.key === 'Escape') hideNewAlbumModal();
  });

  // Click on the backdrop (overlay itself, not the card) closes the modal
  $('modal-new-album').addEventListener('click', e => {
    if (e.target === $('modal-new-album')) hideNewAlbumModal();
  });
}

function setupSidebar() {
  $('btn-new-album').addEventListener('click', showNewAlbumModal);
  $('btn-refresh').addEventListener('click', e => handleRefresh(e.currentTarget, 'still'));
  $('btn-refresh-powergrade').addEventListener('click', e => handleRefresh(e.currentTarget, 'powergrade'));
  $('btn-dismiss-health-notice').addEventListener('click', () => {
    $('gallery-health-notice').hidden = true;
  });
  setupNewAlbumModal();

  const sidebarEl     = document.getElementById('sidebar');
  const sidebarScroll = sidebarEl.querySelector('.sidebar-scroll');

  function updateSidebarFade() {
    const atBottom = sidebarScroll.scrollHeight - sidebarScroll.scrollTop <= sidebarScroll.clientHeight + 2;
    sidebarEl.classList.toggle('at-bottom', atBottom);
  }
  sidebarScroll.addEventListener('scroll', updateSidebarFade);
  updateSidebarFade();

  sidebarEl.addEventListener('click', (e) => {
    const item = e.target.closest('.album-item');
    if (!item) return;
    document.querySelectorAll('.album-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    const albumIndex = parseInt(item.dataset.albumIndex, 10);
    const albumType  = item.dataset.albumType;
    state.gallery.selectedAlbumIndex = albumIndex;
    state.gallery.selectedAlbumType  = albumType;
    loadStills(albumIndex, albumType);
  });
}

// ── Python bridge status ───────────────────────────────────────────────────

function setupPythonStatusListener() {
  window.gradeshare.onPythonStatus(({ ready }) => {
    state.resolve.pythonReady = ready;

    if (!ready && state.resolve.connected) {
      state.resolve.connected = false;
      setStatusBox('error', 'Lost connection to DaVinci Resolve');

      const btn = $('btn-connect');
      btn.disabled    = false;
      btn.textContent = 'Reconnect';
      btn.classList.remove('btn-connected');
      $('btn-disconnect').hidden = true;
    }
  });
}

// ── Auto-save ──────────────────────────────────────────────────────────────

function triggerAutoSave() {
  if (!state.resolve.connected || !state.project.name) return;
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(autoSave, 1000);
}

async function autoSave() {
  const projectName = state.project.name;
  if (!projectName) return;
  showSaveStatus('Saving…');
  const data = buildSessionJSON(null);
  const res  = await window.gradeshare.session.save(projectName, null, data);
  if (res.ok) {
    console.log('[Session] Autosaved at', data.savedAt);
    showSaveStatus('Saved');
  } else {
    console.error('[Session] Autosave failed:', res.error);
    showSaveStatus('');
  }
}

function showSaveStatus(text) {
  const el = $('save-status');
  if (!el) return;
  el.textContent = text;
  if (!text) { el.classList.remove('visible'); return; }
  el.classList.add('visible');
  if (text === 'Saving…') return;
  clearTimeout(_saveStatusTimer);
  _saveStatusTimer = setTimeout(() => el.classList.remove('visible'), 2000);
}

function buildSessionJSON(sessionName) {
  // Flush active tab before serialising so its saved state is current
  if (state.layoutTabs.length > 0) saveCurrentTabState();

  const sel = state.gallery.selectedStills;

  return {
    version:     2,
    savedAt:     new Date().toISOString(),
    name:        sessionName ?? null,
    projectName: state.project.name ?? '',
    // Legacy single-layout fields — kept for backward compatibility
    layout: {
      platformId:        state.layout.platformId,
      gridId:            state.layout.gridId,
      captionMode:       state.layout.captionMode,
      captionProject:    state.layout.captionProject,
      captionStudio:     state.layout.captionStudio,
      showFilename:      state.layout.showFilename,
      showWatermark:     state.layout.showWatermark,
      watermarkFilename: state.layout.watermarkFilename ?? null,
      watermarkCorner:   state.layout.watermarkCorner,
      watermarkMode:     state.layout.watermarkMode,
      watermarkSize:     state.layout.watermarkSize,
      watermarkOpacity:  state.layout.watermarkOpacity,
      globalBackground:      state.layout.globalBackground,
      globalBackgroundColor: state.layout.globalBackgroundColor,
      cellBackgrounds:       state.layout.cellBackgrounds,
      tweakScope:            state.layout.tweakScope,
      tweakActiveCell:       state.layout.tweakActiveCell,
      cellTweaks:            state.layout.cellTweaks,
    },
    gallery: {
      selectedAlbumIndex: state.gallery.selectedAlbumIndex,
      selectedAlbumType:  state.gallery.selectedAlbumType,
      selectedAlbumName:  (state.gallery.selectedAlbumType === 'still'
        ? state.project.stillAlbums
        : state.project.powerGradeAlbums
      )[state.gallery.selectedAlbumIndex]?.name ?? null,
      selectedStillPaths: sel.map(s => s.imagePath ?? s.image_path ?? s.path ?? ''),
      zoomLevel:          state.gallery.zoomLevel,
    },
    cells: {
      offsets:          state.layout.cellOffsets,
      scales:           state.layout.cellScales,
      locked:           state.layout.cellLocked,
      stillAssignments: state.layout.cellStills.map(s => {
        if (!s) return null;
        const idx = sel.indexOf(s);
        return idx >= 0 ? idx : null;
      }),
    },
    // Tab workspace
    layoutTabs: state.layoutTabs.map(tab => ({
      id:              tab.id,
      label:           tab.label,
      platformId:      tab.platformId,
      gridId:          tab.gridId,
      captionMode:     tab.captionMode,
      captionProject:  tab.captionProject,
      captionStudio:   tab.captionStudio,
      showFilename:    tab.showFilename,
      showWatermark:   tab.showWatermark,
      watermarkFilename: tab.watermarkFilename ?? null,
      watermarkCorner:   tab.watermarkCorner,
      watermarkMode:     tab.watermarkMode,
      watermarkSize:     tab.watermarkSize,
      watermarkOpacity:  tab.watermarkOpacity,
      cells: {
        offsets:     tab.cellOffsets,
        scales:      tab.cellScales,
        locked:      tab.cellLocked,
        backgrounds: tab.cellBackgrounds,
        tweaks:      tab.cellTweaks,
      },
      globalBackground:      tab.globalBackground,
      globalBackgroundColor: tab.globalBackgroundColor,
      tweakScope:      tab.tweakScope      ?? 'all',
      tweakActiveCell: tab.tweakActiveCell ?? 0,
    })),
    activeTabIndex: state.activeTabIndex,
  };
}

// ── Watermark library ──────────────────────────────────────────────────────

async function loadWatermarkLibrary() {
  const res = await window.gradeshare.watermark.list();
  if (!res.ok) return;
  watermarkLibrary = res.watermarks ?? [];
  renderWatermarkLibrary();
}

function renderWatermarkLibrary() {
  const row    = $('watermark-library-row');
  const addBtn = $('btn-add-logo');
  if (!row || !addBtn) return;
  row.querySelectorAll('.watermark-thumb').forEach(el => el.remove());

  watermarkLibrary.forEach(item => {
    const thumb = document.createElement('div');
    thumb.className    = 'watermark-thumb';
    thumb.dataset.filename = item.filename;
    if (state.layout.watermarkFilename === item.filename) thumb.classList.add('selected');

    const img = document.createElement('img');
    img.src = item.fileUrl;
    img.alt = item.filename;
    thumb.appendChild(img);

    const delBtn = document.createElement('button');
    delBtn.className   = 'watermark-thumb-delete';
    delBtn.textContent = '×';
    delBtn.title       = 'Remove from library';
    delBtn.addEventListener('click', async e => {
      e.stopPropagation();
      await window.gradeshare.watermark.delete(item.filename);
      if (state.layout.watermarkFilename === item.filename) {
        state.layout.watermarkDataUrl   = null;
        state.layout.watermarkFilename  = null;
        updateLayoutCanvas();
      }
      await loadWatermarkLibrary();
    });
    thumb.appendChild(delBtn);

    thumb.addEventListener('click', () => selectWatermarkFromLibrary(item));
    row.insertBefore(thumb, addBtn);
  });
}

function selectWatermarkFromLibrary(item) {
  state.layout.watermarkDataUrl  = item.fileUrl;
  state.layout.watermarkFilename = item.filename;
  console.log('[Watermark] Selected:', item.filename, 'URL:', item.fileUrl);
  renderWatermarkLibrary();
  updateLayoutCanvas();
  triggerAutoSave();
}

// ── Sessions panel ─────────────────────────────────────────────────────────

async function loadSessionsPanel() {
  const projectName = state.project.name;
  if (!projectName) return;
  const [autosaveRes, namedRes] = await Promise.all([
    window.gradeshare.session.loadAutosave(projectName),
    window.gradeshare.session.listNamed(projectName),
  ]);
  renderSessionsPanel(
    autosaveRes.ok ? autosaveRes.state : null,
    namedRes.ok    ? namedRes.currentProjectSessions : [],
    namedRes.ok    ? namedRes.otherProjectSessions   : [],
  );
}

function renderSessionsPanel(autosave, named, otherSessions = []) {
  const panel          = $('sessions-panel');
  const content        = $('sessions-content');
  const titleEl        = $('sessions-title');
  const currentProject = state.project.name ?? '';
  titleEl.textContent  = `Sessions — ${currentProject || 'Project'}`;
  content.innerHTML    = '';

  // ── Autosave row ──────────────────────────────────────────────────────────
  if (autosave) {
    const autosaveProject = autosave.projectName ?? null;
    const mismatch        = !!(autosaveProject && autosaveProject !== currentProject);

    const row = document.createElement('div');
    row.className = 'session-autosave-row' + (mismatch ? ' session-autosave-mismatch' : '');

    const ts = document.createElement('span');
    ts.className   = 'session-timestamp';
    ts.textContent = new Date(autosave.savedAt).toLocaleString();

    const btn = document.createElement('button');
    btn.style.fontSize = 'var(--font-size-xs)';
    btn.style.padding  = '4px 10px';

    if (mismatch) {
      btn.className   = 'btn-session-amber';
      btn.textContent = `Resume session from '${autosaveProject}'`;
      btn.addEventListener('click', () => {
        showSessionMismatchNotice(autosaveProject, currentProject);
        restoreSession(autosave);
      });

      const mainRow = document.createElement('div');
      mainRow.className = 'session-autosave-main';
      mainRow.appendChild(btn);
      mainRow.appendChild(ts);
      row.appendChild(mainRow);

      const currentLine = document.createElement('span');
      currentLine.className   = 'session-mismatch-current-project';
      currentLine.textContent = `Current project: ${currentProject}`;
      row.appendChild(currentLine);
    } else {
      btn.className   = 'btn-primary';
      btn.textContent = 'Resume last session';
      btn.addEventListener('click', () => restoreSession(autosave));
      row.appendChild(ts);
      row.appendChild(btn);
    }

    content.appendChild(row);
  }

  // ── Named sessions ────────────────────────────────────────────────────────
  if (named.length > 0) {
    const div = document.createElement('div');
    div.className = 'session-divider';
    content.appendChild(div);

    named.forEach(sess => {
      const sessProject = sess.projectName ?? null;
      const mismatch    = !!(sessProject && sessProject !== currentProject);

      const row = document.createElement('div');
      row.className = 'session-named-row' + (mismatch ? ' session-named-mismatch' : '');

      const mainRow = document.createElement('div');
      mainRow.className = 'session-named-main-row';

      const nameEl = document.createElement('span');
      nameEl.className   = 'session-named-name';
      nameEl.textContent = (mismatch ? '⚠ ' : '') + sess.name;

      const tsEl = document.createElement('span');
      tsEl.className   = 'session-timestamp';
      tsEl.textContent = sess.savedAt ? new Date(sess.savedAt).toLocaleString() : '';

      const loadBtn = document.createElement('button');
      loadBtn.className   = mismatch ? 'btn-session-amber' : 'btn-subtle';
      loadBtn.style.padding = '2px 8px';
      loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', async () => {
        if (mismatch) showSessionMismatchNotice(sessProject, currentProject);
        const res = await window.gradeshare.session.loadNamed(sess.path);
        if (res.ok) restoreSession(res.state);
      });

      const delBtn = document.createElement('button');
      delBtn.className   = 'session-delete-btn';
      delBtn.textContent = '×';
      delBtn.title       = 'Delete session';
      delBtn.addEventListener('click', async () => {
        await window.gradeshare.session.deleteNamed(sess.path);
        await loadSessionsPanel();
      });

      mainRow.appendChild(nameEl);
      mainRow.appendChild(tsEl);
      mainRow.appendChild(loadBtn);
      mainRow.appendChild(delBtn);
      row.appendChild(mainRow);

      if (mismatch) {
        const mismatchLine = document.createElement('div');
        mismatchLine.className   = 'session-mismatch-line';
        mismatchLine.textContent = `Saved from project: ${sessProject} — current project is ${currentProject}`;
        row.appendChild(mismatchLine);
      }

      content.appendChild(row);
    });
  }

  // ── Sessions from other projects ──────────────────────────────────────────
  if (otherSessions.length > 0) {
    const div = document.createElement('div');
    div.className = 'session-divider';
    content.appendChild(div);

    const otherHeader = document.createElement('div');
    otherHeader.className   = 'session-other-header';
    otherHeader.textContent = 'From other projects';
    content.appendChild(otherHeader);

    otherSessions.forEach(sess => {
      const sessProject = sess.projectName ?? null;
      const row = document.createElement('div');
      row.className = 'session-named-row session-named-mismatch';

      const mainRow = document.createElement('div');
      mainRow.className = 'session-named-main-row';

      const nameEl = document.createElement('span');
      nameEl.className   = 'session-named-name';
      nameEl.textContent = sess.name;

      const tsEl = document.createElement('span');
      tsEl.className   = 'session-timestamp';
      tsEl.textContent = sess.savedAt ? new Date(sess.savedAt).toLocaleString() : '';

      const loadBtn = document.createElement('button');
      loadBtn.className     = 'btn-session-amber';
      loadBtn.style.padding = '2px 8px';
      loadBtn.textContent   = 'Load';
      loadBtn.addEventListener('click', async () => {
        if (sessProject) showSessionMismatchNotice(sessProject, currentProject);
        const res = await window.gradeshare.session.loadNamed(sess.path);
        if (res.ok) restoreSession(res.state);
      });

      const delBtn = document.createElement('button');
      delBtn.className   = 'session-delete-btn';
      delBtn.textContent = '×';
      delBtn.title       = 'Delete session';
      delBtn.addEventListener('click', async () => {
        await window.gradeshare.session.deleteNamed(sess.path);
        await loadSessionsPanel();
      });

      mainRow.appendChild(nameEl);
      mainRow.appendChild(tsEl);
      mainRow.appendChild(loadBtn);
      mainRow.appendChild(delBtn);
      row.appendChild(mainRow);

      if (sessProject) {
        const mismatchLine = document.createElement('div');
        mismatchLine.className   = 'session-mismatch-line';
        mismatchLine.textContent = `Saved from project: ${sessProject}`;
        row.appendChild(mismatchLine);
      }

      content.appendChild(row);
    });
  }

  // ── Save named session ────────────────────────────────────────────────────
  const div2 = document.createElement('div');
  div2.className = 'session-divider';
  content.appendChild(div2);

  const saveRow = document.createElement('div');
  saveRow.className = 'session-save-row';
  const nameInput = document.createElement('input');
  nameInput.type        = 'text';
  nameInput.className   = 'control-input session-name-input';
  nameInput.placeholder = 'Session name…';
  const saveBtn = document.createElement('button');
  saveBtn.className   = 'btn-subtle';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    const data = buildSessionJSON(name);
    const res  = await window.gradeshare.session.save(state.project.name, name, data);
    if (res.ok) { nameInput.value = ''; await loadSessionsPanel(); }
  });
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });
  saveRow.appendChild(nameInput);
  saveRow.appendChild(saveBtn);
  content.appendChild(saveRow);

  // ── Start fresh ───────────────────────────────────────────────────────────
  const freshBtn = document.createElement('button');
  freshBtn.className   = 'btn-subtle session-fresh-btn';
  freshBtn.textContent = 'Start fresh';
  freshBtn.addEventListener('click', async () => {
    if (state.project.stillAlbums.length > 0) {
      state.gallery.selectedAlbumIndex = 0;
      state.gallery.selectedAlbumType  = 'still';
      const firstItem = document.querySelector('.album-item[data-album-type="still"][data-album-index="0"]');
      if (firstItem) {
        document.querySelectorAll('.album-item').forEach(el => el.classList.remove('active'));
        firstItem.classList.add('active');
      }
      await loadStills(0, 'still');
    } else {
      switchScreen('gallery');
    }
  });
  content.appendChild(freshBtn);

  panel.hidden = false;
}

function showSessionMismatchNotice(sessionProjectName, currentProjectName) {
  const content = $('sessions-content');
  if (!content) return;
  const existing = content.querySelector('.session-mismatch-notice');
  if (existing) existing.remove();
  const notice = document.createElement('div');
  notice.className   = 'session-mismatch-notice';
  notice.textContent = `Loading session from '${sessionProjectName}' into '${currentProjectName}' — stills will be re-fetched from current project`;
  content.insertBefore(notice, content.firstChild);
  setTimeout(() => {
    notice.classList.add('fading');
    setTimeout(() => notice.remove(), 500);
  }, 4000);
}

// ── Session restore ─────────────────────────────────────────────────────────

async function restoreSession(sessionData) {
  const { layout: L, gallery: G, cells: C } = sessionData;

  // 1. Restore layout state
  state.layout.platformId       = L.platformId       ?? 'ig-portrait';
  state.layout.gridId           = L.gridId           ?? '2x2';
  state.layout.captionMode      = L.captionMode      ?? 'none';
  state.layout.captionProject   = L.captionProject   ?? '';
  state.layout.captionStudio    = L.captionStudio    ?? '';
  state.layout.showFilename     = L.showFilename     ?? false;
  state.layout.showWatermark    = L.showWatermark    ?? true;
  state.layout.watermarkCorner       = L.watermarkCorner       ?? 'br';
  state.layout.watermarkMode         = L.watermarkMode         ?? 'canvas';
  state.layout.watermarkSize         = L.watermarkSize         ?? 15;
  state.layout.watermarkOpacity      = L.watermarkOpacity      ?? 1.0;
  state.layout.globalBackground      = L.globalBackground      ?? true;
  state.layout.globalBackgroundColor = L.globalBackgroundColor ?? '#000000';
  state.layout.cellBackgrounds       = L.cellBackgrounds       ?? [];
  state.layout.tweakScope            = L.tweakScope            ?? 'all';
  state.layout.tweakActiveCell       = L.tweakActiveCell       ?? 0;
  state.layout.cellTweaks            = (L.cellTweaks ?? []).map(t => ({ ...t }));

  // 2. Restore watermark from library
  if (L.watermarkFilename) {
    const libItem = watermarkLibrary.find(w => w.filename === L.watermarkFilename);
    if (libItem) {
      state.layout.watermarkDataUrl  = libItem.fileUrl;
      state.layout.watermarkFilename = libItem.filename;
    }
  } else {
    state.layout.watermarkDataUrl  = null;
    state.layout.watermarkFilename = null;
  }

  const albumIndex = G.selectedAlbumIndex;
  const albumType  = G.selectedAlbumType ?? 'still';

  if (albumIndex === null || albumIndex === undefined) {
    syncRestoredControls(L);
    switchScreen('social');
    return;
  }

  // 3. Show loading indicator on connect screen
  const versionStr    = state.resolve.version  ? ` ${state.resolve.version}`  : '';
  const projectStr    = state.project.name     ? ` — ${state.project.name}`   : '';
  const connectedText = `${state.resolve.productName ?? 'DaVinci Resolve'}${versionStr}${projectStr}`;
  setStatusBox('connected', 'Restoring session…');

  // 3a. Populate sidebar album lists from the fresh Python process.
  //     The bridge is always restarted on connect, so references are never stale.
  const albumsRes = await window.gradeshare.getAlbums();
  console.log('[Restore] getAlbums result:', JSON.stringify(albumsRes));
  if (albumsRes.ok) {
    state.project.stillAlbums      = albumsRes.data?.stillAlbums      ?? [];
    state.project.powerGradeAlbums = albumsRes.data?.powerGradeAlbums ?? [];
    renderSidebarList('still',      state.project.stillAlbums);
    renderSidebarList('powergrade', state.project.powerGradeAlbums);
    console.log('[Restore] Albums loaded, proceeding with stills load');
  } else {
    console.warn('[Restore] getAlbums failed:', albumsRes.error);
  }

  const albumList = albumType === 'powergrade'
    ? state.project.powerGradeAlbums
    : state.project.stillAlbums;

  if (albumIndex >= albumList.length) {
    const savedName = G.selectedAlbumName ?? `album ${albumIndex}`;
    setStatusBox('warning', `Album "${savedName}" not found in current project`);
    switchScreen('gallery');
    return;
  }

  const currentAlbumName = albumList[albumIndex]?.name;
  if (G.selectedAlbumName && currentAlbumName && currentAlbumName !== G.selectedAlbumName) {
    showSaveStatus(`Album name changed: "${G.selectedAlbumName}" → "${currentAlbumName}"`);
  }

  // 4. Activate album in sidebar
  state.gallery.selectedAlbumIndex = albumIndex;
  state.gallery.selectedAlbumType  = albumType;
  document.querySelectorAll('.album-item').forEach(el => el.classList.remove('active'));
  const albumItem = document.querySelector(
    `.album-item[data-album-type="${albumType}"][data-album-index="${albumIndex}"]`
  );
  if (albumItem) albumItem.classList.add('active');

  // 5. Load stills without navigating away from the connect screen
  console.log('[Restore] Calling loadStills with albumIndex:', albumIndex, 'albumType:', albumType);
  _restoringSession = true;
  let loadedOk;
  try {
    loadedOk = await loadStills(albumIndex, albumType);
  } finally {
    _restoringSession = false;
  }

  if (!loadedOk) {
    setStatusBox('error', 'Could not restore session — album may have changed in Resolve');
    switchScreen('gallery');
    return;
  }

  // 6. Restore connect screen status
  setStatusBox('connected', connectedText);

  // 7. Match stills by filename-without-extension (temp dir and format may differ between sessions)
  const stripExt  = name => name.replace(/\.[^.]+$/, '');
  const savedPaths = G.selectedStillPaths ?? [];

  console.log('[Restore] Saved paths:', savedPaths);
  console.log('[Restore] Fresh stills:', state.gallery.stills.map(s => s.imagePath ?? s.image_path ?? s.path ?? ''));

  // Build lookup: stem → gallery index
  const stemMap  = new Map(); // e.g. "gs_preview_1.4.1" → idx
  const labelMap = new Map(); // e.g. "1.4" → idx (fallback)
  state.gallery.stills.forEach((still, idx) => {
    const p    = still.imagePath ?? still.image_path ?? still.path ?? '';
    const stem = stripExt(p.split('/').pop());
    if (stem && !stemMap.has(stem)) stemMap.set(stem, idx);
    const lbl  = still.label ?? still.name ?? null;
    if (lbl  && !labelMap.has(lbl))  labelMap.set(lbl, idx);
  });

  // Pass 1: match on stem (filename without extension)
  state.gallery.selectedStillIds = [];
  savedPaths.forEach(savedPath => {
    const savedStem = stripExt(savedPath.split('/').pop());
    const freshStem = [...stemMap.keys()].find(s => s === savedStem) ?? null;
    console.log(`[Restore] Stem compare - saved: ${savedStem} vs fresh: ${freshStem ?? '(no match)'}`);
    const idx = stemMap.get(savedStem);
    if (idx !== undefined && !state.gallery.selectedStillIds.includes(idx)) {
      state.gallery.selectedStillIds.push(idx);
    }
  });

  // Pass 2: label fallback if stem matching produced nothing
  if (state.gallery.selectedStillIds.length === 0 && savedPaths.length > 0) {
    console.log('[Restore] Stem match failed — trying label fallback');
    console.log('[Restore] Fresh stems:', [...stemMap.keys()]);
    console.log('[Restore] Saved stems:', savedPaths.map(p => stripExt(p.split('/').pop())));
    savedPaths.forEach(savedPath => {
      // Extract label-like portion: last dot-separated numeric segment (e.g. "1.4" from "gs_preview_1.4.1")
      const stem  = stripExt(savedPath.split('/').pop());
      const parts = stem.split('_');
      const label = parts[parts.length - 1] ?? null;
      if (!label) return;
      const idx = labelMap.get(label);
      console.log(`[Restore] Label fallback: stem="${stem}" label="${label}" → idx=${idx ?? 'none'}`);
      if (idx !== undefined && !state.gallery.selectedStillIds.includes(idx)) {
        state.gallery.selectedStillIds.push(idx);
      }
    });
  }

  // Pass 3: graceful fallback — select all stills in order
  if (state.gallery.selectedStillIds.length === 0 && state.gallery.stills.length > 0) {
    console.log('[Restore] No path matches found, selecting all stills as fallback');
    state.gallery.selectedStillIds = state.gallery.stills.map((_, i) => i);
  }

  console.log(`[Restore] Matched ${state.gallery.selectedStillIds.length} of ${savedPaths.length} stills`);

  syncSelectedStills();
  document.querySelectorAll('.still-card').forEach(card => {
    const cIdx = parseInt(card.dataset.index, 10);
    card.classList.toggle('selected', state.gallery.selectedStillIds.includes(cIdx));
  });
  updateGalleryCount();

  // Warn if project changed and not all stills could be matched
  if (sessionData.projectName && sessionData.projectName !== state.project.name) {
    const matched  = state.gallery.selectedStillIds.length;
    const expected = savedPaths.length;
    if (expected > 0 && matched < expected) {
      showSaveStatus(`Matched ${matched} of ${expected} stills`);
    }
  }

  // 8. Sync cellStills from selection, then restore saved canvas state on top
  updateSocialFromGallery();
  const restoreGrid = GRIDS.find(g => g.id === state.layout.gridId);
  const cellCount   = restoreGrid ? restoreGrid.cols * restoreGrid.rows : 1;
  const pad = (arr, len, def) => {
    const a = (arr ?? []).slice(0, len);
    while (a.length < len) a.push(def());
    return a;
  };
  state.layout.cellOffsets = pad(C?.offsets, cellCount, () => ({ x: 0, y: 0 }));
  state.layout.cellScales  = pad(C?.scales,  cellCount, () => 1.0);
  state.layout.cellLocked  = pad(C?.locked,  cellCount, () => false);

  // 8a. Restore gallery zoom level
  if (sessionData.gallery?.zoomLevel != null) {
    state.gallery.zoomLevel = sessionData.gallery.zoomLevel;
    const zoomSlider = $('gallery-zoom-slider');
    if (zoomSlider) zoomSlider.value = String(state.gallery.zoomLevel);
    applyGalleryZoom();
  }

  // 8b. Restore tab workspace (v2 sessions only)
  if (sessionData.layoutTabs && sessionData.layoutTabs.length > 0) {
    const sel = state.gallery.selectedStills;
    state.layoutTabs = sessionData.layoutTabs.map(tabData => {
      const tab = makeNewTab(tabData.platformId ?? 'ig-portrait', tabData.gridId ?? '2x2');
      Object.assign(tab, {
        id:              tabData.id ?? Date.now(),
        label:           tabData.label ?? tabLabel(tabData.platformId, tabData.gridId),
        captionMode:     tabData.captionMode     ?? 'none',
        captionProject:  tabData.captionProject  ?? '',
        captionStudio:   tabData.captionStudio   ?? '',
        showFilename:    tabData.showFilename     ?? false,
        showWatermark:   tabData.showWatermark    ?? true,
        watermarkFilename:     tabData.watermarkFilename     ?? null,
        watermarkCorner:       tabData.watermarkCorner       ?? 'br',
        watermarkMode:         tabData.watermarkMode         ?? 'canvas',
        watermarkSize:         tabData.watermarkSize         ?? 15,
        watermarkOpacity:      tabData.watermarkOpacity      ?? 1.0,
        globalBackground:      tabData.globalBackground      ?? true,
        globalBackgroundColor: tabData.globalBackgroundColor ?? '#000000',
        tweakScope:      tabData.tweakScope      ?? 'all',
        tweakActiveCell: tabData.tweakActiveCell ?? 0,
      });
      if (tab.watermarkFilename) {
        const libItem = watermarkLibrary.find(w => w.filename === tab.watermarkFilename);
        if (libItem) tab.watermarkDataUrl = libItem.fileUrl;
      }
      const tabGrid  = GRIDS.find(g => g.id === tab.gridId);
      const tabCells = tabGrid ? tabGrid.cols * tabGrid.rows : 1;
      const restoreBg = tabData.globalBackgroundColor ?? '#000000';
      tab.cellStills      = Array.from({ length: tabCells }, (_, i) => sel[i] ?? null);
      tab.cellOffsets     = pad(tabData.cells?.offsets,     tabCells, () => ({ x: 0, y: 0 }));
      tab.cellScales      = pad(tabData.cells?.scales,      tabCells, () => 1.0);
      tab.cellLocked      = pad(tabData.cells?.locked,      tabCells, () => false);
      tab.cellBackgrounds = pad(tabData.cells?.backgrounds, tabCells, () => restoreBg);
      tab.cellTweaks      = pad(tabData.cells?.tweaks,      tabCells, () => ({ lift: 0, gamma: 0, gain: 0, saturation: 0 }));
      return tab;
    });
    state.activeTabIndex = Math.min(
      sessionData.activeTabIndex ?? 0,
      state.layoutTabs.length - 1
    );
    loadTabState(state.activeTabIndex);
  } else {
    // v1 session — ensure the single default tab reflects restored layout
    saveCurrentTabState();
  }
  renderTabBar();

  // 9. Sync UI controls then navigate to Social — canvas renders with restored state
  syncRestoredControls(L);
  switchScreen('social');
}

function syncRestoredControls(L) {
  // Pickers
  const pickerMap = {
    'platform-picker':     L.platformId,
    'grid-picker':         L.gridId,
    'caption-mode-picker': L.captionMode,
  };
  Object.entries(pickerMap).forEach(([id, val]) => {
    document.querySelectorAll(`#${id} .picker-btn`).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.id === val);
    });
  });

  // Text inputs
  const proj = $('caption-project'); if (proj) proj.value = L.captionProject ?? '';
  const stud = $('caption-studio');  if (stud) stud.value = L.captionStudio  ?? '';

  // Toggles
  setToggleState('toggle-filename',  L.showFilename  ?? false);
  setToggleState('toggle-watermark', L.showWatermark ?? true);
  const wmControls = $('watermark-controls');
  if (wmControls) wmControls.hidden = !(L.showWatermark ?? true);

  // Size slider
  const sizeSlider = $('watermark-size-slider');
  const sizeValue  = $('watermark-size-value');
  if (sizeSlider) sizeSlider.value = String(L.watermarkSize ?? 15);
  if (sizeValue)  sizeValue.textContent = `${L.watermarkSize ?? 15}%`;

  // Watermark pickers
  document.querySelectorAll('#watermark-mode-picker .picker-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === (L.watermarkMode ?? 'canvas'));
  });
  document.querySelectorAll('.corner-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.corner === (L.watermarkCorner ?? 'br'));
  });

  // Cell background swatch + toggle
  setToggleState('toggle-cell-bg-global', L.globalBackground ?? true);
  const cellBgSwatch = $('btn-cell-bg-swatch');
  const cellBgInput  = $('input-cell-bg-color');
  const bgColor = (L.globalBackground ?? true)
    ? (L.globalBackgroundColor ?? '#000000')
    : (L.cellBackgrounds?.[0] ?? '#000000');
  if (cellBgSwatch) cellBgSwatch.style.backgroundColor = bgColor;
  if (cellBgInput)  cellBgInput.value = bgColor;

  // Tweaks
  syncTweakSliders();

  renderWatermarkLibrary();
}

function setToggleState(id, on) {
  const btn = $(id);
  if (!btn) return;
  btn.dataset.state = on ? 'on' : 'off';
  btn.setAttribute('aria-checked', String(on));
}

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
  // Bootstrap the tab workspace — one default tab mirroring initial state.layout
  state.layoutTabs     = [makeNewTab(state.layout.platformId, state.layout.gridId)];
  state.activeTabIndex = 0;
  saveCurrentTabState(); // sync initial layout values into tab 0

  setupTabNav();
  setupConnectScreen();
  setupGalleryToolbar();
  setupLayoutScreen();
  setupContactSheetScreen();
  setupExportScreen();
  setupSidebar();
  setupPythonStatusListener();
  initDocumentDragHandlers();
  setupResizeListener();
  loadWatermarkLibrary();
  renderTabBar();
}

document.addEventListener('DOMContentLoaded', init);
