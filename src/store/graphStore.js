// src/store/graphStore.js
import { writable } from 'svelte/store';

function createStored(key, fallback) {
  let initial;
  try {
    const raw = localStorage.getItem(key);
    initial = raw ? JSON.parse(raw) : fallback;
  } catch {
    initial = fallback;
  }
  const store = writable(initial);
  store.subscribe((v) => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  });
  return store;
}

export const nodes = createStored('found_nodes_v1', []);
export const edges = createStored('found_edges_v1', []);
export const tags = createStored('found_tags_v1', {});
export const activeNodeId = writable(null);

// Cytoscape instance store (not persisted)
export const cyInstance = writable(null);
