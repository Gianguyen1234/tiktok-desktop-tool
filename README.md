# TikTok Music Tool

A lightweight desktop app for opening TikTok in a dedicated window, keeping playback active when the app loses focus, and downloading MP3 audio or video from a TikTok post URL.

## Features

- Dedicated TikTok desktop viewer
- Background playback toggle
- Volume control from `0` to `100`
- Download options for:
  - `MP3` audio
  - `HD` video
  - `No watermark` video
  - image posts when the provider returns them

## Current Architecture

- `Electron` desktop shell
- `webview` for TikTok
- injected page script for playback behavior
- main-process downloader bridge
- provider-based download fetch, currently using `tikwm`

## Security Model

This app is safer than installing a random browser extension only if the code and release process stay transparent.

Current constraints:

- `contextIsolation` is enabled
- `nodeIntegration` is disabled
- file downloads happen in the Electron main process
- the renderer only gets a narrow preload bridge
- the app opens external links in the system browser

Current trust boundary:

- the downloader depends on `https://tikwm.com/api/`
- TikTok can change page behavior at any time
- this is not a security product and should not be marketed as malware-proof or virus-proof

## Development

Install dependencies:

```powershell
npm install
```

Run the app:

```powershell
npm start
```

## Packaging

Create unpacked output:

```powershell
npm run pack
```

Create Windows installer and portable build:

```powershell
npm run dist:win
```

General distribution build:

```powershell
npm run dist
```

Build output goes to `dist/`.

## Publishing To GitHub

Recommended release flow:

1. Push source code to a public GitHub repository.
2. Run `npm run dist:win`.
3. Upload the generated files from `dist/` to a GitHub Release.
4. Publish SHA256 checksums alongside the binaries.
5. Document exactly which external services the app calls.

Recommended files for a release:

- Windows installer (`nsis`)
- portable executable
- `SHA256SUMS.txt`
- release notes

## Open Source Notes

Before publishing broadly, you should still add:

- a license file such as `MIT`
- screenshots
- a privacy note
- a small changelog
- optional code signing for Windows releases
