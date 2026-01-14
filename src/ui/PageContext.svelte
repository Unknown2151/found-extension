<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { nodes } from '../store/graphStore';

  export let url = typeof window !== 'undefined' ? window.location.href : '';
  export let title = '';

  const dispatch = createEventDispatcher();

  let all = [];
  const unsub = nodes.subscribe((v) => (all = v || []));

  $: matches = all.filter((n) => n.url && n.url === url);

  function openNode(id) {
    dispatch('open', { id });
  }

  function createNodeForPage() {
    const id = crypto.randomUUID();
    const label = title || document.title || 'Page Note';
    const node = { id, label, notes: '', notes_preview: '', tags: [], url };
    nodes.update((list) => [...list, node]);
    dispatch('created', { id });
  }

  function close() {
    dispatch('close');
  }

  onDestroy(() => unsub());
</script>

<aside
  style="position:fixed; left:16px; top:16px; width:360px; background:rgba(12,12,12,0.96); padding:12px; border-radius:8px; z-index:60; box-shadow:0 8px 30px rgba(0,0,0,0.5);"
>
  <div style="display:flex; align-items:center; gap:8px;">
    <strong>Page Context</strong>
    <div style="margin-left:auto;"><button on:click={close}>Close</button></div>
  </div>

  <div style="margin-top:8px; color:#9aa3b2; font-size:13px;">
    URL: <div style="word-break:break-all;">{url}</div>
  </div>

  <div style="margin-top:10px;">
    {#if matches.length}
      <div
        style="max-height:300px; overflow:auto; display:flex; flex-direction:column; gap:6px; margin-top:6px;"
      >
        {#each matches as m}
          <div
            style="display:flex; align-items:center; gap:8px; padding:8px; border-radius:6px; background:rgba(255,255,255,0.02);"
          >
            <div style="flex:1;">{m.label}</div>
            <div><button on:click={() => openNode(m.id)}>Open</button></div>
          </div>
        {/each}
      </div>
    {:else}
      <div style="margin-top:8px; color:#999">No notes linked to this page yet.</div>
    {/if}
  </div>

  <div style="margin-top:12px; display:flex; gap:8px;">
    <button on:click={createNodeForPage}>Create note for page</button>
    <div style="margin-left:auto; color:#9aa3b2; font-size:13px;">
      Local only • use import/export to backup
    </div>
  </div>
</aside>
