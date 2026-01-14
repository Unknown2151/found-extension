<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let x = 0;
  export let y = 0;
  export let targetId = null;
  export let type = 'node'; // 'node' | 'edge'

  const dispatch = createEventDispatcher();

  const nodeOptions = [
    { id: 'open', label: 'Open node' },
    { id: 'center', label: 'Center node' },
    { id: 'connect', label: 'Connect from here' },
    { id: 'add-tag', label: 'Add tag' },
    { id: 'open-link', label: 'Open Link' },
    { id: 'copy-url', label: 'Copy URL' },
    { id: 'delete', label: 'Delete node' },
  ];

  const edgeOptions = [{ id: 'delete-edge', label: 'Delete edge' }];

  $: options = type === 'edge' ? edgeOptions : nodeOptions;

  function run(opt) {
    dispatch('action', { action: opt.id, targetId });
  }

  // close on Escape
  function onKey(e) {
    if (e.key === 'Escape') dispatch('action', { action: 'close' });
  }
  onMount(() => window.addEventListener('keydown', onKey));
  onDestroy(() => window.removeEventListener('keydown', onKey));
</script>

<div class="ctx" style="left:{x}px; top:{y}px;">
  {#each options as o}
    <div
      class="item"
      role="button"
      tabindex="0"
      on:click={() => run(o)}
      on:keydown={(e) => e.key === 'Enter' && run(o)}
    >
      {o.label}
    </div>
  {/each}
</div>

<style>
  .ctx {
    position: fixed;
    z-index: 60;
    min-width: 180px;
    background: rgba(15, 15, 18, 0.98);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  }
  .item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
  }
  .item:hover {
    background: rgba(255, 255, 255, 0.03);
  }
</style>
