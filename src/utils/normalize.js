// src/utils/normalize.js
export const MIN_NODE_SIZE = 28;

export function normalizeNodes(arr) {
  return (Array.isArray(arr) ? arr : []).map((n) => ({
    id: n.id || crypto.randomUUID(),
    label:
      n.label && n.label.trim() ? n.label : n.notes ? String(n.notes).slice(0, 40) : 'Untitled',
    notes: n.notes || '',
    notes_preview: n.notes_preview || (n.notes ? String(n.notes).slice(0, 180) : ''),
    tags: Array.isArray(n.tags) ? n.tags : [],
    size: Math.max(MIN_NODE_SIZE, Number(n.size || MIN_NODE_SIZE)),
    color: n.color || (n.url ? '#6ea8fe' : '#9aa3b2'),
    url: n.url || null,
    createdAt: n.createdAt || new Date().toISOString(),
    position: n.position || undefined,
    meta: n.meta || {},
  }));
}

export function normalizeEdges(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((e) => ({
      id: e.id || crypto.randomUUID(),
      source: e.source || e.from,
      target: e.target || e.to,
      label: e.label || '',
    }))
    .filter((e) => e.source && e.target);
}
