const { contextBridge, ipcRenderer, webFrame } = require('electron');

if (window.location.protocol === 'file:') {
  const updaterAPI = {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
    onUpdaterEvent: (callback) => ipcRenderer.on('updater-event', (_event, value) => callback(value))
  };

  contextBridge.exposeInMainWorld('electronAPI', {
    updater: updaterAPI
  });

  contextBridge.exposeInMainWorld('oniAPI', {
    updater: updaterAPI,
    // System & Default Browser
    setAsDefaultBrowser: () => ipcRenderer.invoke('app:setAsDefaultBrowser'),
    isDefaultBrowser: () => ipcRenderer.invoke('app:isDefaultBrowser'),
    // Window controls
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    
    // Tab operations
    createTab: (url) => ipcRenderer.invoke('tab:create', url),
    closeTab: (id) => ipcRenderer.invoke('tab:close', id),
    switchTab: (id) => ipcRenderer.invoke('tab:switch', id),
    reloadTab: (id) => ipcRenderer.invoke('tab:reload', id),
    goBack: (id) => ipcRenderer.invoke('tab:goBack', id),
    goForward: (id) => ipcRenderer.invoke('tab:goForward', id),
    navigate: (url, id) => ipcRenderer.invoke('tab:navigate', { url, id }),
    forwardInputEvent: (event) => ipcRenderer.invoke('tab:forwardInputEvent', event),
    stopLoading: (id) => ipcRenderer.invoke('tab:stop', id),
    zoom: (delta, id) => ipcRenderer.invoke('tab:zoom', { delta, id }),
    resetZoom: (id) => ipcRenderer.invoke('tab:resetZoom', id),
    toggleMute: (id) => ipcRenderer.invoke('tab:toggleMute', id),
    toggleDevTools: (id) => ipcRenderer.invoke('tab:toggleDevTools', id),
    getTabs: () => ipcRenderer.invoke('tab:getAll'),
    reorderTabs: (orderedTabIds) => ipcRenderer.invoke('tab:reorder', orderedTabIds),

    // Find in page
    findInPage: (text, forward) => ipcRenderer.invoke('tab:findInPage', { text, forward }),
    stopFindInPage: (action) => ipcRenderer.invoke('tab:stopFindInPage', action),

    // Bookmarks (Start Menu Pinned Apps)
    getBookmarks: () => ipcRenderer.invoke('bookmarks:get'),
    addBookmark: (bookmark) => ipcRenderer.invoke('bookmarks:add', bookmark),
    removeBookmark: (idOrUrl) => ipcRenderer.invoke('bookmarks:remove', idOrUrl),
    setBookmarks: (list) => ipcRenderer.invoke('bookmarks:set', list),
    isBookmarked: (url) => ipcRenderer.invoke('bookmarks:isBookmarked', url),

    // Desktop Apps (Home Page Grid Layout)
    getDesktopApps: () => ipcRenderer.invoke('desktop-apps:get'),
    setDesktopApps: (list) => ipcRenderer.invoke('desktop-apps:set', list),
    addDesktopApp: (app) => ipcRenderer.invoke('desktop-apps:add', app),
    removeDesktopApp: (idOrUrl) => ipcRenderer.invoke('desktop-apps:remove', idOrUrl),
    onDesktopAppsUpdated: (callback) => {
      const handler = (event, list) => callback(list);
      ipcRenderer.on('desktop-apps:updated', handler);
      return () => ipcRenderer.removeListener('desktop-apps:updated', handler);
    },

    // Clipboard
    readClipboardText: () => ipcRenderer.invoke('clipboard:readText'),
    writeClipboardText: (text) => ipcRenderer.invoke('clipboard:writeText', text),

    // History & Privacy
    getHistory: () => ipcRenderer.invoke('history:get'),
    removeHistory: (id) => ipcRenderer.invoke('history:remove', id),
    clearHistory: () => ipcRenderer.invoke('history:clear'),
    clearBrowsingData: (options) => ipcRenderer.invoke('privacy:clearData', options),

    // Downloads
    getDownloads: () => ipcRenderer.invoke('downloads:get'),
    clearDownloads: () => ipcRenderer.invoke('downloads:clear'),
    cancelDownload: (id) => ipcRenderer.invoke('downloads:cancel', id),
    openDownloadFile: (filePath) => ipcRenderer.invoke('downloads:openFile', filePath),
    openDownloadFolder: (filePath) => ipcRenderer.invoke('downloads:openFolder', filePath),

    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get'),
    updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),
    onSettingsUpdated: (callback) => {
      const handler = (event, settings) => callback(settings);
      ipcRenderer.on('settings:updated', handler);
      return () => ipcRenderer.removeListener('settings:updated', handler);
    },

    // Themes & Customization
    getThemes: () => ipcRenderer.invoke('themes:getAll'),
    getActiveTheme: () => ipcRenderer.invoke('themes:getActive'),
    applyTheme: (themeId) => ipcRenderer.invoke('themes:apply', themeId),
    saveTheme: (options) => ipcRenderer.invoke('themes:save', options),
    getAccentColors: () => ipcRenderer.invoke('customization:getAccentColors'),
    setAccentColor: (colorId) => ipcRenderer.invoke('customization:setAccentColor', colorId),
    setWallpaper: (wallpaperUrl) => ipcRenderer.invoke('customization:setWallpaper', wallpaperUrl),
    importWallpaper: () => ipcRenderer.invoke('customization:importWallpaper'),
    removeWallpaper: (idOrUrl) => ipcRenderer.invoke('customization:removeWallpaper', idOrUrl),

    // Shield
    getShieldStats: () => ipcRenderer.invoke('shield:getStats'),
    toggleShield: (enabled) => ipcRenderer.invoke('shield:toggle', enabled),

    // UI state notification to main
    setTopBarHeight: (height) => ipcRenderer.invoke('ui:setTopBarHeight', height),
    setOverlayOpen: (isOpen) => ipcRenderer.invoke('ui:setOverlayOpen', isOpen),
    setDockBounds: (bounds) => ipcRenderer.invoke('ui:setDockBounds', bounds),
    setModalsOpen: (isOpen) => ipcRenderer.invoke('ui:setModalsOpen', isOpen),
    setStartMenuOpen: (isOpen) => ipcRenderer.invoke('ui:setStartMenuOpen', isOpen),
    focusDock: () => ipcRenderer.invoke('dock:focus'),
    toggleDock: (state) => ipcRenderer.invoke('ui:toggleDock', state),
    getDockVisibility: () => ipcRenderer.invoke('ui:getDockVisibility'),
    triggerOsAction: (action) => ipcRenderer.invoke('os:triggerAction', action),
    showDockTooltip: (data) => ipcRenderer.invoke('tooltip:show', data),
    hideDockTooltip: () => ipcRenderer.invoke('tooltip:hide'),

    // Event Listeners from Main Process
    onTabUpdated: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('tab:updated', handler);
      return () => ipcRenderer.removeListener('tab:updated', handler);
    },
    onTabCreated: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('tab:created', handler);
      return () => ipcRenderer.removeListener('tab:created', handler);
    },
    onTabClosed: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('tab:closed', handler);
      return () => ipcRenderer.removeListener('tab:closed', handler);
    },
    onTabSwitched: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('tab:switched', handler);
      return () => ipcRenderer.removeListener('tab:switched', handler);
    },
    onDownloadProgress: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('download:progress', handler);
      return () => ipcRenderer.removeListener('download:progress', handler);
    },
    onDownloadCompleted: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('download:completed', handler);
      return () => ipcRenderer.removeListener('download:completed', handler);
    },
    onShowContextMenu: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('os:show-context-menu', handler);
      return () => ipcRenderer.removeListener('os:show-context-menu', handler);
    },
    executeContextMenuAction: (action, params) => ipcRenderer.invoke('context:action', { action, params }),
    hideContextMenu: () => ipcRenderer.invoke('context:hide'),
    onShieldUpdated: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('shield:updated', handler);
      return () => ipcRenderer.removeListener('shield:updated', handler);
    },
    onWindowMaximizedChange: (callback) => {
      const handler = (event, isMax) => callback(isMax);
      ipcRenderer.on('window:maximizedChange', handler);
      return () => ipcRenderer.removeListener('window:maximizedChange', handler);
    },
    onFindResult: (callback) => {
      const handler = (event, result) => callback(result);
      ipcRenderer.on('tab:findResult', handler);
      return () => ipcRenderer.removeListener('tab:findResult', handler);
    },
    onThemeChanged: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('theme:changed', handler);
      return () => ipcRenderer.removeListener('theme:changed', handler);
    },
    onOsAction: (callback) => {
      const handler = (event, action) => callback(action);
      ipcRenderer.on('os:action', handler);
      return () => ipcRenderer.removeListener('os:action', handler);
    },
    onBookmarksUpdated: (callback) => {
      const handler = (event, list) => callback(list);
      ipcRenderer.on('bookmarks:updated', handler);
      return () => ipcRenderer.removeListener('bookmarks:updated', handler);
    },
    onTooltipUpdate: (callback) => {
      const handler = (event, text) => callback(text);
      ipcRenderer.on('tooltip:update', handler);
      return () => ipcRenderer.removeListener('tooltip:update', handler);
    },
    showDownloadToast: (data) => ipcRenderer.invoke('toast:show', data),
    hideDownloadToast: () => ipcRenderer.invoke('toast:hide'),
    onToastDisplay: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('toast:display', handler);
      return () => ipcRenderer.removeListener('toast:display', handler);
    },
    onDockVisibilityChange: (callback) => {
      const handler = (event, isVisible) => callback(isVisible);
      ipcRenderer.on('ui:dockVisibilityChange', handler);
      return () => ipcRenderer.removeListener('ui:dockVisibilityChange', handler);
    },
    onHtmlFullscreenChange: (callback) => {
      const handler = (event, isFullscreen) => callback(isFullscreen);
      ipcRenderer.on('window:htmlFullscreenChange', handler);
      return () => ipcRenderer.removeListener('window:htmlFullscreenChange', handler);
    },
    onTabsReordered: (callback) => {
      const handler = (event, list) => callback(list);
      ipcRenderer.on('tabs:reordered', handler);
      return () => ipcRenderer.removeListener('tabs:reordered', handler);
    },
    onShortcut: (name, callback) => {
      const handler = () => callback();
      ipcRenderer.on('shortcut:' + name, handler);
      return () => ipcRenderer.removeListener('shortcut:' + name, handler);
    }
  });
} else {
  // Web page execution (e.g. SteamDB, Turnstile, Cloudflare challenges, DRM, Twitch, X.com, Google)
  try {
    const host = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
    const isGoogleAuthOrService =
      host === 'accounts.google.com' ||
      host.endsWith('.accounts.google.com') ||
      host === 'accounts.youtube.com' ||
      host === 'google.com' ||
      host.endsWith('.google.com') ||
      host === 'gstatic.com' ||
      host.endsWith('.gstatic.com') ||
      host === 'googleusercontent.com' ||
      host.endsWith('.googleusercontent.com') ||
      host === 'youtube.com' ||
      host.endsWith('.youtube.com');

    const runInMainWorld = (code) => {
      try {
        if (webFrame && webFrame.executeJavaScriptInIsolatedWorld) {
          webFrame.executeJavaScriptInIsolatedWorld(0, [{ code }]);
        } else if (webFrame && webFrame.executeJavaScript) {
          webFrame.executeJavaScript(code);
        }
      } catch (_) {}
    };

    if (isGoogleAuthOrService) {
      // Synchronize MAIN world environment ONLY on Google authentication/service domains for BotGuard
      const chromeVer = (process && process.versions && process.versions.chrome) || '152.0.7977.130';
      const majorVersion = chromeVer ? chromeVer.split('.')[0] : '152';
      const chromeUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;

      const googleBotGuardCode = `
        (function() {
          const majorVersion = '${majorVersion}';
          const fullVersion = '${chromeVer}';
          const chromeUA = '${chromeUA}';

          // 1. Synchronize navigator.userAgent and appVersion on Google domains
          try {
            Object.defineProperty(navigator, 'userAgent', {
              get: () => chromeUA,
              configurable: true,
              enumerable: true
            });
            Object.defineProperty(navigator, 'appVersion', {
              get: () => '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + fullVersion + ' Safari/537.36',
              configurable: true,
              enumerable: true
            });
          } catch (_) {}

          // 2. Populate realistic desktop Chrome properties on window.chrome on Google
          if (!window.chrome) {
            window.chrome = {};
          }
          if (Object.keys(window.chrome).length === 0 || !window.chrome.app) {
            const appObj = {
              isInstalled: false,
              InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
              RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
              getDetails: function() {},
              getIsInstalled: function() { return false; },
              installState: function() { return 'not_installed'; },
              runningState: function() { return 'cannot_run'; }
            };
            const runtimeObj = {
              OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
              OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
              PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
              PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
              PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
              RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
              connect: function(extId, connectInfo) {
                const msgListeners = [];
                const discListeners = [];
                return {
                  name: (connectInfo && connectInfo.name) || '',
                  onMessage: {
                    addListener: function(fn) { if (typeof fn === 'function') msgListeners.push(fn); },
                    removeListener: function(fn) { const i = msgListeners.indexOf(fn); if (i !== -1) msgListeners.splice(i, 1); },
                    hasListener: function(fn) { return msgListeners.includes(fn); }
                  },
                  onDisconnect: {
                    addListener: function(fn) { if (typeof fn === 'function') discListeners.push(fn); },
                    removeListener: function(fn) { const i = discListeners.indexOf(fn); if (i !== -1) discListeners.splice(i, 1); },
                    hasListener: function(fn) { return discListeners.includes(fn); }
                  },
                  postMessage: function() {},
                  disconnect: function() {
                    for (const fn of discListeners) { try { fn(); } catch (_) {} }
                  }
                };
              },
              sendMessage: function(extId, msg, opts, cb) {
                const callback = typeof cb === 'function' ? cb : (typeof opts === 'function' ? opts : (typeof msg === 'function' ? msg : null));
                if (callback) {
                  setTimeout(() => { try { callback(undefined); } catch (_) {} }, 0);
                }
                return Promise.resolve(undefined);
              }
            };
            const csiObj = function() {
              return { onloadT: Date.now(), startE: Date.now(), pageT: 100.0, tran: 15 };
            };
            const loadTimesObj = function() {
              const now = Date.now() / 1000;
              return {
                requestTime: now, startLoadTime: now, commitLoadTime: now, finishDocumentLoadTime: now,
                finishLoadTime: now, firstPaintTime: now, firstPaintAfterLoadTime: 0, navigationType: 'Other',
                wasFetchedViaSpdy: false, wasNpnNegotiated: false, npnNegotiatedProtocol: 'unknown',
                wasAlternateProtocolAvailable: false, connectionInfo: 'http/1.1'
              };
            };

            try {
              Object.defineProperties(window.chrome, {
                app: { value: appObj, writable: true, enumerable: true, configurable: true },
                runtime: { value: runtimeObj, writable: true, enumerable: true, configurable: true },
                csi: { value: csiObj, writable: true, enumerable: true, configurable: true },
                loadTimes: { value: loadTimesObj, writable: true, enumerable: true, configurable: true }
              });
            } catch(e) {
              window.chrome.app = appObj;
              window.chrome.runtime = runtimeObj;
              window.chrome.csi = csiObj;
              window.chrome.loadTimes = loadTimesObj;
            }
          }

          // 3. Align navigator.userAgentData with Chrome brands on Google
          const chromeBrands = Object.freeze([
            Object.freeze({ brand: 'Chromium', version: majorVersion }),
            Object.freeze({ brand: 'Not_A Brand', version: '24' }),
            Object.freeze({ brand: 'Google Chrome', version: majorVersion })
          ]);
          const fullVersionList = Object.freeze([
            Object.freeze({ brand: 'Chromium', version: fullVersion }),
            Object.freeze({ brand: 'Not_A Brand', version: '24.0.0.0' }),
            Object.freeze({ brand: 'Google Chrome', version: fullVersion })
          ]);

          if (navigator.userAgentData) {
            try {
              const proto = Object.getPrototypeOf(navigator.userAgentData);
              if (proto && Object.getOwnPropertyDescriptor(proto, 'brands')) {
                Object.defineProperty(proto, 'brands', {
                  get: function() { return chromeBrands; },
                  enumerable: true,
                  configurable: true
                });
              } else {
                Object.defineProperty(navigator.userAgentData, 'brands', {
                  get: function() { return chromeBrands; },
                  enumerable: true,
                  configurable: true
                });
              }

              const origGetHighEntropy = (proto && proto.getHighEntropyValues) || navigator.userAgentData.getHighEntropyValues;
              const customGetHighEntropy = async function(hints = []) {
                let result = {};
                if (typeof origGetHighEntropy === 'function') {
                  try { result = await origGetHighEntropy.call(this, hints); } catch(e) {}
                }
                result.brands = chromeBrands;
                result.mobile = false;
                result.platform = 'Windows';
                if (Array.isArray(hints)) {
                  if (hints.includes('fullVersionList')) result.fullVersionList = fullVersionList;
                  if (hints.includes('uaFullVersion')) result.uaFullVersion = fullVersion;
                  if (hints.includes('platformVersion')) result.platformVersion = result.platformVersion || '15.0.0';
                  if (hints.includes('architecture')) result.architecture = 'x86';
                  if (hints.includes('bitness')) result.bitness = '64';
                }
                return result;
              };

              if (proto && proto.getHighEntropyValues) {
                Object.defineProperty(proto, 'getHighEntropyValues', {
                  value: customGetHighEntropy,
                  writable: true,
                  enumerable: true,
                  configurable: true
                });
              } else {
                navigator.userAgentData.getHighEntropyValues = customGetHighEntropy;
              }
            } catch (e) {}
          }
        })();
      `;
      runInMainWorld(googleBotGuardCode);
    } else {
      // Non-Google domains (Netflix, Twitch, X.com, Disney+, Crunchyroll, Reddit, etc.):
      // ONLY define window.chrome.app if missing (standard desktop Chrome behavior).
      // NEVER touch navigator.userAgentData, runtime, or prototypes so Kasada (Twitch) & DRM (Netflix) are 100% native!
      const nonGoogleCode = `
        (function() {
          try {
            if (!window.chrome) {
              window.chrome = {};
            }
            if (!window.chrome.app) {
              window.chrome.app = {
                isInstalled: false,
                InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
                RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
                getDetails: function () {},
                getIsInstalled: function () { return false; },
                installState: function () { return 'not_installed'; },
                runningState: function () { return 'cannot_run'; }
              };
            }
          } catch (_) {}
        })();
      `;
      runInMainWorld(nonGoogleCode);
    }
  } catch (err) {}
}
