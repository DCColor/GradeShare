'use strict';

// ── Inlined theme data ─────────────────────────────────────────────────────
// require() is unavailable in the renderer (contextIsolation: true).
// These arrays mirror config/theme.js exactly.

const PLATFORMS = [
  { id: 'ig-square',   label: 'IG Square',   width: 1080, height: 1080 },
  { id: 'ig-portrait', label: 'IG Portrait', width: 1080, height: 1350 },
  { id: 'ig-stories',  label: 'IG Stories',  width: 1080, height: 1920 },
  { id: 'tiktok',      label: 'TikTok',      width: 1080, height: 1920 },
  { id: 'facebook',    label: 'Facebook',    width: 1200, height: 628  },
  { id: 'youtube',     label: 'YouTube',     width: 1280, height: 720  },
  { id: 'linkedin',    label: 'LinkedIn',    width: 1200, height: 627  },
  { id: 'x',           label: 'X',           width: 1600, height: 900  },
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
    loading:            false,
    albumHealth:        {},
  },
  layout: {
    platformId:     'ig-portrait',
    gridId:         '2x2',
    captionProject: '',
    captionStudio:  '',
    showFilename:   false,
    showWatermark:  true,
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

  if (id === 'layout') {
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

    btn.hidden = true;
    $('btn-browse-gallery').hidden = false;

    await loadAlbums();
  } catch (err) {
    setStatusBox('error', err.message);
    btn.disabled = false;
    btn.textContent = 'Connect to Resolve';
  }
}

function setupConnectScreen() {
  $('btn-connect').addEventListener('click', handleConnect);
  $('btn-browse-gallery').addEventListener('click', () => switchScreen('gallery'));
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

  showHealthNotice('unknown', 0, '');
  switchScreen('gallery');

  const grid = $('still-grid');
  grid.innerHTML = 'Loading stills...';
  updateGalleryCount();

  console.log('Calling getStills with albumIndex:', albumIndex, 'albumType:', albumType);
  const res = await window.gradeshare.getStills(albumIndex, albumType);
  console.log('getStills response:', JSON.stringify(res));
  console.log('result.ok:', res.ok);
  console.log('result.data:', res.data);
  if (res.data) {
    console.log('result.data.stills:', res.data.stills);
    console.log('result.data.count:', res.data.count);
    console.log('result.data.health:', res.data.health);
    console.log('result.data.message:', res.data.message);
    console.log('result.data.loadedCount:', res.data.loadedCount, '/ totalCount:', res.data.totalCount);
  }
  state.gallery.loading = false;

  if (!res.ok) {
    console.error('getStills error:', res.error);
    grid.innerHTML = res.error ?? 'Failed to load stills';
    updateGalleryCount();
    return;
  }

  const health  = res.data?.health       ?? 'unknown';
  const message = res.data?.message      ?? '';
  const missing = res.data?.missingCount ?? 0;
  updateAlbumHealthDot(albumType, albumIndex, health);
  showHealthNotice(health, missing, message);

  const stills = res.data?.stills ?? res.data ?? [];
  if (Array.isArray(stills) && stills.length === 0) {
    console.log('Stills array is empty');
  } else if (Array.isArray(stills) && stills.length > 0) {
    console.log(`Rendering ${stills.length} stills`);
    console.log('First still object:', JSON.stringify(stills[0]));
  }

  state.gallery.stills           = stills;
  state.gallery.selectedStillIds = [];
  renderStillGrid(state.gallery.stills);
  updateGalleryCount();
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

    card.addEventListener('click', () => handleStillClick(index));
    grid.appendChild(card);
  });
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
  updateGalleryCount();
}

function handleSelectAll() {
  state.gallery.selectedStillIds = state.gallery.stills.map((_, i) => i);
  $('still-grid').querySelectorAll('.still-card').forEach(c => c.classList.add('selected'));
  updateGalleryCount();
}

function handleClearSelection() {
  state.gallery.selectedStillIds = [];
  $('still-grid').querySelectorAll('.still-card').forEach(c => c.classList.remove('selected'));
  updateGalleryCount();
}

function updateGalleryCount() {
  const total    = state.gallery.stills.length;
  const selected = state.gallery.selectedStillIds.length;
  const el       = $('gallery-count');
  el.textContent = selected > 0
    ? `${selected} of ${total} selected`
    : `${total} still${total !== 1 ? 's' : ''}`;
}

