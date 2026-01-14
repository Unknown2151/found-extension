<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import cytoscape from 'cytoscape';
  import cola from 'cytoscape-cola';
  import fcose from 'cytoscape-fcose';
  import * as webcola from 'webcola';

  import { nodes, edges, activeNodeId, cyInstance } from '../store/graphStore';
  import Minimap from './minimap/Minimap.svelte';
  import ContextMenu from '../ui/ContextMenu.svelte';
  import ConnectionsDrawer from '../ui/ConnectionsDrawer.svelte';

  // register layouts safely (webcola for cola)
  try {
    cola(cytoscape, webcola);
  } catch (e) {
    console.warn('cola register failed', e);
  }
  try {
    cytoscape.use(fcose);
  } catch (e) {
    /* fcose optional */
  }

  const dispatch = createEventDispatcher();

  let el; // div container ref
  let cy; // cytoscape instance
  let localNodes = [];
  let localEdges = [];

  let unsubscribeNodes = null;
  let unsubscribeEdges = null;

  let ctxVisible = false;
  let ctxX = 0,
    ctxY = 0,
    ctxTargetId = null;

  let connectMode = false; // if true, user will pick source then target
  let connectSource = null; // id

  // Context menu keyboard handler reference
  function onWindowKey(e) {
    if (e.key === 'Escape') {
      closeContext();
      connectMode = false;
      connectSource = null;
    }
  }

  onMount(() => {
    // subscribe to stores only after component mounts
    unsubscribeNodes = nodes.subscribe((v) => {
      localNodes = v || [];
      safeRender();
    });
    unsubscribeEdges = edges.subscribe((v) => {
      localEdges = v || [];
      safeRender();
    });

    // init cy and listeners
    initCy();

    // window key handler
    window.addEventListener('keydown', onWindowKey);
  });

  onDestroy(() => {
    unsubscribeNodes && unsubscribeNodes();
    unsubscribeEdges && unsubscribeEdges();
    window.removeEventListener('keydown', onWindowKey);
    if (cy) {
      cyInstance.set(null);
      try {
        cy.destroy();
      } catch (_) {}
    }
  });

  function initCy() {
    if (cy) return;

    cy = cytoscape({
      container: el,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': 'data(color)',
            width: 'data(size)',
            height: 'data(size)',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'font-size': 10,
            color: '#e6eef6',
            'text-wrap': 'wrap',
            'text-max-width': '90',
          },
        },
        { selector: 'node:selected', style: { 'border-width': 3, 'border-color': '#6ea8fe' } },
        {
          selector: 'edge',
          style: {
            label: 'data(label)',
            'line-color': '#9aa3b2',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#9aa3b2',
            'curve-style': 'bezier',
            width: 1,
            opacity: 0.6,
          },
        },
        { selector: '.dimmed', style: { opacity: 0.08 } },
        { selector: '.hovered', style: { 'border-width': 3, 'border-color': '#fff' } },
      ],
      pixelRatio: 1,
      boxSelectionEnabled: true,
    });

    // expose instance to store for other components
    cyInstance.set(cy);

    // events
    cy.on('tap', 'node', (evt) => {
      const id = evt.target.id();
      if (connectMode) {
        // connection mode: pick source / target
        if (!connectSource) {
          connectSource = id;
          dispatch('notify', { message: 'Source selected. Click target node.' });
        } else if (connectSource === id) {
          // clicked same node: cancel
          connectSource = null;
          dispatch('notify', { message: 'Select a different node as target.' });
        } else {
          // create edge
          dispatch('createEdge', { from: connectSource, to: id });
          connectSource = null;
          connectMode = false;
        }
        return;
      }

      activeNodeId.set(id);
      dispatch('nodeOpen', { id });
    });

    // right-click context menu (node)
    cy.on('cxttap', 'node', (evt) => {
      openContext(evt, 'node');
    });

    // right-click context menu (edge)
    cy.on('cxttap', 'edge', (evt) => {
      openContext(evt, 'edge');
    });

    // tap on background closes details and context menu
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        activeNodeId.set(null);
        closeContext();
      }
    });

    // double tap on background to create node
    cy.on('dbltap', (evt) => {
      if (evt.target === cy) {
        const pos = evt.position;
        dispatch('createNode', { x: pos.x, y: pos.y });
      }
    });

    // dragging updates position
    cy.on('dragfree', 'node', async (evt) => {
      const id = evt.target.id();
      const pos = evt.target.position();
      const idx = localNodes.findIndex((n) => n.id === id);
      if (idx > -1) {
        localNodes[idx] = { ...localNodes[idx], position: pos };
        nodes.set([...localNodes]); // persist to store
        dispatch('persist'); // parent may handle storage set if needed
      }
    });

    // initial render
    safeRender();
  }

  function safeRender() {
    if (!cy) return;

    cy.batch(() => {
      // remove stale elements
      const nodeIds = new Set(localNodes.map((n) => n.id));
      const edgeIds = new Set(localEdges.map((e) => e.id));

      cy.elements().forEach((elm) => {
        if (elm.isNode() && !nodeIds.has(elm.id())) elm.remove();
        if (elm.isEdge() && !edgeIds.has(elm.id())) elm.remove();
      });

      // update/add nodes
      localNodes.forEach((n) => {
        const elNode = cy.getElementById(n.id);
        if (elNode && elNode.length) {
          elNode.data({
            id: n.id,
            label: n.label,
            size: n.size || 32,
            color: n.color || '#9aa3b2',
            notes: n.notes,
            url: n.url,
          });
          if (n.position) elNode.position(n.position);
        } else {
          // add node (provide position if available)
          const toAdd = {
            group: 'nodes',
            data: {
              id: n.id,
              label: n.label,
              size: n.size || 32,
              color: n.color || '#9aa3b2',
              notes: n.notes,
              url: n.url,
            },
          };
          if (n.position) toAdd.position = n.position;
          cy.add(toAdd);
        }
      });

      // update/add edges
      localEdges.forEach((e) => {
        const elEdge = cy.getElementById(e.id);
        if (elEdge && elEdge.length) {
          elEdge.data({ id: e.id, source: e.source, target: e.target, label: e.label });
        } else {
          // only add edge if both endpoints exist
          if (cy.getElementById(e.source).length && cy.getElementById(e.target).length) {
            cy.add({
              group: 'edges',
              data: { id: e.id, source: e.source, target: e.target, label: e.label },
            });
          }
        }
      });
    });

    // layout a small subset if many nodes don't have an explicit position
    try {
      const unpositioned = cy.nodes().filter((n) => {
        // treat as unpositioned if it doesn't have a saved position attached
        const p = n.position();
        return p == null || (isNaN(p.x) && isNaN(p.y));
      });

      if (unpositioned.length > 0 || true) {
        // Continuous layout for "floating" feel (obsidian-like)
        let layoutOpts = {
          name: 'cola',
          animate: true,
          refresh: 1,
          maxSimulationTime: 6000,
          ungrabifyWhileSimulating: false,
          fit: false,
          padding: 30,
          randomize: false,
          nodeDimensionsIncludeLabels: true,
          nodeSpacing: function (node) {
            return 40;
          },
        };
        cy.layout(layoutOpts).run();
      } else {
        cy.fit(null, 30);
      }
    } catch (err) {
      // fallback: just fit
      try {
        cy.fit(null, 30);
      } catch (_) {}
    }

    dispatch('rendered');
  }

  // Context menu helpers
  function openContext(evt, type) {
    const original = evt.originalEvent || {};
    const clientX = original.clientX || el.getBoundingClientRect().left + evt.position.x;
    const clientY = original.clientY || el.getBoundingClientRect().top + evt.position.y;

    ctxVisible = true;
    ctxX = clientX;
    ctxY = clientY;
    ctxTargetId = evt.target.id();
    ctxType = type;
  }

  let ctxType = 'node';

  function closeContext() {
    ctxVisible = false;
    ctxTargetId = null;
  }

  function onCtxAction(e) {
    // events from ContextMenu
    const { action } = e.detail || {};
    if (!ctxTargetId) return;

    if (action === 'delete-edge') {
      const idx = localEdges.findIndex((e) => e.id === ctxTargetId);
      if (idx > -1) {
        const edge = localEdges[idx];
        // remove locally and sync
        localEdges.splice(idx, 1);
        edges.set([...localEdges]); // parent store update
        dispatch('persist');
      }
      closeContext();
      return;
    }

    if (action === 'open') {
      activeNodeId.set(ctxTargetId);
    } else if (action === 'center') {
      try {
        cy.fit(cy.getElementById(ctxTargetId), 40);
      } catch (_) {}
    } else if (action === 'delete') {
      // ask parent to delete
      dispatch('deleteNode', { id: ctxTargetId });
    } else if (action === 'connect') {
      connectMode = true;
      connectSource = ctxTargetId;
      dispatch('notify', { message: 'Connect mode: choose target node' });
    } else if (action === 'open-link') {
      const node = localNodes.find((n) => n.id === ctxTargetId);
      if (node && node.url) {
        window.open(node.url, '_blank');
      } else {
        dispatch('notify', { message: 'No URL for this node' });
      }
    } else if (action === 'copy-url') {
      const node = localNodes.find((n) => n.id === ctxTargetId);
      if (node && node.url) {
        navigator.clipboard
          .writeText(node.url)
          .then(() => dispatch('notify', { message: 'URL copied' }));
      } else dispatch('notify', { message: 'No URL to copy' });
    } else if (action === 'add-tag') {
      const tag = prompt('Tag name to add to node:');
      if (tag) dispatch('addTagToNode', { id: ctxTargetId, tag });
    }

    closeContext();
  }
</script>

<div class="graph-wrap" bind:this={el} id="cy" aria-label="Graph view"></div>

{#if ctxVisible}
  <ContextMenu x={ctxX} y={ctxY} targetId={ctxTargetId} type={ctxType} on:action={onCtxAction} />
{/if}

<!-- connection drawer -->
{#if connectMode}
  <ConnectionsDrawer
    sourceId={connectSource}
    on:cancel={() => {
      connectMode = false;
      connectSource = null;
    }}
    on:create={(e) => {
      dispatch('createEdge', e.detail);
      connectMode = false;
      connectSource = null;
    }}
  />
{/if}

<!-- minimap inside graph component; Minimap reads cy from the shared store -->
<Minimap />

<style>
  .graph-wrap {
    position: absolute;
    inset: 0;
    z-index: 1;
  }
</style>
