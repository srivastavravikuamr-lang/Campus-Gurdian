/* Reusable visual components and safe display helpers. */
const UI = (() => {
  const escape = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;', "'":'&#39;','"':'&quot;' }[c]));
  const placeholder = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="450"><rect width="100%" height="100%" fill="#e8f1ff"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="70">📦</text></svg>`);
  const timeAgo = date => { const sec = Math.floor((Date.now() - new Date(date)) / 1000); if (sec < 60) return 'Just now'; const units = [[31536000,'year'],[2592000,'month'],[86400,'day'],[3600,'hour'],[60,'minute']]; const [n, word] = units.find(([n]) => sec >= n) || [1,'minute']; const count = Math.floor(sec/n); return `${count} ${word}${count > 1 ? 's' : ''} ago`; };
  const toast = (message, kind = 'success') => { const host = document.querySelector('#toastHost'); if (!host) return; const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = message; host.append(el); setTimeout(() => el.remove(), 3600); };
  const image = item => escape(item.imageUrl || placeholder);
  const card = item => `<article class="item-card fade-in"><img src="${image(item)}" alt="${escape(item.itemName)}"><div class="card-body"><div class="card-top"><span class="pill ${item.type}">${item.type === 'lost' ? 'Lost' : 'Found'}</span><button class="icon-button favorite-btn" data-id="${item.id}" title="Favorite">${Store.favorites().includes(item.id) ? '♥' : '♡'}</button></div><h3>${escape(item.itemName)}</h3><p class="muted">${escape(item.category)} · ${escape(item.location)}</p><p class="meta">📅 ${escape(item.date)} <span>• ${timeAgo(item.createdAt)}</span></p><div class="card-footer"><span class="status ${item.status}">${escape(item.status)}</span><a class="text-link" href="details.html?id=${item.id}">View →</a></div></div></article>`;
  const empty = (title, text) => `<div class="empty-state"><span>🔎</span><h3>${title}</h3><p>${text}</p></div>`;
  const modal = (title, content) => { document.querySelector('#modalHost').innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><button class="modal-close" aria-label="Close">×</button><h2>${title}</h2>${content}</section></div>`; };
  const closeModal = () => { const h = document.querySelector('#modalHost'); if (h) h.innerHTML = ''; };
  return { escape, placeholder, timeAgo, toast, image, card, empty, modal, closeModal };
})();
