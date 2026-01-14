<script>
  import { createEventDispatcher } from 'svelte';
  import {
    isCloudSyncEnabled,
    setCloudSyncEnabled,
    getSyncProvider,
    setSyncProvider,
    syncToCloud,
    syncFromCloud,
  } from '../utils/storage';

  const dispatch = createEventDispatcher();

  let enabled = isCloudSyncEnabled();
  let provider = getSyncProvider() || 'file-backup';
  let status = '';

  function toggleEnabled() {
    enabled = !enabled;
    setCloudSyncEnabled(enabled);
  }

  function changeProvider(e) {
    provider = e.target.value;
    setSyncProvider(provider);
  }

  async function handleSyncTo() {
    status = 'Syncing...';
    try {
      await syncToCloud();
      status = 'Upload complete';
    } catch (e) {
      status = 'Error: ' + e.message;
    }
  }

  async function handleSyncFrom() {
    status = 'Syncing...';
    try {
      await syncFromCloud();
      status = 'Download complete';
    } catch (e) {
      status = 'Error: ' + e.message;
    }
  }

  function close() {
    dispatch('close');
  }
</script>

<div
  style="position:fixed; left:50%; top:20%; transform:translateX(-50%); width:400px; background:rgba(12,12,12,0.98); padding:20px; border-radius:8px; z-index:60; box-shadow:0 8px 30px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1);"
>
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
    <h3 style="margin:0; font-size:18px;">Sync Settings</h3>
    <button
      on:click={close}
      style="background:transparent; border:0; color:#9aa3b2; cursor:pointer;">&times;</button
    >
  </div>

  <div style="margin-bottom:16px;">
    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
      <input type="checkbox" checked={enabled} on:change={toggleEnabled} />
      <span>Enable Cloud Sync</span>
    </label>
  </div>

  {#if enabled}
    <div style="margin-bottom:16px;">
      <label style="display:block; margin-bottom:4px; font-size:13px; color:#9aa3b2;"
        >Provider</label
      >
      <select
        value={provider}
        on:change={changeProvider}
        style="width:100%; padding:8px; border-radius:4px; background:rgba(255,255,255,0.05); color:white; border:1px solid rgba(255,255,255,0.1);"
      >
        <option value="file-backup">File Backup (Simulated)</option>
        <option value="google-drive" disabled>Google Drive (Coming Soon)</option>
        <option value="dropbox" disabled>Dropbox (Coming Soon)</option>
      </select>
    </div>

    <div style="display:flex; gap:10px;">
      <button
        on:click={handleSyncTo}
        style="flex:1; padding:8px; background:#3b82f6; border:0; border-radius:4px; color:white; cursor:pointer;"
      >
        Sync Up (Export)
      </button>
      <button
        on:click={handleSyncFrom}
        style="flex:1; padding:8px; background:#374151; border:0; border-radius:4px; color:white; cursor:pointer;"
      >
        Sync Down (Import)
      </button>
    </div>

    {#if status}
      <div style="margin-top:12px; font-size:13px; color:#9aa3b2; text-align:center;">{status}</div>
    {/if}
  {/if}
</div>
