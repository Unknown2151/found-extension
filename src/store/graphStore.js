// src/store/graphStore.js
import { writable } from 'svelte/store';

async function createStored(key, fallback) {
  let initial = fallback;

  // Try to load initial data
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const data = await new Promise(res => chrome.storage.local.get([key], res));
    if (data[key] !== undefined) initial = data[key];
  } else {
    try {
      const raw = localStorage.getItem(key);
      if (raw) initial = JSON.parse(raw);
    } catch {
      initial = fallback;
    }
  }

  const store = writable(initial);

  // Auto-save on changes
  store.subscribe((v) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [key]: v });
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch { }
    }
  });

  // Listen for changes from other contexts (like background script)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[key]) {
        store.set(changes[key].newValue);
      }
    });
  }

  return store;
}

export const nodes = await createStored('found_nodes_v1', []);
export const edges = await createStored('found_edges_v1', []);
export const tags = await createStored('found_tags_v1', {});
export const activeNodeId = writable(null);

// Cytoscape instance store (not persisted)
export const cyInstance = writable(null);
