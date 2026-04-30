let data = null;
let currentCat = 'sauces';

const CUISINE_COLOURS = {
  italian:        '#c0392b',
  spanish:        '#d4651a',
  mexican:        '#2e8b4a',
  indian:         '#c9860a',
  north_african:  '#a0791a',
  west_african:   '#7a4010',
  chinese:        '#9b1a1a',
  japanese:       '#6b4c7a',
  thai:           '#1a7a5e',
  french:         '#2a5a8a',
  korean:         '#8a1a2e',
  caribbean:      '#b8620a',
  mediterranean:  '#2a6a8a',
  middle_eastern: '#8a6a10',
  asian:          '#1a6a6a',
};

async function init() {
  try {
    const res = await fetch('./sauces.json');
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

  const grid = document.createElement('div');
  grid.className = 'grid';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    const colour = CUISINE_COLOURS[item.cuisine] || '#888';
    card.style.borderLeftColor = colour;
    card.innerHTML = `
      <div class="card-name">${item.name}</div>
      <div class="card-cuisine">${fmtCuisine(item.cuisine)}</div>
      <div class="badges">${swBadge(item)}${heatBadge(item)}</div>
    `;
    card.addEventListener('click', () => showDetail(item));
    grid.appendChild(card);
  });

  setMain(grid);
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

  const el = document.createElement('div');
  el.className = 'detail';
  el.innerHTML = `
    <div class="detail-header">
      <h2>${item.name}</h2>
      <div class="detail-cuisine">${fmtCuisine(item.cuisine)}</div>
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
  `;

  setMain(el);
}

function buildShareText() {
  const groups = data.shopping_list;
  const checked = JSON.parse(localStorage.getItem('shopping_checked') || '{}');
  const lines = ['Shopping list\n'];
  Object.entries(groups).forEach(([groupName, items]) => {
    const needed = items.filter(item => !checked[groupName + ':' + item]);
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
    alert('Nothing left to buy — everything is ticked!');
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
  const checked = JSON.parse(localStorage.getItem('shopping_checked') || '{}');

  const wrap = document.createElement('div');

  const actions = document.createElement('div');
  actions.className = 'shopping-actions';
  actions.innerHTML = `
    <button class="clear-btn">Clear all</button>
    <button class="share-btn" id="share-btn">Share list</button>
  `;
  actions.querySelector('.clear-btn').addEventListener('click', () => {
    localStorage.removeItem('shopping_checked');
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
      const key = groupName + ':' + item;
      const isChecked = !!checked[key];

      const row = document.createElement('div');
      row.className = 'shopping-item' + (isChecked ? ' checked' : '');
      row.innerHTML = `
        <div class="check-box">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="2,8 6,12 14,4"/>
          </svg>
        </div>
        <span class="item-label">${item}</span>
      `;
      row.addEventListener('click', () => {
        const current = JSON.parse(localStorage.getItem('shopping_checked') || '{}');
        if (current[key]) delete current[key];
        else current[key] = true;
        localStorage.setItem('shopping_checked', JSON.stringify(current));
        row.classList.toggle('checked');
        row.querySelector('.check-box').style.background = current[key] ? '#5b3fa6' : '';
        row.querySelector('.check-box').style.borderColor = current[key] ? '#5b3fa6' : '';
        row.querySelector('span').style.textDecoration = current[key] ? 'line-through' : '';
        row.querySelector('span').style.color = current[key] ? 'var(--muted)' : '';
      });
      group.appendChild(row);
    });

    grid.appendChild(group);
  });

  wrap.appendChild(grid);
  setMain(wrap);
}

function buildPairs(item) {
  const groups = [];

  if (item.works_with && !item.pairs_with) {
    groups.push({ label: null, items: item.works_with });
  } else {
    if (item.works_with) groups.push({ label: 'Protein',    items: item.works_with });
    if (item.pairs_with) {
      const p = item.pairs_with;
      if (p.proteins)   groups.push({ label: 'Protein',    items: p.proteins });
      if (p.carbs)      groups.push({ label: 'Carbs',      items: p.carbs });
      if (p.vegetables) groups.push({ label: 'Vegetables', items: p.vegetables });
    }
  }

  if (!groups.length) return '';

  const groupsHtml = groups.map(g => `
    <div class="pairs-group">
      ${g.label ? `<h4>${g.label}</h4>` : ''}
      <p>${g.items.join(', ')}</p>
    </div>
  `).join('');

  return `
    <div class="pairs-section">
      <div class="section-label">Pairs with</div>
      <div class="pairs-row">${groupsHtml}</div>
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
