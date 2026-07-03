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
  const seededDemo = await autoSeedDemoIfEmpty();
  await renderProjectList();
  attachEventListeners();
  if (seededDemo) showDemoBanner();
});

// ============ SHOW / HIDE VIEWS ============

function showView(viewId) {
  ['emptyState', 'aboutView', 'projectNotesView', 'impactSummaryView', 'projectView', 'surveyDetailView'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');
}

function setActiveNav(section) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === section);
  });
}

function clearProjectListActive() {
  document.querySelectorAll('.project-item').forEach(btn => btn.classList.remove('active'));
}

function syncProjectListActive() {
  document.querySelectorAll('.project-item').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.id) === currentProjectId);
  });
}

async function navigateToSection(section) {
  setActiveNav(section);
  currentSurveyId = null;

  if (section === 'about') {
    clearProjectListActive();
    showView('aboutView');
    return;
  }

  if (section === 'notes') {
    clearProjectListActive();
    showView('projectNotesView');
    return;
  }

  if (section === 'summary') {
    if (!currentProjectId) {
      showView('emptyState');
      return;
    }
    syncProjectListActive();
    showView('impactSummaryView');
    await renderImpactSummary();
    return;
  }

  currentProjectTab = section === 'surveys' ? 'surveys' : 'journal';

  if (!currentProjectId) {
    showView('emptyState');
    return;
  }

  syncProjectListActive();
  await renderProjectView(currentProjectTab);
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

  renderProjectView(currentProjectTab || 'journal');
}

// ============ SELECT PROJECT ============

async function selectProject(id) {
  currentProjectId = id;
  currentSurveyId  = null;
  currentProjectTab = 'journal';
  setActiveNav('journal');
  syncProjectListActive();
  renderProjectView('journal');
}

// ============ RENDER PROJECT VIEW ============

async function renderProjectView(tab = currentProjectTab || 'journal') {
  if (!currentProjectId) return;
  const project = await db.projects.get(currentProjectId);
  if (!project) return;

  showView('projectView');

  document.getElementById('projectTitle').textContent = project.name;
  const descEl = document.getElementById('projectDesc');
  descEl.textContent = project.description || '';
  descEl.style.display = project.description ? '' : 'none';

  switchProjectTab(tab);

  await renderStats();
  if (tab === 'journal') await renderEntries();
}

// ============ SWITCH PROJECT TAB ============

function switchProjectTab(tab) {
  currentProjectTab = tab;
  setActiveNav(tab);

  document.querySelectorAll('.view-tab[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === tab);
  });

  document.getElementById('journalSection').classList.toggle('hidden', tab !== 'journal');
  document.getElementById('surveysSection').classList.toggle('hidden', tab !== 'surveys');

  if (tab === 'surveys') renderSurveyList();
}

// ============ DEMO DATA ============

async function loadDemoData() {
  const demoNames = ['Nabolagets kraft', 'Ungdomsworkshop', 'Mentorsamling'];
  const existingCount = await db.projects.count();
  const existingDemoCount = await db.projects.where('name').anyOf(demoNames).count();

  if (existingDemoCount > 0) {
    const duplicateOk = confirm('Demo data already exists. Add another copy anyway?');
    if (!duplicateOk) return;
  } else if (existingCount > 0) {
    const mergeOk = confirm('Add demo projects to your existing local data?');
    if (!mergeOk) return;
  }

  const firstProjectId = await createDemoData();
  localStorage.setItem('visdetDemoSeeded', 'true');
  currentProjectId = firstProjectId;
  currentProjectTab = 'journal';
  setActiveNav('journal');
  await renderProjectList();
  showDemoBanner();
}

async function autoSeedDemoIfEmpty() {
  const existingCount = await db.projects.count();
  if (existingCount > 0 || localStorage.getItem('visdetDemoSeeded')) return false;

  currentProjectId = await createDemoData();
  currentProjectTab = 'journal';
  localStorage.setItem('visdetDemoSeeded', 'true');
  return true;
}

function showDemoBanner() {
  document.getElementById('demoBanner')?.classList.remove('hidden');
}

