/* =============================================
   IMPACT JOURNAL — APP.JS
   Local-first impact tracking for Unlimiters
   Stack: Dexie (IndexedDB), vanilla JS
   ============================================= */

// ============ DATABASE SETUP ============

const db = new Dexie('ImpactJournalDB');

db.version(1).stores({
  projects:    '++id, name, description, createdAt, updatedAt',
  entries:     '++id, projectId, text, count, tags, createdAt',
  attachments: '++id, entryId, name, type, size, data'
});

// ============ APP STATE ============

let currentProjectId = null;
let pendingFiles = [];         // files staged in the entry modal
let pendingDeleteFn = null;    // fn to call if user confirms delete
let editingEntryId = null;     // null = new entry, else = editing

// ============ INIT ============

document.addEventListener('DOMContentLoaded', async () => {
  await renderProjectList();
  attachEventListeners();
});

// ============ RENDER PROJECT LIST ============

async function renderProjectList() {
  const projects = await db.projects.orderBy('updatedAt').reverse().toArray();
  const list = document.getElementById('projectList');
  const emptyState = document.getElementById('emptyState');
  const projectView = document.getElementById('projectView');

  list.innerHTML = '';

  if (projects.length === 0) {
    emptyState.classList.remove('hidden');
    projectView.classList.add('hidden');
    currentProjectId = null;
    return;
  }

  emptyState.classList.add('hidden');

  // Auto-select first project if none selected or current was deleted
  if (!currentProjectId || !projects.find(p => p.id === currentProjectId)) {
    currentProjectId = projects[0].id;
  }

  projects.forEach(project => {
    const btn = document.createElement('button');
    btn.className = 'project-item' + (project.id === currentProjectId ? ' active' : '');
    btn.dataset.id = project.id;

    const count = 0; // lazy — we'll refresh on selection
    btn.innerHTML = `
      <div class="project-item-name">${escapeHtml(project.name)}</div>
      <div class="project-item-meta">${formatDate(project.updatedAt)}</div>
    `;
    btn.addEventListener('click', () => selectProject(project.id));
    list.appendChild(btn);
  });

  renderProjectView();
}

// ============ SELECT PROJECT ============

async function selectProject(id) {
  currentProjectId = id;
  // Update active state in sidebar
  document.querySelectorAll('.project-item').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.id) === id);
  });
  renderProjectView();
}

// ============ RENDER PROJECT VIEW ============

async function renderProjectView() {
  if (!currentProjectId) return;

  const project = await db.projects.get(currentProjectId);
  if (!project) return;

  const projectView = document.getElementById('projectView');
  projectView.classList.remove('hidden');

  document.getElementById('projectTitle').textContent = project.name;
  const descEl = document.getElementById('projectDesc');
  descEl.textContent = project.description || '';
  descEl.style.display = project.description ? '' : 'none';

  await renderStats();
  await renderEntries();
}

// ============ RENDER STATS ============

async function renderStats() {
  const entries = await db.entries.where('projectId').equals(currentProjectId).toArray();
  const entryIds = entries.map(e => e.id);
  const attachments = entryIds.length > 0
    ? await db.attachments.where('entryId').anyOf(entryIds).toArray()
    : [];

  const totalPeople = entries.reduce((sum, e) => sum + (parseInt(e.count) || 0), 0);

  document.getElementById('statEntries').textContent = entries.length;
  document.getElementById('statPeople').textContent = totalPeople.toLocaleString();
  document.getElementById('statAttachments').textContent = attachments.length;
}

// ============ RENDER ENTRIES ============

