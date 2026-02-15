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

async function testKodiConnection(config) {
  const url = buildKodiUrl(config);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getKodiAuthHeaders(config) },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'JSONRPC.Ping',
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

  return true;
}

function getFormConfig() {
  const host = document.getElementById('host').value.trim();
  const port = parseInt(document.getElementById('port').value, 10) || 8080;
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  return { host, port, username, password };
}

function validateConfig(config) {
  if (!config.host) {
    return 'Vui lòng nhập Host.';
  }
  if (config.port < 1 || config.port > 65535) {
    return 'Port phải từ 1 đến 65535.';
  }
  return null;
}

function showResult(message, isError) {
  const el = document.getElementById('testResult');
  el.textContent = message;
  el.className = isError ? 'error' : 'success';
}

async function loadConfig() {
  const { kodiConfig } = await chrome.storage.local.get('kodiConfig');
  const config = kodiConfig || { host: '', port: 8080, username: '', password: '' };

  document.getElementById('host').value = config.host || '';
  document.getElementById('port').value = config.port || 8080;
  document.getElementById('username').value = config.username || '';
  document.getElementById('password').value = config.password || '';
}

document.getElementById('kodiForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const config = getFormConfig();
  const err = validateConfig(config);
  if (err) {
    showResult(err, true);
    return;
  }

  await chrome.storage.local.set({
    kodiConfig: {
      host: config.host,
      port: config.port,
      username: config.username || '',
      password: config.password || ''
    }
  });

  showResult('Đã lưu cấu hình.', false);
});

document.getElementById('testBtn').addEventListener('click', async () => {
  const config = getFormConfig();
  const err = validateConfig(config);
  if (err) {
    showResult(err, true);
    return;
  }

  const resultEl = document.getElementById('testResult');
  resultEl.textContent = 'Đang kiểm tra...';
  resultEl.className = '';

  try {
    await testKodiConnection(config);
    showResult('Kết nối thành công!', false);
  } catch (err) {
    showResult(err.message || 'Không kết nối được Kodi.', true);
  }
});

loadConfig();
