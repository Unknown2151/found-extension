# found

`found` is a local-first personal knowledge graph designed to help you capture, connect, and visualize information effortlessly. Built with Svelte and available as a Chrome extension, it allows you to capture web content and ideas as nodes in an interactive graph.

## 🚀 Quick Start

### Requirements
- Node.js (v18+)
- npm or pnpm

### Development
```bash
git clone https://github.com/username/found-svelte.git
cd found-svelte
npm install
npm run dev
```

### Build & Production
```bash
# Build the application
npm run build

# Run linting and static checks
npm run lint
npm run check

# Run tests
npm run test
```

## ✨ Features

- **Knowledge Graph**: Interactive visual graph powered by Cytoscape + fcose.
- **Web Capture**: Save selected text and URLs directly from your browser.
- **Node Management**: Create floating nodes, categorize with tags, and build backlinks.
- **Rich Editor**: Markdown-enabled notes editor with support for bi-directional links.
- **Navigation**: Built-in minimap for graph navigation and overview.
- **Efficiency**: Command palette (Ctrl+K), fuzzy search, and full undo/redo support.
- **Local-First**: All data is stored locally with easy import/export options.

## 🗺️ Roadmap

- [ ] **Wiki-links**: Full support for `[[Note]]` style bi-directional linking.
- [ ] **Context Popup**: Extension popup showing relevant nodes for the current active tab.
- [ ] **Cloud Sync**: Optional encrypted backup to Google Drive or Dropbox.
- [ ] **Mobile Support**: Responsive views for capturing notes on the go.

## 🛠️ Tech Stack

- **Framework**: [Svelte](https://svelte.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Graph Engine**: [Cytoscape.js](https://js.cytoscape.org/)
- **Styling**: Vanilla CSS
- **Testing**: [Vitest](https://vitest.dev/)

---

*Found is currently in active development. Contributions and feedback are welcome!*
