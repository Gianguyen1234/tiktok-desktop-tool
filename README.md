# TikTok Music Tool

TikTok Music Tool is a desktop app for listening to TikTok audio in a dedicated window and downloading available media from a TikTok post URL.

## What It Does

- Opens TikTok in a standalone desktop viewer
- Keeps playback active when the app loses focus
- Lets you control playback volume from `0` to `100`
- Fetches download options for:
  - `MP3` audio
  - `HD` video
  - `No watermark` video
  - image posts when available

## How It Works

This project uses:

- `Electron` for the desktop shell
- an embedded `webview` for TikTok
- a small injected script for playback behavior
- a main-process download bridge for saving files locally

The current downloader provider is `tikwm`.

## Security And Transparency

This project is open source so people can inspect how it works before running it.

Current behavior:

- `contextIsolation` is enabled
- `nodeIntegration` is disabled
- downloads are handled in the Electron main process
- the renderer only accesses a limited preload bridge
- external links open in the system browser

Current trust boundaries:

- media download options currently depend on `https://tikwm.com/api/`
- TikTok can change its page structure or behavior at any time
- this is a convenience app, not a security product

## Running Locally

Install dependencies:

```powershell
npm install
```

Start the app:

```powershell
npm start
```

## Building

Create an unpacked build:

```powershell
npm run pack
```

Create Windows release files:

```powershell
npm run dist:win
```

General distribution build:

```powershell
npm run dist
```

Build output is written to `dist/`.

## Release Files

Windows builds currently produce:

- `TikTok Music Tool-<version>-win-x64-setup.exe`
- `TikTok Music Tool-<version>-win-x64-portable.exe`
- `SHA256SUMS.txt`

The checksum file is provided so anyone can verify that a downloaded binary matches the published release artifact.

## Verifying Downloads

Each release can include:

- the Windows setup file
- the Windows portable file
- `SHA256SUMS.txt`
- `verify.bat`

To verify downloaded files:

1. Put `verify.bat`, `SHA256SUMS.txt`, and the downloaded `.exe` files in the same folder.
2. Run `verify.bat`.
3. Confirm that both files return `[OK]`.

If a file returns `[FAIL]` or `[MISSING]`, do not trust that download until the problem is resolved.

## License

This project is licensed under the `MIT` License. See [LICENSE](/G:/tiktok-desktop-tool/LICENSE).
