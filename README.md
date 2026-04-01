# YouTube Picture-in-Picture

YTView is a macOS app that lets you watch YouTube videos in a floating window that stays always on top. Perfect for watching videos while working or using other apps — **completely ad-free**.

## What does YTView do?

YTView creates a compact, minimalist window that plays YouTube videos without ads or distractions. The window stays on top of all other applications, so you can watch your videos without switching between windows.

## Features

- **Ad-free playback** - Watch YouTube videos without any ads
- **Always on top** - The window stays visible over all other applications
- **Minimalist interface** - No distractions, just the video
- **Video queue** - Add multiple videos to a queue and watch them in sequence
- **Chrome extension** - Quickly send videos from your browser to YTView
- **Keyboard shortcuts** - Fast control with global shortcuts
- **Remembers last video** - The app remembers which video you were watching

## Chrome Extension

The Chrome extension lets you interact with YTView directly from your browser:

- **Open in PIP** - Click the extension icon on any YouTube video to open it in YTView's floating window
- **Add to queue** - Hover over any video thumbnail on YouTube and click the "+" button to add it to the queue
- **Add playlists** - On playlist pages, click "Add all to YTView" to send the entire playlist to your queue

The extension communicates with the desktop app via a local API on port `8765`.

## Video Queue

YTView includes a built-in video queue so you can line up multiple videos:

- Add videos by URL or paste multiple links at once
- Play all queued videos in sequence
- Remove individual items or clear the entire queue
- Queue is persisted between sessions

## How to Use

1. **Open the app** - On launch, you'll see a field to enter the video
2. **Enter a video** - Paste the full YouTube URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`) or just the video ID
3. **Confirm** - Press Enter or click OK
4. **Watch** - The video loads ad-free and you can watch normally
5. **Switch video** - Click anywhere on the video to open the input field again

## Keyboard Shortcuts

- **Cmd+Shift+Y**: Open or focus the YTView window
- **Cmd+Q**: Quit the app
- **Cmd+W**: Close the window

## Requirements

- macOS (Electron-compatible version)
- Node.js (version 18 or higher)
- npm

## Download

Go to the [Releases](../../releases) page and download the latest `.dmg` file for macOS. Open the `.dmg` and drag YTView to your **Applications** folder.

> **Note:** Since the app is not signed by Apple, macOS may block it on first launch. Go to **System Settings > Privacy & Security** and click "Open Anyway".

## Development

This project uses a monorepo with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/).

### Install dependencies

```bash
pnpm install
```

### Run in development mode

```bash
pnpm turbo run build
cd apps/desktop && npm run electron:dev
```

### Build the app (.app / .dmg)

```bash
pnpm turbo run build
cd apps/desktop && npm run electron:build
```

The `.dmg` will be generated in `apps/desktop/dist/`.
