let data = null;
let currentCat = 'sauces';

const CUISINE_COLOURS = {
  // Europe — navy blues to warm terracotta
  french:         '#2e4d7e',
  italian:        '#7a2e28',
  spanish:        '#8e3e1a',
  mediterranean:  '#2e628a',
  // Americas — greens and amber
  mexican:        '#2a7a40',
  caribbean:      '#8a5218',
  // MENA + Africa — ochres and earth browns
  middle_eastern: '#7a5618',
  north_african:  '#8a6818',
  west_african:   '#6a3a10',
  ethiopian:      '#7a3418',
  // Indian subcontinent — turmeric gold
  indian:         '#b07a08',
  // SE Asia — teals and forest greens
  thai:           '#1a7a58',
  vietnamese:     '#1a6845',
  asian:          '#1a5e5e',
  // E Asia — deep red through burgundy to purple
  chinese:        '#8e1e1e',
  korean:         '#781e2e',
  japanese:       '#5a3e6a',
};

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

async function init() {
  try {
    const res = await fetch('./sauces.json?v=6');
    data = await res.json();
  } catch (e) {
    document.getElementById('main').innerHTML = '<p style="padding:24px;color:red">Could not load sauces.json</p>';
    return;
  }

  document.getElementById('tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCat = tab.dataset.cat;
    if (currentCat === 'shopping') showShopping();
    else showGrid(currentCat);
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    if (currentCat === 'shopping') showShopping();
    else showGrid(currentCat);
  });

  showGrid('sauces');
}

function showGrid(cat) {
  setHeader('Kitchen', true);
  const items = data[cat] || [];
  const missing = JSON.parse(localStorage.getItem('pantry_missing') || '[]');

  const wrap = document.createElement('div');

  if (missing.length) {
    const banner = document.createElement('div');
    banner.className = 'pantry-banner';
    banner.innerHTML = `<span>${missing.length} ingredient${missing.length > 1 ? 's' : ''} missing — greyed recipes need restocking</span>
      <button id="pantry-clear-banner">Clear filter</button>`;
    banner.querySelector('#pantry-clear-banner').addEventListener('click', () => {
      localStorage.removeItem('pantry_missing');
      showGrid(cat);
    });
    wrap.appendChild(banner);
  }

  const grid = document.createElement('div');
  grid.className = 'grid';

  items.forEach(item => {
    const card = document.createElement('div');
    const unavailable = missing.length && item.required_items &&
      item.required_items.some(i => missing.includes(i));
    card.className = 'card' + (unavailable ? ' unavailable' : '');
    const colour = CUISINE_COLOURS[item.cuisine] || '#555';
    const badges = swBadge(item) + heatBadge(item);
    const tint = hexToRgba(colour, 0.06);
    card.innerHTML = `
      <div class="card-header" style="background:${colour}">
        <div class="card-name">${item.name}</div>
        <div class="card-cuisine">${fmtCuisine(item.cuisine)}</div>
      </div>
      <div class="card-body" style="background:${tint};border-top:1.5px solid ${colour}"><div class="badges">${badges}</div></div>
    `;
    card.addEventListener('click', () => showDetail(item));
    grid.appendChild(card);
  });

  wrap.appendChild(grid);
  setMain(wrap);
}

function showDetail(item) {
  setHeader(item.name, false);

  const recipe = item.recipe_5 || item.recipe || {};
  const ingredients = recipe.ingredients || [];
  const method = recipe.method || '';

  const ingredientsHtml = ingredients
    .map(i => `<li>${i}</li>`)
    .join('');

  const swNote = item.sw_note
    ? `<div class="notice notice-syn"><strong>Slimming World:</strong> ${item.sw_note}</div>`
    : '';

  const heatNote = item.adult_heat_note
    ? `<div class="notice notice-heat"><strong>Adult heat:</strong> ${item.adult_heat_note}</div>`
    : '';

  const pairsHtml = buildPairs(item);
  const elevateHtml = buildElevate(item);

  const el = document.createElement('div');
  el.className = 'detail';
  const accentColour = CUISINE_COLOURS[item.cuisine] || '#555';
  el.style.borderLeftColor = accentColour;
  el.innerHTML = `
    <div class="detail-header">
      <span class="detail-cuisine">${fmtCuisine(item.cuisine)}</span>
      <div class="badges">${swBadge(item)}${heatBadge(item)}</div>
    </div>
    <div class="detail-body">
      <div>
        <div class="section-label">Ingredients &mdash; 5 portions</div>
        <ul class="ingredient-list">${ingredientsHtml}</ul>
      </div>
      <div>
        <div class="section-label">Method</div>
        <p class="method-box">${method}</p>
        ${swNote}
        ${heatNote}
      </div>
    </div>
    ${pairsHtml}
    ${elevateHtml}
  `;

  setMain(el);
}

function buildShareText() {
  const groups = data.shopping_list;
  const missing = JSON.parse(localStorage.getItem('pantry_missing') || '[]');
  const lines = ['Shopping list\n'];
  Object.entries(groups).forEach(([groupName, items]) => {
    const needed = items.filter(item => missing.includes(item));
    if (!needed.length) return;
    lines.push(groupName.toUpperCase());
    needed.forEach(item => lines.push('• ' + item));
    lines.push('');
  });
  return lines.join('\n').trim();
}

async function shareList() {
  const text = buildShareText();
  if (!text.includes('•')) {
    alert('Nothing ticked — tick what you need to buy first.');
    return;
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Shopping list', text });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    showCopied();
  } catch (e) {
    showFallback(text);
  }
}

