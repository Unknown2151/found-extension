<script>
  import { onDestroy, createEventDispatcher } from 'svelte';
  import NotesEditor from '../editor/NotesEditor.svelte';
  import { nodes, edges, tags, activeNodeId } from '../store/graphStore';

  const dispatch = createEventDispatcher();

  let localNodes = [];
  let localEdges = [];
  let localTags = {};
  let activeId = null;
  let activeNode = null;
  let nodeIndex = -1;

  const unsubNodes = nodes.subscribe((v) => {
    localNodes = v || [];
    refreshActive();
  });
  const unsubEdges = edges.subscribe((v) => {
    localEdges = v || [];
  });
  const unsubTags = tags.subscribe((v) => (localTags = v || {}));
  const unsubActive = activeNodeId.subscribe((v) => {
    activeId = v;
    refreshActive();
  });

  onDestroy(() => {
    unsubNodes();
    unsubEdges();
    unsubTags();
    unsubActive();
  });

  function refreshActive() {
    if (!activeId) {
      activeNode = null;
      nodeIndex = -1;
      return;
    }
    nodeIndex = localNodes.findIndex((n) => n.id === activeId);
    activeNode = nodeIndex > -1 ? { ...localNodes[nodeIndex] } : null;
  }

  function saveNotes(e) {
    if (!activeNode) return;
    const text = e.detail?.text ?? activeNode.notes ?? '';
    activeNode.notes = text;
    activeNode.notes_preview = text ? text.slice(0, 180) : '';
    localNodes[nodeIndex] = { ...activeNode };
    nodes.set([...localNodes]);

    syncLinks(text);

    dispatch('persist');
    dispatch('saved', { id: activeNode.id });
  }

  function syncLinks(text) {
    if (!activeNode || !text) return;
    // Regex matches [[Label]]
    const regex = /\[\[([^\]]+)\]\]/g;
    let match;
    const missingEdges = [];

    // Find existing targets from edges
    const existingTargets = new Set(
      localEdges.filter((e) => e.source === activeNode.id).map((e) => e.target)
    );

    while ((match = regex.exec(text)) !== null) {
      const label = match[1];
      // Find target node by label
      const targetNode = localNodes.find((n) => n.label === label);

      if (targetNode && targetNode.id !== activeNode.id) {
        if (!existingTargets.has(targetNode.id)) {
          missingEdges.push({
            id: crypto.randomUUID(),
            source: activeNode.id,
            target: targetNode.id,
          });
          existingTargets.add(targetNode.id); // avoid duplicates
        }
      }
    }

    if (missingEdges.length > 0) {
      edges.update((prev) => [...prev, ...missingEdges]);
      dispatch('persist');
    }
  }

  function handleWikiLink(e) {
    // explicit creation event
    const { id, label } = e.detail;
    if (!activeNode || activeNode.id === id) return;

    const exists = localEdges.some((e) => e.source === activeNode.id && e.target === id);
    if (!exists) {
      const newEdge = {
        id: crypto.randomUUID(),
        source: activeNode.id,
        target: id,
      };
      edges.update((prev) => [...prev, newEdge]);
      dispatch('persist');
    }
  }

  function handleOpenNode(e) {
    dispatch('open', { id: e.detail.id });
  }

  function deleteNode() {
    if (!activeNode) return;
    if (!confirm('Delete this node?')) return;
    const id = activeNode.id;
    nodes.set(localNodes.filter((n) => n.id !== id));
    edges.set(localEdges.filter((e) => e.source !== id && e.target !== id));
    dispatch('persist');
    dispatch('deleted', { id });
    activeNodeId.set(null);
  }

  function addTag(name) {
    if (!activeNode || !name) return;
    if (!(activeNode.tags || []).includes(name)) {
      activeNode.tags = [...(activeNode.tags || []), name];
      localNodes[nodeIndex] = { ...activeNode };
      nodes.set([...localNodes]);
      dispatch('persist');
    }
    if (!localTags[name]) {
      tags.update((t) => ({ ...t, [name]: { color: '#60a5fa' } }));
      dispatch('persist');
    }
  }

  function removeTag(name) {
    if (!activeNode) return;
    activeNode.tags = (activeNode.tags || []).filter((t) => t !== name);
    localNodes[nodeIndex] = { ...activeNode };
    nodes.set([...localNodes]);
    dispatch('persist');
  }

  function backlinks() {
    if (!activeNode) return [];
    return localEdges
      .filter((e) => e.target === activeNode.id)
      .map((e) => localNodes.find((n) => n.id === e.source))
      .filter(Boolean);
  }
</script>

<aside
  style="width:420px; padding:12px; background:rgba(18,18,20,0.98); height:100vh; box-sizing:border-box; overflow-y:auto; border-left:1px solid rgba(255,255,255,0.05);"
>
  {#if activeNode}
    <div
      style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;"
    >
      <h2 style="margin:0; font-size: 1.25rem;">{activeNode.label}</h2>
      <div style="display:flex; gap:8px;">
        <button on:click={() => dispatch('close')} style="padding:4px 8px; font-size:0.9em;"
          >Close</button
        >
      </div>
    </div>
    <div style="display:flex; gap:8px; margin-bottom:12px;">
      <button on:click={() => dispatch('persist')} style="flex:1; padding:6px;">Save</button>
      <button on:click={deleteNode} style="flex:1; padding:6px; background:#ef4444;">Delete</button>
    </div>

    <div style="margin-top:8px; color:#9aa3b2;">
      {#if activeNode.url}
        <a href={activeNode.url} target="_blank" rel="noopener noreferrer">{activeNode.url}</a>
      {:else}
        No URL
      {/if}
    </div>

    <div style="margin-top:12px; height:50%;">
      <NotesEditor
        value={activeNode.notes}
        on:autosave={saveNotes}
        on:update={saveNotes}
        on:wikilink={handleWikiLink}
        on:openNode={handleOpenNode}
      />
    </div>

    <div style="margin-top:12px;">
      <strong>Tags</strong>
      <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
        {#each activeNode.tags || [] as t}
          <div
            style="background:{localTags[t]
              ? localTags[t].color
              : '#999'}; padding:6px 8px; border-radius:8px; display:flex; align-items:center;"
          >
            <span>{t}</span>
            <button on:click={() => removeTag(t)} style="margin-left:6px;">x</button>
          </div>
        {/each}
        <button
          on:click={() => {
            const name = prompt('Tag name');
            if (name) addTag(name);
          }}>+ Add Tag</button
        >
      </div>
    </div>

    <div style="margin-top:12px;">
      <strong>Backlinks</strong>
      <div style="margin-top:8px;">
        {#each backlinks() as b}
          <button
            type="button"
            on:click={() => dispatch('open', { id: b.id })}
            style="width:100%; text-align:left; padding:8px; border:0; border-bottom:1px solid rgba(255,255,255,0.03); background:transparent; cursor:pointer;"
          >
            <div style="font-weight:600;">{b.label}</div>
            <div style="font-size:12px; color:#9aa3b2;">{b.notes_preview}</div>
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div style="color:#999">No node selected. Click a node to view or create one.</div>
  {/if}
</aside>