function setupGalleryToolbar() {
  $('btn-select-all').addEventListener('click', handleSelectAll);
  $('btn-clear-selection').addEventListener('click', handleClearSelection);
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

function updateLayoutCanvas() {
  const canvas    = $('layout-canvas');
  if (!canvas) return;
  const container = canvas.parentElement;
  const maxW      = container.clientWidth  - 40;
  const maxH      = container.clientHeight - 40;
  if (maxW <= 0 || maxH <= 0) return;

  const platform = PLATFORMS.find(p => p.id === state.layout.platformId);
  const grid     = GRIDS.find(g => g.id === state.layout.gridId);
  if (!platform) return;

  const ratio = platform.width / platform.height;
  let w, h;
  if (maxW / ratio <= maxH) {
    w = maxW;
    h = Math.round(maxW / ratio);
  } else {
    h = maxH;
    w = Math.round(maxH * ratio);
  }

  canvas.width        = w;
  canvas.height       = h;
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;

  drawCanvasPreview(canvas, grid);
}

function drawCanvasPreview(canvas, grid) {
  const ctx  = canvas.getContext('2d');
  const W    = canvas.width;
  const H    = canvas.height;
  const cols = grid?.cols ?? 1;
  const rows = grid?.rows ?? 1;
  const cs   = getComputedStyle(document.documentElement);

  ctx.fillStyle = cs.getPropertyValue('--color-bg-raised').trim();
  ctx.fillRect(0, 0, W, H);

  const gap   = 2;
  const cellW = W / cols;
  const cellH = H / rows;

  ctx.fillStyle = cs.getPropertyValue('--color-bg-mid').trim();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillRect(
        c * cellW + gap,
        r * cellH + gap,
        cellW - gap * 2,
        cellH - gap * 2,
      );
    }
  }

  ctx.strokeStyle = cs.getPropertyValue('--color-border-subtle').trim();
  ctx.lineWidth   = 0.5;
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, H);
    ctx.stroke();
  }
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(W, r * cellH);
    ctx.stroke();
  }
}

function setupLayoutScreen() {
  const platformEl = $('platform-picker');
  platformEl.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:var(--space-xs)';
  renderPicker('platform-picker', PLATFORMS, state.layout.platformId, id => {
    state.layout.platformId = id;
    updateLayoutCanvas();
  });

  const gridEl = $('grid-picker');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-xs)';
  renderPicker('grid-picker', GRIDS, state.layout.gridId, id => {
    state.layout.gridId = id;
    updateLayoutCanvas();
  });

  $('caption-project').addEventListener('input', e => {
    state.layout.captionProject = e.target.value;
  });
  $('caption-studio').addEventListener('input', e => {
    state.layout.captionStudio = e.target.value;
  });

  setupToggle('toggle-filename', on => { state.layout.showFilename = on; });
  setupToggle('toggle-watermark', on => { state.layout.showWatermark = on; });
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

async function handleRefresh(btn) {
  btn.classList.add('spinning');
  btn.disabled = true;

  try {
    const res = await window.gradeshare.refresh();
    if (!res.ok) return;

    state.project.stillAlbums      = res.data?.stillAlbums      ?? [];
    state.project.powerGradeAlbums = res.data?.powerGradeAlbums ?? [];

    renderSidebarList('still',      state.project.stillAlbums);
    renderSidebarList('powergrade', state.project.powerGradeAlbums);

    // If an album is currently selected, reload its stills with the fresh data
    const { selectedAlbumIndex, selectedAlbumType } = state.gallery;
    if (selectedAlbumIndex !== null) {
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
  $('btn-refresh').addEventListener('click', e => handleRefresh(e.currentTarget));
  $('btn-refresh-powergrade').addEventListener('click', e => handleRefresh(e.currentTarget));
  $('btn-dismiss-health-notice').addEventListener('click', () => {
    $('gallery-health-notice').hidden = true;
  });
  setupNewAlbumModal();

  document.getElementById('sidebar').addEventListener('click', (e) => {
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
      btn.hidden    = false;
      btn.disabled  = false;
      btn.textContent = 'Reconnect';
      $('btn-browse-gallery').hidden = true;
    }
  });
}

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
  setupTabNav();
  setupConnectScreen();
  setupGalleryToolbar();
  setupLayoutScreen();
  setupContactSheetScreen();
  setupExportScreen();
  setupSidebar();
  setupPythonStatusListener();
}

document.addEventListener('DOMContentLoaded', init);