async function createDemoData() {
  const projectSeeds = getDemoProjectSeeds();

  let firstProjectId = null;

  for (const seed of projectSeeds) {
    const projectId = await db.projects.add({
      name: seed.name,
      description: seed.description,
      createdAt: seed.createdAt,
      updatedAt: seed.updatedAt
    });

    if (!firstProjectId) firstProjectId = projectId;

    for (const entry of seed.entries) {
      const entryId = await db.entries.add({
        projectId,
        text: entry.text,
        count: entry.count,
        tags: entry.tags,
        createdAt: entry.createdAt
      });

      for (const attachment of entry.attachments || []) {
        await db.attachments.add({
          entryId,
          name: attachment.name,
          type: attachment.type,
          size: attachment.size,
          data: demoAttachmentData(attachment.name)
        });
      }
    }

    if (seed.surveys) {
      await addDemoSurveys(projectId, seed.surveys);
    }
  }

  return firstProjectId;
}

function getDemoProjectSeeds() {
  const mainEntries = [
    ['2025-01-16', 32, ['workshop', 'nabolag', 'innsikt'], 'Needs mapping kickoff. Held a local workshop with residents and social entrepreneurs to map current needs and possible collaborations.', ['needs-map-jan-2025.pdf']],
    ['2025-02-04', 28, ['partnerskap', 'nettverk'], 'Partner check-in. Followed up with partner organisation after community meeting and documented possible collaboration points for spring activities.', []],
    ['2025-02-27', 41, ['ungdom', 'workshop', 'læring'], 'Youth ideas workshop. Participants shared challenges around funding, visibility and local recruitment, then sketched small initiative ideas.', ['youth-workshop-notes.pdf']],
    ['2025-03-18', 24, ['mentor', 'oppfølging'], 'Mentor follow-up. Collected feedback after a mentoring session and documented early signs of increased confidence among participants.', []],
    ['2025-04-10', 37, ['sosialt entreprenørskap', 'nettverk'], 'Founder stories evening. Local changemakers shared early project stories and practical questions about testing ideas with residents.', ['founder-stories-agenda.pdf']],
    ['2025-05-06', 29, ['effektmåling', 'rapportering', 'innsikt'], 'Evidence routine test. Documented recurring questions that should inform the next workshop format and future reporting structure.', []],
    ['2025-05-29', 35, ['partnerskap', 'nabolag'], 'Community partner roundtable. Several ideas moved from early exploration to concrete follow-up actions with local partners.', ['partner-roundtable-summary.pdf']],
    ['2025-06-19', 43, ['workshop', 'læring'], 'Summer learning session. Residents and entrepreneurs compared what had been tested so far and identified where peer learning was most useful.', []],
    ['2025-08-21', 26, ['mentor', 'oppfølging', 'sosialt entreprenørskap'], 'Mentor clinic. Three early-stage initiatives received practical feedback on budgets, local recruitment and next-step planning.', ['mentor-clinic-notes.docx']],
    ['2025-09-09', 31, ['ungdom', 'nettverk'], 'Youth network evening. Participants described the meeting point as useful for building confidence, contacts and local belonging.', []],
    ['2025-09-30', 39, ['workshop', 'effektmåling'], 'Impact documentation workshop. The group tested simple ways to describe change without turning every activity into formal reporting.', ['impact-template.csv']],
    ['2025-10-23', 30, ['partnerskap', 'rapportering'], 'Municipality dialogue. Followed up on partner questions about what early evidence would be useful for future funding conversations.', []],
    ['2025-11-14', 34, ['nabolag', 'innsikt'], 'Neighbourhood listening session. Residents mapped barriers to participation and suggested more informal formats for first-time attendees.', ['listening-session-photo-notes.pdf']],
    ['2025-12-03', 27, ['læring', 'oppfølging'], 'End-of-year reflection. Participants reviewed what helped initiatives move forward and where longer follow-up data is still missing.', []],
    ['2026-01-22', 45, ['workshop', 'sosialt entreprenørskap'], 'New year project lab. Social entrepreneurs refined project ideas and identified concrete tests for the next six weeks.', ['project-lab-board.pdf']],
    ['2026-02-12', 33, ['mentor', 'nettverk'], 'Mentor matching session. New mentor connections were formed around communication, local partnerships and measuring early outcomes.', []],
    ['2026-03-05', 38, ['ungdom', 'workshop', 'innsikt'], 'Youth participation follow-up. Young participants reviewed previous ideas and selected two concepts for practical testing.', ['youth-followup-notes.pdf']],
    ['2026-03-26', 25, ['effektmåling', 'rapportering'], 'Evidence review. The team reviewed journal notes and identified activities with strong stories but limited attachments.', []],
    ['2026-04-17', 36, ['partnerskap', 'oppfølging'], 'Partner follow-up sprint. Several partner conversations created new opportunities for collaboration and shared venues.', []],
    ['2026-05-15', 48, ['nabolag', 'nettverk', 'læring'], 'Open neighbourhood gathering. Participants exchanged learning across initiatives and invited new residents into the network.', ['open-gathering-attendance.csv']],
    ['2026-06-11', 23, ['rapportering', 'effektmåling', 'innsikt'], 'Reporting preparation. Summarized the strongest signals of change and listed evidence gaps for the next reporting period.', ['summary-draft-june-2026.pdf']]
  ];

  return [
    {
      name: 'Nabolagets kraft',
      description: 'Recurring local meeting point for social entrepreneurs, residents and partners to build networks, share learning and develop local initiatives. Period: January 2025 – June 2026.',
      createdAt: dateIso('2025-01-01'),
      updatedAt: dateIso('2026-06-24'),
      entries: mainEntries.map(([createdAt, count, tags, text, attachments]) => ({
        createdAt: dateIso(createdAt),
        count,
        tags,
        text,
        attachments: attachments.map(name => sampleAttachment(name))
      })),
      surveys: getDemoSurveySeeds()
    },
    {
      name: 'Ungdomsworkshop',
      description: 'Focused youth workshop series connected to confidence, belonging and practical project ideas.',
      createdAt: dateIso('2025-09-01'),
      updatedAt: dateIso('2026-03-10'),
      entries: [
        { createdAt: dateIso('2025-09-18'), count: 22, tags: ['workshop', 'ungdom', 'læring'], text: 'Youth workshop pilot. Young participants mapped local challenges and sketched small initiatives they could test.', attachments: [] },
        { createdAt: dateIso('2025-11-02'), count: 18, tags: ['ungdom', 'mentor', 'oppfølging'], text: 'Follow-up mentoring. Participants asked for practical help with budgeting, outreach and presenting their ideas.', attachments: [sampleAttachment('youth-mentor-feedback.pdf')] },
        { createdAt: dateIso('2026-02-20'), count: 26, tags: ['ungdom', 'nettverk'], text: 'Peer learning meetup. Participants shared progress and named confidence, contacts and structure as useful outcomes.', attachments: [] }
      ]
    },
    {
      name: 'Mentorsamling',
      description: 'Mentor gatherings and practical follow-up with local changemakers.',
      createdAt: dateIso('2025-05-01'),
      updatedAt: dateIso('2026-04-02'),
      entries: [
        { createdAt: dateIso('2025-05-22'), count: 16, tags: ['mentor', 'partnerskap'], text: 'Mentor gathering. Case discussions focused on role clarity, useful documentation routines and practical next steps.', attachments: [] },
        { createdAt: dateIso('2025-10-09'), count: 21, tags: ['mentor', 'læring', 'oppfølging'], text: 'Mentor reflection session. Mentors shared patterns they observed across local initiatives and where support was still thin.', attachments: [sampleAttachment('mentor-reflection-notes.docx')] },
        { createdAt: dateIso('2026-04-02'), count: 14, tags: ['mentor', 'effektmåling'], text: 'Impact note review. Mentors tested a short reflection template for capturing observed progress after conversations.', attachments: [] }
      ]
    }
  ];
}

