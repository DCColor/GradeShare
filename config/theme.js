/**
 * GradeShare — theme.js
 * Central design system. Every color, font, size, and spacing value
 * lives here. Nothing is hardcoded anywhere else in the app.
 * 
 * Usage:
 *   const { colors, fonts, spacing } = require('../config/theme');
 */

const theme = {

  // ── Brand ────────────────────────────────────────────────────────────────
  brand: {
    name:    'GradeShare',
    version: '0.1.0',
  },

  // ── Colors ───────────────────────────────────────────────────────────────
  colors: {

    // Primary accent — Scaffold red
    primary:        'rgb(230, 5, 1)',
    primaryHover:   'rgb(255, 30, 26)',
    primaryDim:     'rgb(120, 3, 1)',
    primaryBg:      'rgb(26, 5, 0)',

    // Secondary accent — amber, used for HDR indicators
    amber:          'rgb(245, 158, 11)',
    amberDim:       'rgb(122, 74, 0)',
    amberBg:        'rgb(26, 16, 0)',

    // Success — connection status, confirmations
    success:        'rgb(74, 222, 128)',
    successBg:      'rgb(15, 61, 31)',
    successBorder:  'rgb(22, 101, 52)',

    // Backgrounds — darkest to lightest
    bgDeep:         'rgb(16, 14, 12)',     // titlebar, sidebar, cards
    bgBase:         'rgb(24, 22, 20)',     // main app background
    bgMid:          'rgb(30, 26, 22)',     // hover states, inputs
    bgRaised:       'rgb(38, 34, 28)',     // elevated elements

    // Borders
    borderSubtle:   'rgb(42, 37, 32)',     // primary borders
    borderMid:      'rgb(58, 48, 40)',     // secondary borders
    borderStrong:   'rgb(80, 68, 56)',     // strong dividers

    // Text
    textPrimary:    'rgb(232, 224, 216)',  // main readable text
    textMid:        'rgb(144, 136, 128)',  // secondary text
    textDim:        'rgb(85, 80, 74)',     // labels, placeholders
    textFaint:      'rgb(64, 56, 46)',     // very subtle text

    // Still card placeholder palette — warm cinematic tones
    // Used when real images aren't loaded yet
    stillPalette: [
      'rgb(42, 26, 14)',
      'rgb(26, 30, 14)',
      'rgb(14, 26, 30)',
      'rgb(30, 14, 26)',
      'rgb(30, 26, 14)',
      'rgb(14, 30, 26)',
      'rgb(26, 14, 30)',
      'rgb(30, 14, 14)',
    ],
  },

  // ── Typography ───────────────────────────────────────────────────────────
  fonts: {
    family:       '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    familyMono:   '"SF Mono", "Fira Code", "Fira Mono", monospace',

    // Sizes
    size: {
      xxs:  '9px',
      xs:   '10px',
      sm:   '11px',
      base: '12px',
      md:   '13px',
      lg:   '14px',
      xl:   '16px',
      xxl:  '20px',
      logo: '30px',
    },

    // Weights
    weight: {
      normal:   400,
      medium:   500,
      semibold: 600,
    },

    // Line heights
    lineHeight: {
      tight:  1.3,
      base:   1.5,
      loose:  1.7,
    },

    // Letter spacing
    tracking: {
      tight:  '-0.02em',
      normal: '0',
      wide:   '0.02em',
      wider:  '0.06em',
      widest: '0.08em',
    },
  },

  // ── Spacing ──────────────────────────────────────────────────────────────
  spacing: {
    xxs:  '2px',
    xs:   '4px',
    sm:   '6px',
    md:   '8px',
    lg:   '12px',
    xl:   '16px',
    xxl:  '20px',
    xxxl: '24px',
  },

  // ── Layout ───────────────────────────────────────────────────────────────
  layout: {
    sidebarWidth:     '192px',
    titlebarHeight:   '38px',
    navHeight:        '36px',
    borderRadius: {
      sm:   '4px',
      md:   '6px',
      lg:   '8px',
      xl:   '12px',
      full: '9999px',
    },
    border: '0.5px solid',
  },

  // ── Component defaults ───────────────────────────────────────────────────
  components: {

    button: {
      primary: {
        background:   'rgb(230, 5, 1)',
        color:        'rgb(255, 255, 255)',
        borderRadius: '6px',
        fontWeight:   600,
        fontSize:     '12px',
        padding:      '5px 14px',
      },
      ghost: {
        background:   'transparent',
        color:        'rgb(230, 5, 1)',
        border:       '0.5px solid rgb(230, 5, 1)',
        borderRadius: '6px',
        fontWeight:   600,
        fontSize:     '12px',
        padding:      '5px 14px',
      },
      subtle: {
        background:   'transparent',
        color:        'rgb(85, 80, 74)',
        border:       '0.5px solid rgb(58, 48, 40)',
        borderRadius: '6px',
        fontSize:     '11px',
        padding:      '5px 10px',
      },
    },

    input: {
      background:   'rgb(16, 14, 12)',
      border:       '0.5px solid rgb(42, 37, 32)',
      borderFocus:  '0.5px solid rgb(230, 5, 1)',
      borderRadius: '5px',
      color:        'rgb(200, 192, 184)',
      fontSize:     '11px',
      padding:      '5px 7px',
    },

    card: {
      background:   'rgb(16, 14, 12)',
      border:       '0.5px solid rgb(42, 37, 32)',
      borderRadius: '8px',
      padding:      '11px 13px',
    },

    badge: {
      hdr: {
        background: 'rgb(26, 16, 0)',
        color:      'rgb(245, 158, 11)',
        border:     '0.5px solid rgb(122, 74, 0)',
        borderRadius: '3px',
        fontSize:   '9px',
        padding:    '2px 6px',
      },
      connected: {
        background: 'rgb(15, 61, 31)',
        color:      'rgb(74, 222, 128)',
        border:     '0.5px solid rgb(22, 101, 52)',
        borderRadius: '4px',
        fontSize:   '11px',
        padding:    '3px 8px',
      },
    },

    toggle: {
      width:        '26px',
      height:       '14px',
      borderRadius: '7px',
      off: {
        background: 'rgb(42, 37, 32)',
        border:     '0.5px solid rgb(58, 48, 40)',
        thumbBg:    'rgb(96, 96, 96)',
      },
      on: {
        background: 'rgb(230, 5, 1)',
        border:     '0.5px solid rgb(230, 5, 1)',
        thumbBg:    'rgb(255, 255, 255)',
      },
    },

    stillCard: {
      borderRadius:     '5px',
      borderIdle:       '2px solid transparent',
      borderHover:      '2px solid rgb(74, 68, 56)',
      borderSelected:   '2px solid rgb(230, 5, 1)',
      aspectRatio:      '16/9',
      checkSize:        '16px',
      metaFontSize:     '8px',
    },

    sidebar: {
      itemHeight:       '30px',
      activeBorderLeft: '2px solid rgb(230, 5, 1)',
      activeBg:         'rgb(30, 26, 22)',
      activeColor:      'rgb(230, 5, 1)',
    },
  },

  // ── Platform presets ─────────────────────────────────────────────────────
  // Canvas dimensions for each social platform
  platforms: [
    { id: 'ig-square',   label: 'IG Square',   ratio: '1/1',    width: 1080, height: 1080 },
    { id: 'ig-portrait', label: 'IG Portrait', ratio: '4/5',    width: 1080, height: 1350 },
    { id: 'ig-landscape',label: 'IG Landscape',ratio: '1.91/1', width: 1080, height:  566 },
    { id: 'ig-stories',  label: 'IG Stories',  ratio: '9/16',   width: 1080, height: 1920 },
    { id: 'tiktok',      label: 'TikTok',      ratio: '9/16',   width: 1080, height: 1920 },
    { id: 'fb-feed',     label: 'FB Feed',     ratio: '4/5',    width: 1080, height: 1350 },
    { id: 'fb-story',    label: 'FB Story',    ratio: '9/16',   width: 1080, height: 1920 },
    { id: 'youtube',     label: 'YouTube',     ratio: '16/9',   width: 1280, height:  720 },
    { id: 'linkedin',    label: 'LinkedIn',    ratio: '1.91/1', width: 1200, height:  627 },
    { id: 'x',           label: 'X',           ratio: '16/9',   width: 1600, height:  900 },
  ],

  // ── Grid layouts ─────────────────────────────────────────────────────────
  grids: [
    { id: '1x1', label: '1×1', cols: 1, rows: 1 },
    { id: '2x2', label: '2×2', cols: 2, rows: 2 },
    { id: '3x1', label: '3×1', cols: 1, rows: 3 },
    { id: '1x3', label: '1×3', cols: 3, rows: 1 },
    { id: '2x3', label: '2×3', cols: 2, rows: 3 },
    { id: 'ba',  label: 'B/A', cols: 2, rows: 1, beforeAfter: true },
  ],

  // ── Export formats ───────────────────────────────────────────────────────
  exportFormats: ['JPEG', 'PNG', 'TIFF'],
  exportQualities: ['95%', '85%', '75%'],
  exportResolutions: [
    { label: '1080px', value: 1080 },
    { label: '2160px', value: 2160 },
    { label: '4K',     value: 3840 },
  ],

  // ── Color science presets ────────────────────────────────────────────────
  colorScience: {
    sources: [
      { id: 'rec709-24',  label: 'Rec.709 2.4',   hdr: false },
      { id: 'rec709-22',  label: 'Rec.709 2.2',   hdr: false },
      { id: 'rec2020-pq', label: 'Rec.2020 PQ',   hdr: true  },
      { id: 'rec2020-hlg',label: 'Rec.2020 HLG',  hdr: true  },
      { id: 'p3-d65',     label: 'P3-D65',        hdr: false },
    ],
    outputs: [
      { id: 'srgb',       label: 'sRGB (web)',     hdr: false },
      { id: 'p3',         label: 'Display P3',     hdr: false },
      { id: 'hdr-heic',   label: 'HDR HEIC',       hdr: true  },
      { id: 'none',       label: 'No transform',   hdr: false },
    ],
  },

  // ── Contact sheet metadata fields ────────────────────────────────────────
  contactSheetFields: [
    { id: 'label',         label: 'Clip label',     default: true  },
    { id: 'record_tc',     label: 'Record TC',      default: true  },
    { id: 'source_tc',     label: 'Source TC',      default: true  },
    { id: 'timeline_name', label: 'Timeline name',  default: false },
    { id: 'resolution',    label: 'Resolution',     default: true  },
    { id: 'bit_depth',     label: 'Bit depth',      default: false },
    { id: 'create_time',   label: 'Date created',   default: false },
  ],

  // ── Contact sheet grid layouts ───────────────────────────────────────────
  contactSheetGrids: [
    { id: '2x2', label: '2×2', cols: 2, rows: 2 },
    { id: '3x2', label: '3×2', cols: 3, rows: 2 },
    { id: '4x2', label: '4×2', cols: 4, rows: 2 },
    { id: '3x3', label: '3×3', cols: 3, rows: 3 },
    { id: '4x3', label: '4×3', cols: 4, rows: 3 },
    { id: '1x4', label: '1×4', cols: 1, rows: 4 },
  ],

};

module.exports = theme;
