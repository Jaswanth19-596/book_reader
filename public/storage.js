export function validateSelections(value) {
  if (!Array.isArray(value) || value.length > 10000) throw Error('Choose a Folio backup with at most 10,000 selections.');
  return value.map(item => {
    if (!item || typeof item.word !== 'string' || !item.word.trim() || item.word.length > 12000 || typeof item.meaning !== 'string') throw Error('This backup contains an invalid selection.');
    const result = { word: item.word, meaning: item.meaning };
    for (const key of ['context', 'kind', 'partOfSpeech']) {
      if (item[key] !== undefined && typeof item[key] !== 'string') throw Error('Invalid selection details.');
      result[key] = item[key] || '';
    }
    for (const key of ['examples', 'trickyPhrases']) {
      if (item[key] !== undefined && (!Array.isArray(item[key]) || item[key].some(v => typeof v !== 'string'))) throw Error('Invalid selection examples.');
      result[key] = item[key] || [];
    }
    if (JSON.stringify(result).length > 100000) throw Error('A selection is too large.');
    return result;
  });
}

export function readLegacy(storage) {
  const raw = storage.getItem('folio-words');
  return raw ? validateSelections(JSON.parse(raw)) : [];
}

export function parseBackup(text) {
  const value = JSON.parse(text);
  if (Array.isArray(value)) return validateSelections(value);
  if (value?.format !== 'folio-selections' || value.version !== 1) throw Error('Choose a Folio selections backup.');
  return validateSelections(value.selections);
}

export class CloudSelections {
  constructor(client, userId) { this.client = client; this.userId = userId; }
  async list() {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await this.client.from('folio_selections').select('id,payload,deleted_at').eq('user_id', this.userId).order('id').range(offset, offset + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) return rows;
    }
  }
  async save(items) {
    const valid = validateSelections(items);
    const rows = await Promise.all(valid.map(async payload => {
      const bytes = new TextEncoder().encode(payload.word);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const id = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      return { user_id: this.userId, id, payload };
    }));
    // Ignore conflicts: migration/import must never overwrite a newer cloud copy
    // or resurrect a selection removed on another device.
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await this.client.from('folio_selections').upsert(rows.slice(i, i + 100), { onConflict: 'user_id,id', ignoreDuplicates: true });
      if (error) throw error;
    }
  }
  async archive(id, deleted = true) {
    const { data, error } = await this.client.from('folio_selections').update({ deleted_at: deleted ? new Date().toISOString() : null }).eq('user_id', this.userId).eq('id', id).select('id');
    if (error) throw error;
    if (data.length !== 1) throw Error('Selection was not updated. Refresh and try again.');
  }
}
