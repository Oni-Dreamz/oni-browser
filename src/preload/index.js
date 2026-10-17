const { contextBridge, ipcRenderer } = require('electron');

if (window.location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('oniAPI', {
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
    stopLoading: (id) => ipcRenderer.invoke('tab:stop', id),
    zoom: (delta, id) => ipcRenderer.invoke('tab:zoom', { delta, id }),
    resetZoom: (id) => ipcRenderer.invoke('tab:resetZoom', id),
    toggleMute: (id) => ipcRenderer.invoke('tab:toggleMute', id),
    toggleDevTools: (id) => ipcRenderer.invoke('tab:toggleDevTools', id),
    getTabs: () => ipcRenderer.invoke('tab:getAll'),

    // Find in page
    findInPage: (text, forward) => ipcRenderer.invoke('tab:findInPage', { text, forward }),
    stopFindInPage: (action) => ipcRenderer.invoke('tab:stopFindInPage', action),

    // Bookmarks
    getBookmarks: () => ipcRenderer.invoke('bookmarks:get'),
    addBookmark: (bookmark) => ipcRenderer.invoke('bookmarks:add', bookmark),
    removeBookmark: (idOrUrl) => ipcRenderer.invoke('bookmarks:remove', idOrUrl),
    isBookmarked: (url) => ipcRenderer.invoke('bookmarks:isBookmarked', url),

    // History & Privacy
    getHistory: () => ipcRenderer.invoke('history:get'),
    removeHistory: (id) => ipcRenderer.invoke('history:remove', id),
    clearHistory: () => ipcRenderer.invoke('history:clear'),
    clearBrowsingData: (options) => ipcRenderer.invoke('privacy:clearData', options),

    // Downloads
    getDownloads: () => ipcRenderer.invoke('downloads:get'),
    clearDownloads: () => ipcRenderer.invoke('downloads:clear'),
    openDownloadFile: (filePath) => ipcRenderer.invoke('downloads:openFile', filePath),
    openDownloadFolder: (filePath) => ipcRenderer.invoke('downloads:openFolder', filePath),

    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get'),
    updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),

    // Themes
    getThemes: () => ipcRenderer.invoke('themes:getAll'),
    getActiveTheme: () => ipcRenderer.invoke('themes:getActive'),
    applyTheme: (themeId) => ipcRenderer.invoke('themes:apply', themeId),
    saveTheme: (options) => ipcRenderer.invoke('themes:save', options),

    // Shield
    getShieldStats: () => ipcRenderer.invoke('shield:getStats'),
    toggleShield: (enabled) => ipcRenderer.invoke('shield:toggle', enabled),

    // UI state notification to main
    setTopBarHeight: (height) => ipcRenderer.invoke('ui:setTopBarHeight', height),
    setOverlayOpen: (isOpen) => ipcRenderer.invoke('ui:setOverlayOpen', isOpen),
    setDockBounds: (bounds) => ipcRenderer.invoke('ui:setDockBounds', bounds),
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
    }
  });
}