function showCopied() {
  const btn = document.getElementById('share-btn');
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = 'Copied!';
  btn.disabled = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2000);
}

function showFallback(text) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:999;padding:24px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:500px;width:100%">
      <p style="font-weight:700;margin-bottom:12px">Copy this list:</p>
      <textarea readonly style="width:100%;height:200px;font-size:14px;padding:12px;border:1px solid #ddd;border-radius:8px;resize:none">${text}</textarea>
      <div style="display:flex;gap:12px;margin-top:12px">
        <button id="modal-copy" style="flex:1;padding:12px 24px;background:#5b3fa6;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer">Copy to clipboard</button>
        <button id="modal-close" style="flex:1;padding:12px 24px;background:#f5f3ef;color:#1a1a1a;border:1px solid #e2dfd9;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer">Close</button>
      </div>
    </div>
  `;
  modal.querySelector('#modal-close').addEventListener('click', () => modal.remove());
  modal.querySelector('#modal-copy').addEventListener('click', () => {
    const ta = modal.querySelector('textarea');
    ta.select();
    ta.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
    } catch (e) {}
    const btn = modal.querySelector('#modal-copy');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy to clipboard'; }, 2000);
  });
  document.body.appendChild(modal);
  modal.querySelector('textarea').select();
}

function showShopping() {
  setHeader('Kitchen', true);
  const groups = data.shopping_list;
  const missing = JSON.parse(localStorage.getItem('pantry_missing') || '[]');

  const wrap = document.createElement('div');

  const actions = document.createElement('div');
  actions.className = 'shopping-actions';
  actions.innerHTML = `
    <span class="shopping-hint">Tick what you need to buy</span>
    <button class="clear-btn">Clear all</button>
    <button class="share-btn" id="share-btn">Share list</button>
  `;
  actions.querySelector('.clear-btn').addEventListener('click', () => {
    localStorage.removeItem('pantry_missing');
    showShopping();
  });
  actions.querySelector('.share-btn').addEventListener('click', shareList);
  wrap.appendChild(actions);

  const grid = document.createElement('div');
  grid.className = 'shopping-list';

  Object.entries(groups).forEach(([groupName, items]) => {
    const group = document.createElement('div');
    group.className = 'shopping-group';
    group.innerHTML = `<h3>${groupName}</h3>`;

    items.forEach(item => {
      const isMissing = missing.includes(item);
      const row = document.createElement('div');
      row.className = 'shopping-item' + (isMissing ? ' checked' : '');
      row.innerHTML = `
        <div class="check-box">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="2,8 6,12 14,4"/>
          </svg>
        </div>
        <span class="item-label">${item}</span>
      `;
      row.addEventListener('click', () => {
        const current = JSON.parse(localStorage.getItem('pantry_missing') || '[]');
        const idx = current.indexOf(item);
        if (idx >= 0) current.splice(idx, 1);
        else current.push(item);
        localStorage.setItem('pantry_missing', JSON.stringify(current));
        const nowMissing = current.includes(item);
        row.classList.toggle('checked', nowMissing);
        row.querySelector('span').style.textDecoration = '';
        row.querySelector('span').style.color = '';
      });
      group.appendChild(row);
    });

    grid.appendChild(group);
  });

  wrap.appendChild(grid);
  setMain(wrap);
}

function buildPairs(item) {
  const rows = [];

  if (item.works_with && !item.pairs_with) {
    rows.push({ label: 'Works with', items: item.works_with });
  } else {
    if (item.works_with) rows.push({ label: 'Protein',    items: item.works_with });
    if (item.pairs_with) {
      const p = item.pairs_with;
      if (p.proteins)   rows.push({ label: 'Protein',    items: p.proteins });
      if (p.carbs)      rows.push({ label: 'Carbs',      items: p.carbs });
      if (p.vegetables) rows.push({ label: 'Veg',        items: p.vegetables });
    }
  }

  if (!rows.length) return '';

  const rowsHtml = rows.map(r => `
    <div class="pairs-row">
      <span class="pairs-label">${r.label}</span>
      <span class="pairs-items">${r.items.join(', ')}</span>
    </div>
  `).join('');

  return `
    <div class="pairs-section">
      <div class="section-label">Pairs with</div>
      <div class="pairs-list">${rowsHtml}</div>
    </div>
  `;
}

function buildElevate(item) {
  if (!item.elevate || !item.elevate.length) return '';
  const itemsHtml = item.elevate.map(e => `
    <div class="elevate-item">
      <div class="elevate-item-name">${e.item}</div>
      <div class="elevate-item-tip">${e.tip}</div>
    </div>
  `).join('');
  return `
    <div class="elevate-section">
      <div class="section-label">Elevate &mdash; optional extras</div>
      <div class="elevate-list">${itemsHtml}</div>
    </div>
  `;
}

function setHeader(title, hideBack) {
  document.getElementById('page-title').textContent = hideBack ? 'Saucery' : title;
  document.getElementById('back-btn').classList.toggle('hidden', hideBack);
}

function setMain(el) {
  const main = document.getElementById('main');
  main.innerHTML = '';
  main.appendChild(el);
  main.scrollTop = 0;
  window.scrollTo(0, 0);
}

function fmtCuisine(c) {
  return (c || '').replace(/_/g, ' ');
}

function swBadge(item) {
  if (item.sw === 'free')   return '<span class="badge badge-free">SW Free</span>';
  if (item.sw === 'synned') return '<span class="badge badge-syn">Synned</span>';
  return '';
}

function heatBadge(item) {
  return item.adult_heat ? '<span class="badge badge-heat">Adult heat</span>' : '';
}

init();
