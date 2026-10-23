const STORAGE_KEY = 'folio-connection';
const DEFAULT_MODEL = 'glm-5.3-flash';
const MODELS = new Set([DEFAULT_MODEL, 'kimi-k3', 'deepseek-v4.1-flash']);

export function loadConnection() {
  try {
    const data = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
    if (typeof data?.apiKey === 'string' && data.apiKey.trim() && data.apiKey.length <= 1000) {
      return { apiKey: data.apiKey.trim(), model: MODELS.has(data.model) ? data.model : DEFAULT_MODEL };
    }
  } catch {}
  return { apiKey: '', model: DEFAULT_MODEL };
}

export function saveConnection({ apiKey, model }, remember = true) {
  try {
    if (remember) {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiKey, model }));
    } else {
      globalThis.localStorage.removeItem(STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function forgetConnection() {
  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
