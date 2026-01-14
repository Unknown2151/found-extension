// src/store/historyStore.js
import { writable } from 'svelte/store';
import { nodes, edges, tags } from './graphStore';

function createHistory() {
  const { subscribe, update, set } = writable({
    undo: [],
    redo: [],
  });

  async function pushSnapshot() {
    // snapshot current graph
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(await get(nodes))),
      edges: JSON.parse(JSON.stringify(await get(edges))),
      tags: JSON.parse(JSON.stringify(await get(tags))),
    };
    update((s) => ({ undo: [...s.undo, snapshot].slice(-200), redo: [] }));
  }

  function undoOne() {
    let popped = /** @type {any} */ (null);
    update((s) => {
      if (!s.undo.length) return s;
      popped = s.undo[s.undo.length - 1];
      const newUndo = s.undo.slice(0, -1);
      const newRedo = [
        ...s.redo,
        { nodes: popped.nodes, edges: popped.edges, tags: popped.tags },
      ].slice(-200);
      return { undo: newUndo, redo: newRedo };
    });
    if (popped) {
      nodes.set(popped.nodes);
      edges.set(popped.edges);
      tags.set(popped.tags);
    }
  }

  function redoOne() {
    let popped = /** @type {any} */ (null);
    update((s) => {
      if (!s.redo.length) return s;
      popped = s.redo[s.redo.length - 1];
      const newRedo = s.redo.slice(0, -1);
      const newUndo = [
        ...s.undo,
        { nodes: popped.nodes, edges: popped.edges, tags: popped.tags },
      ].slice(-200);
      return { undo: newUndo, redo: newRedo };
    });
    if (popped) {
      nodes.set(popped.nodes);
      edges.set(popped.edges);
      tags.set(popped.tags);
    }
  }

  return {
    subscribe,
    pushSnapshot,
    undoOne,
    redoOne,
    reset: () => set({ undo: [], redo: [] }),
  };
}

// small helper to get current value of store (sync)
function get(s) {
  return new Promise((res) => {
    const unsub = s.subscribe((v) => {
      res(v);
      unsub();
    });
  });
}

export const history = createHistory();
