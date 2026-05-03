/* ── Keycloak config ─────────────────────────────────
   Realm / client match your realm-export.json.
   Change KEYCLOAK_URL if Keycloak runs on a different host/port.
──────────────────────────────────────────────────── */
const KEYCLOAK_URL    = 'http://localhost:8081';
const KEYCLOAK_REALM  = 'reusable-realm';
const KEYCLOAK_CLIENT = 'reusable-client';
const API_BASE        = 'http://localhost:8080';

/* ── Bootstrap modal helpers ──────────────────────── */
const categoryModal = () => bootstrap.Modal.getOrCreateInstance(document.getElementById('categoryModal'));
const itemModal     = () => bootstrap.Modal.getOrCreateInstance(document.getElementById('itemModal'));
const deleteModal   = () => bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteModal'));

/* ── State ────────────────────────────────────────── */
let keycloak;
let isAdmin   = false;
let isSupport = false;
let canWrite  = false;   // ADMIN or SUPPORT
let categoriesCache = [];

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  keycloak = new Keycloak({
    url:      KEYCLOAK_URL,
    realm:    KEYCLOAK_REALM,
    clientId: KEYCLOAK_CLIENT,
  });

  keycloak.init({ onLoad: 'login-required', pkceMethod: 'S256' })
    .then(authenticated => {
      if (!authenticated) { keycloak.login(); return; }

      // Auto-refresh token 30 s before expiry
      setInterval(() => keycloak.updateToken(30).catch(() => keycloak.login()), 15000);

      const roles = keycloak.tokenParsed?.realm_access?.roles ?? [];
      isAdmin   = roles.includes('ADMIN');
      isSupport = roles.includes('SUPPORT');
      canWrite  = isAdmin || isSupport;

      renderNav(roles);
      renderAdminControls();
      showSection('categories');
      loadCategories();

      document.getElementById('loading-screen').classList.add('d-none');
      document.getElementById('app').classList.remove('d-none');
    })
    .catch(() => {
      document.getElementById('loading-screen').innerHTML =
        '<div class="alert alert-danger m-4">Could not connect to Keycloak. Is it running on port 8081?</div>';
    });
});

/* ══════════════════════════════════════════════════
   NAV / ROLE RENDERING
══════════════════════════════════════════════════ */
function renderNav(roles) {
  const preferred = keycloak.tokenParsed?.preferred_username ?? '';
  document.getElementById('nav-username').textContent = preferred;

  const badge = document.getElementById('nav-role-badge');
  if (isAdmin) {
    badge.textContent = 'ADMIN';
    badge.classList.add('bg-danger');
  } else if (isSupport) {
    badge.textContent = 'SUPPORT';
    badge.classList.add('bg-warning', 'text-dark');
  } else {
    badge.textContent = 'USER';
    badge.classList.add('bg-secondary');
  }
}

function renderAdminControls() {
  if (canWrite) {
    document.getElementById('btn-create-category').classList.remove('d-none');
    document.getElementById('btn-create-item').classList.remove('d-none');
    // Show actions column header always if can write or can delete
    document.getElementById('cat-actions-header').classList.remove('d-none');
    document.getElementById('item-actions-header').classList.remove('d-none');
  }
}

function doLogout() {
  keycloak.logout({ redirectUri: window.location.origin });
}

/* ══════════════════════════════════════════════════
   SECTION SWITCHING
══════════════════════════════════════════════════ */
window.showSection = function(name) {
  document.getElementById('section-categories').classList.add('d-none');
  document.getElementById('section-items').classList.add('d-none');
  document.getElementById('section-' + name).classList.remove('d-none');

  document.querySelectorAll('.navbar-nav .nav-link').forEach(l => l.classList.remove('active'));
  if (name === 'categories') loadCategories();
  if (name === 'items')      loadItems();
};

