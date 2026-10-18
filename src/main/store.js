const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const DEFAULT_WALLPAPER_URL = '../../assets/wallpaper.jpg';

const ACCENT_COLORS = [
  { id: 'emerald', name: 'Emerald', hex: '#00ff88', rgb: '0, 255, 136', hover: '#33ff9f', dark: '#00994d' },
  { id: 'crimson', name: 'Crimson', hex: '#ff2a5f', rgb: '255, 42, 95', hover: '#ff5c85', dark: '#b8143d' },
  { id: 'cyan', name: 'Cyber Cyan', hex: '#00e5ff', rgb: '0, 229, 255', hover: '#4df0ff', dark: '#008fa3' },
  { id: 'violet', name: 'Amethyst', hex: '#a855f7', rgb: '168, 85, 247', hover: '#c084fc', dark: '#7e22ce' },
  { id: 'amber', name: 'Solar Gold', hex: '#f59e0b', rgb: '245, 158, 11', hover: '#fbbf24', dark: '#b45309' },
  { id: 'rose', name: 'Sakura', hex: '#ff4d94', rgb: '255, 77, 148', hover: '#ff80b3', dark: '#be185d' },
  { id: 'blue', name: 'Cobalt', hex: '#3b82f6', rgb: '59, 130, 246', hover: '#60a5fa', dark: '#1d4ed8' }
];

const LEGACY_DEFAULT_PIN_URLS = new Set([
  'https://github.com',
  'https://youtube.com',
  'https://reddit.com',
  'https://wikipedia.org',
  'https://twitch.tv',
  'https://news.ycombinator.com',
  'https://chatgpt.com',
  'https://claude.ai'
]);

const LEGACY_DEFAULT_PIN_IDS = new Set([
  'pin_github',
  'pin_youtube',
  'pin_reddit',
  'pin_wikipedia',
  'pin_twitch',
  'pin_hn',
  'pin_chatgpt',
  'pin_claude'
]);

const CLASSIC_THEME = {
  id: 'classic',
  name: 'Classic',
  description: 'Original Oni Browser configuration — cyber-emerald accents, dark glassmorphic chrome, kanji clock dashboard, and active Oni Shield.',
  version: '1.0.0',
  builtIn: true,
  createdAt: 1729036800000,
  updatedAt: 1729036800000,
  // Browser Chrome visual & structural constructs
  chrome: {
    cssVariables: {
      '--bg-main': '#0a0b0f',
      '--bg-titlebar': '#0d0f16',
      '--bg-toolbar': '#12141e',
      '--bg-tab-inactive': '#131622',
      '--bg-tab-active': '#181c2b',
      '--bg-surface': '#171a26',
      '--bg-surface-hover': '#1e2233',
      '--bg-surface-active': '#252b40',
      '--accent-green': '#00ff88',
      '--accent-rgb': '0, 255, 136',
      '--accent-green-hover': '#33ff9f',
      '--accent-green-glow': 'rgba(0, 255, 136, 0.35)',
      '--accent-glow': 'rgba(0, 255, 136, 0.4)',
      '--accent-green-dark': '#00994d',
      '--accent-violet': '#8b5cf6',
      '--accent-cyan': '#00e5ff',
      '--accent-emerald': '#00ff88',
      '--accent-amber': '#f59e0b',
      '--text-primary': '#f8fafc',
      '--text-secondary': '#94a3b8',
      '--text-muted': '#64748b',
      '--border-subtle': 'rgba(255, 255, 255, 0.07)',
      '--border-focus': 'rgba(0, 255, 136, 0.65)',
      '--font-family': "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'JetBrains Mono', monospace",
      '--radius-sm': '6px',
      '--radius-md': '10px',
      '--radius-lg': '14px',
      '--radius-full': '9999px',
      '--titlebar-height': '40px',
      '--toolbar-height': '44px',
      '--bookmarks-height': '32px'
    },
    layout: {
      tabBarPosition: 'top',
      toolbarPosition: 'top',
      windowControlsPosition: 'right',
      showBrandEmblem: true,
      brandText: 'ONI',
      brandIcon: '../../assets/app-icon.png',
      tabStyle: 'rounded-top',
      activeTabIndicator: 'top-glow-line',
      omniboxStyle: 'pill',
      showHomeButton: true,
      showShieldButton: true,
      showBookmarksButton: true,
      showDownloadsButton: true,
      showHistoryButton: true,
      showFindButton: true,
      showDevToolsButton: true,
      showBookmarksBar: true
    },
    customCss: ''
  },
  // New Tab Dashboard visual & functional constructs
  newTab: {
    cssVariables: {
      '--bg-dark': '#08090d',
      '--accent-green': '#00ff88',
      '--accent-rgb': '0, 255, 136',
      '--accent-green-hover': '#33ff9f',
      '--accent-green-dark': '#00994d',
      '--accent-glow': 'rgba(0, 255, 136, 0.4)',
      '--accent-green-glow': 'rgba(0, 255, 136, 0.35)',
      '--accent-cyan': '#00e5ff',
      '--accent-violet': '#8b5cf6',
      '--text-main': '#f8fafc',
      '--text-muted': '#94a3b8',
      '--glass-bg': 'rgba(16, 18, 28, 0.65)',
      '--glass-border': 'rgba(255, 255, 255, 0.08)',
      '--font-sans': "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
      '--font-mono': "'JetBrains Mono', monospace"
    },
    wallpaper: {
      image: DEFAULT_WALLPAPER_URL,
      brightness: 0.65,
      saturate: 1.15,
      hoverZoom: true,
      overlayGradient: 'radial-gradient(circle at center, rgba(10, 11, 16, 0.4) 0%, rgba(6, 7, 10, 0.9) 100%), linear-gradient(180deg, rgba(8, 9, 13, 0.5) 0%, rgba(8, 9, 13, 0.85) 100%)'
    },
    hero: {
      visible: true,
      emblemIcon: '../../assets/app-icon.png',
      rotatingGlow: true,
      titlePrefix: 'ONI ',
      titleAccent: 'BROWSER',
      defaultGreeting: 'Hunt the Web.',
      greetings: {
        morning: 'Good Morning, Hunter.',
        afternoon: 'Good Afternoon, Hunter.',
        evening: 'Good Evening, Hunter.',
        night: 'Night Operations Active.'
      }
    },
    clock: {
      visible: true,
      use24Hour: true,
      showSeconds: true,
      showKanjiDate: true,
      showEnglishDate: true
    },
    search: {
      visible: true,
      placeholder: 'Search the web or type a URL...',
      showEngineSelector: true
    },
    shortcuts: {
      visible: true,
      items: []
    },
    footer: {
      visible: true,
      showShieldStatus: true,
      quote: '知識は力である • Knowledge is Power',
      versionBadge: 'v1.0.0 Standalone'
    },
    customCss: ''
  },
  // Functional & behavioral constructs
  behavior: {
    searchEngine: 'google',
    homeUrl: 'oni://newtab',
    showBookmarksBar: true,
    adBlockEnabled: true,
    hardwareAcceleration: true,
    restoreLastSession: false,
    windowBackgroundColor: '#0c0d12'
  }
};

