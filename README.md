# 鬼 Oni Browser

> **Sleek. Fierce. Uncompromised Web Navigation.**

**Oni Browser** is a modern, high-performance web browser built with Electron for Windows. Featuring an ultra-fast multi-tab engine powered by modern `WebContentsView`, a custom frameless dark obsidian & cyberpunk neon interface, built-in **Oni Shield** ad & tracker protection, and a customizable New Tab Dashboard.

---

## ✨ Highlights & Features

- **Standalone Windows Executable**: Fully portable single `.exe` file (`dist/Oni Browser Standalone.exe`) that runs instantly without installation.
- **Custom Frameless Obsidian Chrome**: Custom window titlebar with minimize, maximize/restore, and close buttons, seamless draggable header, and custom Oni branding.
- **Multi-Tab WebContentsView Architecture**: True independent web rendering tabs with fluid tab switching, tab closure, audio status, loading indicators, and HTML5 video fullscreen support.
- **Oni Shield Ad & Tracker Blocker**: Built-in network request filter blocking intrusive telemetry, ad networks, and behavioral scripts with live stats.
- **New Tab Dashboard**:
  - Live futuristic digital clock with Japanese Kanji date formatting.
  - Multi-engine search omnibox (DuckDuckGo, Google, Brave, Bing).
  - Quick speed dial shortcuts (GitHub, YouTube, Reddit, Wikipedia, Twitch, Hacker News, ChatGPT, Claude).
  - Atmospheric cyberpunk Tokyo skyline backdrop.
- **Integrated Omnibox (Address Bar)**:
  - Instant URL and search query detection.
  - HTTPS SSL lock security badge.
  - One-click Star Bookmark button.
  - Live Zoom factor pill with instant reset.
- **Interactive Utilities**:
  - **In-Page Search (Ctrl+F)**: Real-time match navigation and count.
  - **Bookmarks Toolbar & Manager**: Quick access chips and full bookmarks modal.
  - **History Manager (Ctrl+H)**: Searchable timestamped history list.
  - **Downloads Flyout (Ctrl+J)**: Real-time download progress tracking with open folder shortcut.
  - **DevTools Toggle (F12)**: Deep inspect web views and DOM elements.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + T` | Open a new tab (`oni://newtab`) |
| `Ctrl + W` | Close the current active tab |
| `Ctrl + R` / `F5` | Reload current page |
| `Ctrl + L` | Focus and select the Omnibox (address bar) |
| `Ctrl + F` | Toggle Find in Page search bar |
| `Ctrl + H` | Open Browsing History |
| `Ctrl + J` | Open Downloads Flyout |
| `Ctrl + D` | Bookmark / Unbookmark active page |
| `Ctrl + +` / `Ctrl + =` | Zoom in (+10%) |
| `Ctrl + -` | Zoom out (-10%) |
| `Ctrl + 0` | Reset zoom to 100% |
| `F12` | Toggle Developer Tools |
| `Escape` | Close active flyout, overlay modal, or find bar |

---

## 🚀 Development & Packaging

### Run in Development:
```powershell
npm run start
```

### Build Standalone Portable EXE:
```powershell
npm run build:portable
```
*Output: `dist/Oni Browser Standalone.exe`*

### Build NSIS Installer EXE:
```powershell
npm run build:installer
```
*Output: `dist/Oni Browser Setup.exe`*

---

## 📁 Project Architecture

```
Oni Browser/
├── assets/
│   ├── app-icon.png        # 256x256 high-resolution PNG icon
│   ├── icon.ico            # Windows application icon
│   └── wallpaper.jpg       # Cyberpunk Tokyo New Tab background
├── src/
│   ├── main/
│   │   ├── index.js        # Main Electron process, tab management, IPC
│   │   ├── store.js        # Persistent JSON storage for bookmarks/history
│   │   └── adblock.js      # Oni Shield request filter engine
│   ├── preload/
│   │   └── index.js        # Context-isolated secure API bridge
│   └── renderer/
│       ├── index.html      # Browser chrome UI (titlebar, tabs, omnibox)
│       ├── index.css       # Obsidian & crimson cyber styling
│       ├── index.js        # UI tab handling and event dispatching
│       ├── newtab.html     # New Tab dashboard
│       ├── newtab.css      # Dashboard styling
│       └── newtab.js       # Live clock and speed dial shortcuts
├── dist/                   # Built standalone executables
└── package.json
```

---

<p align="center">
  <b>Crafted by Oni Lab</b> • <i>Hunt the Web with Oni.</i>
</p>
