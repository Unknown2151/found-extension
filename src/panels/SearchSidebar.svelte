<script>
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import Fuse from "fuse.js";
    import { nodes, tags, cyInstance } from "../store/graphStore";

    const dispatch = createEventDispatcher();

    let localNodes = [];
    let localTags = {};
    let fuse = null;
    let query = "";
    let results = [];
    let activeIndex = 0;
    let tagFilter = null;
    let inputEl;

    const unsubNodes = nodes.subscribe(v => { localNodes = v || []; buildFuse(); runSearch(); });
    const unsubTags = tags.subscribe(v => { localTags = v || {}; });

    onDestroy(() => {
        unsubNodes(); unsubTags();
    });

    function buildFuse() {
        try {
            fuse = new Fuse(localNodes, { keys: ["label", "notes", "tags", "url"], threshold: 0.4, includeScore: true });
        } catch (e) {
            fuse = null;
        }
    }

    function runSearch() {
        const hasText = query.trim().length > 0;
        let matched = localNodes;

        if (hasText && fuse) matched = fuse.search(query).map(r => r.item);

        if (tagFilter) matched = matched.filter(n => (n.tags || []).includes(tagFilter));

        results = matched;
        activeIndex = 0;

        // highlight in the graph
        cyInstance.subscribe(cy => {
            if (!cy) return;
            if (!query && !tagFilter) {
                cy.elements().removeClass("dimmed");
            } else {
                cy.elements().addClass("dimmed");
                results.forEach(n => {
                    const el = cy.getElementById(n.id);
                    if (el.length) { el.removeClass("dimmed"); el.connectedEdges().removeClass("dimmed"); }
                });
            }
        })();
    }

    function onInput(e) {
        query = e.target.value;
        runSearch();
    }

    function selectResultAt(i) {
        if (i < 0 || i >= results.length) return;
        const n = results[i];
        dispatch("open", { id: n.id });
        dispatch("center", { id: n.id });
    }

    function handleKey(e) {
        if (e.key === "ArrowDown") { activeIndex = Math.min(activeIndex + 1, results.length - 1); e.preventDefault(); }
        else if (e.key === "ArrowUp") { activeIndex = Math.max(activeIndex - 1, 0); e.preventDefault(); }
        else if (e.key === "Enter") { selectResultAt(activeIndex); e.preventDefault(); }
        else if (e.key === "Escape") { dispatch("close"); }
    }

    function toggleTag(t) {
        tagFilter = tagFilter === t ? null : t;
        runSearch();
    }

    // when component is mounted we focus if needed
    onMount(() => {
        setTimeout(() => inputEl?.focus(), 30);
    });
</script>

<aside style="width:320px; padding:12px; background:rgba(12,12,12,0.95); height:100vh; box-sizing:border-box;">
    <div style="display:flex; gap:8px; align-items:center;">
        <input bind:this={inputEl} value={query} placeholder="Search (labels, notes, tags...)" oninput={onInput} onkeydown={handleKey} style="flex:1; padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.03);" />
        <button onclick={() => dispatch('close')}>Close</button>
    </div>

    <div style="margin-top:12px;">
        <strong>Tags</strong>
        <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
            {#each Object.keys(localTags) as t}
                <button
                        style="padding:6px 10px; border-radius:999px; border:none; cursor:pointer; background:{localTags[t].color}; color:#000; opacity:{tagFilter===t?1:0.7}"
                        onclick={() => toggleTag(t)}
                        onkeydown={(e) => e.key==='Enter' && toggleTag(t)}
                >
                    {t}
                </button>
            {/each}
            <button onclick={() => { const name = prompt('Tag name'); if (name) dispatch('createTag', { name }); }}>+ Tag</button>
        </div>
    </div>

    <div style="margin-top:12px; overflow:auto; height:calc(100vh - 170px);">
        <div style="font-size:13px; color:#9aa3b2; margin-bottom:8px;">Results ({results.length})</div>

        {#if results.length === 0}
            <div style="padding:12px; color:#999">No results. Try another query.</div>
        {/if}

        {#each results as r, i (r.id)}
            <div
                    class="search-item"
                    style="padding:10px; border-radius:6px; margin-bottom:6px; background:{i===activeIndex ? 'rgba(255,255,255,0.04)' : 'transparent'}; cursor:pointer;"
                    role="button" tabindex="0"
                    onclick={() => selectResultAt(i)}
                    onkeydown={(e) => e.key === 'Enter' && selectResultAt(i)}
            >
                <div style="font-weight:600;">{r.label}</div>
                <div style="font-size:12px; color:#9aa3b2;">{r.tags && r.tags.join(', ')} {r.url ? ` · ${r.url}` : ''}</div>
                <div style="font-size:12px; color:#bfc7d1; margin-top:6px;">{r.notes_preview}</div>
            </div>
        {/each}
    </div>
</aside>

<style>
    :global(.search-item:hover) { background: rgba(255,255,255,0.03); }
</style>