const ONI_OS_THEME = {
  id: 'oni-os',
  name: 'Oni OS',
  description: 'Operating System desktop overhaul — interactive desktop app icons, glassmorphic OS dock & start menu, floating OS windows, system widgets, and taskbar chrome.',
  version: '1.0.0',
  builtIn: true,
  createdAt: 1729036800000,
  updatedAt: 1729036800000,
  // Browser Chrome visual & structural constructs (OS Taskbar & System Bar)
  chrome: {
    cssVariables: {
      '--bg-main': '#06080d',
      '--bg-titlebar': '#070a10',
      '--bg-toolbar': '#0b0f19',
      '--bg-tab-inactive': 'rgba(17, 22, 34, 0.72)',
      '--bg-tab-active': 'rgba(0, 255, 136, 0.12)',
      '--bg-surface': '#111624',
      '--bg-surface-hover': '#192034',
      '--bg-surface-active': '#222b45',
      '--accent-green': '#00ff88',
      '--accent-rgb': '0, 255, 136',
      '--accent-green-hover': '#33ff9f',
      '--accent-green-glow': 'rgba(0, 255, 136, 0.38)',
      '--accent-glow': 'rgba(0, 255, 136, 0.4)',
      '--accent-green-dark': '#00994d',
      '--accent-violet': '#8b5cf6',
      '--accent-cyan': '#00e5ff',
      '--accent-emerald': '#00ff88',
      '--accent-amber': '#f59e0b',
      '--text-primary': '#f8fafc',
      '--text-secondary': '#94a3b8',
      '--text-muted': '#64748b',
      '--border-subtle': 'rgba(0, 255, 136, 0.12)',
      '--border-focus': 'rgba(0, 229, 255, 0.75)',
      '--font-family': "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-mono': "'JetBrains Mono', monospace",
      '--radius-sm': '8px',
      '--radius-md': '10px',
      '--radius-lg': '16px',
      '--radius-full': '9999px',
      '--titlebar-height': '42px',
      '--toolbar-height': '44px',
      '--bookmarks-height': '30px'
    },
    layout: {
      tabBarPosition: 'os-dock-bottom',
      toolbarPosition: 'hidden',
      windowControlsPosition: 'os-menubar-right',
      showTitlebar: false,
      showToolbar: false,
      showOsMenubar: true,
      showBrandEmblem: true,
      brandText: 'ONI OS',
      brandIcon: '../../assets/app-icon.png',
      tabStyle: 'os-dock-icon',
      activeTabIndicator: 'os-bottom-pill',
      omniboxStyle: 'hidden',
      showHomeButton: false,
      showShieldButton: false,
      showBookmarksButton: false,
      showDownloadsButton: false,
      showHistoryButton: false,
      showFindButton: false,
      showDevToolsButton: false,
      showBookmarksBar: false
    },
    customCss: `
      body.theme-oni-os #titlebar,
      body.theme-oni-os #toolbar,
      body.theme-oni-os #bookmarks-bar {
        display: none !important;
      }
      body.theme-oni-os #os-menubar {
        display: flex !important;
      }
    `
  },
  // New Tab Dashboard visual & functional constructs (Full OS Desktop Mode)
  newTab: {
    layoutMode: 'desktop',
    cssVariables: {
      '--bg-dark': '#05070b',
      '--accent-green': '#00ff88',
      '--accent-rgb': '0, 255, 136',
      '--accent-green-hover': '#33ff9f',
      '--accent-green-dark': '#00994d',
      '--accent-glow': 'rgba(0, 255, 136, 0.4)',
      '--accent-green-glow': 'rgba(0, 255, 136, 0.38)',
      '--accent-cyan': '#00e5ff',
      '--accent-violet': '#8b5cf6',
      '--text-main': '#f8fafc',
      '--text-muted': '#94a3b8',
      '--glass-bg': 'rgba(12, 16, 26, 0.72)',
      '--glass-border': 'rgba(0, 255, 136, 0.18)',
      '--font-sans': "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
      '--font-mono': "'JetBrains Mono', monospace"
    },
    wallpaper: {
      image: DEFAULT_WALLPAPER_URL,
      brightness: 0.58,
      saturate: 1.25,
      hoverZoom: false,
      overlayGradient: 'radial-gradient(circle at 18% 22%, rgba(0, 255, 136, 0.1) 0%, transparent 45%), radial-gradient(circle at 82% 78%, rgba(0, 229, 255, 0.1) 0%, transparent 45%), linear-gradient(180deg, rgba(4, 6, 10, 0.35) 0%, rgba(4, 6, 10, 0.8) 100%)'
    },
    desktop: {
      showDesktopWidgets: true,
      showDock: true,
      systemName: 'ONI OS // KERNEL 44.7',
      userName: 'Hunter'
    },
    hero: {
      visible: true,
      emblemIcon: '../../assets/app-icon.png',
      rotatingGlow: true,
      titlePrefix: 'ONI ',
      titleAccent: 'OS',
      defaultGreeting: 'System Online.',
      greetings: {
        morning: 'System Ready • Morning Shift',
        afternoon: 'System Ready • Active Session',
        evening: 'System Ready • Evening Ops',
        night: 'System Ready • Night Protocol'
      }
    },
    clock: {
      visible: true,
      use24Hour: true,
      showSeconds: true,
      showKanjiDate: true,
      showEnglishDate: true
    },
    search: {
      visible: true,
      placeholder: 'Oni OS Search — Search web, launch app, or enter URL...',
      showEngineSelector: true
    },
    shortcuts: {
      visible: true,
      items: []
    },
    footer: {
      visible: true,
      showShieldStatus: true,
      quote: '知識は力である • Oni OS Desktop Environment',
      versionBadge: 'Oni OS v1.0'
    },
    customCss: ''
  },
  behavior: {
    searchEngine: 'google',
    homeUrl: 'oni://newtab',
    showBookmarksBar: false,
    adBlockEnabled: true,
    hardwareAcceleration: true,
    restoreLastSession: false,
    windowBackgroundColor: '#06080d'
  }
};

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizePinUrl(rawUrl) {
  if (!rawUrl) return '';
  if (/^https?:\/\/login\.disney\.com\/.*DTCI-DISNEYPLUS\.WEB.*\/bridge\/web/i.test(rawUrl)) {
    return 'https://www.disneyplus.com/login';
  }
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    const pathname = u.pathname.replace(/\/+$/, '');
    return `${u.protocol}//${host}${pathname}${u.search}`;
  } catch (e) {
    return String(rawUrl).trim().replace(/\/+$/, '').toLowerCase();
  }
}