async function renderEntries() {
  const searchVal = document.getElementById('searchInput').value.toLowerCase().trim();
  const activeFilter = document.querySelector('.pill.active')?.dataset.filter || 'all';

  let entries = await db.entries.where('projectId').equals(currentProjectId).reverse().sortBy('createdAt');

  // Time filter
  if (activeFilter !== 'all') {
    const days = parseInt(activeFilter);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    entries = entries.filter(e => new Date(e.createdAt).getTime() >= cutoff);
  }

  // Search filter
  if (searchVal) {
    entries = entries.filter(e =>
      e.text.toLowerCase().includes(searchVal) ||
      (e.tags || []).some(t => t.toLowerCase().includes(searchVal))
    );
  }

  const list = document.getElementById('entryList');
  const emptyMsg = document.getElementById('emptyEntries');
  list.innerHTML = '';

  if (entries.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');

  for (const entry of entries) {
    const attachments = await db.attachments.where('entryId').equals(entry.id).toArray();
    const card = buildEntryCard(entry, attachments);
    list.appendChild(card);
  }
}

// ============ BUILD ENTRY CARD ============

function buildEntryCard(entry, attachments) {
  const card = document.createElement('div');
  card.className = 'entry-card';

  const tagsHtml = (entry.tags || []).map(t =>
    `<span class="entry-tag">${escapeHtml(t)}</span>`
  ).join('');

  const attachHtml = attachments.length > 0
    ? attachments.map(a => `
        <div class="attach-chip" data-attach-id="${a.id}" title="${escapeHtml(a.name)}">
          <span class="attach-icon">${fileIcon(a.type)}</span>
          <span>${escapeHtml(a.name)}</span>
        </div>
      `).join('')
    : '';

  card.innerHTML = `
    <div class="entry-card-top">
      <p class="entry-text">${escapeHtml(entry.text)}</p>
      <div class="entry-actions">
        <button class="btn-icon" data-edit="${entry.id}" title="Edit">✎</button>
        <button class="btn-icon btn-danger" data-delete="${entry.id}" title="Delete">✕</button>
      </div>
    </div>
    <div class="entry-meta">
      ${entry.count ? `<span class="entry-count"><span class="entry-count-icon">👥</span>${parseInt(entry.count).toLocaleString()} people reached</span>` : ''}
      <div class="entry-tags">${tagsHtml}</div>
      <span class="entry-date">${formatDate(entry.createdAt)}</span>
    </div>
    ${attachHtml ? `<div class="entry-attachments">${attachHtml}</div>` : ''}
  `;

  // Edit button
  card.querySelector(`[data-edit="${entry.id}"]`).addEventListener('click', () => openEditEntry(entry.id));

  // Delete button
  card.querySelector(`[data-delete="${entry.id}"]`).addEventListener('click', () => {
    openConfirm(
      `Delete this entry? This cannot be undone.`,
      async () => {
        await db.attachments.where('entryId').equals(entry.id).delete();
        await db.entries.delete(entry.id);
        await db.projects.update(currentProjectId, { updatedAt: new Date().toISOString() });
        await renderStats();
        await renderEntries();
      }
    );
  });

  // Attachment click → open file
  card.querySelectorAll('.attach-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const attachId = parseInt(chip.dataset.attachId);
      const attach = await db.attachments.get(attachId);
      if (attach && attach.data) {
        const blob = new Blob([attach.data], { type: attach.type });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    });
  });

  return card;
}

// ============ PROJECT CRUD ============