function getDemoSurveySeeds() {
  const workshopQuestions = [
    { id: 'workshop_useful', type: 'scale', label: 'How useful was the session?', options: [], scaleMin: 1, scaleMax: 5, required: true },
    { id: 'workshop_valuable', type: 'text', label: 'What was the most valuable part?', options: [], scaleMin: 1, scaleMax: 5, required: false },
    { id: 'workshop_followup', type: 'mc', label: 'Do you want follow-up?', options: ['Yes', 'Maybe', 'No'], scaleMin: 1, scaleMax: 5, required: true },
    { id: 'workshop_topic', type: 'checkboxes', label: 'Which topic should be covered next?', options: ['Funding', 'Visibility', 'Partnerships', 'Measuring impact'], scaleMin: 1, scaleMax: 5, required: false }
  ];

  const partnerQuestions = [
    { id: 'partner_value', type: 'scale', label: 'How valuable was the collaboration conversation?', options: [], scaleMin: 1, scaleMax: 5, required: true },
    { id: 'partner_next', type: 'mc', label: 'Is there a clear next step?', options: ['Yes', 'Partly', 'No'], scaleMin: 1, scaleMax: 5, required: true },
    { id: 'partner_note', type: 'text', label: 'What should be followed up?', options: [], scaleMin: 1, scaleMax: 5, required: false }
  ];

  const mentorQuestions = [
    { id: 'mentor_confidence', type: 'scale', label: 'Did the session increase confidence to move forward?', options: [], scaleMin: 1, scaleMax: 5, required: true },
    { id: 'mentor_support', type: 'checkboxes', label: 'What support is still needed?', options: ['Budgeting', 'Communication', 'Recruitment', 'Impact documentation'], scaleMin: 1, scaleMax: 5, required: false },
    { id: 'mentor_comment', type: 'text', label: 'Any useful observation?', options: [], scaleMin: 1, scaleMax: 5, required: false }
  ];

  return [
    {
      title: 'Workshop feedback',
      description: 'Quick participant feedback after local workshops and learning sessions.',
      createdAt: dateIso('2025-09-30'),
      questions: workshopQuestions,
      responses: [
        response('2025-10-01', workshopQuestions, [5, 'Meeting others with similar ideas made the project feel possible.', 'Yes', ['Funding', 'Partnerships']]),
        response('2025-10-02', workshopQuestions, [4, 'The practical examples helped us understand next steps.', 'Yes', ['Visibility', 'Measuring impact']]),
        response('2025-10-02', workshopQuestions, [5, 'I left with a clearer idea and two people to contact.', 'Yes', ['Partnerships']]),
        response('2025-10-03', workshopQuestions, [4, 'Good energy and useful structure.', 'Maybe', ['Funding']]),
        response('2025-10-03', workshopQuestions, [5, 'The group discussion made local collaboration easier.', 'Yes', ['Visibility', 'Partnerships']]),
        response('2025-10-04', workshopQuestions, [4, 'It helped me explain my idea more clearly.', 'Maybe', ['Measuring impact']])
      ]
    },
    {
      title: 'Partner follow-up pulse',
      description: 'Short survey for partners after collaboration meetings.',
      createdAt: dateIso('2026-04-17'),
      questions: partnerQuestions,
      responses: [
        response('2026-04-18', partnerQuestions, [4, 'Yes', 'Share venue calendar and invite two initiatives to the next meeting.']),
        response('2026-04-19', partnerQuestions, [5, 'Yes', 'Explore a joint workshop around recruitment and local visibility.']),
        response('2026-04-19', partnerQuestions, [4, 'Partly', 'Clarify what data is useful for reporting before summer.']),
        response('2026-04-20', partnerQuestions, [5, 'Yes', 'Connect youth project leads with communications support.']),
        response('2026-04-21', partnerQuestions, [4, 'Partly', 'Follow up on shared space and available mentor capacity.'])
      ]
    },
    {
      title: 'Mentor session pulse',
      description: 'Lightweight reflection after mentor clinics and follow-up sessions.',
      createdAt: dateIso('2026-02-12'),
      questions: mentorQuestions,
      responses: [
        response('2026-02-13', mentorQuestions, [5, ['Budgeting', 'Communication'], 'The participant had a clearer next step after mapping costs.']),
        response('2026-02-14', mentorQuestions, [4, ['Recruitment'], 'Good progress, but needs more help finding local volunteers.']),
        response('2026-02-14', mentorQuestions, [4, ['Impact documentation'], 'Useful to write down small changes directly after sessions.']),
        response('2026-02-15', mentorQuestions, [5, ['Communication', 'Impact documentation'], 'The pitch became more grounded and easier to understand.'])
      ]
    }
  ];
}

