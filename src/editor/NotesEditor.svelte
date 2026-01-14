<script>
    import { createEventDispatcher, onDestroy, tick } from "svelte";
    import { nodes } from "../store/graphStore";
    import getCaretCoordinates from 'textarea-caret';

    export let value = "";
    export let autosaveDelay = 700;

    const dispatch = createEventDispatcher();

    let text = value || "";
    let timer = null;
    let area;
    
    // modes: 'edit' | 'view'
    let mode = 'edit';

    // wiki-link autocomplete
    let showSuggestions = false;
    let suggestions = [];
    let query = "";
    let matchStart = 0;
    let selectedIndex = 0;
    
    // popup positioning
    let popupTop = 0;
    let popupLeft = 0;

    let allNodes = [];
    const unsub = nodes.subscribe(v => allNodes = v || []);

    $: if (value !== undefined && value !== text && document.activeElement !== area) {
        text = value;
    }

    function toggleMode() {
        mode = mode === 'edit' ? 'view' : 'edit';
        if (mode === 'edit') {
            // focus logic after render
            tick().then(() => area && area.focus());
        } else {
            // save when switching to view
            saveNow();
        }
    }

    function onInput(e) {
        text = e.target.value;
        checkForWikiTrigger(e.target);
        dispatch('update', { text });
        clearTimeout(timer);
        timer = setTimeout(() => dispatch('autosave', { text }), autosaveDelay);
    }

    function saveNow() {
        clearTimeout(timer);
        dispatch('autosave', { text });
    }

    function checkForWikiTrigger(el) {
        const caret = el.selectionStart;
        const sub = text.slice(0, caret);
        // Match `[[` followed by non-`]` characters at the end
        const match = sub.match(/\[\[([^\]]*)$/);
        
        if (match) {
            query = match[1];
            matchStart = match.index;
            
            const q = query.trim().toLowerCase();
            suggestions = allNodes
                .filter(n => n.label && n.label.toLowerCase().includes(q))
                .slice(0, 8);
                
            if (suggestions.length > 0) {
                showSuggestions = true;
                selectedIndex = 0;
                
                // calculate position
                const coords = getCaretCoordinates(el, caret);
                popupTop = coords.top + 24; // offset for line height
                popupLeft = coords.left;
            } else {
                showSuggestions = false;
            }
        } else {
            showSuggestions = false;
        }
    }

    function insertWikiLink(node) {
        const caret = area.selectionStart;
        const beforeMatch = text.slice(0, matchStart);
        // we replace from matchStart (inclusive of '[[') to caret
        // but actually we want to form `[[Label]]`
        // The regex matched `[[...` so we replace `[[query` with `[[Label]]`
        
        // Construct the new text
        // text = ... [[ ... ]] ...
        
        // Find where the query ends (caret)
        const afterCaret = text.slice(caret);
        
        const newText = beforeMatch + `[[${node.label}]]` + afterCaret;
        text = newText;
        
        const newPos = beforeMatch.length + node.label.length + 4; // [[ + ]] is 4 chars
        
        showSuggestions = false;
        suggestions = [];
        
        tick().then(() => {
            area.focus();
            area.setSelectionRange(newPos, newPos);
        });

        dispatch('wikilink', { id: node.id, label: node.label });
        dispatch('update', { text });
        saveNow();
    }

    function handleKeyDown(e) {
        if (!showSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % suggestions.length;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (suggestions[selectedIndex]) {
                insertWikiLink(suggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            showSuggestions = false;
        }
    }

    // View Mode Rendering
    // Rudimentary markdown rendering with wiki-link replacement
    function renderContent(raw) {
        if (!raw) return '';
        // Escape HTML
        let safe = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // Replace [[Label]] with clickable spans
        // Matches [[Label]]
        return safe.replace(/\[\[([^\]]+)\]\]/g, (match, label) => {
            // Check if node exists (optional, could style differently)
            // For now, always clickable
            return `<button class="wikilink-btn" data-label="${label}">${label}</button>`;
        }).replace(/\n/g, "<br>");
    }

    function handleViewClick(e) {
        if (e.target.classList.contains('wikilink-btn')) {
            const label = e.target.getAttribute('data-label');
            // Find node by label
            const targetNode = allNodes.find(n => n.label === label);
            if (targetNode) {
                dispatch('openNode', { id: targetNode.id });
            }
        }
    }

    onDestroy(() => { clearTimeout(timer); unsub(); });
</script>

<style>
    :global(.wikilink-btn) {
        background: transparent;
        border: 0;
        padding: 0;
        color: #60a5fa; /* Blue-ish */
        text-decoration: underline;
        cursor: pointer;
        font-weight: 500;
        font-size: inherit;
        font-family: inherit;
    }
    :global(.wikilink-btn:hover) {
        color: #93c5fd;
    }
</style>

<div style="height:100%; display:flex; flex-direction:column; position:relative;">
    
    <div style="display:flex; justify-content:flex-end; margin-bottom:8px;">
        <button on:click={toggleMode} style="background:rgba(255,255,255,0.1); border:0; color:white; padding:4px 8px; border-radius:4px; font-size:12px; cursor:pointer;">
            {mode === 'edit' ? 'Preview' : 'Edit'}
        </button>
    </div>

    {#if mode === 'edit'}
        <textarea bind:this={area}
                  value={text}
                  on:input={onInput}
                  on:keydown={handleKeyDown}
                  placeholder="item..."
                  on:blur={() => setTimeout(() => showSuggestions = false, 200)}
                  style="width:100%; flex:1; resize:none; background:rgba(0,0,0,0.35); color:inherit; border-radius:6px; padding:10px; border:1px solid rgba(255,255,255,0.03); outline:none; font-family: inherit;"></textarea>
        
        {#if showSuggestions}
            <div style="position:absolute; top:{popupTop}px; left:{popupLeft}px; z-index:100; min-width:150px; max-height:180px; overflow:auto; background:rgba(20,20,24,0.98); border:1px solid rgba(255,255,255,0.1); border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.5);">
                {#each suggestions as s, i}
                    <button type="button" 
                            class:selected={i === selectedIndex}
                            on:mousedown|preventDefault={() => insertWikiLink(s)} 
                            style="display:block; width:100%; text-align:left; padding:8px 12px; background:{i === selectedIndex ? 'rgba(255,255,255,0.1)' : 'transparent'}; border:0; color:white; cursor:pointer; font-size:13px;">
                        {s.label}
                    </button>
                {/each}
            </div>
        {/if}
    {:else}
        <!-- View Mode -->
        <div on:click={handleViewClick} 
             style="width:100%; flex:1; overflow-y:auto; background:rgba(0,0,0,0.2); border-radius:6px; padding:10px; border:1px transparent; white-space: pre-wrap; word-wrap: break-word;">
            {@html renderContent(text)}
        </div>
    {/if}

    <div style="display:flex; gap:8px; margin-top:6px;">
        <div style="color:#9aa3b2; font-size:13px; margin-left:auto;">
            {mode === 'edit' ? 'Markdown supported' : ''}
        </div>
    </div>
</div>
