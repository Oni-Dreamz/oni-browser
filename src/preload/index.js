const { contextBridge, ipcRenderer, webFrame } = require('electron');

if (window.location.protocol === 'file:') {
  const updaterAPI = {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    getVersion: () => ipcRenderer.invoke('get-app-version'),
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
  // Web page execution (e.g. SteamDB, Turnstile, Cloudflare challenges)
  // Ensure authentic Google Chrome runtime properties in main world (world 0)
  try {
    const stealthCode = `
      // 1. Remove automation / webdriver flag
      try {
        delete Object.getPrototypeOf(navigator).webdriver;
        Object.defineProperty(Object.getPrototypeOf(navigator), 'webdriver', {
          get: () => undefined,
          configurable: true,
          enumerable: true
        });
      } catch (e) {}

      // 2. Standard Google Chrome window.chrome object
      try {
        if (!window.chrome) {
          window.chrome = {};
        }
        if (!window.chrome.runtime) {
          window.chrome.runtime = {
            OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
            OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
            PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
            PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
            PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
            RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
            connect: function () {},
            sendMessage: function () {}
          };
        }
        if (!window.chrome.app) {
          window.chrome.app = {
            isInstalled: false,
            InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
            RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
            getDetails: function () {},
            getIsInstalled: function () {},
            installState: function () {},
            runningState: function () {}
          };
        }
      } catch (e) {}

      // 3. Populate plugins array if empty
      try {
        if (!navigator.plugins || navigator.plugins.length === 0) {
          const pluginsArray = [
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
          ];
          Object.defineProperty(Object.getPrototypeOf(navigator), 'plugins', {
            get: () => pluginsArray,
            configurable: true
          });
        }
      } catch (e) {}
    `;
    if (webFrame && webFrame.executeJavaScriptInIsolatedWorld) {
      webFrame.executeJavaScriptInIsolatedWorld(0, [{ code: stealthCode }]);
    }
  } catch (err) {}
}