async function addDemoSurveys(projectId, surveys) {
  for (const survey of surveys) {
    const surveyId = await db.surveys.add({
      projectId,
      title: survey.title,
      description: survey.description,
      questions: survey.questions,
      createdAt: survey.createdAt
    });

    for (const r of survey.responses || []) {
      await db.responses.add({ surveyId, answers: r.answers, submittedAt: r.submittedAt });
    }
  }
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

// ============ IMPACT SUMMARY ============

async function getImpactSummaryData() {
  const project = await db.projects.get(currentProjectId);
  if (!project) return null;

  const entries = await db.entries.where('projectId').equals(currentProjectId).toArray();
  entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const entryIds = entries.map(e => e.id);
  const attachments = entryIds.length
    ? await db.attachments.where('entryId').anyOf(entryIds).toArray()
    : [];
  const surveys = await db.surveys.where('projectId').equals(currentProjectId).toArray();
  const responsesBySurvey = {};
  let responseCount = 0;

  for (const survey of surveys) {
    const count = await db.responses.where('surveyId').equals(survey.id).count();
    responsesBySurvey[survey.id] = count;
    responseCount += count;
  }

  const totalPeople = entries.reduce((sum, e) => sum + (parseInt(e.count) || 0), 0);
  const tagCounts = {};
  entries.forEach(entry => (entry.tags || []).forEach(tag => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }));

  const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No tags yet';
  const period = getDateRange(entries);

  return { project, entries, attachments, surveys, responsesBySurvey, responseCount, totalPeople, tagCounts, topTag, period };
}

