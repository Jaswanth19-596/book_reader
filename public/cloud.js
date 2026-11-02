import { supabaseConfig } from './supabase-config.js';
import { CloudSelections, readLegacy, parseBackup, validateSelections } from './storage.js';

export function setupCloud({ onChange, notify }) {
  const $ = id => document.getElementById(id);
  let client, store, rows = [], generation = 0, ready = false, loading;
  const status = text => { $('storageStatus').textContent = text; $('cloudStatus').textContent = text; };
  const publish = () => onChange(rows.filter(row => !row.deleted_at).map(row => ({ ...row.payload, cloudId: row.id })));
  const failure = error => { const message = ['PGRST205', '42P01', '42501'].includes(error.code) ? 'Run supabase/shared-selections.sql in your Supabase SQL Editor, then refresh selections.' : (error.message || 'Please try again.'); status('Cloud action failed: ' + message); notify('Cloud action failed. Check Cloud storage for details.'); };
  function recovery() {
    $('removedList').replaceChildren();
    for (const row of rows.filter(row => row.deleted_at)) {
      const div = document.createElement('div');
      div.className = 'saved-row';
      const label = document.createElement('span'); label.textContent = row.payload.word;
      const button = document.createElement('button'); button.textContent = 'Restore';
      button.onclick = () => run(button, async () => { requireStore(); await store.archive(row.id, false); await refresh(); });
      div.append(label, button); $('removedList').append(div);
    }
  }
  async function run(button, action) {
    button.disabled = true;
    try { await action(); } catch (error) { failure(error); }
    finally { button.disabled = false; }
  }
  function requireStore() {
    if (!store || !ready) throw Error('Selections are still loading. Open Cloud storage and refresh if loading failed.');
    return store;
  }
  async function refresh() {
    if (!store) return;
    const version = ++generation, active = store;
    ready = false; status('Loading saved selections…');
    const next = await active.list();
    // Ignore an older response if another refresh has started.
    if (version !== generation || store !== active) return;
    next.forEach(row => validateSelections([row.payload]));
    rows = next; ready = true; publish(); recovery();
    status('Selections loaded from Supabase.');
  }
  async function init() {
    if (client) return client;
    if (!supabaseConfig.url || !supabaseConfig.publishableKey) throw Error('Supabase setup is not complete yet. Add the project URL and publishable key, then reload.');
    if (!loading) loading = (async () => {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.8');
      client = createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      store = new CloudSelections(client);
      return client;
    })().catch(error => { loading = null; throw error; });
    return loading;
  }
  $('cloud').onclick = () => { $('cloudDialog').showModal(); init().catch(failure); };
  $('closeCloud').onclick = () => $('cloudDialog').close();
  $('refreshCloud').onclick = () => run($('refreshCloud'), async () => { await init(); await refresh(); });
  $('migrateBrowser').onclick = () => run($('migrateBrowser'), async () => {
    const active = requireStore();
    const legacy = readLegacy(localStorage);
    if (!legacy.length) { status('No old saved selections were found at this address in this browser.'); return; }
    await active.save(legacy); await refresh();
    status('Browser selections imported. The original browser copy has been kept.');
  });
  $('exportBackup').onclick = () => run($('exportBackup'), async () => {
    requireStore(); await refresh(); requireStore();
    download(rows.map(row => row.payload));
    status('Backup downloaded, including recently removed selections. Keep a copy outside this laptop.');
  });
  $('exportBrowser').onclick = () => run($('exportBrowser'), async () => { download(readLegacy(localStorage)); });
  function download(selections) {
    const blob = new Blob([JSON.stringify({ format: 'folio-selections', version: 1, exportedAt: new Date().toISOString(), selections }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `folio-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('importBackup').onclick = () => $('backupFile').click();
  $('backupFile').onchange = () => run($('importBackup'), async () => {
    const active = requireStore(), file = $('backupFile').files[0];
    $('backupFile').value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) throw Error('Choose a backup smaller than 20 MB.');
    await active.save(parseBackup(await file.text())); await refresh();
    status('Backup imported. Existing selections were kept; use Recently removed to restore archived items.');
  });
  status(supabaseConfig.url ? 'Connecting to Supabase…' : 'Cloud storage needs setup. Open Cloud storage to get started.');
  if (supabaseConfig.url) init().then(refresh).catch(failure);
  return {
    async save(item) {
      const active = requireStore();
      await active.save([item]);
      // Saving a previously removed selection is an explicit restore.
      const existing = rows.find(row => row.payload.word === item.word && row.deleted_at);
      if (existing) await active.archive(existing.id, false);
      await refresh();
    },
    async remove(id) { await requireStore().archive(id); await refresh(); }
  };
}
