export function exportData() {
  return {
    nodes: JSON.parse(localStorage.getItem('nodes') || '[]'),
    edges: JSON.parse(localStorage.getItem('edges') || '[]'),
    tags: JSON.parse(localStorage.getItem('tags') || '{}'),
  };
}

export function importData(data) {
  if (!data) return;
  localStorage.setItem('nodes', JSON.stringify(data.nodes || []));
  localStorage.setItem('edges', JSON.stringify(data.edges || []));
  localStorage.setItem('tags', JSON.stringify(data.tags || {}));
  location.reload();
}
