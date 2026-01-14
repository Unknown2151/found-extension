<script>
    import {createEventDispatcher, onDestroy} from "svelte";
    import { nodes } from "../store/graphStore";

    export let sourceId = null;
    const dispatch = createEventDispatcher();

    let localNodes = [];
    const unsub = nodes.subscribe(v => localNodes = v || []);

    function cancel() {
        dispatch('cancel');
    }

    function chooseTarget(id) {
        if (!sourceId || !id || id === sourceId) {
            alert('Choose a different node');
            return;
        }
        dispatch('create', { from: sourceId, to: id });
    }

    onDestroy(() => unsub());
</script>

<style>
    .drawer { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(12,12,12,0.95); padding:12px; border-radius:8px; box-shadow:0 8px 20px rgba(0,0,0,0.5); z-index:50; width:520px; }
    .node-item { padding:8px; border-radius:6px; cursor:pointer; }
    .node-item:hover { background: rgba(255,255,255,0.02); }
</style>

<div class="drawer" role="dialog" aria-label="Create connection">
    <div style="display:flex; align-items:center; gap:12px;">
        <div><strong>Connect from:</strong></div>
        <div style="font-weight:600;">{sourceId}</div>
        <div style="margin-left:auto;">
            <button on:click={cancel}>Cancel</button>
        </div>
    </div>

    <div style="margin-top:8px; max-height:220px; overflow:auto;">
        {#each localNodes as n}
            <div class="node-item" role="button" tabindex="0" on:click={() => chooseTarget(n.id)} on:keydown={(e) => e.key === 'Enter' && chooseTarget(n.id)}>
                <div style="font-weight:600;">{n.label}</div>
                <div style="font-size:12px; color:#9aa3b2;">{n.notes_preview}</div>
            </div>
        {/each}
    </div>
</div>
