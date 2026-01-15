// src/utils/storage.js
export async function storageGet(keys) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((res) => chrome.storage.local.get(keys, (r) => res(r)));
  } else {
    const out = {};
    if (Array.isArray(keys)) {
      const raw = JSON.parse(localStorage.getItem('found_db_all') || '{}');
      keys.forEach((k) => (out[k] = raw[k]));
      return out;
    } else {
      return JSON.parse(localStorage.getItem(keys) || 'null');
    }
  }
}

export async function storageSet(obj) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((res, rej) =>
      chrome.storage.local.set(obj, () => {
        if (chrome.runtime.lastError) rej(chrome.runtime.lastError);
        else res();
      })
    );
  } else {
    const raw = JSON.parse(localStorage.getItem('found_db_all') || '{}');
    localStorage.setItem('found_db_all', JSON.stringify({ ...raw, ...obj }));
  }
}

// Convenience helpers used by the app for import/export
export function exportData() {
  try {
    return JSON.parse(localStorage.getItem('found_db_all') || '{}');
  } catch (e) {
    return {};
  }
}

export function importData(data) {
  if (!data || typeof data !== 'object') return;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      chrome.storage.local.set(data);
    } catch (e) {
      // fallback to localStorage
      localStorage.setItem('found_db_all', JSON.stringify(data));
    }
  } else {
    localStorage.setItem('found_db_all', JSON.stringify(data));
  }
}

// --- Cloud sync scaffold (opt-in) ---
export async function addCapturedNode(text, url) {
  const nodesKey = 'found_nodes_v1';
  const dbKey = 'found_db_all';

  // 1. Get existing data
  let nodes = [];
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const data = await new Promise(res => chrome.storage.local.get([nodesKey], res));
    nodes = data[nodesKey] || [];
  } else {
    // Fallback if somehow called in non-extension context
    const raw = JSON.parse(localStorage.getItem(dbKey) || '{}');
    nodes = raw[nodesKey] || [];
  }

  // 2. Create new node
  const id = crypto.randomUUID();
  const wordCount = text.trim().split(/\s+/).length;
  let label = text.slice(0, 30) + (text.length > 30 ? '...' : '');
  let notes = text;

  if (wordCount < 7) {
    label = text;
    notes = '';
  }

  const newNode = {
    id,
    label,
    notes,
    notes_preview: notes ? notes.slice(0, 180) : '',
    tags: [],
    url: url || '',
    created_at: new Date().toISOString()
  };

  // 3. Save back
  const updatedNodes = [...nodes, newNode];
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ [nodesKey]: updatedNodes });
    // Also update the unified db for consistency if used
    const dbData = await new Promise(res => chrome.storage.local.get([dbKey], res));
    const db = dbData[dbKey] || {};
    db[nodesKey] = updatedNodes;
    await chrome.storage.local.set({ [dbKey]: db });
  } else {
    const db = JSON.parse(localStorage.getItem(dbKey) || '{}');
    db[nodesKey] = updatedNodes;
    localStorage.setItem(dbKey, JSON.stringify(db));
  }

  return newNode;
}

export function isCloudSyncEnabled() {
  return localStorage.getItem('found_sync_enabled') === '1';
}

export function setCloudSyncEnabled(enabled) {
  localStorage.setItem('found_sync_enabled', enabled ? '1' : '0');
}

export function getSyncProvider() {
  return localStorage.getItem('found_sync_provider') || null;
}

export function setSyncProvider(provider) {
  // provider: e.g. 'google-drive' or 'dropbox'
  localStorage.setItem('found_sync_provider', provider);
}

// Placeholder async sync functions — implement OAuth + API calls for real sync
export async function syncToCloud() {
  const provider = getSyncProvider();
  if (!provider) throw new Error('No sync provider configured');

  if (provider === 'file-backup') {
    // File Backup: Trigger a download of the current state
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    // We can't easily "await" the user saving the file, but we can trigger the download
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `found-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    return { ok: true };
  }

  // TODO: implement provider-specific upload
  console.warn('syncToCloud called (scaffold) for provider', provider);
  return { ok: true };
}

export async function syncFromCloud() {
  const provider = getSyncProvider();
  if (!provider) throw new Error('No sync provider configured');

  if (provider === 'file-backup') {
    // File Backup: Trigger a format upload
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = (e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        const file = target?.files?.[0];
        if (!file) {
          reject(new Error("No file selected"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const txt = String(reader.result);
            importData(JSON.parse(txt));
            resolve({ ok: true });
          } catch (err) {
            reject(err);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  // TODO: implement provider-specific download
  console.warn('syncFromCloud called (scaffold) for provider', provider);
  return { ok: true };
}
