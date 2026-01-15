import { addCapturedNode } from './utils/storage.js';

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'add-to-found',
        title: 'Add to Found',
        contexts: ['selection', 'page']
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'add-to-found') {
        const text = info.selectionText || tab.title || 'Untitled Node';
        const url = tab.url;

        try {
            await addCapturedNode(text, url);
            console.log('Successfully added captured node.');

            // Optional: Send message to popup if it's open
            chrome.runtime.sendMessage({ type: 'NODE_ADDED' }).catch(() => {
                // Ignore error if popup is not open
            });
        } catch (err) {
            console.error('Failed to add captured node:', err);
        }
    }
});
