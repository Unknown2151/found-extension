<script>
    import { createEventDispatcher, onMount } from "svelte";
    import Fuse from "fuse.js";

    export let open = false;
    export let commands = []; // pass array of {id,label}

    const dispatch = createEventDispatcher();

    let query = "";
    let results = [];
    let activeIndex = 0;
    let inputEl;

    onMount(() => buildResults());

    $: if (query !== undefined) buildResults();

    function buildResults() {
        if (!query.trim()) {
            results = commands;
        } else {
            try {
                const f = new Fuse(commands, { keys: ["label"], threshold: 0.35 });
                results = f.search(query).map(r => r.item);
            } catch {
                results = commands;
            }
        }
        activeIndex = 0;
    }

    function handleKey(e) {
        if (e.key === "ArrowDown") { activeIndex = Math.min(activeIndex + 1, results.length - 1); e.preventDefault(); }
        else if (e.key === "ArrowUp") { activeIndex = Math.max(activeIndex - 1, 0); e.preventDefault(); }
        else if (e.key === "Enter") { invoke(results[activeIndex]); e.preventDefault(); }
        else if (e.key === "Escape") { dispatch('close'); }
    }

    function invoke(cmd) {
        if (!cmd) return;
        dispatch('run', { id: cmd.id });
    }
</script>

{#if open}
    <div style="position:fixed; left:50%; top:12%; transform:translateX(-50%); width:680px; z-index:40; background:rgba(12,12,12,0.98); padding:12px; border-radius:8px;">
        <input bind:this={inputEl} bind:value={query} placeholder="Type a command..." onkeydown={handleKey} style="width:100%; padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.03);" />
        <div style="max-height:320px; overflow:auto; margin-top:8px;">
            {#if results.length === 0}
                <div style="padding:8px; color:#999">No command found</div>
            {/if}
            {#each results as r, i (r.id)}
                <div
                        style="padding:8px; cursor:pointer; background:{i===activeIndex ? 'rgba(255,255,255,0.04)' : 'transparent'};"
                        role="button" tabindex="0"
                        onclick={() => invoke(r)}
                        onkeydown={(e) => e.key === 'Enter' && invoke(r)}
                >
                    <div style="font-weight:600;">{r.label}</div>
                </div>
            {/each}
        </div>
    </div>
{/if}
