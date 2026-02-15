function shortenUrl(url, maxLen = 60) {
  if (!url || url.length <= maxLen) return url || '';
  const half = Math.floor((maxLen - 3) / 2);
  return url.slice(0, half) + '...' + url.slice(-half);
}

function getTitleFallback(stream) {
  const title = stream.pageTitle?.trim();
  if (title) return title;
  if (stream.pageUrl) {
    try {
      return new URL(stream.pageUrl).hostname;
    } catch (_) {
      return stream.pageUrl;
    }
  }
  return '(Không có tiêu đề)';
}

function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = isError ? 'error' : '';
  show(toast);
  setTimeout(() => hide(toast), 3000);
}

async function deleteStream(id) {
  const { capturedStreams = [] } = await chrome.storage.session.get('capturedStreams');
  const next = capturedStreams.filter((s) => s.id !== id);
  await chrome.storage.session.set({ capturedStreams: next });
}

async function clearAllStreams() {
  await chrome.storage.session.set({ capturedStreams: [] });
}

function renderStreamList(streams, config) {
  const listEl = document.getElementById('streamList');
  const toolbarEl = document.getElementById('listToolbar');
  listEl.innerHTML = '';

  const sorted = [...streams].sort((a, b) => a.timestamp - b.timestamp);

  sorted.forEach((stream, index) => {
    const num = index + 1;
    const li = document.createElement('li');
    li.className = 'stream-item';

    const row1 = document.createElement('div');
    row1.className = 'item-row item-row-header';

    const numSpan = document.createElement('span');
    numSpan.className = 'item-num';
    numSpan.textContent = num + '.';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'item-title';
    titleSpan.textContent = getTitleFallback(stream);
    titleSpan.title = stream.pageUrl || '';

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const playBtn = document.createElement('button');
    playBtn.className = 'play-btn';
    playBtn.textContent = 'Play';
    playBtn.title = 'Phát trên Kodi';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Xóa';
    deleteBtn.title = 'Xóa khỏi danh sách';
    deleteBtn.dataset.id = stream.id;

    playBtn.addEventListener('click', async () => {
      if (!config?.host) {
        showToast('Cần cấu hình Kodi trước.', true);
        return;
      }
      playBtn.disabled = true;
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { action: 'playToKodi', url: stream.url },
            (res) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
              } else {
                resolve(res || { success: false, error: 'Unknown error' });
              }
            }
          );
        });
        if (response.success) {
          showToast('Đã gửi tới Kodi');
        } else {
          showToast(response.error || 'Lỗi', true);
        }
      } finally {
        playBtn.disabled = false;
      }
    });

    deleteBtn.addEventListener('click', () => {
      deleteStream(stream.id);
    });

    actions.appendChild(playBtn);
    actions.appendChild(deleteBtn);
    row1.appendChild(numSpan);
    row1.appendChild(titleSpan);
    row1.appendChild(actions);

    const row2 = document.createElement('div');
    row2.className = 'item-row';
    const link = document.createElement('a');
    link.className = 'stream-link';
    link.href = stream.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = shortenUrl(stream.url);
    link.title = stream.url;
    row2.appendChild(link);

    li.appendChild(row1);
    li.appendChild(row2);
    listEl.appendChild(li);
  });

  if (toolbarEl) {
    if (streams.length > 0) show(toolbarEl);
    else hide(toolbarEl);
  }
}

async function init() {
  const loadingEl = document.getElementById('loading');
  const noConfigEl = document.getElementById('noConfig');
  const emptyEl = document.getElementById('empty');
  const listEl = document.getElementById('streamList');
  const toolbarEl = document.getElementById('listToolbar');

  const { kodiConfig } = await chrome.storage.local.get('kodiConfig');
  const { capturedStreams = [] } = await chrome.storage.session.get('capturedStreams');

  hide(loadingEl);

  const config = kodiConfig || {};
  const hasConfig = config.host && config.port;
  const hasStreams = capturedStreams.length > 0;

  if (!hasConfig) {
    show(noConfigEl);
    hide(emptyEl);
    hide(listEl);
    if (toolbarEl) hide(toolbarEl);
  } else if (!hasStreams) {
    hide(noConfigEl);
    show(emptyEl);
    hide(listEl);
    if (toolbarEl) hide(toolbarEl);
  } else {
    hide(noConfigEl);
    hide(emptyEl);
    show(listEl);
    if (toolbarEl) show(toolbarEl);
    renderStreamList(capturedStreams, config);
  }

  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      clearAllStreams();
    });
  }

  document.getElementById('settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('noConfigLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('optionsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

async function refresh() {
  const { kodiConfig } = await chrome.storage.local.get('kodiConfig');
  const { capturedStreams = [] } = await chrome.storage.session.get('capturedStreams');

  const loadingEl = document.getElementById('loading');
  const noConfigEl = document.getElementById('noConfig');
  const emptyEl = document.getElementById('empty');
  const listEl = document.getElementById('streamList');
  const toolbarEl = document.getElementById('listToolbar');

  hide(loadingEl);

  const config = kodiConfig || {};
  const hasConfig = config.host && config.port;
  const hasStreams = capturedStreams.length > 0;

  if (!hasConfig) {
    show(noConfigEl);
    hide(emptyEl);
    hide(listEl);
    if (toolbarEl) hide(toolbarEl);
  } else if (!hasStreams) {
    hide(noConfigEl);
    show(emptyEl);
    hide(listEl);
    if (toolbarEl) hide(toolbarEl);
  } else {
    hide(noConfigEl);
    hide(emptyEl);
    show(listEl);
    if (toolbarEl) show(toolbarEl);
    renderStreamList(capturedStreams, config);
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'session' && changes.capturedStreams) {
    refresh();
  }
});

init();
