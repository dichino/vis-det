/* =============================================
   IMPACT JOURNAL — APP.JS
   Local-first impact tracking for Unlimiters
   Stack: Dexie (IndexedDB), vanilla JS
   ============================================= */

// ============ DATABASE SETUP ============

const db = new Dexie('ImpactJournalDB');

// Version 1: original journal tables
db.version(1).stores({
  projects:    '++id, name, description, createdAt, updatedAt',
  entries:     '++id, projectId, text, count, tags, createdAt',
  attachments: '++id, entryId, name, type, size, data'
});

// Version 2: add surveys + responses
db.version(2).stores({
  projects:    '++id, name, description, createdAt, updatedAt',
  entries:     '++id, projectId, text, count, tags, createdAt',
  attachments: '++id, entryId, name, type, size, data',
  surveys:     '++id, projectId, title, description, createdAt',
  responses:   '++id, surveyId, submittedAt'
});

// ============ APP STATE ============

let currentProjectId  = null;
let currentSurveyId   = null;
let currentProjectTab = 'journal';   // 'journal' | 'surveys'
let currentSurveyTab  = 'questions'; // 'questions' | 'responses' | 'share'
let pendingFiles      = [];
let pendingDeleteFn   = null;
let editingEntryId    = null;
let buildingQuestions = [];          // questions staged in survey builder

// ============ INIT ============

document.addEventListener('DOMContentLoaded', async () => {
  await renderProjectList();
  attachEventListeners();
});

// ============ SHOW / HIDE VIEWS ============

function showView(viewId) {
  ['emptyState', 'projectView', 'surveyDetailView'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');
}

// ============ RENDER PROJECT LIST (SIDEBAR) ============

async function renderProjectList() {
  const projects = await db.projects.orderBy('updatedAt').reverse().toArray();
  const list = document.getElementById('projectList');
  list.innerHTML = '';

  if (projects.length === 0) {
    showView('emptyState');
    currentProjectId = null;
    return;
  }

  if (!currentProjectId || !projects.find(p => p.id === currentProjectId)) {
    currentProjectId = projects[0].id;
  }

  projects.forEach(project => {
    const btn = document.createElement('button');
    btn.className = 'project-item' + (project.id === currentProjectId ? ' active' : '');
    btn.dataset.id = project.id;
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
  currentSurveyId  = null;
  currentProjectTab = 'journal';
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

  showView('projectView');

  document.getElementById('projectTitle').textContent = project.name;
  const descEl = document.getElementById('projectDesc');
  descEl.textContent = project.description || '';
  descEl.style.display = project.description ? '' : 'none';

  // Reset to journal tab
  switchProjectTab('journal');

  await renderStats();
  await renderEntries();
}

// ============ SWITCH PROJECT TAB ============

function switchProjectTab(tab) {
  currentProjectTab = tab;

  document.querySelectorAll('.view-tab[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === tab);
  });

  document.getElementById('journalSection').classList.toggle('hidden', tab !== 'journal');
  document.getElementById('surveysSection').classList.toggle('hidden', tab !== 'surveys');

  if (tab === 'surveys') renderSurveyList();
}

// ============ RENDER STATS ============

async function renderStats() {
  const entries = await db.entries.where('projectId').equals(currentProjectId).toArray();
  const entryIds = entries.map(e => e.id);
  const attachments = entryIds.length
    ? await db.attachments.where('entryId').anyOf(entryIds).toArray()
    : [];
  const surveys = await db.surveys.where('projectId').equals(currentProjectId).toArray();

  const totalPeople = entries.reduce((sum, e) => sum + (parseInt(e.count) || 0), 0);

  document.getElementById('statEntries').textContent    = entries.length;
  document.getElementById('statPeople').textContent     = totalPeople.toLocaleString();
  document.getElementById('statAttachments').textContent = attachments.length;
  document.getElementById('statSurveys').textContent    = surveys.length;
}

// ============ RENDER ENTRIES ============

async function renderEntries() {
  const searchVal    = document.getElementById('searchInput').value.toLowerCase().trim();
  const activeFilter = document.querySelector('.pill.active')?.dataset.filter || 'all';

  let entries = await db.entries
    .where('projectId').equals(currentProjectId)
    .reverse().sortBy('createdAt');

  if (activeFilter !== 'all') {
    const cutoff = Date.now() - parseInt(activeFilter) * 86400000;
    entries = entries.filter(e => new Date(e.createdAt).getTime() >= cutoff);
  }

  if (searchVal) {
    entries = entries.filter(e =>
      e.text.toLowerCase().includes(searchVal) ||
      (e.tags || []).some(t => t.toLowerCase().includes(searchVal))
    );
  }

  const list     = document.getElementById('entryList');
  const emptyMsg = document.getElementById('emptyEntries');
  list.innerHTML = '';

  if (entries.length === 0) { emptyMsg.classList.remove('hidden'); return; }
  emptyMsg.classList.add('hidden');

  for (const entry of entries) {
    const attachments = await db.attachments.where('entryId').equals(entry.id).toArray();
    list.appendChild(buildEntryCard(entry, attachments));
  }
}

// ============ BUILD ENTRY CARD ============

function buildEntryCard(entry, attachments) {
  const card = document.createElement('div');
  card.className = 'entry-card';

  const tagsHtml   = (entry.tags || []).map(t => `<span class="entry-tag">${escapeHtml(t)}</span>`).join('');
  const attachHtml = attachments.map(a => `
    <div class="attach-chip" data-attach-id="${a.id}" title="${escapeHtml(a.name)}">
      <span>${fileIcon(a.type)}</span>
      <span>${escapeHtml(a.name)}</span>
    </div>
  `).join('');

  card.innerHTML = `
    <div class="entry-card-top">
      <p class="entry-text">${escapeHtml(entry.text)}</p>
      <div class="entry-actions">
        <button class="btn-icon" data-edit="${entry.id}" title="Edit">✎</button>
        <button class="btn-icon btn-danger" data-delete="${entry.id}" title="Delete">✕</button>
      </div>
    </div>
    <div class="entry-meta">
      ${entry.count ? `<span class="entry-count">👥 ${parseInt(entry.count).toLocaleString()} people reached</span>` : ''}
      <div class="entry-tags">${tagsHtml}</div>
      <span class="entry-date">${formatDate(entry.createdAt)}</span>
    </div>
    ${attachHtml ? `<div class="entry-attachments">${attachHtml}</div>` : ''}
  `;

  card.querySelector(`[data-edit="${entry.id}"]`).addEventListener('click', () => openEditEntry(entry.id));
  card.querySelector(`[data-delete="${entry.id}"]`).addEventListener('click', () => {
    openConfirm('Delete this entry? This cannot be undone.', async () => {
      await db.attachments.where('entryId').equals(entry.id).delete();
      await db.entries.delete(entry.id);
      await db.projects.update(currentProjectId, { updatedAt: new Date().toISOString() });
      await renderStats();
      await renderEntries();
    });
  });

  card.querySelectorAll('.attach-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const attach = await db.attachments.get(parseInt(chip.dataset.attachId));
      if (attach?.data) {
        const url = URL.createObjectURL(new Blob([attach.data], { type: attach.type }));
        window.open(url, '_blank');
      }
    });
  });

  return card;
}