class Store {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.filePath = path.join(this.userDataPath, 'oni-browser-data.json');
    this.data = this.loadData();
  }

  getClassicTheme() {
    return cloneDeep(CLASSIC_THEME);
  }

  getOniOsTheme() {
    return cloneDeep(ONI_OS_THEME);
  }

  getAccentColors() {
    return cloneDeep(ACCENT_COLORS);
  }

  getDefaultPinnedApps() {
    return [];
  }

  applyAccentAndWallpaperToThemes(themes, settings) {
    if (!Array.isArray(themes) || !settings) return;
    const accentId = settings.accentColor || 'emerald';
    const accent = ACCENT_COLORS.find(c => c.id === accentId) || ACCENT_COLORS[0];
    const activeWallpaper = settings.activeWallpaper || DEFAULT_WALLPAPER_URL;

    themes.forEach(t => {
      if (!t.chrome) t.chrome = { cssVariables: {}, layout: {} };
      if (!t.chrome.cssVariables) t.chrome.cssVariables = {};
      t.chrome.cssVariables['--accent-green'] = accent.hex;
      t.chrome.cssVariables['--accent-emerald'] = accent.hex;
      t.chrome.cssVariables['--accent-rgb'] = accent.rgb;
      t.chrome.cssVariables['--accent-green-hover'] = accent.hover;
      t.chrome.cssVariables['--accent-green-dark'] = accent.dark;
      t.chrome.cssVariables['--accent-green-glow'] = `rgba(${accent.rgb}, 0.38)`;
      t.chrome.cssVariables['--accent-glow'] = `rgba(${accent.rgb}, 0.4)`;
      t.chrome.cssVariables['--border-focus'] = `rgba(${accent.rgb}, 0.65)`;
      if (t.id === 'oni-os') {
        t.chrome.cssVariables['--bg-tab-active'] = `rgba(${accent.rgb}, 0.12)`;
        t.chrome.cssVariables['--border-subtle'] = `rgba(${accent.rgb}, 0.12)`;
      }

      if (!t.newTab) t.newTab = { cssVariables: {}, wallpaper: {} };
      if (!t.newTab.cssVariables) t.newTab.cssVariables = {};
      t.newTab.cssVariables['--accent-green'] = accent.hex;
      t.newTab.cssVariables['--accent-emerald'] = accent.hex;
      t.newTab.cssVariables['--accent-rgb'] = accent.rgb;
      t.newTab.cssVariables['--accent-green-hover'] = accent.hover;
      t.newTab.cssVariables['--accent-green-dark'] = accent.dark;
      t.newTab.cssVariables['--accent-glow'] = `rgba(${accent.rgb}, 0.4)`;
      t.newTab.cssVariables['--accent-green-glow'] = `rgba(${accent.rgb}, 0.38)`;
      if (t.id === 'oni-os') {
        t.newTab.cssVariables['--glass-border'] = `rgba(${accent.rgb}, 0.18)`;
      }

      if (!t.newTab.wallpaper) t.newTab.wallpaper = {};
      t.newTab.wallpaper.image = activeWallpaper;
      if (t.id === 'oni-os') {
        t.newTab.wallpaper.overlayGradient = `radial-gradient(circle at 18% 22%, rgba(${accent.rgb}, 0.1) 0%, transparent 45%), radial-gradient(circle at 82% 78%, rgba(0, 229, 255, 0.1) 0%, transparent 45%), linear-gradient(180deg, rgba(4, 6, 10, 0.35) 0%, rgba(4, 6, 10, 0.8) 100%)`;
      }
    });
  }

  getDefaultData() {
    const pins = [];
    const settings = {
      searchEngine: 'google', // 'google' | 'duckduckgo' | 'bing' | 'brave'
      homeUrl: 'oni://home',
      showBookmarksBar: false,
      theme: 'oni-os',
      activeThemeId: 'oni-os',
      accentColor: 'emerald',
      activeWallpaper: DEFAULT_WALLPAPER_URL,
      customWallpapers: [],
      desktopWidgets: {
        clock: { enabled: true, gridCol: null, gridRow: 0 },
        search: { enabled: true, gridCol: null, gridRow: 2 },
        shield: { enabled: true, gridCol: null, gridRow: 3 }
      },
      defaultPinsCleared_v2: true,
      adBlockEnabled: true,
      hardwareAcceleration: true,
      restoreLastSession: false
    };
    const themes = [cloneDeep(ONI_OS_THEME), cloneDeep(CLASSIC_THEME)];
    this.applyAccentAndWallpaperToThemes(themes, settings);
    return {
      settings,
      themes,
      bookmarks: pins,
      desktopApps: pins,
      history: [],
      downloads: []
    };
  }

  loadData() {
    const defaults = this.getDefaultData();
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const parsedWidgets = (parsed.settings && parsed.settings.desktopWidgets) || {};
        const mergedWidgets = {
          clock: { ...defaults.settings.desktopWidgets.clock, ...(parsedWidgets.clock || {}) },
          search: { ...defaults.settings.desktopWidgets.search, ...(parsedWidgets.search || {}) },
          shield: { ...defaults.settings.desktopWidgets.shield, ...(parsedWidgets.shield || {}) }
        };
        const mergedSettings = {
          ...defaults.settings,
          ...(parsed.settings || {}),
          searchEngine: (parsed.settings && parsed.settings.searchEngine) || 'google',
          accentColor: (parsed.settings && parsed.settings.accentColor) || 'emerald',
          activeWallpaper: (parsed.settings && parsed.settings.activeWallpaper) || DEFAULT_WALLPAPER_URL,
          customWallpapers: Array.isArray(parsed.settings && parsed.settings.customWallpapers)
            ? parsed.settings.customWallpapers
            : [],
          desktopWidgets: mergedWidgets
        };

        // Ensure themes array exists and includes both Oni OS and Classic themes
        let themes = Array.isArray(parsed.themes) && parsed.themes.length > 0
          ? parsed.themes
          : [cloneDeep(ONI_OS_THEME), cloneDeep(CLASSIC_THEME)];

        const oniOsIdx = themes.findIndex(t => t.id === 'oni-os');
        if (oniOsIdx === -1) {
          themes.unshift(cloneDeep(ONI_OS_THEME));
        } else {
          themes[oniOsIdx] = {
            ...cloneDeep(ONI_OS_THEME),
            ...themes[oniOsIdx],
            chrome: cloneDeep(ONI_OS_THEME.chrome),
            newTab: { ...cloneDeep(ONI_OS_THEME.newTab), ...(themes[oniOsIdx].newTab || {}), layoutMode: 'desktop' },
            behavior: { ...ONI_OS_THEME.behavior, ...(themes[oniOsIdx].behavior || {}), searchEngine: mergedSettings.searchEngine }
          };
        }

        const classicIdx = themes.findIndex(t => t.id === 'classic');
        if (classicIdx === -1) {
          themes.push(cloneDeep(CLASSIC_THEME));
        } else {
          themes[classicIdx].chrome = cloneDeep(CLASSIC_THEME.chrome);
          themes[classicIdx].newTab = { ...cloneDeep(CLASSIC_THEME.newTab), ...(themes[classicIdx].newTab || {}) };
          themes[classicIdx].behavior = { ...(themes[classicIdx].behavior || {}), searchEngine: mergedSettings.searchEngine };
        }

        // Ensure Oni OS is strictly top/first in themes array
        const oniOsTheme = themes.find(t => t.id === 'oni-os') || cloneDeep(ONI_OS_THEME);
        const classicTheme = themes.find(t => t.id === 'classic') || cloneDeep(CLASSIC_THEME);
        const otherThemes = themes.filter(t => t.id !== 'oni-os' && t.id !== 'classic');
        themes = [oniOsTheme, classicTheme, ...otherThemes];

        // Collect existing grid coordinates from previous desktopApps or bookmarks
        const gridCoords = new Map();
        if (Array.isArray(parsed.desktopApps)) {
          parsed.desktopApps.forEach((d, idx) => {
            const norm = normalizePinUrl(d.url);
            const coords = {
              gridCol: (d.gridCol !== undefined && !isNaN(d.gridCol)) ? Number(d.gridCol) : Math.floor(idx / 6),
              gridRow: (d.gridRow !== undefined && !isNaN(d.gridRow)) ? Number(d.gridRow) : (idx % 6)
            };
            if (d.id) gridCoords.set(d.id, coords);
            if (norm) gridCoords.set(norm, coords);
          });
        }
        if (Array.isArray(parsed.bookmarks)) {
          parsed.bookmarks.forEach((b) => {
            if (b.gridCol !== undefined && b.gridRow !== undefined) {
              const coords = { gridCol: Number(b.gridCol), gridRow: Number(b.gridRow) };
              if (b.id) gridCoords.set(b.id, coords);
              const norm = normalizePinUrl(b.url);
              if (norm) gridCoords.set(norm, coords);
            }
          });
        }

        const shouldStripLegacyDefaults = !(parsed.settings && parsed.settings.defaultPinsCleared_v2);
        mergedSettings.defaultPinsCleared_v2 = true;

        // Unify Pinned Apps (single source of truth for both Home Page & Start Menu)
        let unifiedPins = [];
        const seenUrls = new Set();
        const addPinCandidate = (p) => {
          if (!p || !p.url || p.url.startsWith('oni://')) return;
          const norm = normalizePinUrl(p.url);
          if (!norm || seenUrls.has(norm)) return;
          if (shouldStripLegacyDefaults) {
            if (LEGACY_DEFAULT_PIN_IDS.has(p.id) || LEGACY_DEFAULT_PIN_URLS.has(norm) || p.createdAt === 1729036800000) {
              return;
            }
          }
          seenUrls.add(norm);
          const iconUrl = p.icon || p.favicon || '';
          const existingCoords = (p.id && gridCoords.get(p.id)) || gridCoords.get(norm);
          const col = (p.gridCol !== undefined && !isNaN(p.gridCol))
            ? Number(p.gridCol)
            : (existingCoords ? existingCoords.gridCol : undefined);
          const row = (p.gridRow !== undefined && !isNaN(p.gridRow))
            ? Number(p.gridRow)
            : (existingCoords ? existingCoords.gridRow : undefined);

          unifiedPins.push({
            id: p.id || ('pin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
            title: p.title || 'Untitled',
            url: p.url,
            icon: iconUrl,
            favicon: iconUrl,
            gridCol: col,
            gridRow: row,
            createdAt: p.createdAt || Date.now()
          });
        };

        // Only load user-created bookmarks/desktopApps (never seed from theme defaults)
        if (Array.isArray(parsed.bookmarks)) {
          parsed.bookmarks.forEach(addPinCandidate);
        }
        if (Array.isArray(parsed.desktopApps)) {
          parsed.desktopApps.forEach(addPinCandidate);
        }

        // Assign free grid slots to any apps missing coordinates
        const occupied = new Set();
        unifiedPins.forEach(p => {
          if (p.gridCol !== undefined && p.gridRow !== undefined) {
            occupied.add(`${p.gridCol},${p.gridRow}`);
          }
        });
        unifiedPins.forEach((p, idx) => {
          if (p.gridCol === undefined || p.gridRow === undefined) {
            for (let c = 0; c < 30; c++) {
              let found = false;
              for (let r = 0; r < 6; r++) {
                if (!occupied.has(`${c},${r}`)) {
                  p.gridCol = c;
                  p.gridRow = r;
                  occupied.add(`${c},${r}`);
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
            if (p.gridCol === undefined) {
              p.gridCol = Math.floor(idx / 6);
              p.gridRow = idx % 6;
            }
          }
        });

        // Sync unified Pinned Apps back into all themes' shortcuts
        themes.forEach(t => {
          if (t.newTab && t.newTab.shortcuts) {
            t.newTab.shortcuts.items = unifiedPins.map(p => ({
              id: p.id,
              title: p.title,
              url: p.url,
              icon: p.icon || p.favicon || '',
              favicon: p.favicon || p.icon || '',
              gridCol: p.gridCol,
              gridRow: p.gridRow
            }));
          }
        });

        // Migrate legacy 'oni-cyber' theme setting to 'oni-os'
        if (!mergedSettings.activeThemeId || mergedSettings.theme === 'oni-cyber') {
          mergedSettings.activeThemeId = 'oni-os';
          mergedSettings.theme = 'oni-os';
        }
        if (!themes.some(t => t.id === mergedSettings.activeThemeId)) {
          mergedSettings.activeThemeId = 'oni-os';
          mergedSettings.theme = 'oni-os';
        }

        // Apply active Accent Color and Wallpaper across all themes
        this.applyAccentAndWallpaperToThemes(themes, mergedSettings);

        const data = {
          ...defaults,
          ...parsed,
          settings: mergedSettings,
          themes,
          bookmarks: unifiedPins,
          desktopApps: unifiedPins
        };
        this.saveData(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to load store data:', err);
    }
    this.saveData(defaults);
    return defaults;
  }

  saveData(data = this.data) {
    try {
      fs.mkdirSync(this.userDataPath, { recursive: true });
      if (data && data.bookmarks) {
        data.desktopApps = data.bookmarks;
      }
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save store data:', err);
    }
  }

  syncPinnedAppsToThemes() {
    if (!Array.isArray(this.data.themes)) return;
    const items = (this.data.bookmarks || []).map(p => ({
      id: p.id,
      title: p.title,
      url: p.url,
      icon: p.icon || p.favicon || '',
      favicon: p.favicon || p.icon || '',
      gridCol: p.gridCol,
      gridRow: p.gridRow
    }));
    this.data.themes.forEach(t => {
      if (!t.newTab) t.newTab = {};
      if (!t.newTab.shortcuts) t.newTab.shortcuts = { visible: true, items: [] };
      t.newTab.shortcuts.items = items;
    });
  }

  // Settings
  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    const prevWidgets = (this.data.settings && this.data.settings.desktopWidgets) || {
      clock: { enabled: true, gridCol: null, gridRow: 0 },
      search: { enabled: true, gridCol: null, gridRow: 2 },
      shield: { enabled: true, gridCol: null, gridRow: 3 }
    };
    this.data.settings = { ...this.data.settings, ...newSettings };
    if (newSettings && newSettings.desktopWidgets) {
      this.data.settings.desktopWidgets = {
        clock: { ...prevWidgets.clock, ...(newSettings.desktopWidgets.clock || {}) },
        search: { ...prevWidgets.search, ...(newSettings.desktopWidgets.search || {}) },
        shield: { ...prevWidgets.shield, ...(newSettings.desktopWidgets.shield || {}) }
      };
    }
    if (newSettings.activeThemeId) {
      this.data.settings.theme = newSettings.activeThemeId;
    } else if (newSettings.theme) {
      this.data.settings.activeThemeId = newSettings.theme;
    }
    if (newSettings.searchEngine && Array.isArray(this.data.themes)) {
      this.data.themes.forEach(t => {
        if (t.behavior) t.behavior.searchEngine = newSettings.searchEngine;
      });
    }
    if (newSettings.showBookmarksBar !== undefined && Array.isArray(this.data.themes)) {
      const classicTheme = this.data.themes.find(t => t.id === 'classic');
      if (classicTheme) {
        if (classicTheme.behavior) classicTheme.behavior.showBookmarksBar = newSettings.showBookmarksBar;
        if (classicTheme.chrome && classicTheme.chrome.layout) classicTheme.chrome.layout.showBookmarksBar = newSettings.showBookmarksBar;
      }
    }
    this.applyAccentAndWallpaperToThemes(this.data.themes, this.data.settings);
    this.saveData();
    return this.data.settings;
  }

  setAccentColor(colorId) {
    const valid = ACCENT_COLORS.find(c => c.id === colorId) || ACCENT_COLORS[0];
    this.data.settings.accentColor = valid.id;
    this.applyAccentAndWallpaperToThemes(this.data.themes, this.data.settings);
    this.saveData();
    return {
      theme: this.getActiveTheme(),
      settings: this.data.settings
    };
  }

  setWallpaper(wallpaperUrl) {
    this.data.settings.activeWallpaper = wallpaperUrl || DEFAULT_WALLPAPER_URL;
    this.applyAccentAndWallpaperToThemes(this.data.themes, this.data.settings);
    this.saveData();
    return {
      theme: this.getActiveTheme(),
      settings: this.data.settings
    };
  }

  addCustomWallpaper(sourceFilePath) {
    if (!sourceFilePath || !fs.existsSync(sourceFilePath)) {
      return { theme: this.getActiveTheme(), settings: this.data.settings };
    }
    const wallpapersDir = path.join(this.userDataPath, 'wallpapers');
    fs.mkdirSync(wallpapersDir, { recursive: true });
    const ext = path.extname(sourceFilePath) || '.jpg';
    const baseName = path.basename(sourceFilePath, ext);
    const destFilename = `wp_${Date.now()}${ext}`;
    const destPath = path.join(wallpapersDir, destFilename);
    fs.copyFileSync(sourceFilePath, destPath);

    const fileUrl = pathToFileURL(destPath).href;
    const wpEntry = {
      id: `wp_${Date.now()}`,
      name: baseName,
      url: fileUrl,
      filePath: destPath
    };

    if (!Array.isArray(this.data.settings.customWallpapers)) {
      this.data.settings.customWallpapers = [];
    }
    this.data.settings.customWallpapers.push(wpEntry);
    this.data.settings.activeWallpaper = fileUrl;
    this.applyAccentAndWallpaperToThemes(this.data.themes, this.data.settings);
    this.saveData();
    return {
      theme: this.getActiveTheme(),
      settings: this.data.settings,
      wallpaper: wpEntry
    };
  }

  removeCustomWallpaper(idOrUrl) {
    if (!Array.isArray(this.data.settings.customWallpapers)) {
      return { theme: this.getActiveTheme(), settings: this.data.settings };
    }
    const target = this.data.settings.customWallpapers.find(w => w.id === idOrUrl || w.url === idOrUrl);
    this.data.settings.customWallpapers = this.data.settings.customWallpapers.filter(w => w.id !== idOrUrl && w.url !== idOrUrl);
    if (target && target.filePath && fs.existsSync(target.filePath)) {
      try {
        fs.unlinkSync(target.filePath);
      } catch (e) {}
    }
    if (this.data.settings.activeWallpaper === idOrUrl || (target && this.data.settings.activeWallpaper === target.url)) {
      this.data.settings.activeWallpaper = DEFAULT_WALLPAPER_URL;
    }
    this.applyAccentAndWallpaperToThemes(this.data.themes, this.data.settings);
    this.saveData();
    return {
      theme: this.getActiveTheme(),
      settings: this.data.settings
    };
  }

  // Themes
  getThemes() {
    if (!Array.isArray(this.data.themes) || this.data.themes.length === 0) {
      this.data.themes = [cloneDeep(ONI_OS_THEME), cloneDeep(CLASSIC_THEME)];
    }
    const oniOsTheme = this.data.themes.find(t => t.id === 'oni-os');
    if (oniOsTheme && this.data.themes[0].id !== 'oni-os') {
      const rest = this.data.themes.filter(t => t.id !== 'oni-os');
      this.data.themes = [oniOsTheme, ...rest];
      this.saveData();
    }
    return this.data.themes;
  }

  getActiveTheme() {
    const themes = this.getThemes();
    const activeId = this.data.settings.activeThemeId || this.data.settings.theme || 'oni-os';
    return themes.find(t => t.id === activeId) || themes.find(t => t.id === 'oni-os') || themes[0];
  }

  applyTheme(themeId) {
    const themes = this.getThemes();
    const target = themes.find(t => t.id === themeId);
    if (!target) return { theme: this.getActiveTheme(), settings: this.data.settings };

    this.data.settings.activeThemeId = target.id;
    this.data.settings.theme = target.id;

    if (target.behavior) {
      if (target.behavior.searchEngine !== undefined) {
        this.data.settings.searchEngine = target.behavior.searchEngine;
      }
      if (target.behavior.homeUrl !== undefined) {
        this.data.settings.homeUrl = target.behavior.homeUrl;
      }
      if (target.behavior.showBookmarksBar !== undefined) {
        this.data.settings.showBookmarksBar = target.behavior.showBookmarksBar;
      }
      if (target.behavior.adBlockEnabled !== undefined) {
        this.data.settings.adBlockEnabled = target.behavior.adBlockEnabled;
      }
    }

    this.applyAccentAndWallpaperToThemes(this.data.themes, this.data.settings);
    this.saveData();
    return {
      theme: target,
      settings: this.data.settings
    };
  }

  saveCurrentConfigAsTheme(options = {}) {
    const baseTheme = cloneDeep(this.getActiveTheme() || CLASSIC_THEME);
    const currentSettings = this.getSettings();
    const rawName = (options.name || 'Classic').trim() || 'Classic';
    const id = options.id || rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('theme_' + Date.now());

    const existingIdx = this.data.themes.findIndex(t => t.id === id);
    const now = Date.now();

    const mergedChrome = {
      ...baseTheme.chrome,
      ...(options.chrome || {}),
      cssVariables: {
        ...(baseTheme.chrome && baseTheme.chrome.cssVariables ? baseTheme.chrome.cssVariables : {}),
        ...(options.chrome && options.chrome.cssVariables ? options.chrome.cssVariables : {})
      },
      layout: {
        ...(baseTheme.chrome && baseTheme.chrome.layout ? baseTheme.chrome.layout : {}),
        showBookmarksBar: currentSettings.showBookmarksBar !== false,
        ...(options.chrome && options.chrome.layout ? options.chrome.layout : {})
      }
    };

    const mergedNewTab = {
      ...baseTheme.newTab,
      ...(options.newTab || {}),
      cssVariables: {
        ...(baseTheme.newTab && baseTheme.newTab.cssVariables ? baseTheme.newTab.cssVariables : {}),
        ...(options.newTab && options.newTab.cssVariables ? options.newTab.cssVariables : {})
      }
    };

    if (mergedNewTab.shortcuts && Array.isArray(mergedNewTab.shortcuts.items)) {
      this.data.bookmarks = mergedNewTab.shortcuts.items.map(p => ({
        id: p.id || ('pin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
        title: p.title || 'Untitled',
        url: p.url,
        icon: p.icon || p.favicon || '',
        favicon: p.favicon || p.icon || '',
        createdAt: p.createdAt || now
      }));
    }

    const mergedBehavior = {
      ...(baseTheme.behavior || {}),
      searchEngine: currentSettings.searchEngine || 'google',
      homeUrl: currentSettings.homeUrl || 'oni://newtab',
      showBookmarksBar: currentSettings.showBookmarksBar !== false,
      adBlockEnabled: currentSettings.adBlockEnabled !== false,
      hardwareAcceleration: currentSettings.hardwareAcceleration !== false,
      restoreLastSession: !!currentSettings.restoreLastSession,
      ...(options.behavior || {})
    };

    const savedTheme = {
      ...baseTheme,
      id,
      name: rawName,
      description: options.description !== undefined
        ? options.description
        : (existingIdx >= 0 ? this.data.themes[existingIdx].description : `Saved browser configuration (${rawName}).`),
      version: options.version || '1.0.0',
      builtIn: id === 'classic' ? true : !!(existingIdx >= 0 && this.data.themes[existingIdx].builtIn),
      createdAt: existingIdx >= 0 ? this.data.themes[existingIdx].createdAt : now,
      updatedAt: now,
      chrome: mergedChrome,
      newTab: mergedNewTab,
      behavior: mergedBehavior
    };

    if (existingIdx >= 0) {
      this.data.themes[existingIdx] = savedTheme;
    } else {
      this.data.themes.push(savedTheme);
    }

    this.syncPinnedAppsToThemes();
    this.data.settings.activeThemeId = savedTheme.id;
    this.data.settings.theme = savedTheme.id;
    this.saveData();

    return {
      theme: savedTheme,
      themes: this.data.themes,
      settings: this.data.settings
    };
  }

  // Pinned Apps (Unified Bookmarks & Desktop Apps)
  getBookmarks() {
    return this.data.bookmarks || [];
  }

  addBookmark(bookmark) {
    if (!bookmark || !bookmark.url) return this.getBookmarks();
    if (/^https?:\/\/login\.disney\.com\/.*DTCI-DISNEYPLUS\.WEB.*\/bridge\/web/i.test(bookmark.url)) {
      bookmark.url = 'https://www.disneyplus.com/login';
      if (!bookmark.title || bookmark.title === 'Loading...' || bookmark.title.includes('disney.com')) {
        bookmark.title = 'Disney+ Log In';
      }
    }
    let iconUrl = bookmark.icon || bookmark.favicon || '';
    if (!iconUrl) {
      try {
        const u = new URL(bookmark.url);
        iconUrl = `${u.origin}/favicon.ico`;
      } catch (e) {
        iconUrl = 'assets/icon.png';
      }
    }

    const normItem = normalizePinUrl(bookmark.url);
    const existing = (this.data.bookmarks || []).find(b =>
      normalizePinUrl(b.url) === normItem || (bookmark.id && b.id === bookmark.id)
    );
    if (existing) {
      if (bookmark.title) existing.title = bookmark.title;
      if (iconUrl) { existing.icon = iconUrl; existing.favicon = iconUrl; }
      if (bookmark.gridCol !== undefined && !isNaN(bookmark.gridCol)) existing.gridCol = Number(bookmark.gridCol);
      if (bookmark.gridRow !== undefined && !isNaN(bookmark.gridRow)) existing.gridRow = Number(bookmark.gridRow);
      this.syncPinnedAppsToThemes();
      this.saveData();
      return this.data.bookmarks;
    }

    // Find next vacant grid cell (col, row) on desktop, avoiding both Pinned Apps and active Widgets
    const occupied = new Set((this.data.bookmarks || []).map(b => `${b.gridCol},${b.gridRow}`));
    const widgetsCfg = (this.data.settings && this.data.settings.desktopWidgets) || {};
    const widgetSpans = {
      clock: { colSpan: 3, rowSpan: 2 },
      search: { colSpan: 3, rowSpan: 1 },
      shield: { colSpan: 3, rowSpan: 1 }
    };
    Object.entries(widgetSpans).forEach(([wid, span]) => {
      const w = widgetsCfg[wid];
      if (w && w.enabled !== false && w.gridCol !== null && w.gridCol !== undefined && w.gridRow !== null && w.gridRow !== undefined) {
        const wc = Number(w.gridCol);
        const wr = Number(w.gridRow);
        if (!isNaN(wc) && !isNaN(wr)) {
          for (let dc = 0; dc < span.colSpan; dc++) {
            for (let dr = 0; dr < span.rowSpan; dr++) {
              occupied.add(`${wc + dc},${wr + dr}`);
            }
          }
        }
      }
    });
    let freeCol = 0;
    let freeRow = 0;
    for (let c = 0; c < 30; c++) {
      let found = false;
      for (let r = 0; r < 6; r++) {
        if (!occupied.has(`${c},${r}`)) {
          freeCol = c;
          freeRow = r;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    const item = {
      id: bookmark.id || ('pin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
      title: bookmark.title || 'Untitled',
      url: bookmark.url,
      icon: iconUrl,
      favicon: iconUrl,
      gridCol: (bookmark.gridCol !== undefined && !isNaN(bookmark.gridCol)) ? Number(bookmark.gridCol) : freeCol,
      gridRow: (bookmark.gridRow !== undefined && !isNaN(bookmark.gridRow)) ? Number(bookmark.gridRow) : freeRow,
      createdAt: Date.now()
    };
    if (!Array.isArray(this.data.bookmarks)) this.data.bookmarks = [];
    this.data.bookmarks.push(item);
    this.syncPinnedAppsToThemes();
    this.saveData();
    return this.data.bookmarks;
  }

  removeBookmark(idOrUrl) {
    if (!idOrUrl) return this.data.bookmarks || [];
    const normTarget = normalizePinUrl(idOrUrl);
    this.data.bookmarks = (this.data.bookmarks || []).filter(b =>
      b.id !== idOrUrl && b.url !== idOrUrl && normalizePinUrl(b.url) !== normTarget
    );
    this.syncPinnedAppsToThemes();
    this.saveData();
    return this.data.bookmarks;
  }

  setBookmarks(bookmarks) {
    if (!Array.isArray(bookmarks)) return this.data.bookmarks || [];
    this.data.bookmarks = bookmarks.map((b, idx) => {
      let bUrl = b.url;
      let bTitle = b.title;
      if (bUrl && /^https?:\/\/login\.disney\.com\/.*DTCI-DISNEYPLUS\.WEB.*\/bridge\/web/i.test(bUrl)) {
        bUrl = 'https://www.disneyplus.com/login';
        if (!bTitle || bTitle === 'Loading...' || bTitle.includes('disney.com')) {
          bTitle = 'Disney+ Log In';
        }
      }
      return {
        id: b.id || ('pin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
        title: bTitle || 'Untitled',
        url: bUrl,
        icon: b.icon || b.favicon || '',
        favicon: b.favicon || b.icon || '',
        gridCol: (b.gridCol !== undefined && !isNaN(b.gridCol)) ? Number(b.gridCol) : Math.floor(idx / 6),
        gridRow: (b.gridRow !== undefined && !isNaN(b.gridRow)) ? Number(b.gridRow) : (idx % 6),
        createdAt: b.createdAt || Date.now()
      };
    });
    this.syncPinnedAppsToThemes();
    this.saveData();
    return this.data.bookmarks;
  }

  isBookmarked(url) {
    if (!url || url.startsWith('oni://')) return false;
    const normTarget = normalizePinUrl(url);
    return (this.data.bookmarks || []).some(b => b.url === url || normalizePinUrl(b.url) === normTarget);
  }

  // Desktop Apps layout methods (fully unified with Bookmarks)
  getDesktopApps() {
    return this.getBookmarks();
  }

  setDesktopApps(apps) {
    return this.setBookmarks(apps);
  }

  addDesktopApp(app) {
    return this.addBookmark(app);
  }

  removeDesktopApp(idOrUrl) {
    return this.removeBookmark(idOrUrl);
  }

  // History
  getHistory() {
    return this.data.history || [];
  }

  addHistory(entry) {
    if (!entry.url || entry.url.startsWith('oni://') || entry.url.startsWith('about:')) return;
    const item = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      title: entry.title || entry.url,
      url: entry.url,
      visitedAt: Date.now()
    };
    // Keep max 1000 history items
    this.data.history.unshift(item);
    if (this.data.history.length > 1000) {
      this.data.history = this.data.history.slice(0, 1000);
    }
    this.saveData();
  }

  removeHistory(id) {
    this.data.history = this.data.history.filter(h => h.id !== id);
    this.saveData();
    return this.data.history;
  }

  clearHistory() {
    this.data.history = [];
    this.saveData();
    return [];
  }

  // Downloads
  getDownloads() {
    return this.data.downloads || [];
  }

  addOrUpdateDownload(item) {
    const idx = this.data.downloads.findIndex(d => d.id === item.id);
    if (idx >= 0) {
      this.data.downloads[idx] = { ...this.data.downloads[idx], ...item };
    } else {
      this.data.downloads.unshift(item);
    }
    if (this.data.downloads.length > 100) {
      this.data.downloads = this.data.downloads.slice(0, 100);
    }
    this.saveData();
    return this.data.downloads;
  }

  clearDownloads() {
    this.data.downloads = [];
    this.saveData();
    return [];
  }
}

module.exports = new Store();
