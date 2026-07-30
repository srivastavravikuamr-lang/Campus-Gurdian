/* Application controller. No server is needed; Store persists browser data. */
(() => {
  const $ = selector => document.querySelector(selector);
  const page = document.body.dataset.page;
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
  const path = page === 'home' ? 'pages/' : '';

  function stats(items = Store.items()) {
    const lost = items.filter(i => i.type === 'lost').length, found = items.filter(i => i.type === 'found').length;
    const returned = items.filter(i => i.status === 'returned').length;
    return { lost, found, returned, pending: items.length - returned };
  }
  function statMarkup(s) { return [[s.lost,'Total Lost','🔍'],[s.found,'Total Found','📦'],[s.returned,'Returned','✓'],[s.pending,'Pending','⏳']].map(([n,label,icon]) => `<article class="stat"><span>${icon} ${label}</span><strong>${n}</strong></article>`).join(''); }
  function setupBase() {
    document.body.classList.toggle('dark', Store.settings().theme === 'dark');
    $('.theme-toggle')?.addEventListener('click', () => { const dark = !document.body.classList.contains('dark'); document.body.classList.toggle('dark', dark); Store.saveSettings({ theme: dark ? 'dark' : 'light' }); });
    $('.nav-toggle')?.addEventListener('click', () => $('.nav-links').classList.toggle('open'));
    window.addEventListener('scroll', () => $('.back-top')?.classList.toggle('show', scrollY > 400));
    $('.back-top')?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') UI.closeModal(); if (event.ctrlKey && event.key.toLowerCase() === 'f') { const search = $('#searchItems'); if (search) { event.preventDefault(); search.focus(); } } });
    document.addEventListener('click', event => { if (event.target.matches('.modal-close,.modal-backdrop')) UI.closeModal(); if (event.target.matches('.favorite-btn')) { const now = Store.toggleFavorite(event.target.dataset.id); event.target.textContent = now ? '♥' : '♡'; UI.toast(now ? 'Added to favorites.' : 'Removed from favorites.'); } });
    document.addEventListener('error', event => { if (event.target.tagName === 'IMG') event.target.src = UI.placeholder; }, true);
  }
  function initHome() {
    $('#homeStats').innerHTML = statMarkup(stats());
    const newest = Store.items().slice(0,3); $('#recentItems').innerHTML = newest.length ? newest.map(UI.card).join('').replaceAll('href="details.html', 'href="pages/details.html') : UI.empty('No reports yet', 'Be the first to report a lost or found item.');
  }
  const commonFields = type => {
    const label = type === 'lost' ? 'Your Name' : 'Finder Name';
    const fields = [
      [label,'name','text',true],['Email','email','email',true],['Phone','phone','tel',true],['Roll Number','rollNumber','text',true],['Department','department','text',true],
      ...(type === 'lost' ? [['Year','year','select',true]] : []),['Item Name','itemName','text',true],['Category','category','select',true],['Description','description','textarea',true],['Color','color','text',false],['Brand','brand','text',false],
      [type === 'lost' ? 'Date Lost' : 'Date Found','date','date',true],[type === 'lost' ? 'Location Lost' : 'Location Found','location','text',true],
      ...(type === 'lost' ? [['Reward (optional)','reward','text',false]] : [['Current Storage Location','storageLocation','text',true]]),['Image URL (optional)','imageUrl','url',false]
    ];
    return fields.map(([label,name,kind,required]) => { let input; if (kind === 'textarea') input = `<textarea name="${name}" maxlength="500" ${required?'required':''} placeholder="Add useful identifying details"></textarea>`; else if (kind === 'select') { const opts = name === 'year' ? ['Select year','1st Year','2nd Year','3rd Year','4th Year'] : ['Select category','Electronics','ID / Documents','Keys','Clothing','Books','Accessories','Other']; input = `<select name="${name}" ${required?'required':''}>${opts.map((x,i)=>`<option value="${i?x:''}">${x}</option>`).join('')}</select>`; } else input = `<input name="${name}" type="${kind}" ${required?'required':''}>`; return `<div class="field ${name==='description'?'full':''}"><label>${label}${required?' *':''}</label>${input}</div>`; }).join('');
  };
  function initReport() {
    const type = document.body.dataset.type, form = $('#itemForm'), key = `clf_draft_${type}`;
    $('#formFields').innerHTML = commonFields(type);
    const imageInput = form.elements.imageUrl, preview = document.createElement('img'); preview.className = 'preview'; preview.alt = 'Image preview'; imageInput.closest('.field').append(preview);
    const updatePreview = () => { if (imageInput.value.trim()) { preview.src = imageInput.value.trim(); preview.style.display = 'block'; } else preview.style.display = 'none'; };
    const draft = Store.read(key, null); if (draft) Object.entries(draft).forEach(([name,value]) => { if (form.elements[name]) form.elements[name].value = value; });
    const updateForm = () => { const desc = form.description.value; $('#counter').textContent = `${desc.length} / 500 characters`; const draftData = Object.fromEntries(new FormData(form)); Store.write(key, draftData); };
    form.addEventListener('input', updateForm); form.addEventListener('change', () => { updateForm(); updatePreview(); }); updateForm(); updatePreview();
    form.addEventListener('reset', () => setTimeout(() => { localStorage.removeItem(key); updateForm(); }, 0));
    form.addEventListener('submit', event => { event.preventDefault(); if (!form.reportValidity()) return; const data = Object.fromEntries(new FormData(form)); if (!/^\+?[0-9\s-]{7,15}$/.test(data.phone)) return UI.toast('Enter a valid phone number.', 'error'); const duplicate = Store.items().some(i => i.type === type && i.itemName.toLowerCase() === data.itemName.toLowerCase() && i.date === data.date && i.location.toLowerCase() === data.location.toLowerCase()); if (duplicate) return UI.toast('A matching report already exists.', 'error'); Store.addItem({ ...data, id: uid('CLF'), type, status: 'pending', createdAt: new Date().toISOString() }); localStorage.removeItem(key); form.reset(); UI.toast('Your report was published successfully!'); setTimeout(() => location.href = 'dashboard.html', 700); });
  }
  let currentPage = 1;
  function initDashboard() {
    $('#exportBtn').insertAdjacentHTML('beforebegin', '<button class="btn secondary" id="claimsBtn">Review Claims</button>');
    const refresh = () => { const all = Store.items(); $('#dashboardStats').innerHTML = statMarkup(stats(all)); const departments = [...new Set(all.map(i=>i.department).filter(Boolean))]; $('#departmentFilter').innerHTML = '<option value="all">All departments</option>' + departments.map(d=>`<option>${UI.escape(d)}</option>`).join(''); renderDashboard(); renderChart(); };
    const renderDashboard = () => { const query = $('#searchItems').value.toLowerCase(), type = $('#typeFilter').value, dep = $('#departmentFilter').value, sort = $('#sortItems').value; let list = Store.items().filter(i => (type === 'all' || (type === 'returned' ? i.status === 'returned' : i.type === type)) && (dep === 'all' || i.department === dep) && [i.itemName,i.category,i.location,i.department].join(' ').toLowerCase().includes(query)); list.sort((a,b)=>sort==='az'?a.itemName.localeCompare(b.itemName):sort==='oldest'?new Date(a.createdAt)-new Date(b.createdAt):new Date(b.createdAt)-new Date(a.createdAt)); const pages = Math.max(1,Math.ceil(list.length/6)); currentPage = Math.min(currentPage,pages); const shown = list.slice((currentPage-1)*6,currentPage*6); $('#dashboardItems').innerHTML = shown.length ? shown.map(item => `${UI.card(item).replace('View →', 'Manage →')}`).join('') : UI.empty('Nothing found', 'Try changing your search or filters.'); $('#pagination').innerHTML = Array.from({length:pages},(_,i)=>`<button class="page-btn ${i+1===currentPage?'active':''}" data-page-number="${i+1}">${i+1}</button>`).join(''); };
    const renderChart = () => { const s = stats(), max = Math.max(s.lost,s.found,s.returned,1), chart = $('#chart'); chart.innerHTML = ''; [[s.lost,'Lost'],[s.found,'Found'],[s.returned,'Returned']].forEach(([n,label]) => { const bar = document.createElement('div'); bar.className='bar'; bar.style.height=`${Math.max(8,n/max*140)}px`; bar.innerHTML=`<span>${n}</span><small>${label}</small>`; chart.append(bar); }); };
    ['searchItems','typeFilter','sortItems','departmentFilter'].forEach(id => $('#'+id).addEventListener('input', () => { currentPage=1; renderDashboard(); }));
    $('#pagination').addEventListener('click', e => { if(e.target.dataset.pageNumber){currentPage=+e.target.dataset.pageNumber;renderDashboard();} });
    $('#dashboardItems').addEventListener('click', e => { const link = e.target.closest('a'); if (link) { const id = new URL(link.href).searchParams.get('id'); link.href = `details.html?id=${id}&manage=1`; } });
    $('#exportBtn').addEventListener('click', () => { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(Store.exportAll(),null,2)],{type:'application/json'}));a.download='campus-lost-found-backup.json';a.click();URL.revokeObjectURL(a.href); });
    $('#claimsBtn').addEventListener('click', () => { const claims = Store.claims(); UI.modal('Claim requests', claims.length ? claims.map(c => { const item = Store.getItem(c.itemId); return `<div class="info-list"><strong>${UI.escape(item?.itemName || 'Deleted item')}</strong><li>${UI.escape(c.name)} · ${UI.escape(c.phone)}</li><li>${UI.escape(c.reason)}</li><li>Status: <span class="status ${c.status}">${c.status}</span></li>${c.status === 'pending' ? `<button class="btn approve-claim" data-claim="${c.id}">Approve</button> <button class="btn secondary reject-claim" data-claim="${c.id}">Reject</button>` : ''}</div>`; }).join('') : UI.empty('No claim requests', 'New ownership claims will appear here.')); });
    document.addEventListener('click', e => { const button = e.target.closest('.approve-claim,.reject-claim'); if (!button) return; Store.updateClaim(button.dataset.claim, { status: button.classList.contains('approve-claim') ? 'approved' : 'rejected' }); UI.closeModal(); UI.toast('Claim decision saved.'); });
    $('#importFile').addEventListener('change', async e => { try { Store.importAll(JSON.parse(await e.target.files[0].text())); UI.toast('Data imported successfully.'); refresh(); } catch(err) { UI.toast(err.message,'error'); } });
    refresh();
  }
  function initDetails() {
    const id = new URLSearchParams(location.search).get('id'), item = Store.getItem(id), host = $('#detailContent');
    if (!item) { host.innerHTML = UI.empty('Item not found', 'This report may have been removed.'); return; }
    Store.markViewed(id);
    const manage = new URLSearchParams(location.search).get('manage') === '1';
    host.innerHTML = `<div class="detail"><img class="detail-image" src="${UI.image(item)}" alt="${UI.escape(item.itemName)}"><article><span class="pill ${item.type}">${item.type} item</span><h1>${UI.escape(item.itemName)}</h1><span class="status ${item.status}">${UI.escape(item.status)}</span><p>${UI.escape(item.description)}</p><ul class="info-list"><li><strong>Category:</strong> ${UI.escape(item.category)}</li><li><strong>Location:</strong> ${UI.escape(item.location)}</li><li><strong>Date:</strong> ${UI.escape(item.date)}</li><li><strong>Department:</strong> ${UI.escape(item.department)}</li><li><strong>Reported by:</strong> ${UI.escape(item.name)}</li><li><strong>Contact:</strong> ${UI.escape(item.email)} · ${UI.escape(item.phone)}</li>${item.storageLocation?`<li><strong>Stored at:</strong> ${UI.escape(item.storageLocation)}</li>`:''}</ul><div class="button-row">${item.status !== 'returned' ? `<button class="btn claim-button">I think this is my item</button>` : ''}<button class="btn secondary" id="shareBtn">Share</button><button class="btn secondary" id="printBtn">Print</button>${manage?`<button class="btn secondary" id="editBtn">Edit</button>${item.status !== 'returned'?`<button class="btn secondary" id="returnBtn">Mark Returned</button>`:''}<button class="btn danger" id="deleteBtn">Delete</button>`:''}</div></article></div>`;
    const similar = Store.items().filter(i => i.id !== id && i.category === item.category).slice(0,3); $('#similarItems').innerHTML = similar.length ? similar.map(UI.card).join('') : UI.empty('No similar items yet', 'Check back for new reports.');
    $('.claim-button')?.addEventListener('click', () => UI.modal('Claim this item', `<form id="claimForm"><div class="field"><label>Your name *</label><input name="name" required></div><div class="field"><label>Phone *</label><input name="phone" required type="tel"></div><div class="field"><label>Why is it yours? *</label><textarea name="reason" required></textarea></div><div class="button-row"><button class="btn">Submit claim</button></div></form>`));
    $('#printBtn')?.addEventListener('click', () => window.print());
    $('#shareBtn')?.addEventListener('click', async () => { try { if(navigator.share) await navigator.share({title:item.itemName,text:'Campus Lost & Found item',url:location.href}); else { await navigator.clipboard.writeText(location.href); UI.toast('Item link copied to clipboard.'); } } catch {} });
    $('#editBtn')?.addEventListener('click', () => editModal(item));
    $('#returnBtn')?.addEventListener('click', () => confirmAction('Mark this item as returned?', () => { Store.updateItem(id,{status:'returned'}); UI.toast('Item moved to the returned archive.'); location.reload(); }));
    $('#deleteBtn')?.addEventListener('click', () => confirmAction('Delete this item permanently?', () => { Store.removeItem(id); UI.toast('Item deleted.'); location.href='dashboard.html'; }));
    document.addEventListener('submit', e => { if(e.target.id==='claimForm'){e.preventDefault(); const data=Object.fromEntries(new FormData(e.target)); Store.addClaim({...data,id:uid('claim'),itemId:id,status:'pending',createdAt:new Date().toISOString()}); UI.closeModal();UI.toast('Claim submitted for review.');} });
  }
  function confirmAction(message, action) { UI.modal('Please confirm', `<p>${message}</p><div class="button-row"><button class="btn danger" id="confirmAction">Yes, continue</button><button class="btn secondary modal-close">Cancel</button></div>`); $('#confirmAction').addEventListener('click', action); }
  function editModal(item) { UI.modal('Edit report', `<form id="editForm"><div class="form-grid"><div class="field"><label>Item name</label><input name="itemName" required value="${UI.escape(item.itemName)}"></div><div class="field"><label>Category</label><input name="category" required value="${UI.escape(item.category)}"></div><div class="field"><label>Location</label><input name="location" required value="${UI.escape(item.location)}"></div><div class="field"><label>Date</label><input name="date" required type="date" value="${UI.escape(item.date)}"></div><div class="field full"><label>Description</label><textarea name="description" required>${UI.escape(item.description)}</textarea></div><div class="field full"><label>Image URL</label><input name="imageUrl" value="${UI.escape(item.imageUrl)}"></div></div><div class="button-row"><button class="btn">Save changes</button></div></form>`); document.querySelector('#editForm').addEventListener('submit', e => { e.preventDefault(); Store.updateItem(item.id,Object.fromEntries(new FormData(e.target))); UI.closeModal();UI.toast('Report updated.');location.reload(); }); }
  function initContact() { $('#contactForm')?.addEventListener('submit', e => { e.preventDefault(); e.target.reset(); UI.toast('Message received. The desk will get back to you soon.'); }); }
  setupBase();
  if(page === 'home') initHome();
  if(page === 'report') initReport();
  if(page === 'dashboard') initDashboard();
  if(page === 'details') initDetails();
  if(page === 'contact') initContact();
})();
