# 鬼 Oni Browser & Oni OS

> **Sleek. Fierce. Uncompromised Web Operating System for Windows.**

[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-00ff88?style=flat-square&logo=windows)](https://github.com/Oni-Dreamz/oni-browser)
[![Engine](https://img.shields.io/badge/Engine-Electron%2044%20%7C%20Chromium-00e5ff?style=flat-square&logo=electron)](https://github.com/Oni-Dreamz/oni-browser)
[![Auto--Updates](https://img.shields.io/badge/Updates-electron--updater%20%7C%20GitHub-a855f7?style=flat-square&logo=github)](https://github.com/Oni-Dreamz/oni-browser)
[![Shield](https://img.shields.io/badge/AdBlock-Oni%20Shield%20Active-ff3366?style=flat-square)](https://github.com/Oni-Dreamz/oni-browser)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](LICENSE)

**Oni Browser** is not just another browser wrapper—it is a **cyberpunk desktop operating system interface** engineered directly into a high-performance web browser. Built on **Electron 44** and modern **`WebContentsView` architecture**, Oni replaces clunky traditional browser tabs with the **Oni OS** paradigm: a floating interactive glass dock, desktop widget workspaces, draggable floating OS windows, built-in telemetry neutralization via **Oni Shield**, and live GitHub auto-updates.

---

## ⛩️ The Oni OS Experience

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 鬼 ONI OS ─── Home Desktop  │  [ Search Omnibox ]  │  📶 🛡️ 🔊  12:00  │
  ├────────────────────────────────────────────────────────────────────────┤
  │                                                                        │
  │   [ 12:00:00 - 水曜日 ]          ┌─── SYSTEM STATS ──────────────┐   │
  │   Tokyo Cyberpunk Canvas         │ CPU: 12%  │ RAM: 3.4GB / 32GB │   │
  │                                  │ SHIELD: 4,821 BLOCKED         │   │
  │   [ Desktop Widgets Grid ]       └───────────────────────────────┘   │
  │   • Google / DDG Omnibox         ┌─── FLOATING OS WINDOW ────────┐   │
  │   • Notes Scratchpad             │  [x] System Settings          │   │
  │   • Weather Telemetry            │  • SYSTEM UPDATES: v1.0.0     │   │
  │   • Pinned Apps Grid             │  • Themes: Oni OS / Classic   │   │
  │                                  └───────────────────────────────┘   │
  │                                                                        │
  │       [ 鬼 ] [ 🌐 ] [ 🕒 ] [ ⭐ ] [ ⬇️ ] [ 📝 ] [ 🖩 ] [ ⚙️ ]         │
  │       └─────── Floating Glass Dock with Live Badges ────────┘         │
  └────────────────────────────────────────────────────────────────────────┘
```

The flagship layout of the browser is **Oni OS Mode**, turning your web workspace into a futuristic, distraction-free command deck:

### 1. 🛸 Floating Interactive Glass App Dock
- **macOS & Cyberpunk Glass Aesthetics**: Translucent, frosted backdrop with dynamic hover magnification, smooth spring animations, and glow halos.
- **Quick-Launch Applications**:
  - **Start Menu / App Launcher (鬼)**: Searchable launcher for web apps and shortcuts.
  - **Browser Mode**: Instant switch between active web browsing and the OS Desktop.
  - **History Manager**: Timeline of previous sessions.
  - **Bookmarks / Pinned Apps**: Grid of saved web portals and apps.
  - **Downloads Center**: Active download counter badge with real-time progress.
  - **Notes Scratchpad**: Persistent floating notepad for fast note-taking.
  - **Retro Calculator**: Quick cyberpunk calculator tool.
  - **System Settings**: Control center for updates, theme constructs, search engines, and privacy.
  - **Global Audio Mute & Dock Hide Toggle**: One-click mute for active tabs and dock auto-collapse.

### 2. 🪟 Layered Floating OS Modals (`modalsView`)
- Rendered on a dedicated, transparent `WebContentsView` layer, ensuring popups, menus, and utilities never compromise tab performance or web page frames.
- **Draggable & Focusable**: Move, minimize, stack, and close windows just like a native desktop operating system.
- **Dedicated OS Windows**:
  - **System Settings Window**: Tabbed into *General*, *Customization*, *Widgets*, and *Privacy & Data*.
  - **History Window**: Timestamped, searchable domain history with batch wipe.
  - **Bookmarks Window**: Custom grid of your pinned daily sites.
  - **Downloads Window**: Live transfer speeds, byte counters, progress bars, pause/cancel, and folder reveals.
  - **Notes & Calculator Windows**: Independent productivity tools.

### 3. 🖥️ Modular Desktop Workspace (`newtab.html`)
- **Atmospheric Cyberpunk Tokyo Canvas**: High-resolution wallpaper engine with support for custom image uploads.
- **Interactive Home Widgets**:
  - **Digital Clock & Japanese Kanji Date**: Live time with date format toggle.
  - **Multi-Engine Omnibox**: Instant queries via Google, DuckDuckGo, Brave Search, or Bing.
  - **System Resource Telemetry**: Real-time simulated CPU, memory, and Oni Shield blocker telemetry.
  - **Quick Notes & Weather**: Embedded desktop glance widgets.
  - **Customizable App Grid**: Drag-and-drop tiles for daily quick-launches.

### 4. 🔄 Dynamic GitHub Auto-Updates (`electron-updater`)
- **Direct GitHub Releases Target**: Tied directly to [`Oni-Dreamz/oni-browser`](https://github.com/Oni-Dreamz/oni-browser).
- **Silent Boot Check**: Checks for new versions on startup without blocking the UI.
- **In-App Cyberpunk Update Card**:
  - **Version Subtitle**: Dynamically displays current running version (`v1.0.0`).
  - **Scanning Indicator**: Glowing cyan spinner during update verification.
  - **Download Progress Bar**: Real-time progress bar with percentage counter (`Downloading update: XX%`).
  - **One-Click Restart**: Switches to a pulsing emerald button: `[ Restart & Install ]` once the package is ready.
  - **Error & Retry**: Safe fallback with detailed error alerts and instant retry triggers.

### 5. 🛡️ Built-in Oni Shield Protection
- **Ad & Tracker Neutralization**: Intercepts requests before they leave the socket, filtering invasive advertising servers, user trackers, and behavioral analytics.
- **Anti-Detection Stealth Headers**: Configured with authentic Chrome 132+ user agent signatures and Client Hints (`sec-ch-ua`), eliminating false-positive bot-detection on Cloudflare Turnstile, SteamDB, and protected services.
- **Privacy Eraser**: Selective clearing of cookies, cache, storage, and browsing history with a single click.

### 6. 🎨 Dual Themes & Accent Personalization
- **Theme Constructs**:
  - **Oni OS**: The default immersive operating system desktop with bottom dock and top system bar.
  - **Classic**: Traditional high-contrast browser layout with a top tab bar, omnibox, and pill address bar.
- **Accent Color Engine**:
  - 🟢 **Emerald** (`#00ff88`) — Default Cyber Neon
  - 🔴 **Crimson** (`#ff3366`) — Oni Blood Red
  - 🔵 **Cyan** (`#00e5ff`) — Matrix Grid Blue
  - 🟣 **Violet** (`#a855f7`) — Synthwave Purple

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action | Oni OS Behavior |
| :--- | :--- | :--- |
| `Ctrl + T` | **New Tab** | Spawns a new web tab or switches to Oni OS Desktop |
| `Ctrl + W` | **Close Tab** | Closes the current active tab (never terminates the browser window) |
| `Ctrl + R` / `F5` | **Reload** | Refreshes the active web page |
| `Ctrl + L` | **Focus Omnibox** | Jumps focus to address search bar |
| `Ctrl + F` | **Find in Page** | Toggles match counter and search bar |
| `Ctrl + H` | **History** | Opens floating **Oni OS History Window** |
| `Ctrl + J` | **Downloads** | Opens floating **Oni OS Downloads Center** |
| `Ctrl + B` | **Pinned Apps** | Opens floating **Bookmarks & Pinned Apps** window |
| `Ctrl + ,` | **Settings** | Opens floating **Oni OS System Settings** window |
| `Ctrl + K` | **Search / Spotlight**| Focuses instant desktop search bar |
| `Ctrl + D` | **Bookmark Page** | Toggles pin/bookmark for active site |
| `Ctrl + +` / `Ctrl + =` | **Zoom In** | Increases active tab scale (+10%) |
| `Ctrl + -` | **Zoom Out** | Decreases active tab scale (-10%) |
| `Ctrl + 0` | **Reset Zoom** | Resets active tab scale to 100% |
| `F12` | **DevTools** | Toggles Chromium Developer Tools |
| `Escape` | **Dismiss** | Closes active floating window, context menu, or find bar |

---

## 📁 Codebase Architecture

```
Oni Browser/
├── assets/
│   ├── app-icon.png               # High-res application identity logo
│   ├── icon.ico                   # Windows application & installer icon
│   └── wallpaper.jpg              # Default Cyberpunk Tokyo desktop backdrop
├── scripts/
│   └── make-ico.js                # Icon conversion pipeline
├── src/
│   ├── main/
│   │   ├── index.js               # Main process, WebContentsView lifecycle, IPC & auto-updater
│   │   ├── store.js               # Persistent JSON state (themes, bookmarks, history, settings)
│   │   └── adblock.js             # Built-in Oni Shield network request filter engine
│   ├── preload/
│   │   ├── index.js               # Secure contextBridge API (`oniAPI` & `electronAPI.updater`)
│   │   └── preload.js             # Module alias shim
│   └── renderer/
│       ├── index.html / .js / .css# Top system bar, window chrome, and overlay manager
│       ├── dock.html / .js / .css # Floating interactive glass app dock
│       ├── modals.html / .js / .css# Floating OS windows (Settings, History, Downloads, Apps)
│       ├── newtab.html / .js / .css# Oni OS home desktop, modular widgets, and clock
│       ├── toast.html / .js       # Non-intrusive HUD notification popups
│       ├── tooltip.html / .js/.css# Cyberpunk hover tooltips for dock & UI
│       ├── contextmenu.html / .js # Custom desktop & web context menu
│       └── settings.html          # Fallback standalone settings page (`oni://settings`)
├── dist/                          # Built executables, blockmaps, and installer assets
│   ├── Oni-Browser-Setup-1.0.0.exe# Full Windows NSIS Setup Installer (Auto-updating)
│   ├── Oni-Browser-Setup-1.0.0.exe.blockmap
│   ├── latest.yml                 # GitHub release update manifest
│   ├── Oni Browser Standalone.exe # Portable single-file executable
│   └── win-unpacked/              # Unpacked binary for local development testing
└── package.json                   # Build scripts, updater publish config, and dependencies
```

---

## 🚀 Building & Packaging

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20+ recommended)
- Windows 10 / 11 64-bit

### 1. Install Dependencies
```powershell
npm install
```

### 2. Run in Development Mode
```powershell
npm run start
```

### 3. Build Windows NSIS Installer (with Auto-Update Support)
```powershell
npm run build:installer
```
*Generates `dist/Oni-Browser-Setup-1.0.0.exe`, `latest.yml`, and blockmap files ready for GitHub Releases.*

### 4. Build Standalone Portable EXE
```powershell
npm run build:portable
```
*Generates single-file executable `dist/Oni Browser Standalone.exe` requiring zero installation.*

---

## 🔒 Security & Privacy Notice
Oni Browser isolates all untrusted web execution within native Electron sandboxes and blocks telemetry domains by default. Passwords, browsing history, and bookmarks remain entirely on your local machine (`store.js` in local user application data) and are never uploaded to third-party telemetry servers.

---

<p align="center">
  <b>Crafted with pride by Oni Lab</b> • <i>A New Era of Cyberpunk Web Navigation.</i>
</p>
