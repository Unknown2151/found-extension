// src/store/uiStore.js
import { writable } from 'svelte/store';

export const isSearchOpen = writable(false);
export const isCmdOpen = writable(false);
export const isDetailsOpen = writable(false);
