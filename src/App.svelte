<script>
  import Graph from './graph/Graph.svelte';
  import SearchSidebar from './panels/SearchSidebar.svelte';
  import DetailsSidebar from './panels/DetailsSidebar.svelte';
  import CommandPalette from './panels/CommandPalette.svelte';
  import PageContext from './ui/PageContext.svelte';
  import SyncSettings from './ui/SyncSettings.svelte';

  import { nodes, edges, tags, activeNodeId, cyInstance } from './store/graphStore';
  import { exportData, importData } from './utils/storage';

  let showSearch = false;
  let showCmd = false;
  let showPageContext = false;
  let pageContextUrl = '';
  let pageContextTitle = '';

  let showSyncSettings = false;
  let showSidebar = true;

  // Detect if running in popup vs full page
  // Popup windows are typically small (e.g., 400x600), full tabs are larger
  $: isPopup =
    typeof window !== 'undefined' && (window.innerWidth < 800 || window.innerHeight < 600);

  // Function to open the extension in a full page tab
  function openFullPage() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    }
  }

  /* -----------------------------
       COMMANDS (Command Palette)
    -------------------------------- */
  const COMMANDS = [
    { id: 'addNode', label: 'Add new node' },
    { id: 'center', label: 'Center graph' },
    { id: 'export', label: 'Export data' },
    { id: 'import', label: 'Import data' },
    { id: 'pageContext', label: 'Show page context' },
    { id: 'openSearch', label: 'Open search' },
    { id: 'configureSync', label: 'Configure sync' },
    { id: 'openFullPage', label: 'Open in full page' },
  ];

  /* -----------------------------
       NODE CREATION
    -------------------------------- */
  /* -----------------------------
       NODE CREATION
    -------------------------------- */
  function createNode(optText, optPosition) {
    const id = crypto.randomUUID();

    let label = 'New Node';
    let notes = '';

    // Smart Capture Logic
    if (optText) {
      const wordCount = optText.trim().split(/\s+/).length;
      if (wordCount < 7) {
        // Short text: use as label
        label = optText;
      } else {
        // Long text: prompt for label
        const userLabel = prompt(
          'Text is long. Enter a short label for this node:',
          optText.slice(0, 20) + '...'
        );
        if (userLabel) {
          label = userLabel;
          notes = optText;
        } else {
          // User cancelled custom label, use truncated text or partial
          label = optText.slice(0, 30) + '...';
          notes = optText;
        }
      }
    } else {
      // Manual creation (e.g. double click)
      const input = prompt("What's on your mind?");
      if (!input) return; // Cancelled

      const wordCount = input.trim().split(/\s+/).length;
      if (wordCount < 7) {
        label = input;
      } else {
        const userLabel = prompt('Text is long. Enter a short label:', input.slice(0, 20) + '...');
        if (userLabel) {
          label = userLabel;
          notes = input;
        } else {
          label = input.slice(0, 30) + '...';
          notes = input;
        }
      }
    }

    nodes.update((n) => [
      ...n,
      {
        id,
        label,
        notes,
        notes_preview: notes ? notes.slice(0, 180) : '',
        tags: [],
        url: '',
        position: optPosition || undefined,
      },
    ]);

    activeNodeId.set(id);

    // Center camera on the new node
    // cyInstance.subscribe((cy) => {
    //   if (cy) cy.fit(cy.getElementById(id), 50);
    // })();
  }

  /* -----------------------------
       COMMAND PALETTE RUNNER
    -------------------------------- */
  function runCommand(ev) {
    const id = ev.detail.id;

    if (id === 'addNode') createNode(null, { x: 0, y: 0 }); // Default center? Or let graph layout handle it

    if (id === 'center') {
      cyInstance.subscribe((cy) => cy?.fit(undefined, 80))();
    }

    if (id === 'export') {
      const data = exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'knowledge-graph.json';
      a.click();
    }

    if (id === 'import') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = (e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        const file = target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const txt = String(reader.result);
          importData(JSON.parse(txt));
        };
        reader.readAsText(file);
      };
      input.click();
    }

    if (id === 'openSearch') showSearch = true;

    if (id === 'pageContext') {
      // Check for chrome tabs API (extension usage)
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0]) {
            pageContextUrl = tabs[0].url || '';
            pageContextTitle = tabs[0].title || '';
            showPageContext = true;
          } else {
            // Fallback or error
            pageContextUrl = window.location.href;
            pageContextTitle = document.title;
            showPageContext = true;
          }
        });
      } else {
        // Local dev fallback
        pageContextUrl = typeof window !== 'undefined' ? window.location.href : '';
        pageContextTitle = typeof document !== 'undefined' ? document.title : 'Local Page';
        showPageContext = true;
      }
    }

    if (id === 'configureSync') {
      showSyncSettings = true;
    }

    if (id === 'openFullPage') {
      openFullPage();
    }

    showCmd = false;
  }

  /* -----------------------------
       SEARCH SIDEBAR HANDLERS
    -------------------------------- */
  function handleSearchOpenNode(ev) {
    const nodeId = ev.detail.id;
    activeNodeId.set(nodeId);

    cyInstance.subscribe((cy) => {
      if (cy) cy.fit(cy.getElementById(nodeId), 40);
    })();

    showSearch = false;
  }

  function handleSearchCenter(ev) {
    cyInstance.subscribe((cy) => {
      if (cy) cy.fit(cy.getElementById(ev.detail.id), 50);
    })();
  }

  /* -----------------------------
       GRAPH EVENT HANDLERS
    -------------------------------- */
  function onGraphCreateEdge(ev) {
    const { from, to } = ev.detail;

    // Check for existing edge (undirected or directed depending on requirement, here directed A->B)
    let exists = false;
    edges.update((current) => {
      exists = current.some(
        (e) => (e.source === from && e.target === to) || (e.source === to && e.target === from)
      );
      return current;
    });

    if (exists) {
      // Optionally notify user
      console.log('Edge already exists');
      return;
    }

    const edge = { id: crypto.randomUUID(), source: from, target: to, label: '' };
    edges.update((e) => [...e, edge]);
  }

  // Handle manual node creation from Graph (double click)
  function onGraphCreateNode(ev) {
    // ev.detail has { x, y }
    createNode(null, ev.detail);
  }

  function onGraphDeleteNode(ev) {
    const id = ev.detail.id;

    nodes.update((n) => n.filter((x) => x.id !== id));
    edges.update((e) => e.filter((ed) => ed.source !== id && ed.target !== id));
  }

  function onGraphAddTagToNode(ev) {
    const { id, tag } = ev.detail;

    nodes.update((list) =>
      list.map((n) => (n.id === id ? { ...n, tags: [...new Set([...(n.tags || []), tag])] } : n))
    );

    tags.update((t) => ({
      ...t,
      [tag]: t[tag] || { color: '#60a5fa' },
    }));
  }

  function onGraphNotify(ev) {
    console.log('notify:', ev.detail.message);
  }
