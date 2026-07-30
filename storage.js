/* LocalStorage data layer: every page uses these small helpers. */
const Store = (() => {
  const KEYS = { items: 'clf_items', claims: 'clf_claims', favorites: 'clf_favorites', settings: 'clf_settings', viewed: 'clf_viewed' };
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const items = () => read(KEYS.items);
  const saveItems = value => write(KEYS.items, value);
  const getItem = id => items().find(item => item.id === id);
  const addItem = item => saveItems([item, ...items()]);
  const updateItem = (id, data) => saveItems(items().map(item => item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item));
  const removeItem = id => saveItems(items().filter(item => item.id !== id));
  const favorites = () => read(KEYS.favorites);
  const toggleFavorite = id => { const list = favorites(); write(KEYS.favorites, list.includes(id) ? list.filter(x => x !== id) : [...list, id]); return !list.includes(id); };
  const claims = () => read(KEYS.claims);
  const addClaim = claim => write(KEYS.claims, [claim, ...claims()]);
  const updateClaim = (id, data) => write(KEYS.claims, claims().map(c => c.id === id ? { ...c, ...data } : c));
  const settings = () => read(KEYS.settings, { theme: 'light' });
  const saveSettings = value => write(KEYS.settings, { ...settings(), ...value });
  const viewed = () => read(KEYS.viewed);
  const markViewed = id => write(KEYS.viewed, [id, ...viewed().filter(x => x !== id)].slice(0, 6));
  const exportAll = () => ({ items: items(), claims: claims(), favorites: favorites(), settings: settings(), exportedAt: new Date().toISOString() });
  const importAll = data => { if (!Array.isArray(data.items)) throw new Error('The file does not contain valid item data.'); ['items','claims','favorites','settings'].forEach(k => data[k] !== undefined && write(KEYS[k], data[k])); };
  return { KEYS, read, write, items, getItem, addItem, updateItem, removeItem, favorites, toggleFavorite, claims, addClaim, updateClaim, settings, saveSettings, viewed, markViewed, exportAll, importAll };
})();
