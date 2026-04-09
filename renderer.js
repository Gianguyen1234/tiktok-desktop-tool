const api = window.desktopApi;

const tiktokView = document.getElementById('tiktok-view');
const viewerUrl = document.getElementById('viewer-url');
const openUrl = document.getElementById('open-url');
const viewerStatus = document.getElementById('viewer-status');

const volumeSlider = document.getElementById('volume-slider');
const volumeNumber = document.getElementById('volume-number');
const backgroundPlay = document.getElementById('background-play');
const playbackStatus = document.getElementById('playback-status');

const downloadUrl = document.getElementById('download-url');
const fetchUrl = document.getElementById('fetch-url');
const downloadStatus = document.getElementById('download-status');
const downloadMeta = document.getElementById('download-meta');
const downloadResults = document.getElementById('download-results');

const POST_URL_RE = /^https?:\/\/(?:www\.)?tiktok\.com\/@[^/]+\/video\/\d+/i;

const state = {
  volume: 1,
  backgroundPlay: true
};

const INJECT_SCRIPT = `
(() => {
  if (window.__tikTokMusicTool) {
    return true;
  }

  const cfg = {
    backgroundPlay: true,
    volume: 1
  };

  const origPause = HTMLVideoElement.prototype.pause;
  const realHiddenGetter = (() => {
    const d = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    return d && d.get ? d.get : null;
  })();
  const realVisibilityGetter = (() => {
    const d = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    return d && d.get ? d.get : null;
  })();

  function reallyHidden() {
    return realHiddenGetter ? realHiddenGetter.call(document) : false;
  }

  function mediaNodes() {
    return Array.from(document.querySelectorAll('video, audio'));
  }

  function applyVolume() {
    const media = mediaNodes();
    media.forEach((node) => {
      try {
        node.defaultMuted = false;
        node.muted = false;
        node.volume = cfg.volume;
      } catch (_) {}
    });
    return media.length;
  }

  function pauseBlocker(event) {
    if (cfg.backgroundPlay && event.target instanceof HTMLVideoElement && (reallyHidden() || !document.hasFocus())) {
      event.stopImmediatePropagation();
      event.preventDefault();
      event.target.play().catch(() => {});
    }
  }

  function enableBackgroundPlay() {
    try {
      Object.defineProperty(document, 'hidden', {
        get() {
          return cfg.backgroundPlay ? false : (realHiddenGetter ? realHiddenGetter.call(document) : false);
        },
        configurable: true
      });
    } catch (_) {}

    try {
      Object.defineProperty(document, 'visibilityState', {
        get() {
          return cfg.backgroundPlay ? 'visible' : (realVisibilityGetter ? realVisibilityGetter.call(document) : 'visible');
        },
        configurable: true
      });
    } catch (_) {}

    HTMLVideoElement.prototype.pause = function patchedPause() {
      if (cfg.backgroundPlay && (reallyHidden() || !document.hasFocus())) return;
      return origPause.call(this);
    };

    window.removeEventListener('pause', pauseBlocker, true);
    window.addEventListener('pause', pauseBlocker, true);
  }

  function bindNode(node) {
    if (!node || node.__ttBound) return;
    node.__ttBound = true;
    node.addEventListener('play', applyVolume, true);
    node.addEventListener('canplay', applyVolume, true);
    node.addEventListener('volumechange', applyVolume, true);
  }

  function scan(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('video, audio').forEach(bindNode);
    return applyVolume();
  }

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node && node.matches && node.matches('video, audio')) bindNode(node);
        scan(node);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  setInterval(applyVolume, 500);
  enableBackgroundPlay();
  scan(document);

  window.__tikTokMusicTool = {
    updateSettings(next) {
      if (typeof next.backgroundPlay === 'boolean') cfg.backgroundPlay = next.backgroundPlay;
      if (typeof next.volume === 'number') cfg.volume = Math.max(0, Math.min(1, next.volume));
      enableBackgroundPlay();
      return { mediaCount: applyVolume(), backgroundPlay: cfg.backgroundPlay, volume: cfg.volume };
    },
    inspectPage() {
      const canonical = document.querySelector('link[rel="canonical"]');
      const desc = document.querySelector('meta[property="og:description"], meta[name="description"]');
      return {
        url: (canonical && canonical.href) || location.href,
        title: document.title || '',
        description: desc ? (desc.content || '') : '',
        mediaCount: mediaNodes().length
      };
    }
  };

  return true;
})()
`;

function normalizeUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  return value.startsWith('http') ? value : `https://${value}`;
}

function setStatus(element, text, tone) {
  element.textContent = text;
  element.classList.remove('good', 'bad', 'muted');
  element.classList.add(tone || 'muted');
}

function setVolumeUi(percent) {
  const safe = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  state.volume = safe / 100;
  volumeSlider.value = String(safe);
  volumeNumber.value = String(safe);
}

function sanitizeFilename(name) {
  return String(name || 'tiktok-media')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'tiktok-media';
}

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function isPostUrl(url) {
  return POST_URL_RE.test(String(url || ''));
}

function injectTool() {
  return tiktokView.executeJavaScript(INJECT_SCRIPT, true);
}

