// src/graph/graph.js
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import fcose from 'cytoscape-fcose';
import * as webcola from 'webcola';

export function registerLayouts() {
  // Safe registration: try webcola-backed cola, then fcose
  try {
    cola(cytoscape, webcola);
  } catch (e) {
    console.warn('cola registration failed', e);
  }
  try {
    cytoscape.use(fcose);
  } catch (e) {
    console.warn('fcose registration failed', e);
  }
}

/**
 * Minimal Cytoscape config to copy into Graph.svelte if needed
 */
export function createCy(container, opts = {}) {
  registerLayouts();
  return cytoscape({
    container,
    style: opts.style || [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'background-color': 'data(color)',
          width: 'data(size)',
          height: 'data(size)',
        },
      },
      { selector: 'node:selected', style: { 'border-width': 3, 'border-color': '#6ea8fe' } },
      {
        selector: 'edge',
        style: {
          label: 'data(label)',
          'line-color': '#9aa3b2',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
        },
      },
    ],
    boxSelectionEnabled: opts.boxSelectionEnabled ?? true,
  });
}
