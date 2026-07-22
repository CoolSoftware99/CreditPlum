// --- State ---
const state = {
  score: 560,
  favorites: new Set(),
  authMode: 'login', // or 'register'
};
// Expose for the chatbot widget so it can pass the visitor's score as context.
window.state = state;

// --- Helpers ---
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
};

function bandFor(score) {
  if (score < 580) return 'Poor';
  if (score < 670) return 'Fair';
  if (score < 740) return 'Good';
  if (score < 800) return 'Very good';
  return 'Excellent';
}

function ripenessColor(pct) {
  if (pct >= 70) return 'var(--ripe)';
  if (pct >= 40) return 'var(--ripening)';
  return 'var(--unripe)';
}

const CATEGORY_LABEL = {
  'secured-card': 'Secured card',
  'unsecured-card': 'Unsecured card',
  'credit-builder-loan': 'Credit-builder loan',
  'personal-loan': 'Personal loan',
};

// --- Product rendering ---
function productCard(p) {
  const card = el('div', 'product-card');
  const odds = p.match ? p.match.estimatedApprovalOdds : p.approvalLikelihood;
  const isFav = state.favorites.has(p._id);

  card.innerHTML = `
    <span class="tag">${CATEGORY_LABEL[p.category] || p.category}</span>
    <h3>${p.name}</h3>
    <div class="issuer">${p.issuer}</div>

    <div class="ripeness" title="Estimated approval odds for your score">
      <div class="track"><div class="fill" style="width:${odds}%;background:${ripenessColor(odds)}"></div></div>
      <div class="pct" style="color:${ripenessColor(odds)}">${odds}%</div>
    </div>
    <div class="ripe-hint">Estimated approval odds at score ${state.score}</div>

    <div class="facts">
      <div><b>$${p.annualFee}</b><span>Annual fee</span></div>
      <div><b>${p.regularApr || '—'}</b><span>Regular APR</span></div>
      ${p.depositRequired ? `<div><b>$${p.depositRequired}</b><span>Deposit</span></div>` : ''}
    </div>

    ${p.bestFor ? `<p style="margin:0;font-size:.92rem;color:var(--ink-soft)"><strong>Best for:</strong> ${p.bestFor}</p>` : ''}
    ${p.highlights && p.highlights.length ? `<ul class="card-list">${p.highlights.slice(0, 3).map((h) => `<li>${h}</li>`).join('')}</ul>` : ''}

    <div class="card-actions">
      <a class="btn" href="/go/${p.slug}" target="_blank" rel="nofollow sponsored noopener">See offer</a>
      <button class="fav-btn ${isFav ? 'on' : ''}" data-id="${p._id}" aria-label="Save">${isFav ? '♥' : '♡'}</button>
    </div>
  `;

  card.querySelector('.fav-btn').addEventListener('click', (e) => toggleFavorite(e.currentTarget));
  return card;
}

async function loadProducts() {
  const grid = $('#productGrid');
  grid.innerHTML = '<p style="color:var(--ink-soft)">Finding matches…</p>';
  try {
    const { products, count } = await API.products({
      score: state.score,
      category: $('#categoryFilter').value,
      sort: $('#sortFilter').value,
    });
    $('#resultCount').textContent = `${count} product${count === 1 ? '' : 's'}`;
    grid.innerHTML = '';
    if (!products.length) {
      grid.innerHTML = '<div class="no-match-msg">No products match those filters yet. Try widening them.</div>';
      return;
    }
    products.forEach((p) => grid.appendChild(productCard(p)));
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--unripe)">Couldn't load products: ${err.message}</p>`;
  }
}

// --- Favorites ---
async function refreshFavorites() {
  if (!API.isLoggedIn()) {
    state.favorites = new Set();
    return;
  }
  try {
    const { favorites } = await API.listFavorites();
    state.favorites = new Set(favorites.map((f) => f._id));
  } catch {
    state.favorites = new Set();
  }
}

async function toggleFavorite(btn) {
  if (!API.isLoggedIn()) {
    openAuth('login');
    return;
  }
  const id = btn.dataset.id;
  try {
    if (state.favorites.has(id)) {
      await API.removeFavorite(id);
      state.favorites.delete(id);
      btn.classList.remove('on');
      btn.textContent = '♡';
    } else {
      await API.addFavorite(id);
      state.favorites.add(id);
      btn.classList.add('on');
      btn.textContent = '♥';
    }
  } catch (err) {
    alert(err.message);
  }
}

// --- Education ---
async function loadArticles() {
  const grid = $('#eduGrid');
  try {
    const { articles } = await API.articles();
    grid.innerHTML = '';
    articles.forEach((a) => {
      const card = el('article', 'edu-card');
      card.innerHTML = `
        <div class="cat">${a.category}</div>
        <h3>${a.title}</h3>
        <p>${a.excerpt}</p>
        <div class="read">${a.readingMinutes} min read</div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--unripe)">Couldn't load articles: ${err.message}</p>`;
  }
}

// --- Auth modal ---
function openAuth(mode) {
  state.authMode = mode;
  $('#authModal').classList.add('open');
  $('#authErr').textContent = '';
  const isLogin = mode === 'login';
  $('#authTitle').textContent = isLogin ? 'Welcome back' : 'Create your account';
  $('#authSubmit').textContent = isLogin ? 'Sign in' : 'Create account';
  $('#authSwitchText').textContent = isLogin ? 'New here?' : 'Already have an account?';
  $('#authSwitch').textContent = isLogin ? 'Create an account' : 'Sign in';
  $('#authPassword').setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
}
function closeAuth() { $('#authModal').classList.remove('open'); }

async function submitAuth() {
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;
  const errBox = $('#authErr');
  errBox.textContent = '';
  try {
    const fn = state.authMode === 'login' ? API.login : API.register;
    const { token } = await fn({ email, password });
    API.setToken(token);
    closeAuth();
    await refreshFavorites();
    updateAuthUI();
    loadProducts();
  } catch (err) {
    errBox.textContent = err.message;
  }
}

function updateAuthUI() {
  $('#authBtn').textContent = API.isLoggedIn() ? 'Sign out' : 'Sign in';
}

// --- Wiring ---
function init() {
  // Score picker
  const range = $('#scoreRange');
  const applyScore = () => {
    state.score = Number(range.value);
    $('#scoreReadout').textContent = state.score;
    $('#bandLabel').textContent = bandFor(state.score);
  };
  range.addEventListener('input', applyScore);
  // Reload after the user stops dragging, to avoid hammering the API.
  let debounce;
  range.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(loadProducts, 250);
  });
  applyScore();

  $('#categoryFilter').addEventListener('change', loadProducts);
  $('#sortFilter').addEventListener('change', loadProducts);

  // Auth
  $('#authBtn').addEventListener('click', () => {
    if (API.isLoggedIn()) {
      API.setToken(null);
      refreshFavorites().then(() => { updateAuthUI(); loadProducts(); });
    } else {
      openAuth('login');
    }
  });
  $('#authSwitch').addEventListener('click', (e) => { e.preventDefault(); openAuth(state.authMode === 'login' ? 'register' : 'login'); });
  $('#authSubmit').addEventListener('click', submitAuth);
  $('#authModal').addEventListener('click', (e) => { if (e.target.id === 'authModal') closeAuth(); });
  $('#favLink').addEventListener('click', (e) => { e.preventDefault(); if (!API.isLoggedIn()) openAuth('login'); else document.querySelector('#compare').scrollIntoView(); });

  // Initial load
  updateAuthUI();
  refreshFavorites().then(loadProducts);
  loadArticles();
}

document.addEventListener('DOMContentLoaded', init);