function applyPlaybackSettings() {
  injectTool()
    .then(() => tiktokView.executeJavaScript(
      `window.__tikTokMusicTool.updateSettings(${JSON.stringify({
        volume: state.volume,
        backgroundPlay: state.backgroundPlay
      })})`,
      true
    ))
    .then((result) => {
      const count = result && result.mediaCount ? result.mediaCount : 0;
      setStatus(playbackStatus, `Applied to ${count} media node(s)`, 'good');
      setStatus(viewerStatus, 'Viewer ready', 'good');
    })
    .catch((err) => {
      setStatus(playbackStatus, `Playback error: ${err.message}`, 'bad');
    });
}

function inspectPage() {
  return injectTool().then(() => tiktokView.executeJavaScript('window.__tikTokMusicTool.inspectPage()', true));
}

function clearResults() {
  downloadMeta.textContent = '';
  downloadResults.innerHTML = '';
}

function addDownloadButton(row) {
  const button = document.createElement('button');
  const left = document.createElement('span');
  const right = document.createElement('span');

  left.textContent = row.label;
  right.textContent = row.size ? formatSize(row.size) : '';
  right.style.color = 'var(--muted)';

  button.append(left, right);
  button.addEventListener('click', () => {
    button.disabled = true;
    api.downloadFile(row.url, row.filename)
      .then((result) => {
        setStatus(downloadStatus, `Saved: ${result.path}`, 'good');
      })
      .catch((err) => {
        setStatus(downloadStatus, `Download failed: ${err.message}`, 'bad');
      })
      .finally(() => {
        button.disabled = false;
      });
  });

  downloadResults.appendChild(button);
}

function buildRows(data, fileBase) {
  const safeBase = sanitizeFilename(fileBase);
  const rows = [];

  if (data.music) rows.push({ label: 'MP3 Audio', size: null, url: data.music, filename: `${safeBase}.mp3` });
  if (data.hdplay) rows.push({ label: 'Video HD', size: data.hd_size || data.hdsize, url: data.hdplay, filename: `${safeBase}-hd.mp4` });
  if (data.play) rows.push({ label: 'Video No Watermark', size: data.size, url: data.play, filename: `${safeBase}.mp4` });
  if (Array.isArray(data.images)) {
    data.images.forEach((img, index) => {
      rows.push({ label: `Image ${index + 1}/${data.images.length}`, size: null, url: img, filename: `${safeBase}-image-${index + 1}.jpg` });
    });
  }

  return rows;
}

function fetchDownloadOptions(url, suggestedName) {
  const targetUrl = normalizeUrl(url);
  if (!targetUrl) {
    setStatus(downloadStatus, 'Paste a TikTok post URL first.', 'bad');
    return;
  }

  if (!isPostUrl(targetUrl)) {
    setStatus(downloadStatus, 'Use a TikTok post URL in the form /@user/video/123.', 'bad');
    return;
  }

  clearResults();
  setStatus(downloadStatus, 'Fetching media options...', 'muted');
  fetchUrl.disabled = true;

  api.fetchTikwm(targetUrl)
    .then((data) => {
      const rows = buildRows(data, suggestedName || data.title || data.id || 'tiktok-media');
      if (!rows.length) {
        setStatus(downloadStatus, 'No downloadable files returned by the provider.', 'bad');
        return;
      }

      const bits = [];
      if (suggestedName || data.title) bits.push(sanitizeFilename(suggestedName || data.title));
      if (data.author && data.author.nickname) bits.push(`by ${data.author.nickname}`);
      downloadMeta.textContent = bits.join(' | ');

      rows.forEach(addDownloadButton);
      setStatus(downloadStatus, `${rows.length} option(s) ready.`, 'good');
    })
    .catch((err) => {
      setStatus(downloadStatus, `Provider error: ${err.message}`, 'bad');
    })
    .finally(() => {
      fetchUrl.disabled = false;
    });
}

function syncUrls(url) {
  const nextUrl = normalizeUrl(url) || 'https://www.tiktok.com';
  viewerUrl.value = nextUrl;
  downloadUrl.value = nextUrl;
}

openUrl.addEventListener('click', () => {
  const target = normalizeUrl(viewerUrl.value) || 'https://www.tiktok.com';
  tiktokView.loadURL(target);
});

viewerUrl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') openUrl.click();
});

volumeSlider.addEventListener('input', () => {
  setVolumeUi(volumeSlider.value);
  applyPlaybackSettings();
});

volumeNumber.addEventListener('input', () => {
  setVolumeUi(volumeNumber.value);
  applyPlaybackSettings();
});

backgroundPlay.addEventListener('change', () => {
  state.backgroundPlay = backgroundPlay.checked;
  applyPlaybackSettings();
});

fetchUrl.addEventListener('click', () => {
  fetchDownloadOptions(downloadUrl.value, '');
});

downloadUrl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') fetchDownloadOptions(downloadUrl.value, '');
});

tiktokView.addEventListener('did-finish-load', () => {
  syncUrls(tiktokView.getURL());
  applyPlaybackSettings();
});

tiktokView.addEventListener('did-navigate', (event) => {
  syncUrls(event.url);
});

tiktokView.addEventListener('did-navigate-in-page', (event) => {
  syncUrls(event.url);
});

tiktokView.addEventListener('did-fail-load', (event) => {
  setStatus(viewerStatus, `Load failed: ${event.errorDescription}`, 'bad');
});

window.addEventListener('error', (event) => {
  setStatus(downloadStatus, `Renderer error: ${event.message}`, 'bad');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason && event.reason.message ? event.reason.message : String(event.reason);
  setStatus(downloadStatus, `Promise error: ${reason}`, 'bad');
});

setVolumeUi(100);
syncUrls('https://www.tiktok.com');