function openNewProject() {
  document.getElementById('projectModalTitle').textContent = 'New Project';
  document.getElementById('inputProjectName').value = '';
  document.getElementById('inputProjectDesc').value = '';
  document.getElementById('projectModal').dataset.editing = '';
  document.getElementById('projectModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('inputProjectName').focus(), 50);
}

async function openEditProject() {
  const project = await db.projects.get(currentProjectId);
  if (!project) return;
  document.getElementById('projectModalTitle').textContent = 'Edit Project';
  document.getElementById('inputProjectName').value = project.name;
  document.getElementById('inputProjectDesc').value = project.description || '';
  document.getElementById('projectModal').dataset.editing = currentProjectId;
  document.getElementById('projectModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('inputProjectName').focus(), 50);
}

async function saveProject() {
  const name = document.getElementById('inputProjectName').value.trim();
  if (!name) { document.getElementById('inputProjectName').focus(); return; }

  const desc = document.getElementById('inputProjectDesc').value.trim();
  const editingId = document.getElementById('projectModal').dataset.editing;

  if (editingId) {
    await db.projects.update(parseInt(editingId), {
      name, description: desc, updatedAt: new Date().toISOString()
    });
  } else {
    const now = new Date().toISOString();
    const id = await db.projects.add({ name, description: desc, createdAt: now, updatedAt: now });
    currentProjectId = id;
  }

  document.getElementById('projectModal').classList.add('hidden');
  await renderProjectList();
}

function deleteCurrentProject() {
  openConfirm(
    `Delete project and all its entries? This cannot be undone.`,
    async () => {
      const entries = await db.entries.where('projectId').equals(currentProjectId).toArray();
      const entryIds = entries.map(e => e.id);
      if (entryIds.length) await db.attachments.where('entryId').anyOf(entryIds).delete();
      await db.entries.where('projectId').equals(currentProjectId).delete();
      await db.projects.delete(currentProjectId);
      currentProjectId = null;
      await renderProjectList();
    }
  );
}

// ============ ENTRY CRUD ============

function openNewEntry() {
  editingEntryId = null;
  pendingFiles = [];
  document.getElementById('entryModalTitle').textContent = 'New Entry';
  document.getElementById('inputEntryText').value = '';
  document.getElementById('inputEntryCount').value = '';
  document.getElementById('inputEntryTags').value = '';
  document.getElementById('filePreview').innerHTML = '';
  document.getElementById('entryModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('inputEntryText').focus(), 50);
}

async function openEditEntry(entryId) {
  const entry = await db.entries.get(entryId);
  if (!entry) return;

  editingEntryId = entryId;
  pendingFiles = [];

  document.getElementById('entryModalTitle').textContent = 'Edit Entry';
  document.getElementById('inputEntryText').value = entry.text;
  document.getElementById('inputEntryCount').value = entry.count || '';
  document.getElementById('inputEntryTags').value = (entry.tags || []).join(', ');

  // Load existing attachments into preview
  const existing = await db.attachments.where('entryId').equals(entryId).toArray();
  const previewEl = document.getElementById('filePreview');
  previewEl.innerHTML = '';
  existing.forEach(a => {
    addFilePreviewChip(a.name, null, a.id); // existingId marks it as already saved
  });

  document.getElementById('entryModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('inputEntryText').focus(), 50);
}

async function saveEntry() {
  const text = document.getElementById('inputEntryText').value.trim();
  if (!text) { document.getElementById('inputEntryText').focus(); return; }

  const count = parseInt(document.getElementById('inputEntryCount').value) || 0;
  const tagsRaw = document.getElementById('inputEntryTags').value;
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const now = new Date().toISOString();

  if (editingEntryId) {
    await db.entries.update(editingEntryId, { text, count, tags, updatedAt: now });
    // Handle attachments: delete removed ones, add new pending files
    // For simplicity: delete all existing and re-add pending
    // (existing chips without file = keep via existingId logic below)
    const keptIds = [];
    document.querySelectorAll('.file-preview-item[data-existing-id]').forEach(el => {
      keptIds.push(parseInt(el.dataset.existingId));
    });
    const allExisting = await db.attachments.where('entryId').equals(editingEntryId).toArray();
    const toDelete = allExisting.filter(a => !keptIds.includes(a.id)).map(a => a.id);
    if (toDelete.length) await db.attachments.bulkDelete(toDelete);

  } else {
    const entryId = await db.entries.add({ projectId: currentProjectId, text, count, tags, createdAt: now });
    editingEntryId = entryId;
  }

  // Save new pending files
  for (const file of pendingFiles) {
    const data = await readFileAsArrayBuffer(file);
    await db.attachments.add({
      entryId: editingEntryId,
      name: file.name,
      type: file.type,
      size: file.size,
      data
    });
  }

  await db.projects.update(currentProjectId, { updatedAt: now });
  document.getElementById('entryModal').classList.add('hidden');
  pendingFiles = [];
  editingEntryId = null;
  await renderStats();
  await renderEntries();
}

// ============ FILE HANDLING ============

function setupFileDrop() {
  const drop = document.getElementById('fileDrop');
  const input = document.getElementById('fileInput');

  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
  });

  input.addEventListener('change', () => {
    handleFiles(Array.from(input.files));
    input.value = ''; // reset so same file can be added again
  });
}

function handleFiles(files) {
  files.forEach(file => {
    if (file.size > 10 * 1024 * 1024) {
      alert(`"${file.name}" is too large (max 10 MB per file).`);
      return;
    }
    pendingFiles.push(file);
    addFilePreviewChip(file.name, file, null);
  });
}

function addFilePreviewChip(name, file, existingId) {
  const preview = document.getElementById('filePreview');
  const chip = document.createElement('div');
  chip.className = 'file-preview-item';
  if (existingId) chip.dataset.existingId = existingId;

  chip.innerHTML = `
    <span>${fileIcon(file ? file.type : '')} ${escapeHtml(name)}</span>
    <span class="remove-file" title="Remove">✕</span>
  `;
  chip.querySelector('.remove-file').addEventListener('click', () => {
    if (file) pendingFiles = pendingFiles.filter(f => f !== file);
    chip.remove();
  });
  preview.appendChild(chip);
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ============ EXPORT / IMPORT ============

async function exportData() {
  const projects = await db.projects.toArray();
  const entries = await db.entries.toArray();
  const attachments = await db.attachments.toArray();

  // Export attachments as metadata only (no blobs)
  const attachMeta = attachments.map(({ id, entryId, name, type, size }) => ({ id, entryId, name, type, size }));

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    note: 'Attachments exported as metadata only (no file data).',
    projects,
    entries,
    attachments: attachMeta
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `impact-journal-${formatDateFile()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    alert('Invalid JSON file. Please use an exported Impact Journal file.');
    return;
  }

  if (!payload.projects || !payload.entries) {
    alert('Unrecognized file format. Please use an Impact Journal export.');
    return;
  }

  const confirmed = confirm(
    `This will MERGE the imported data with your current data.\n\n` +
    `Importing: ${payload.projects.length} project(s), ${payload.entries.length} entries.\n\n` +
    `Continue?`
  );
  if (!confirmed) return;

  // Build ID maps to avoid collisions
  const projectIdMap = {};
  for (const p of payload.projects) {
    const oldId = p.id;
    delete p.id;
    const newId = await db.projects.add(p);
    projectIdMap[oldId] = newId;
  }

  const entryIdMap = {};
  for (const e of payload.entries) {
    const oldId = e.id;
    delete e.id;
    e.projectId = projectIdMap[e.projectId] || e.projectId;
    const newId = await db.entries.add(e);
    entryIdMap[oldId] = newId;
  }

  await renderProjectList();
  alert(`Import complete! ${payload.projects.length} project(s) and ${payload.entries.length} entries imported.`);
}

// ============ CONFIRM MODAL ============

function openConfirm(message, onConfirm) {
  document.getElementById('confirmMessage').textContent = message;
  pendingDeleteFn = onConfirm;
  document.getElementById('confirmModal').classList.remove('hidden');
}

// ============ EVENT LISTENERS ============

function attachEventListeners() {
  setupFileDrop();

  // New project buttons
  document.getElementById('btnNewProject').addEventListener('click', openNewProject);
  document.getElementById('btnNewProjectEmpty').addEventListener('click', openNewProject);

  // Project modal
  document.getElementById('btnSaveProject').addEventListener('click', saveProject);
  document.getElementById('btnCancelProject').addEventListener('click', () => {
    document.getElementById('projectModal').classList.add('hidden');
  });
  document.getElementById('inputProjectName').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveProject();
  });

  // Edit/delete project
  document.getElementById('btnEditProject').addEventListener('click', openEditProject);
  document.getElementById('btnDeleteProject').addEventListener('click', deleteCurrentProject);

  // Add entry
  document.getElementById('btnAddEntry').addEventListener('click', openNewEntry);

  // Entry modal
  document.getElementById('btnSaveEntry').addEventListener('click', saveEntry);
  document.getElementById('btnCancelEntry').addEventListener('click', () => {
    document.getElementById('entryModal').classList.add('hidden');
    pendingFiles = [];
    editingEntryId = null;
  });

  // Confirm modal
  document.getElementById('btnConfirm').addEventListener('click', async () => {
    if (pendingDeleteFn) await pendingDeleteFn();
    pendingDeleteFn = null;
    document.getElementById('confirmModal').classList.add('hidden');
  });
  document.getElementById('btnCancelConfirm').addEventListener('click', () => {
    pendingDeleteFn = null;
    document.getElementById('confirmModal').classList.add('hidden');
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', renderEntries);

  // Filter pills
  document.getElementById('filterPills').addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    renderEntries();
  });

  // Export / Import
  document.getElementById('btnExport').addEventListener('click', exportData);
  document.getElementById('btnImport').addEventListener('click', () => {
    document.getElementById('importInput').click();
  });
  document.getElementById('importInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });

  // Keyboard: Escape closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
  });
}

// ============ HELPERS ============

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateFile() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fileIcon(mimeType) {
  if (!mimeType) return '📎';
  if (mimeType.startsWith('image/')) return '🖼';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return '📊';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  return '📎';
}