const M3U8_FILTER = {
  urls: ['*://*/*.m3u8*', '*://*/*index.m3u8*']
};
const DEDUP_MS = 60000;
const MAX_STREAMS = 100;

async function addCapturedStream(details) {
  const { url, tabId, initiator } = details;
  const now = Date.now();

  const { capturedStreams = [] } = await chrome.storage.session.get('capturedStreams');

  const exists = capturedStreams.some(
    (s) =>
      s.url === url &&
      s.tabId === tabId &&
      now - s.timestamp < DEDUP_MS
  );
  if (exists) return;

  const newStream = {
    id: crypto.randomUUID(),
    url,
    tabId,
    timestamp: now,
    initiator: initiator || undefined
  };

  if (tabId > 0) {
    try {
      const tab = await chrome.tabs.get(tabId);
      newStream.pageTitle = tab.title ?? '';
      newStream.pageUrl = tab.url ?? '';
    } catch (_) {
      newStream.pageTitle = '';
      newStream.pageUrl = '';
    }
  }

  const updated = [newStream, ...capturedStreams].slice(0, MAX_STREAMS);
  await chrome.storage.session.set({ capturedStreams: updated });
}

function buildKodiUrl(config) {
  const { host, port } = config;
  return `http://${host}:${port}/jsonrpc`;
}

function getKodiAuthHeaders(config) {
  const { username, password } = config;
  if (!username || !password) return {};
  const cred = username + ':' + password;
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(cred)));
  return { 'Authorization': 'Basic ' + encoded };
}

async function kodiRequest(config, method, params = {}) {
  const url = buildKodiUrl(config);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getKodiAuthHeaders(config) },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: 1
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Kodi error');
  }

  return data;
}

async function playToKodi(m3u8Url) {
  const { kodiConfig } = await chrome.storage.local.get('kodiConfig');
  const config = kodiConfig || {};

  if (!config.host || !config.port) {
    return { success: false, error: 'Chưa cấu hình Kodi. Vui lòng cấu hình trong Options.' };
  }

  try {
    await kodiRequest(config, 'Player.Open', {
      item: { file: m3u8Url }
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Không kết nối được Kodi'
    };
  }
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    addCapturedStream(details);
  },
  M3U8_FILTER
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'playToKodi') {
    playToKodi(message.url).then(sendResponse);
    return true;
  }
});