async function renderImpactSummary() {
  const data = await getImpactSummaryData();
  if (!data) return;

  const { project, entries, attachments, surveys, responseCount, totalPeople, topTag, period } = data;

  document.getElementById('summaryProjectName').textContent = project.name;
  document.getElementById('summaryPeriod').textContent = period.label;
  document.getElementById('summaryUpdated').textContent = `Last updated ${formatDate(project.updatedAt || project.createdAt)} · Local-first prototype`;

  document.getElementById('summaryMetrics').innerHTML = [
    ['People reached', totalPeople.toLocaleString()],
    ['Journal entries', entries.length],
    ['Surveys', surveys.length],
    ['Attachments', attachments.length],
    ['Top tag', topTag]
  ].map(([label, value], i) => `
    <div class="summary-metric summary-metric-${i + 1}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join('');

  const narrative = buildNarrativeSummary(data);
  document.getElementById('summaryNarrative').innerHTML = narrative.map(p => `<p>${escapeHtml(p)}</p>`).join('');
  renderList('summaryThemes', inferThemes(data));
  renderList('summarySignals', buildSignals(data));
  renderList('summaryGaps', buildEvidenceGaps(data));
  renderList('summaryNextSteps', buildNextSteps(data));
}

function buildNarrativeSummary(data) {
  const { project, entries, surveys, responseCount, totalPeople, period, tagCounts } = data;
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([tag]) => tag);
  const activityTypes = topTags.length ? topTags.join(', ') : 'documented local activities';

  return [
    `Between ${period.plain}, ${project.name} documented ${entries.length} activities and reached ${totalPeople.toLocaleString()} people through ${activityTypes}. The journal entries show recurring work around local network building, mentorship, learning and early-stage social entrepreneurship.`,
    `${surveys.length} survey${surveys.length !== 1 ? 's' : ''} and ${responseCount} imported response${responseCount !== 1 ? 's' : ''} support the reporting workflow. The data is still local and draft-level, but it is structured enough to prepare an impact summary, identify evidence gaps and create an AI-ready reporting prompt without exposing API keys in the frontend.`
  ];
}

function inferThemes(data) {
  const text = data.entries.map(e => `${e.text} ${(e.tags || []).join(' ')}`).join(' ').toLowerCase();
  const candidates = [
    ['Local network building', ['nabolag', 'nettverk', 'partnerskap', 'collaboration']],
    ['Youth participation', ['ungdom', 'young', 'youth']],
    ['Mentorship and follow-up', ['mentor', 'oppfølging', 'follow-up']],
    ['Community learning', ['læring', 'workshop', 'innsikt', 'learning']],
    ['Early impact documentation', ['effektmåling', 'rapportering', 'evidence', 'impact']],
    ['Social entrepreneurship', ['sosialt entreprenørskap', 'entrepreneur']]
  ];

  const themes = candidates
    .filter(([, words]) => words.some(word => text.includes(word)))
    .map(([label]) => label);

  return themes.length ? themes.slice(0, 5) : ['Structured activity documentation', 'Local learning and follow-up'];
}

function buildSignals(data) {
  const signals = [
    'Participants repeatedly described the meeting point as useful for building confidence, contacts and local belonging.',
    'Several local ideas moved from informal discussion to concrete follow-up actions with mentors or partners.',
    'Partner conversations created new opportunities for collaboration, shared venues and practical support.',
    'Journal notes show recurring learning around funding, visibility, recruitment and impact documentation.'
  ];

  if (data.responseCount > 0) {
    signals.push(`${data.responseCount} imported survey responses add lightweight participant and partner feedback to the journal evidence.`);
  }

  return signals.slice(0, 5);
}

function buildEvidenceGaps(data) {
  const gaps = [
    'More structured participant feedback is needed across all recurring activity formats.',
    'Long-term outcomes after 3–6 months are not yet consistently documented.',
    'Some activities have limited evidence attachments or follow-up notes.'
  ];

  if (data.responseCount < data.entries.length) {
    gaps.push('Survey response coverage is useful but still incomplete compared with the number of logged activities.');
  }

  return gaps;
}

function buildNextSteps(data) {
  const steps = [
    'Add follow-up survey responses after key workshops and mentoring sessions.',
    'Attach photos, notes or partner summaries from high-value activities.',
    'Export the markdown summary for reporting or funding conversations.',
    'Revisit participant outcomes after 3–6 months.',
    'Add partner follow-up notes where collaboration opportunities were identified.'
  ];

  return data.attachments.length ? steps : ['Attach evidence from the strongest journal entries.', ...steps.slice(0, 4)];
}

function renderList(id, items) {
  document.getElementById(id).innerHTML = items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

async function copyMarkdownSummary() {
  const data = await getImpactSummaryData();
  if (!data) return;
  await copyText(buildMarkdownSummary(data), document.getElementById('btnCopyMarkdown'));
}

async function copyAiPrompt() {
  const data = await getImpactSummaryData();
  if (!data) return;
  await copyText(buildAiPrompt(data), document.getElementById('btnCopyAiPrompt'));
}

function buildMarkdownSummary(data) {
  const { project, entries, attachments, surveys, responseCount, totalPeople, topTag, period } = data;
  const narrative = buildNarrativeSummary(data);

  return `# Impact Summary Draft: ${project.name}

**Reporting period:** ${period.label}
**People reached:** ${totalPeople.toLocaleString()}
**Journal entries:** ${entries.length}
**Surveys:** ${surveys.length}
**Survey responses:** ${responseCount}
**Attachments:** ${attachments.length}
**Top tag:** ${topTag}

## Narrative Summary

${narrative.join('\n\n')}

## Key Themes
${inferThemes(data).map(item => `- ${item}`).join('\n')}

## Signals Of Change
${buildSignals(data).map(item => `- ${item}`).join('\n')}

## Evidence Gaps
${buildEvidenceGaps(data).map(item => `- ${item}`).join('\n')}

## Recommended Next Steps
${buildNextSteps(data).map(item => `- ${item}`).join('\n')}
`;
}

function buildAiPrompt(data) {
  const { project, entries, attachments, surveys, responseCount, totalPeople, tagCounts, period } = data;
  const recentEntries = entries.slice(-8).map(e => `- ${formatDate(e.createdAt)}: ${e.text} (${e.count || 0} people; tags: ${(e.tags || []).join(', ') || 'none'})`).join('\n');
  const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => `${tag} (${count})`).join(', ');

  return `You are helping prepare an impact report summary from local project documentation.

Project title: ${project.name}
Description: ${project.description || 'No description provided.'}
Date range: ${period.label}

Metrics:
- People reached: ${totalPeople.toLocaleString()}
- Journal entries: ${entries.length}
- Attachments: ${attachments.length}
- Surveys: ${surveys.length}
- Imported survey responses: ${responseCount}
- Tags: ${tags || 'No tags yet'}

Recent activity notes:
${recentEntries || '- No entries yet.'}

Survey notes:
${surveys.map(s => `- ${s.title}: ${(s.questions || []).length} questions`).join('\n') || '- No surveys yet.'}

Instruction:
Write a polished impact report summary in a professional but grounded tone. Be honest about evidence gaps and avoid overstating outcomes.`;
}

async function copyText(text, button) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    flashButton(button, 'Copied');
  } catch {
    alert('Copy failed. You can still select and copy the generated text manually from the page.');
  }
}

function flashButton(button, text) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => button.textContent = original, 1400);
}

function getDateRange(entries) {
  if (!entries.length) return { label: 'No entries yet', plain: 'the selected period' };
  const first = entries[0].createdAt;
  const last = entries[entries.length - 1].createdAt;
  return {
    label: `${formatMonthYear(first)} – ${formatMonthYear(last)}`,
    plain: `${formatMonthYear(first)} and ${formatMonthYear(last)}`
  };
}

function formatMonthYear(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
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

  const entryTitle = getEntryTitle(entry.text);
  const entryPreview = getEntryPreview(entry.text, entryTitle);
  const tagsHtml   = (entry.tags || []).map(t => `<span class="entry-tag">${escapeHtml(t)}</span>`).join('');
  const attachHtml = attachments.map(a => `
    <div class="attach-chip" data-attach-id="${a.id}" title="${escapeHtml(a.name)}">
      <span>${fileIcon(a.type)}</span>
      <span>${escapeHtml(a.name)}</span>
    </div>
  `).join('');

  card.innerHTML = `
    <div class="entry-card-top">
      <div class="entry-copy">
        <h3 class="entry-title">${escapeHtml(entryTitle)}</h3>
        <p class="entry-text">${escapeHtml(entryPreview)}</p>
      </div>
      <div class="entry-actions">
        <button class="btn-icon" data-edit="${entry.id}" title="Edit">✎</button>
        <button class="btn-icon btn-danger" data-delete="${entry.id}" title="Delete">✕</button>
      </div>
    </div>
    <div class="entry-meta">
      ${entry.count ? `<span class="entry-count">${parseInt(entry.count).toLocaleString()} people reached</span>` : ''}
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

function getEntryTitle(text) {
  const clean = String(text || '').trim();
  const firstSentence = clean.match(/^(.{12,110}?[.!?])\s/)?.[1];
  if (firstSentence) return firstSentence.replace(/[.!?]$/, '');
  return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean || 'Untitled evidence note';
}

function getEntryPreview(text, title) {
  const clean = String(text || '').trim();
  const withoutTitle = clean.startsWith(title) ? clean.slice(title.length).replace(/^[.!?\s]+/, '') : clean;
  const preview = withoutTitle || clean;
  return preview.length > 220 ? `${preview.slice(0, 217)}...` : preview;
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
      <div class="survey-card-icon">SV</div>
      <div class="survey-card-info">
        <div class="survey-card-label">Feedback collection</div>
        <div class="survey-card-title">${escapeHtml(survey.title)}</div>
        ${survey.description ? `<div class="survey-card-desc">${escapeHtml(survey.description)}</div>` : ''}
        <div class="survey-card-chips">
          <span class="meta-chip">${(survey.questions || []).length} questions</span>
          <span class="meta-chip">${responseCount} response${responseCount !== 1 ? 's' : ''}</span>
          <span class="meta-chip">Updated ${formatDate(survey.updatedAt || survey.createdAt)}</span>
        </div>
      </div>
      <div class="survey-card-arrow" aria-hidden="true"></div>
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
    const typeLabels = { text: 'Short text', mc: 'Multiple choice (pick one)', scale: 'Linear scale', checkboxes: 'Checkboxes (pick many)' };
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
    body { font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f7f5; color: #111110; min-height: 100vh; padding: 40px 20px 80px; font-size: 16px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 0 auto; }
    .survey-header { margin-bottom: 36px; }
    .survey-title { font-size: 32px; font-weight: 700; letter-spacing: 0; line-height: 1.14; margin-bottom: 12px; }
    .survey-desc { font-size: 16px; color: #6b6b67; line-height: 1.65; }
    .question-card { background: #fff; border: 1px solid #e8e8e4; border-radius: 14px; padding: 20px 22px; margin-bottom: 14px; transition: border-color 0.15s; }
    .question-card.error { border-color: #e8c5c2; }
    .q-label { font-size: 16px; font-weight: 600; color: #111110; margin-bottom: 14px; line-height: 1.45; }
    .q-num { font-size: 12px; font-weight: 600; color: #a0a09c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .required-star { color: #c0392b; }
    textarea.text-input { width: 100%; padding: 12px 14px; border: 1px solid #e8e8e4; border-radius: 8px; background: #f7f7f5; font-family: inherit; font-size: 15px; color: #111110; outline: none; resize: vertical; min-height: 96px; transition: border-color 0.15s; }
    textarea.text-input:focus { border-color: #d0d0ca; background: #fff; }
    .option { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border: 1px solid #e8e8e4; border-radius: 9px; margin-bottom: 8px; cursor: pointer; transition: all 0.12s; user-select: none; }
    .option:hover { background: #f7f7f5; }
    .option.selected { border-color: #111110; background: #f0f0ec; }
    .option-indicator { width: 18px; height: 18px; border: 1.5px solid #d0d0ca; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.12s; font-size: 11px; color: #fff; }
    .radio-indicator { border-radius: 50%; }
    .option.selected .option-indicator { background: #111110; border-color: #111110; }
    .radio-indicator::after { content: ''; width: 6px; height: 6px; background: #fff; border-radius: 50%; opacity: 0; transition: opacity 0.12s; }
    .option.selected .radio-indicator::after { opacity: 1; }
    .option-label { font-size: 15px; color: #111110; }
    .scale-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .scale-btn { min-width: 44px; height: 44px; padding: 0 10px; border: 1.5px solid #e8e8e4; border-radius: 9px; background: #f7f7f5; font-size: 16px; font-weight: 500; color: #111110; cursor: pointer; transition: all 0.12s; font-family: inherit; }
    .scale-btn:hover { border-color: #d0d0ca; background: #f0f0ec; }
    .scale-btn.selected { background: #111110; border-color: #111110; color: #fff; }
    .scale-labels { display: flex; justify-content: space-between; font-size: 11px; color: #a0a09c; padding: 0 2px; }
    .error-msg { font-size: 12px; color: #c0392b; margin-top: 8px; display: none; }
    .submit-bar { margin-top: 32px; }
    .btn-submit { width: 100%; padding: 15px; background: #111110; color: #fff; border: none; border-radius: 10px; font-family: inherit; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    .btn-submit:hover { background: #333330; }
    .success-screen { text-align: center; padding: 80px 20px; }
    .success-icon { font-size: 56px; margin-bottom: 20px; }
    .success-title { font-size: 27px; font-weight: 700; letter-spacing: 0; margin-bottom: 12px; }
    .success-msg { font-size: 16px; color: #6b6b67; line-height: 1.7; max-width: 400px; margin: 0 auto; }
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

      document.getElementById('app').innerHTML = '<div class="success-screen"><h2 class="success-title">Response saved</h2><p class="success-msg">Your response has been downloaded as a JSON file.<br><br>Please send it back to the organiser so they can import it into Vis Det.</p></div>';
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
  dlBtn.textContent = 'Download QR as PNG';
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

  // Section navigation
  document.querySelector('.app-nav').addEventListener('click', e => {
    const nav = e.target.closest('.nav-item');
    if (nav) navigateToSection(nav.dataset.nav);
  });

  // New project
  document.getElementById('btnNewProject').addEventListener('click', openNewProject);
  document.getElementById('btnNewProjectEmpty').addEventListener('click', openNewProject);
  document.getElementById('btnLoadDemoEmpty').addEventListener('click', loadDemoData);
  document.getElementById('btnAboutBack').addEventListener('click', () => navigateToSection('journal'));
  document.getElementById('btnDismissDemoBanner').addEventListener('click', () => document.getElementById('demoBanner').classList.add('hidden'));
  document.getElementById('btnCopyMarkdown').addEventListener('click', copyMarkdownSummary);
  document.getElementById('btnCopyAiPrompt').addEventListener('click', copyAiPrompt);

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

function dateIso(date) {
  return new Date(`${date}T12:00:00`).toISOString();
}

function sampleAttachment(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const typeMap = {
    csv: 'text/csv',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf'
  };
  return { name, type: typeMap[ext] || 'text/plain', size: 2048 };
}

function demoAttachmentData(name) {
  return new TextEncoder().encode(`Demo placeholder file for ${name}.`).buffer;
}

function response(submittedAt, questions, answers) {
  return {
    submittedAt: dateIso(submittedAt),
    answers: questions.map((q, i) => ({
      questionId: q.id,
      label: q.label,
      type: q.type,
      answer: answers[i] ?? null
    }))
  };
}

function fileIcon(mimeType) {
  if (!mimeType) return 'FILE';
  if (mimeType.startsWith('image/')) return 'IMG';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return 'CSV';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
  return 'FILE';
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