// ============ PROJECT CRUD ============

function openNewProject() {
  document.getElementById('projectModalTitle').textContent = 'New Project';
  document.getElementById('inputProjectName').value  = '';
  document.getElementById('inputProjectDesc').value  = '';
  document.getElementById('projectModal').dataset.editing = '';
  document.getElementById('projectModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('inputProjectName').focus(), 50);
}

async function openEditProject() {
  const project = await db.projects.get(currentProjectId);
  if (!project) return;
  document.getElementById('projectModalTitle').textContent = 'Edit Project';
  document.getElementById('inputProjectName').value  = project.name;
  document.getElementById('inputProjectDesc').value  = project.description || '';
  document.getElementById('projectModal').dataset.editing = currentProjectId;
  document.getElementById('projectModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('inputProjectName').focus(), 50);
}

async function saveProject() {
  const name = document.getElementById('inputProjectName').value.trim();
  if (!name) { document.getElementById('inputProjectName').focus(); return; }
  const desc      = document.getElementById('inputProjectDesc').value.trim();
  const editingId = document.getElementById('projectModal').dataset.editing;
  const now       = new Date().toISOString();

  if (editingId) {
    await db.projects.update(parseInt(editingId), { name, description: desc, updatedAt: now });
  } else {
    const id = await db.projects.add({ name, description: desc, createdAt: now, updatedAt: now });
    currentProjectId = id;
  }

  document.getElementById('projectModal').classList.add('hidden');
  await renderProjectList();
}

function deleteCurrentProject() {
  openConfirm('Delete this project and all its data? This cannot be undone.', async () => {
    const entries  = await db.entries.where('projectId').equals(currentProjectId).toArray();
    const entryIds = entries.map(e => e.id);
    if (entryIds.length) await db.attachments.where('entryId').anyOf(entryIds).delete();
    await db.entries.where('projectId').equals(currentProjectId).delete();

    const surveys = await db.surveys.where('projectId').equals(currentProjectId).toArray();
    for (const s of surveys) await db.responses.where('surveyId').equals(s.id).delete();
    await db.surveys.where('projectId').equals(currentProjectId).delete();

    await db.projects.delete(currentProjectId);
    currentProjectId = null;
    await renderProjectList();
  });
}

// ============ ENTRY CRUD ============

function openNewEntry() {
  editingEntryId = null;
  pendingFiles   = [];
  document.getElementById('entryModalTitle').textContent  = 'New Entry';
  document.getElementById('inputEntryText').value         = '';
  document.getElementById('inputEntryCount').value        = '';
  document.getElementById('inputEntryTags').value         = '';
  document.getElementById('filePreview').innerHTML        = '';
  document.getElementById('entryModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('inputEntryText').focus(), 50);
}

async function openEditEntry(entryId) {
  const entry = await db.entries.get(entryId);
  if (!entry) return;
  editingEntryId = entryId;
  pendingFiles   = [];
  document.getElementById('entryModalTitle').textContent = 'Edit Entry';
  document.getElementById('inputEntryText').value        = entry.text;
  document.getElementById('inputEntryCount').value       = entry.count || '';
  document.getElementById('inputEntryTags').value        = (entry.tags || []).join(', ');

  const existing = await db.attachments.where('entryId').equals(entryId).toArray();
  const previewEl = document.getElementById('filePreview');
  previewEl.innerHTML = '';
  existing.forEach(a => addFilePreviewChip(a.name, null, a.id));

  document.getElementById('entryModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('inputEntryText').focus(), 50);
}

async function saveEntry() {
  const text = document.getElementById('inputEntryText').value.trim();
  if (!text) { document.getElementById('inputEntryText').focus(); return; }

  const count  = parseInt(document.getElementById('inputEntryCount').value) || 0;
  const tags   = document.getElementById('inputEntryTags').value.split(',').map(t => t.trim()).filter(Boolean);
  const now    = new Date().toISOString();

  if (editingEntryId) {
    await db.entries.update(editingEntryId, { text, count, tags, updatedAt: now });
    const keptIds    = [...document.querySelectorAll('.file-preview-item[data-existing-id]')].map(el => parseInt(el.dataset.existingId));
    const allExist   = await db.attachments.where('entryId').equals(editingEntryId).toArray();
    const toDelete   = allExist.filter(a => !keptIds.includes(a.id)).map(a => a.id);
    if (toDelete.length) await db.attachments.bulkDelete(toDelete);
  } else {
    editingEntryId = await db.entries.add({ projectId: currentProjectId, text, count, tags, createdAt: now });
  }

  for (const file of pendingFiles) {
    const data = await readFileAsArrayBuffer(file);
    await db.attachments.add({ entryId: editingEntryId, name: file.name, type: file.type, size: file.size, data });
  }

  await db.projects.update(currentProjectId, { updatedAt: now });
  document.getElementById('entryModal').classList.add('hidden');
  pendingFiles   = [];
  editingEntryId = null;
  await renderStats();
  await renderEntries();
}

// ============ FILE HANDLING ============

function setupFileDrop() {
  const drop  = document.getElementById('fileDrop');
  const input = document.getElementById('fileInput');

  drop.addEventListener('dragover',  e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
  });

  input.addEventListener('change', () => { handleFiles(Array.from(input.files)); input.value = ''; });
}

function handleFiles(files) {
  files.forEach(file => {
    if (file.size > 10 * 1024 * 1024) { alert(`"${file.name}" is too large (max 10 MB).`); return; }
    pendingFiles.push(file);
    addFilePreviewChip(file.name, file, null);
  });
}

function addFilePreviewChip(name, file, existingId) {
  const preview = document.getElementById('filePreview');
  const chip    = document.createElement('div');
  chip.className = 'file-preview-item';
  if (existingId) chip.dataset.existingId = existingId;
  chip.innerHTML = `<span>${fileIcon(file ? file.type : '')} ${escapeHtml(name)}</span><span class="remove-file" title="Remove">✕</span>`;
  chip.querySelector('.remove-file').addEventListener('click', () => {
    if (file) pendingFiles = pendingFiles.filter(f => f !== file);
    chip.remove();
  });
  preview.appendChild(chip);
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ============ JOURNAL EXPORT / IMPORT ============

async function exportData() {
  const projects    = await db.projects.toArray();
  const entries     = await db.entries.toArray();
  const attachments = await db.attachments.toArray();
  const surveys     = await db.surveys.toArray();
  const responses   = await db.responses.toArray();

  const attachMeta = attachments.map(({ id, entryId, name, type, size }) => ({ id, entryId, name, type, size }));

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 2,
    note: 'Attachments exported as metadata only (no file data).',
    projects, entries, attachments: attachMeta, surveys, responses
  };

  downloadJson(payload, `impact-journal-${formatDateFile()}.json`);
}

async function importData(file) {
  let payload;
  try { payload = JSON.parse(await file.text()); }
  catch { alert('Invalid JSON file.'); return; }

  if (!payload.projects || !payload.entries) { alert('Unrecognized file format.'); return; }

  const ok = confirm(`Merge ${payload.projects.length} project(s) and ${payload.entries.length} entries into your data?\n\nThis will not overwrite existing data.`);
  if (!ok) return;

  const projectIdMap = {};
  for (const p of payload.projects) {
    const oldId = p.id; delete p.id;
    projectIdMap[oldId] = await db.projects.add(p);
  }

  const entryIdMap = {};
  for (const e of payload.entries) {
    const oldId = e.id; delete e.id;
    e.projectId = projectIdMap[e.projectId] || e.projectId;
    entryIdMap[oldId] = await db.entries.add(e);
  }

  if (payload.surveys) {
    const surveyIdMap = {};
    for (const s of payload.surveys) {
      const oldId = s.id; delete s.id;
      s.projectId = projectIdMap[s.projectId] || s.projectId;
      surveyIdMap[oldId] = await db.surveys.add(s);
    }
    if (payload.responses) {
      for (const r of payload.responses) {
        delete r.id;
        r.surveyId = surveyIdMap[r.surveyId] || r.surveyId;
        await db.responses.add(r);
      }
    }
  }

  await renderProjectList();
  alert(`Import complete: ${payload.projects.length} project(s) and ${payload.entries.length} entries imported.`);
}

// ============ SURVEY LIST ============

async function renderSurveyList() {
  const surveys   = await db.surveys.where('projectId').equals(currentProjectId).reverse().sortBy('createdAt');
  const list      = document.getElementById('surveyList');
  const emptyMsg  = document.getElementById('emptySurveys');
  list.innerHTML  = '';

  if (surveys.length === 0) { emptyMsg.classList.remove('hidden'); return; }
  emptyMsg.classList.add('hidden');

  for (const survey of surveys) {
    const responseCount = await db.responses.where('surveyId').equals(survey.id).count();
    const card = document.createElement('div');
    card.className = 'survey-card';
    card.innerHTML = `
      <div class="survey-card-icon">📋</div>
      <div class="survey-card-info">
        <div class="survey-card-title">${escapeHtml(survey.title)}</div>
        ${survey.description ? `<div class="survey-card-desc">${escapeHtml(survey.description)}</div>` : ''}
        <div class="survey-card-chips">
          <span class="meta-chip">${(survey.questions || []).length} questions</span>
          <span class="meta-chip">${responseCount} response${responseCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div style="color: var(--text-muted); font-size: 18px;">→</div>
    `;
    card.addEventListener('click', () => openSurveyDetail(survey.id));
    list.appendChild(card);
  }
}

// ============ OPEN SURVEY DETAIL ============

async function openSurveyDetail(surveyId) {
  currentSurveyId = surveyId;
  const survey    = await db.surveys.get(surveyId);
  if (!survey) return;

  showView('surveyDetailView');

  document.getElementById('surveyDetailTitle').textContent = survey.title;
  const descEl = document.getElementById('surveyDetailDesc');
  descEl.textContent = survey.description || '';
  descEl.style.display = survey.description ? '' : 'none';

  // Reset to questions tab
  switchSurveyTab('questions');

  const responseCount = await db.responses.where('surveyId').equals(surveyId).count();
  document.getElementById('surveyQChip').textContent = `${(survey.questions || []).length} questions`;
  document.getElementById('surveyRChip').textContent = `${responseCount} response${responseCount !== 1 ? 's' : ''}`;

  renderSurveyQuestions(survey);
}

// ============ SWITCH SURVEY TAB ============

function switchSurveyTab(tab) {
  currentSurveyTab = tab;

  document.querySelectorAll('.view-tab[data-survey-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.surveyTab === tab);
  });

  document.getElementById('surveyTabQuestions').classList.toggle('hidden', tab !== 'questions');
  document.getElementById('surveyTabResponses').classList.toggle('hidden', tab !== 'responses');
  document.getElementById('surveyTabShare').classList.toggle('hidden', tab !== 'share');

  if (tab === 'responses') renderResponseAggregation();
}

// ============ RENDER SURVEY QUESTIONS (READ-ONLY) ============

function renderSurveyQuestions(survey) {
  const list = document.getElementById('surveyQuestionsList');
  list.innerHTML = '';
  const questions = survey.questions || [];

  if (questions.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">No questions in this survey.</p>';
    return;
  }

  questions.forEach((q, i) => {
    const typeLabels = { text: '✏️ Short text', mc: '◉ Multiple choice (pick one)', scale: '⬛ Linear scale', checkboxes: '☑ Checkboxes (pick many)' };
    const card = document.createElement('div');
    card.className = 'question-display-card';

    let optionsHtml = '';
    if (q.type === 'mc' || q.type === 'checkboxes') {
      optionsHtml = `<div class="question-options-preview">
        ${(q.options || []).map(o => `<span class="option-pill-preview">${escapeHtml(o)}</span>`).join('')}
      </div>`;
    } else if (q.type === 'scale') {
      optionsHtml = `<div class="question-options-preview">
        <span class="option-pill-preview">Scale: ${q.scaleMin} – ${q.scaleMax}</span>
      </div>`;
    }

    card.innerHTML = `
      <div class="question-display-num">Question ${i + 1}${q.required ? ' · Required' : ''}</div>
      <div class="question-display-label">${escapeHtml(q.label)}</div>
      <div class="question-display-type">${typeLabels[q.type] || q.type}</div>
      ${optionsHtml}
    `;
    list.appendChild(card);
  });
}

// ============ SURVEY BUILDER ============

function openSurveyBuilder() {
  buildingQuestions = [];
  document.getElementById('inputSurveyTitle').value = '';
  document.getElementById('inputSurveyDesc').value  = '';
  renderQuestionBuilderList();
  document.getElementById('surveyBuilderModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('inputSurveyTitle').focus(), 50);
}

function renderQuestionBuilderList() {
  const list     = document.getElementById('questionBuilderList');
  const emptyMsg = document.getElementById('emptyQBuilder');
  list.innerHTML = '';

  if (buildingQuestions.length === 0) { emptyMsg.classList.remove('hidden'); return; }
  emptyMsg.classList.add('hidden');

  buildingQuestions.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'question-builder-card';
    card.dataset.idx = i;

    // Options/scale extra fields
    let extraHtml = '';
    if (q.type === 'mc' || q.type === 'checkboxes') {
      extraHtml = `
        <p class="q-options-label">Options — one per line (or comma-separated)</p>
        <textarea class="q-options-input" rows="3" placeholder="Option A&#10;Option B&#10;Option C">${escapeHtml((q.options || []).join('\n'))}</textarea>
      `;
    } else if (q.type === 'scale') {
      extraHtml = `
        <div class="scale-range-row">
          <label>Min <input type="number" class="q-scale-min" value="${q.scaleMin ?? 1}" min="0" max="10" /></label>
          <label>Max <input type="number" class="q-scale-max" value="${q.scaleMax ?? 5}" min="1" max="10" /></label>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="question-builder-top">
        <span class="q-num-badge">Q${i + 1}</span>
        <select class="q-type-select">
          <option value="text"       ${q.type === 'text'       ? 'selected' : ''}>Short text</option>
          <option value="mc"         ${q.type === 'mc'         ? 'selected' : ''}>Multiple choice (pick one)</option>
          <option value="scale"      ${q.type === 'scale'      ? 'selected' : ''}>Linear scale</option>
          <option value="checkboxes" ${q.type === 'checkboxes' ? 'selected' : ''}>Checkboxes (pick many)</option>
        </select>
        <label class="q-required-wrap">
          <input type="checkbox" class="q-required-cb" ${q.required ? 'checked' : ''} /> Required
        </label>
        <button class="btn-icon btn-danger q-delete-btn" title="Remove question">✕</button>
      </div>
      <input type="text" class="q-label-input" placeholder="Your question…" value="${escapeHtml(q.label || '')}" />
      ${extraHtml}
    `;

    // Sync type change
    card.querySelector('.q-type-select').addEventListener('change', e => {
      buildingQuestions[i].type = e.target.value;
      buildingQuestions[i].options  = [];
      buildingQuestions[i].scaleMin = 1;
      buildingQuestions[i].scaleMax = 5;
      renderQuestionBuilderList();
    });

    // Sync label
    card.querySelector('.q-label-input').addEventListener('input', e => {
      buildingQuestions[i].label = e.target.value;
    });

    // Sync required
    card.querySelector('.q-required-cb').addEventListener('change', e => {
      buildingQuestions[i].required = e.target.checked;
    });

    // Sync options
    const optInput = card.querySelector('.q-options-input');
    if (optInput) {
      optInput.addEventListener('input', e => {
        buildingQuestions[i].options = parseOptions(e.target.value);
      });
    }

    // Sync scale
    const scaleMin = card.querySelector('.q-scale-min');
    const scaleMax = card.querySelector('.q-scale-max');
    if (scaleMin) scaleMin.addEventListener('input', e => { buildingQuestions[i].scaleMin = parseInt(e.target.value) || 1; });
    if (scaleMax) scaleMax.addEventListener('input', e => { buildingQuestions[i].scaleMax = parseInt(e.target.value) || 5; });

    // Delete
    card.querySelector('.q-delete-btn').addEventListener('click', () => {
      buildingQuestions.splice(i, 1);
      renderQuestionBuilderList();
    });

    list.appendChild(card);
  });
}

function addQuestion() {
  buildingQuestions.push({ id: genId(), type: 'text', label: '', options: [], scaleMin: 1, scaleMax: 5, required: false });
  renderQuestionBuilderList();
  // Scroll to bottom of builder body
  const body = document.querySelector('.builder-body');
  setTimeout(() => body.scrollTop = body.scrollHeight, 50);
}

async function saveSurvey() {
  const title = document.getElementById('inputSurveyTitle').value.trim();
  if (!title) { document.getElementById('inputSurveyTitle').focus(); return; }
  if (buildingQuestions.length === 0) { alert('Add at least one question to the survey.'); return; }

  // Validate labels
  for (const q of buildingQuestions) {
    if (!q.label.trim()) { alert('Please fill in all question labels before saving.'); return; }
  }

  const desc = document.getElementById('inputSurveyDesc').value.trim();
  const now  = new Date().toISOString();

  const id = await db.surveys.add({
    projectId: currentProjectId,
    title,
    description: desc,
    questions: buildingQuestions,
    createdAt: now
  });

  await db.projects.update(currentProjectId, { updatedAt: now });
  document.getElementById('surveyBuilderModal').classList.add('hidden');
  buildingQuestions = [];

  await renderStats();
  await renderSurveyList();
  openSurveyDetail(id);
}

function deleteCurrentSurvey() {
  openConfirm('Delete this survey and all its responses? This cannot be undone.', async () => {
    await db.responses.where('surveyId').equals(currentSurveyId).delete();
    await db.surveys.delete(currentSurveyId);
    await db.projects.update(currentProjectId, { updatedAt: new Date().toISOString() });
    currentSurveyId = null;
    await renderStats();
    showView('projectView');
    switchProjectTab('surveys');
    renderSurveyList();
  });
}

// ============ SURVEY EXPORT (standalone HTML) ============

async function exportSurveyHtml() {
  const survey = await db.surveys.get(currentSurveyId);
  if (!survey) return;

  const surveyData = JSON.stringify({
    id:          survey.id,
    title:       survey.title,
    description: survey.description || '',
    questions:   survey.questions   || []
  });

  const html = buildSurveyHtml(surveyData, survey.title);
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `survey-${slugify(survey.title)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// Generate the standalone survey HTML (self-contained, no external deps)
function buildSurveyHtml(surveyDataJson, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f7f5; color: #111110; min-height: 100vh; padding: 40px 20px 80px; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 0 auto; }
    .survey-header { margin-bottom: 36px; }
    .survey-title { font-size: 34px; font-weight: 800; letter-spacing: -1px; line-height: 1.1; margin-bottom: 12px; }
    .survey-desc { font-size: 15px; color: #6b6b67; line-height: 1.6; }
    .question-card { background: #fff; border: 1px solid #e8e8e4; border-radius: 14px; padding: 20px 22px; margin-bottom: 14px; transition: border-color 0.15s; }
    .question-card.error { border-color: #e8c5c2; }
    .q-label { font-size: 15px; font-weight: 600; color: #111110; margin-bottom: 14px; line-height: 1.4; }
    .q-num { font-size: 11px; font-weight: 600; color: #a0a09c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .required-star { color: #c0392b; }
    textarea.text-input { width: 100%; padding: 10px 14px; border: 1px solid #e8e8e4; border-radius: 8px; background: #f7f7f5; font-family: inherit; font-size: 14px; color: #111110; outline: none; resize: vertical; min-height: 80px; transition: border-color 0.15s; }
    textarea.text-input:focus { border-color: #d0d0ca; background: #fff; }
    .option { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border: 1px solid #e8e8e4; border-radius: 9px; margin-bottom: 8px; cursor: pointer; transition: all 0.12s; user-select: none; }
    .option:hover { background: #f7f7f5; }
    .option.selected { border-color: #111110; background: #f0f0ec; }
    .option-indicator { width: 18px; height: 18px; border: 1.5px solid #d0d0ca; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.12s; font-size: 11px; color: #fff; }
    .radio-indicator { border-radius: 50%; }
    .option.selected .option-indicator { background: #111110; border-color: #111110; }
    .radio-indicator::after { content: ''; width: 6px; height: 6px; background: #fff; border-radius: 50%; opacity: 0; transition: opacity 0.12s; }
    .option.selected .radio-indicator::after { opacity: 1; }
    .option-label { font-size: 14px; color: #111110; }
    .scale-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .scale-btn { min-width: 44px; height: 44px; padding: 0 10px; border: 1.5px solid #e8e8e4; border-radius: 9px; background: #f7f7f5; font-size: 15px; font-weight: 500; color: #111110; cursor: pointer; transition: all 0.12s; font-family: inherit; }
    .scale-btn:hover { border-color: #d0d0ca; background: #f0f0ec; }
    .scale-btn.selected { background: #111110; border-color: #111110; color: #fff; }
    .scale-labels { display: flex; justify-content: space-between; font-size: 11px; color: #a0a09c; padding: 0 2px; }
    .error-msg { font-size: 12px; color: #c0392b; margin-top: 8px; display: none; }
    .submit-bar { margin-top: 32px; }
    .btn-submit { width: 100%; padding: 15px; background: #111110; color: #fff; border: none; border-radius: 10px; font-family: inherit; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    .btn-submit:hover { background: #333330; }
    .success-screen { text-align: center; padding: 80px 20px; }
    .success-icon { font-size: 56px; margin-bottom: 20px; }
    .success-title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 12px; }
    .success-msg { font-size: 15px; color: #6b6b67; line-height: 1.7; max-width: 400px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="container" id="app"></div>
  <script>
    const SURVEY = ${surveyDataJson};
    const answers = {};

    function esc(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function render() {
      let html = '<div class="survey-header"><h1 class="survey-title">' + esc(SURVEY.title) + '</h1>';
      if (SURVEY.description) html += '<p class="survey-desc">' + esc(SURVEY.description) + '</p>';
      html += '</div>';

      SURVEY.questions.forEach(function(q, i) {
        html += '<div class="question-card" data-qid="' + q.id + '">';
        html += '<div class="q-num">Question ' + (i+1) + (q.required ? ' <span class="required-star">*</span>' : '') + '</div>';
        html += '<div class="q-label">' + esc(q.label) + '</div>';

        if (q.type === 'text') {
          html += '<textarea class="text-input" data-qid="' + q.id + '" placeholder="Your answer…"></textarea>';
        } else if (q.type === 'mc') {
          (q.options||[]).forEach(function(opt) {
            html += '<div class="option" data-qid="' + q.id + '" data-val="' + esc(opt) + '" data-type="mc"><span class="option-indicator radio-indicator"></span><span class="option-label">' + esc(opt) + '</span></div>';
          });
        } else if (q.type === 'checkboxes') {
          (q.options||[]).forEach(function(opt) {
            html += '<div class="option" data-qid="' + q.id + '" data-val="' + esc(opt) + '" data-type="cb"><span class="option-indicator">✓</span><span class="option-label">' + esc(opt) + '</span></div>';
          });
        } else if (q.type === 'scale') {
          var min = q.scaleMin||1, max = q.scaleMax||5;
          html += '<div class="scale-row">';
          for (var n = min; n <= max; n++) {
            html += '<button class="scale-btn" data-qid="' + q.id + '" data-val="' + n + '">' + n + '</button>';
          }
          html += '</div><div class="scale-labels"><span>' + min + ' — Low</span><span>High — ' + max + '</span></div>';
        }

        html += '<div class="error-msg" id="err-' + q.id + '">This question is required.</div>';
        html += '</div>';
      });

      html += '<div class="submit-bar"><button class="btn-submit" id="btnSubmit">Submit Response</button></div>';
      document.getElementById('app').innerHTML = html;
      wire();
    }

    function wire() {
      document.querySelectorAll('.text-input').forEach(function(el) {
        el.addEventListener('input', function() { answers[el.dataset.qid] = el.value; });
      });
      document.querySelectorAll('.option[data-type="mc"]').forEach(function(el) {
        el.addEventListener('click', function() {
          var qid = el.dataset.qid;
          document.querySelectorAll('.option[data-qid="' + qid + '"]').forEach(function(o) { o.classList.remove('selected'); });
          el.classList.add('selected');
          answers[qid] = el.dataset.val;
        });
      });
      document.querySelectorAll('.option[data-type="cb"]').forEach(function(el) {
        el.addEventListener('click', function() {
          var qid = el.dataset.qid;
          el.classList.toggle('selected');
          answers[qid] = Array.from(document.querySelectorAll('.option[data-qid="' + qid + '"].selected')).map(function(o){ return o.dataset.val; });
        });
      });
      document.querySelectorAll('.scale-btn').forEach(function(el) {
        el.addEventListener('click', function() {
          var qid = el.dataset.qid;
          document.querySelectorAll('.scale-btn[data-qid="' + qid + '"]').forEach(function(b){ b.classList.remove('selected'); });
          el.classList.add('selected');
          answers[qid] = parseInt(el.dataset.val);
        });
      });
      document.getElementById('btnSubmit').addEventListener('click', submit);
    }

    function submit() {
      var valid = true;
      document.querySelectorAll('.error-msg').forEach(function(el){ el.style.display='none'; });
      document.querySelectorAll('.question-card').forEach(function(el){ el.classList.remove('error'); });

      SURVEY.questions.forEach(function(q) {
        if (!q.required) return;
        var ans = answers[q.id];
        var missing = !ans || (Array.isArray(ans) && ans.length === 0) || (typeof ans === 'string' && !ans.trim());
        if (missing) {
          valid = false;
          var errEl = document.getElementById('err-' + q.id);
          if (errEl) errEl.style.display = 'block';
          var card = document.querySelector('.question-card[data-qid="' + q.id + '"]');
          if (card) card.classList.add('error');
        }
      });

      if (!valid) { document.querySelector('.question-card.error').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

      var response = {
        surveyId: SURVEY.id,
        surveyTitle: SURVEY.title,
        submittedAt: new Date().toISOString(),
        answers: SURVEY.questions.map(function(q) {
          return { questionId: q.id, label: q.label, type: q.type, answer: answers[q.id] !== undefined ? answers[q.id] : null };
        })
      };

      var blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'response-' + new Date().toISOString().slice(0,10) + '.json'; a.click();
      URL.revokeObjectURL(url);

      document.getElementById('app').innerHTML = '<div class="success-screen"><div class="success-icon">✅</div><h2 class="success-title">Response saved!</h2><p class="success-msg">Your response has been downloaded as a JSON file.<br><br>Please send it back to the organiser so they can import it into their Impact Journal.</p></div>';
    }

    render();
  </script>
</body>
</html>`;
}

// ============ IMPORT RESPONSE ============

async function importResponse(file) {
  let payload;
  try { payload = JSON.parse(await file.text()); }
  catch { alert('Invalid JSON file.'); return; }

  if (!payload.surveyId || !payload.answers) { alert('This does not look like a survey response file.'); return; }

  // Allow importing to current survey or auto-match by surveyId
  const targetId = payload.surveyId === currentSurveyId
    ? currentSurveyId
    : currentSurveyId; // always import to currently open survey (allows cross-ID import)

  await db.responses.add({
    surveyId:    targetId,
    answers:     payload.answers,
    submittedAt: payload.submittedAt || new Date().toISOString()
  });

  // Update chip counts
  const survey        = await db.surveys.get(currentSurveyId);
  const responseCount = await db.responses.where('surveyId').equals(currentSurveyId).count();
  document.getElementById('surveyRChip').textContent = `${responseCount} response${responseCount !== 1 ? 's' : ''}`;

  await renderResponseAggregation();
  alert('Response imported successfully!');
}

// ============ RENDER RESPONSE AGGREGATION ============

async function renderResponseAggregation() {
  const survey    = await db.surveys.get(currentSurveyId);
  const responses = await db.responses.where('surveyId').equals(currentSurveyId).toArray();
  const container = document.getElementById('responsesAggregation');
  const emptyMsg  = document.getElementById('emptyResponses');

  container.innerHTML = '';

  if (responses.length === 0) { emptyMsg.classList.remove('hidden'); return; }
  emptyMsg.classList.add('hidden');

  const questions = survey.questions || [];
  const total     = responses.length;

  // Summary header
  const header = document.createElement('div');
  header.style.cssText = 'font-size:13px;color:var(--text-muted);margin-bottom:20px;';
  header.textContent   = `${total} response${total !== 1 ? 's' : ''} collected`;
  container.appendChild(header);

  questions.forEach(q => {
    const block = document.createElement('div');
    block.className = 'response-question-block';

    const allAnswers = responses.map(r => {
      const a = (r.answers || []).find(x => x.questionId === q.id);
      return a ? a.answer : null;
    }).filter(a => a !== null && a !== undefined && a !== '');

    let contentHtml = '';

    if (q.type === 'text') {
      const textAnswers = allAnswers.filter(a => typeof a === 'string' && a.trim());
      contentHtml = textAnswers.length
        ? textAnswers.map(a => `<div class="response-text-answer">${escapeHtml(a)}</div>`).join('')
        : '<p style="color:var(--text-muted);font-size:13px;">No answers yet.</p>';

    } else if (q.type === 'mc') {
      const counts = {};
      (q.options || []).forEach(o => { counts[o] = 0; });
      allAnswers.forEach(a => { if (counts[a] !== undefined) counts[a]++; });
      contentHtml = (q.options || []).map(opt => {
        const count = counts[opt] || 0;
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
        return `<div class="response-bar-row">
          <span class="response-bar-label">${escapeHtml(opt)}</span>
          <div class="response-bar-track"><div class="response-bar-fill" style="width:${pct}%"></div></div>
          <span class="response-bar-pct">${pct}% (${count})</span>
        </div>`;
      }).join('');

    } else if (q.type === 'checkboxes') {
      const counts = {};
      (q.options || []).forEach(o => { counts[o] = 0; });
      allAnswers.forEach(a => {
        if (Array.isArray(a)) a.forEach(opt => { if (counts[opt] !== undefined) counts[opt]++; });
      });
      const respondents = allAnswers.filter(a => Array.isArray(a)).length || 1;
      contentHtml = (q.options || []).map(opt => {
        const count = counts[opt] || 0;
        const pct   = Math.round((count / respondents) * 100);
        return `<div class="response-bar-row">
          <span class="response-bar-label">${escapeHtml(opt)}</span>
          <div class="response-bar-track"><div class="response-bar-fill" style="width:${pct}%"></div></div>
          <span class="response-bar-pct">${pct}% (${count})</span>
        </div>`;
      }).join('');

    } else if (q.type === 'scale') {
      const nums = allAnswers.filter(a => typeof a === 'number');
      if (nums.length === 0) {
        contentHtml = '<p style="color:var(--text-muted);font-size:13px;">No answers yet.</p>';
      } else {
        const avg = (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1);
        // Distribution bars
        const counts = {};
        for (let n = (q.scaleMin||1); n <= (q.scaleMax||5); n++) counts[n] = 0;
        nums.forEach(n => { if (counts[n] !== undefined) counts[n]++; });
        const distHtml = Object.keys(counts).map(n => {
          const pct = Math.round((counts[n] / nums.length) * 100);
          return `<div class="response-bar-row">
            <span class="response-bar-label">${n}</span>
            <div class="response-bar-track"><div class="response-bar-fill" style="width:${pct}%"></div></div>
            <span class="response-bar-pct">${counts[n]}</span>
          </div>`;
        }).join('');
        contentHtml = `
          <div class="response-scale-big">${avg}</div>
          <div class="response-scale-sub">avg out of ${q.scaleMax || 5} · ${nums.length} answer${nums.length !== 1 ? 's' : ''}</div>
          ${distHtml}
        `;
      }
    }

    block.innerHTML = `
      <div class="response-q-label">${escapeHtml(q.label)}</div>
      <span class="response-count-note">${allAnswers.length} of ${total} answered</span>
      ${contentHtml}
    `;
    container.appendChild(block);
  });
}

// ============ QR CODE GENERATION ============

function generateQr() {
  const url     = document.getElementById('qrUrlInput').value.trim();
  if (!url) { document.getElementById('qrUrlInput').focus(); return; }

  const display = document.getElementById('qrDisplay');
  display.innerHTML = '';

  const wrap    = document.createElement('div');
  wrap.className = 'qr-canvas-wrap';
  display.appendChild(wrap);

  new QRCode(wrap, { text: url, width: 200, height: 200, colorDark: '#111110', colorLight: '#ffffff' });

  // URL label
  const label = document.createElement('p');
  label.className = 'qr-url-display';
  label.textContent = url;
  display.appendChild(label);

  // Download button (works after QR renders)
  const dlBtn = document.createElement('button');
  dlBtn.className   = 'btn-qr-download';
  dlBtn.textContent = '↓ Download QR as PNG';
  dlBtn.addEventListener('click', () => {
    setTimeout(() => {
      const canvas = wrap.querySelector('canvas');
      if (!canvas) { alert('QR not ready yet, try again.'); return; }
      const a   = document.createElement('a');
      a.href     = canvas.toDataURL('image/png');
      a.download = 'survey-qr.png';
      a.click();
    }, 100);
  });
  display.appendChild(dlBtn);
}

// ============ CONFIRM MODAL ============

function openConfirm(message, onConfirm) {
  document.getElementById('confirmMessage').textContent = message;
  pendingDeleteFn = onConfirm;
  document.getElementById('confirmModal').classList.remove('hidden');
}

// ============ EXPORT / IMPORT (journal-level) ============

// (defined above: exportData, importData)

// ============ EVENT LISTENERS ============

function attachEventListeners() {
  setupFileDrop();

  // New project
  document.getElementById('btnNewProject').addEventListener('click', openNewProject);
  document.getElementById('btnNewProjectEmpty').addEventListener('click', openNewProject);

  // Project modal
  document.getElementById('btnSaveProject').addEventListener('click', saveProject);
  document.getElementById('btnCancelProject').addEventListener('click', () => document.getElementById('projectModal').classList.add('hidden'));
  document.getElementById('inputProjectName').addEventListener('keydown', e => { if (e.key === 'Enter') saveProject(); });

  // Edit/delete project
  document.getElementById('btnEditProject').addEventListener('click', openEditProject);
  document.getElementById('btnDeleteProject').addEventListener('click', deleteCurrentProject);

  // Project tabs
  document.getElementById('projectView').addEventListener('click', e => {
    const tab = e.target.closest('.view-tab[data-view]');
    if (tab) switchProjectTab(tab.dataset.view);
  });

  // New survey
  document.getElementById('btnNewSurvey').addEventListener('click', openSurveyBuilder);

  // Survey builder
  document.getElementById('btnAddQuestion').addEventListener('click', addQuestion);
  document.getElementById('btnSaveSurvey').addEventListener('click', saveSurvey);
  document.getElementById('btnCancelSurveyBuilder').addEventListener('click', () => {
    document.getElementById('surveyBuilderModal').classList.add('hidden');
    buildingQuestions = [];
  });
  document.getElementById('btnCloseSurveyBuilder').addEventListener('click', () => {
    document.getElementById('surveyBuilderModal').classList.add('hidden');
    buildingQuestions = [];
  });

  // Back to project from survey
  document.getElementById('btnBackToProject').addEventListener('click', () => {
    currentSurveyId = null;
    showView('projectView');
    switchProjectTab('surveys');
  });

  // Survey detail tabs
  document.getElementById('surveyDetailView').addEventListener('click', e => {
    const tab = e.target.closest('.view-tab[data-survey-tab]');
    if (tab) switchSurveyTab(tab.dataset.surveyTab);
  });

  // Delete survey
  document.getElementById('btnDeleteSurvey').addEventListener('click', deleteCurrentSurvey);

  // Export survey HTML
  document.getElementById('btnExportSurveyHtml').addEventListener('click', exportSurveyHtml);

  // Import response
  document.getElementById('btnImportResponse').addEventListener('click', () => document.getElementById('responseImportInput').click());
  document.getElementById('responseImportInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importResponse(file);
    e.target.value = '';
  });

  // QR code
  document.getElementById('btnGenerateQr').addEventListener('click', generateQr);
  document.getElementById('qrUrlInput').addEventListener('keydown', e => { if (e.key === 'Enter') generateQr(); });

  // Add entry
  document.getElementById('btnAddEntry').addEventListener('click', openNewEntry);

  // Entry modal
  document.getElementById('btnSaveEntry').addEventListener('click', saveEntry);
  document.getElementById('btnCancelEntry').addEventListener('click', () => {
    document.getElementById('entryModal').classList.add('hidden');
    pendingFiles   = [];
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

  // Journal export / import
  document.getElementById('btnExport').addEventListener('click', exportData);
  document.getElementById('btnImport').addEventListener('click', () => document.getElementById('importInput').click());
  document.getElementById('importInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
  });

  // Escape key closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
  });
}

// ============ HELPERS ============

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

function genId() {
  return 'q_' + Math.random().toString(36).slice(2, 10);
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseOptions(raw) {
  // Support both newline and comma-separated
  const byLine = raw.split('\n').map(s => s.trim()).filter(Boolean);
  if (byLine.length > 1) return byLine;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}