</script>

<!-- LAYOUT WRAPPER -->
<div style="display:flex; width:100vw; height:100vh; overflow:hidden; position:relative;">
  <!-- OPEN IN FULL PAGE BUTTON (only in popup mode) -->
  {#if isPopup}
    <button
      on:click={openFullPage}
      style="position:absolute; top:16px; left:16px; z-index:25; padding:8px 16px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; border:none; border-radius:8px; font-size:13px; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,0.3); cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s ease;"
      class="open-full-page-btn"
      aria-label="Open in full page"
      title="Open in a full browser tab for more space"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>
      Open Full Page
    </button>
  {/if}

  <!-- GRAPH -->
  <Graph
    on:createEdge={onGraphCreateEdge}
    on:createNode={onGraphCreateNode}
    on:deleteNode={onGraphDeleteNode}
    on:addTagToNode={onGraphAddTagToNode}
    on:notify={onGraphNotify}
  />

  <!-- SEARCH SIDEBAR -->
  {#if showSearch}
    <div style="position:absolute; left:0; top:0; height:100%; z-index:20;">
      <SearchSidebar
        on:open={handleSearchOpenNode}
        on:center={handleSearchCenter}
        on:createTag={(e) =>
          tags.update((t) => ({
            ...t,
            [e.detail.name]: { color: '#60a5fa' },
          }))}
        on:close={() => (showSearch = false)}
      />
    </div>
  {/if}

  <!-- DETAILS SIDEBAR -->
  {#if showSidebar}
    <div style="position:absolute; right:0; top:0; height:100%; z-index:15;">
      <DetailsSidebar
        on:open={(ev) => activeNodeId.set(ev.detail.id)}
        on:persist={() => {}}
        on:close={() => (showSidebar = false)}
      />
    </div>
  {/if}

  <!-- SIDEBAR TOGGLE BUTTON -->
  {#if !showSidebar}
    <button
      on:click={() => (showSidebar = true)}
      style="position:absolute; top:16px; right:16px; z-index:20; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.5);"
      aria-label="Show sidebar"
    >
      &larr;
    </button>
  {/if}

  {#if showPageContext}
    <PageContext
      url={pageContextUrl}
      title={pageContextTitle}
      on:open={(e) => {
        activeNodeId.set(e.detail.id);
        cyInstance.subscribe((cy) => cy?.fit(cy.getElementById(e.detail.id), 40))();
        showPageContext = false;
      }}
      on:created={(e) => {
        activeNodeId.set(e.detail.id);
        cyInstance.subscribe((cy) => cy?.fit(cy.getElementById(e.detail.id), 40))();
        showPageContext = false;
      }}
      on:close={() => (showPageContext = false)}
    />
  {/if}

  {#if showSyncSettings}
    <SyncSettings on:close={() => (showSyncSettings = false)} />
  {/if}

  <!-- COMMAND PALETTE -->
  <CommandPalette
    open={showCmd}
    commands={COMMANDS}
    on:run={runCommand}
    on:close={() => (showCmd = false)}
  />
</div>

<!-- GLOBAL HOTKEYS -->
<svelte:window
  onkeydown={(e) => {
    if (e.ctrlKey && e.key === 'k') {
      showCmd = true;
      e.preventDefault();
    }
    if (e.ctrlKey && e.key === 'f') {
      showSearch = true;
      e.preventDefault();
    }
  }}
/>

<style>
  .open-full-page-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }
</style>