/* ══════════════════════════════════════════════════
   HTTP HELPER
══════════════════════════════════════════════════ */
async function apiFetch(path, options = {}) {
  await keycloak.updateToken(30);
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + keycloak.token,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ══════════════════════════════════════════════════
   CATEGORIES
══════════════════════════════════════════════════ */
async function loadCategories() {
  const tbody = document.getElementById('category-table-body');
  tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Loading…</td></tr>';
  try {
    categoriesCache = await apiFetch('/categories');
    renderCategoryTable(categoriesCache);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">${e.message}</td></tr>`;
  }
}

function renderCategoryTable(data) {
  const tbody = document.getElementById('category-table-body');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No categories found.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(c => `
    <tr>
      <td><span class="badge bg-secondary">${c.id}</span></td>
      <td class="fw-semibold">${escHtml(c.name)}</td>
      <td class="text-muted">${c.description ? escHtml(c.description) : '<em class="text-muted">—</em>'}</td>
      ${canWrite ? `
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openCategoryModal(${c.id},'${escAttr(c.name)}','${escAttr(c.description??'')}')">
          <i class="bi bi-pencil"></i> Edit
        </button>
        ${isAdmin ? `
        <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete('category',${c.id},'${escAttr(c.name)}')">
          <i class="bi bi-trash"></i> Delete
        </button>` : ''}
      </td>` : ''}
    </tr>`).join('');
}

window.openCategoryModal = function(id = null, name = '', desc = '') {
  document.getElementById('category-id').value          = id ?? '';
  document.getElementById('category-name').value        = name;
  document.getElementById('category-description').value = desc;
  document.getElementById('category-modal-title').textContent = id ? 'Edit Category' : 'New Category';
  document.getElementById('category-form').classList.remove('was-validated');
  categoryModal().show();
};

window.saveCategory = async function() {
  const form = document.getElementById('category-form');
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const id   = document.getElementById('category-id').value;
  const body = {
    name:        document.getElementById('category-name').value.trim(),
    description: document.getElementById('category-description').value.trim() || undefined,
  };
  try {
    if (id) {
      await apiFetch(`/categories/${id}`, { method: 'PUT',  body: JSON.stringify(body) });
      showToast('Category updated.', 'success');
    } else {
      await apiFetch('/categories',       { method: 'POST', body: JSON.stringify(body) });
      showToast('Category created.', 'success');
    }
    categoryModal().hide();
    loadCategories();
  } catch (e) { showToast(e.message, 'danger'); }
};

/* ══════════════════════════════════════════════════
   ITEMS
══════════════════════════════════════════════════ */
async function loadItems() {
  const tbody = document.getElementById('item-table-body');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Loading…</td></tr>';
  try {
    const items = await apiFetch('/items');
    renderItemTable(items);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">${e.message}</td></tr>`;
  }
}

function renderItemTable(data) {
  const tbody = document.getElementById('item-table-body');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No items found.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(i => `
    <tr>
      <td><span class="badge bg-secondary">${i.id}</span></td>
      <td class="fw-semibold">${escHtml(i.name)}</td>
      <td class="text-muted">${i.description ? escHtml(i.description) : '<em>—</em>'}</td>
      <td><span class="badge bg-success">$${Number(i.price).toFixed(2)}</span></td>
      <td><span class="badge bg-primary">${escHtml(i.categoryName ?? '')}</span></td>
      ${canWrite ? `
      <td>
        <button class="btn btn-sm btn-outline-primary me-1"
          onclick="openItemModal(${i.id},'${escAttr(i.name)}','${escAttr(i.description??'')}',${i.price},${i.categoryId})">
          <i class="bi bi-pencil"></i> Edit
        </button>
        ${isAdmin ? `
        <button class="btn btn-sm btn-outline-danger"
          onclick="confirmDelete('item',${i.id},'${escAttr(i.name)}')">
          <i class="bi bi-trash"></i> Delete
        </button>` : ''}
      </td>` : ''}
    </tr>`).join('');
}

window.openItemModal = async function(id = null, name = '', desc = '', price = '', categoryId = '') {
  // Populate category dropdown from cache (refresh if empty)
  if (!categoriesCache.length) {
    try { categoriesCache = await apiFetch('/categories'); } catch(_) {}
  }
  const sel = document.getElementById('item-category');
  sel.innerHTML = '<option value="">— Select —</option>' +
    categoriesCache.map(c => `<option value="${c.id}" ${c.id == categoryId ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('');

  document.getElementById('item-id').value          = id ?? '';
  document.getElementById('item-name').value        = name;
  document.getElementById('item-description').value = desc;
  document.getElementById('item-price').value       = price;
  document.getElementById('item-modal-title').textContent = id ? 'Edit Item' : 'New Item';
  document.getElementById('item-form').classList.remove('was-validated');
  itemModal().show();
};

window.saveItem = async function() {
  const form = document.getElementById('item-form');
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const id   = document.getElementById('item-id').value;
  const body = {
    name:        document.getElementById('item-name').value.trim(),
    description: document.getElementById('item-description').value.trim() || undefined,
    price:       parseFloat(document.getElementById('item-price').value),
    categoryId:  parseInt(document.getElementById('item-category').value, 10),
  };
  try {
    if (id) {
      await apiFetch(`/items/${id}`, { method: 'PUT',  body: JSON.stringify(body) });
      showToast('Item updated.', 'success');
    } else {
      await apiFetch('/items',       { method: 'POST', body: JSON.stringify(body) });
      showToast('Item created.', 'success');
    }
    itemModal().hide();
    loadItems();
  } catch (e) { showToast(e.message, 'danger'); }
};

/* ══════════════════════════════════════════════════
   DELETE
══════════════════════════════════════════════════ */
window.confirmDelete = function(type, id, name) {
  document.getElementById('delete-confirm-text').textContent =
    `Delete ${type} "${name}" (ID ${id})?`;
  const btn = document.getElementById('confirm-delete-btn');
  btn.onclick = () => doDelete(type, id);
  deleteModal().show();
};

async function doDelete(type, id) {
  try {
    await apiFetch(`/${type}s/${id}`, { method: 'DELETE' });
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`, 'warning');
    deleteModal().hide();
    if (type === 'category') loadCategories();
    else                     loadItems();
  } catch (e) { showToast(e.message, 'danger'); }
}

/* ══════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════ */
function showToast(message, type = 'success') {
  const el = document.getElementById('toast');
  el.className = `toast align-items-center text-white border-0 bg-${type}`;
  document.getElementById('toast-body').textContent = message;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 3000 }).show();
}

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return String(s).replace(/'/g, "\\'").replace(/\n/g, ' ');
}

