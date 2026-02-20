// Impact MVP v2 — local-first + QR share via ?s=... (no backend)
// NOTE: New DB name to avoid conflict with old versions
const DB_NAME = "impact_mvp_nu_v2";

const STAGES = [
  { key: "idea", label: "Idé" },
  { key: "plan", label: "Plan" },
  { key: "done", label: "Gjennomført" },
  { key: "measure", label: "Målt" },
  { key: "report", label: "Rapport" },
];

const db = new Dexie(DB_NAME);
db.version(1).stores({
  projects: "++id, name, updatedAt, stage",
  journalEntries: "++id, projectId, createdAt",
  attachments: "++id, journalEntryId",
  surveys: "++id, projectId, createdAt, shareKey",
  questions: "++id, surveyId, order",
  responses: "++id, surveyId, createdAt",
});

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const nowISO = () => new Date().toISOString();

let activeProjectId = null;
let editingProjectId = null;
let activeSurveyId = null;
let draftQuestions = [];
let stageFilter = "all";
let searchQuery = "";

// Shared mode
let sharedResponseJson = "";

// ---------- helpers ----------
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    "\"": "&quot;", "'": "&#039;",
  }[c]));
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function downloadFile(filename, content, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function base64urlEncode(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecode(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  return decodeURIComponent(escape(atob(b64)));
}

function hashString(input) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) + input.charCodeAt(i);
  return "k" + (h >>> 0).toString(36);
}

function buildSurveyKey(payload) {
  const core = {
    t: payload.title,
    q: payload.questions.map(q => ({
      type: q.type, text: q.text,
      min: q.min ?? null, max: q.max ?? null,
      options: q.options ?? null
    }))
  };
  return hashString(JSON.stringify(core));
}

function stageLabel(key) {
  return STAGES.find(s => s.key === key)?.label ?? "Idé";
}

function getSharePayload() {
  const params = new URLSearchParams(location.search);
  const s = params.get("s");
  if (!s) return null;
  try { return JSON.parse(base64urlDecode(s)); }
  catch { return null; }
}

// ---------- shared mode ----------
function showSharedMode(payload) {
  $("#appView").hidden = true;
  $("#sharedView").hidden = false;

  $("#sharedTitle").textContent = payload.title || "Survey";
  const form = $("#sharedForm");
  form.innerHTML = "";

  sharedResponseJson = "";
  $("#sharedCopyBtn").disabled = true;
  $("#sharedDownloadBtn").disabled = true;

  payload.questions.forEach((q, idx) => {
    const wrap = document.createElement("div");
    wrap.style.marginTop = ".9rem";

    const label = document.createElement("label");
    label.textContent = q.text;
    label.htmlFor = `sq_${idx}`;
    wrap.appendChild(label);

    if (q.type === "text") {
      const ta = document.createElement("textarea");
      ta.id = `sq_${idx}`;
      ta.rows = 3;
      ta.required = true;
      wrap.appendChild(ta);
    }

    if (q.type === "rating") {
      const range = document.createElement("input");
      range.type = "range";
      range.min = q.min ?? 1;
      range.max = q.max ?? 5;
      range.value = Math.round((Number(range.min) + Number(range.max)) / 2);
      range.id = `sq_${idx}`;

      const val = document.createElement("div");
      val.className = "muted tiny";
      val.style.marginTop = ".25rem";
      val.textContent = `Verdi: ${range.value}`;
      range.addEventListener("input", () => (val.textContent = `Verdi: ${range.value}`));

      wrap.appendChild(range);
      wrap.appendChild(val);
    }

    if (q.type === "choice") {
      const select = document.createElement("select");
      select.id = `sq_${idx}`;
      select.required = true;

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Velg…";
      placeholder.disabled = true;
      placeholder.selected = true;
      select.appendChild(placeholder);

      (q.options || []).forEach(opt => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });

      wrap.appendChild(select);
    }

    form.appendChild(wrap);
  });

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn-dark";
  submit.style.marginTop = "1rem";
  submit.textContent = "Generer response JSON";
  form.appendChild(submit);

  form.onsubmit = (e) => {
    e.preventDefault();

    const answers = {};
    payload.questions.forEach((_, idx) => {
      answers[idx] = document.getElementById(`sq_${idx}`)?.value ?? null;
    });

    const response = {
      v: 1,
      shareKey: payload.shareKey,
      surveyTitle: payload.title,
      submittedAt: nowISO(),
      answers,
    };

    sharedResponseJson = JSON.stringify(response, null, 2);
    $("#sharedCopyBtn").disabled = false;
    $("#sharedDownloadBtn").disabled = false;
    alert("Response klar ✅ Last ned eller kopier JSON.");
  };

  $("#sharedCopyBtn").onclick = async () => {
    try {
      await navigator.clipboard.writeText(sharedResponseJson);
      alert("Kopiert ✅");
    } catch {
      alert("Kunne ikke kopiere automatisk.");
    }
  };

  $("#sharedDownloadBtn").onclick = () => {
    downloadFile(`survey-response-${Date.now()}.json`, sharedResponseJson);
  };
}

// ---------- app navigation ----------
function updateNavEnabled() {
  const enabled = Boolean(activeProjectId);
  ["overview", "journal", "survey", "export"].forEach(k => {
    const btn = $(`.nav-btn[data-nav="${k}"]`);
    if (btn) btn.disabled = !enabled;
  });
}

function setNav(nav) {
  $$(".nav-btn").forEach(b => b.setAttribute("aria-selected", String(b.dataset.nav === nav)));

  $("#tab-overview").hidden = nav !== "overview";
  $("#tab-journal").hidden = nav !== "journal";
  $("#tab-survey").hidden = nav !== "survey";
  $("#tab-export").hidden = nav !== "export";

  if (nav === "projects") showListView();
  else showDetailView();
}

function showListView() {
  $("#detailView").hidden = true;
  $("#listView").hidden = false;
  $("#stageChips").hidden = false;
  $("#topKicker").textContent = "Mine prosjekter";
  $("#topTitle").textContent = "Oversikt";
  updateNavEnabled();
}

function showDetailView() {
  $("#listView").hidden = true;
  $("#detailView").hidden = false;
  $("#stageChips").hidden = true;
  $("#topKicker").textContent = "Prosjekt";
  $("#topTitle").textContent = "Detaljer";
  updateNavEnabled();
}

// ---------- stage chips ----------
function renderStageChips() {
  const wrap = $("#stageChips");
  wrap.innerHTML = "";

  const makeChip = (label, key) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "secondary chip";
    b.textContent = label;
    b.setAttribute("aria-selected", String(stageFilter === key));
    b.onclick = () => { stageFilter = key; refreshProjects(); };
    return b;
  };

  wrap.appendChild(makeChip("Alle", "all"));
  STAGES.forEach(s => wrap.appendChild(makeChip(s.label, s.key)));
}

// ---------- projects ----------
async function getProjectStats(projectId) {
  const entries = await db.journalEntries.where("projectId").equals(projectId).toArray();
  const people = entries.reduce((sum, e) => sum + Number(e.count || 0), 0);
  const surveys = await db.surveys.where("projectId").equals(projectId).toArray();
  return [people, entries.length, surveys.length];
}

async function refreshProjects() {
  const grid = $("#projectGrid");
  grid.innerHTML = "";

  const projects = await db.projects.orderBy("updatedAt").reverse().toArray();
  const q = searchQuery.trim().toLowerCase();

  const filtered = projects.filter(p => {
    const matchesStage = stageFilter === "all" ? true : (p.stage === stageFilter);
    const matchesSearch = !q ? true : (
      String(p.name || "").toLowerCase().includes(q) ||
      String(p.description || "").toLowerCase().includes(q)
    );
    return matchesStage && matchesSearch;
  });

  $("#emptyHint").hidden = filtered.length !== 0;

  for (const p of filtered) {
    const [people, entryCount, surveyCount] = await getProjectStats(p.id);

    const card = document.createElement("div");
    card.className = "project-card";
    card.role = "button";
    card.tabIndex = 0;
    card.onclick = () => openProject(p.id);

    card.innerHTML = `
      <div class="pc-head">
        <div>
          <h4>${escapeHtml(p.name)}</h4>
          <div class="badge">Stage: ${escapeHtml(stageLabel(p.stage))}</div>
        </div>
        <span class="badge">↗</span>
      </div>
      <div class="pc-desc">${escapeHtml(p.description || "—")}</div>
      <div class="pc-stats">
        <span class="badge">👥 ${people}</span>
        <span class="badge">📝 ${entryCount}</span>
        <span class="badge">🧾 ${surveyCount}</span>
      </div>
      <div class="muted tiny" style="margin-top:.65rem;">
        Sist oppdatert: ${escapeHtml(fmtDate(p.updatedAt))}
      </div>
    `;

    grid.appendChild(card);
  }
}

async function openProject(pid) {
  activeProjectId = pid;
  showDetailView();

  const p = await db.projects.get(pid);
  $("#projectTitle").textContent = p?.name ?? "";
  $("#projectDesc").textContent = p?.description ?? "";

  await renderStageTrack(p?.stage || "idea");
  await refreshOverview();
  await refreshJournal();
  await refreshSurveys();

  setNav("overview");
}

// ---------- stage track ----------
async function renderStageTrack(activeKey) {
  const wrap = $("#stageTrack");
  wrap.innerHTML = "";

  for (const s of STAGES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "secondary stage-btn";
    btn.textContent = s.label;
    btn.setAttribute("aria-selected", String(s.key === activeKey));
    btn.onclick = async () => {
      if (!activeProjectId) return;
      await db.projects.update(activeProjectId, { stage: s.key, updatedAt: nowISO() });
      await renderStageTrack(s.key);
      await refreshProjects();
    };
    wrap.appendChild(btn);
  }
}

// ---------- overview ----------
async function refreshOverview() {
  if (!activeProjectId) return;

  const [people, entryCount, surveyCount] = await getProjectStats(activeProjectId);
  $("#statPeople").textContent = String(people);
  $("#statEntries").textContent = String(entryCount);
  $("#statSurveys").textContent = String(surveyCount);

  const entries = await db.journalEntries.where("projectId").equals(activeProjectId).sortBy("createdAt");
  const surveys = await db.surveys.where("projectId").equals(activeProjectId).toArray();
  const surveyIds = surveys.map(s => s.id);

  let responses = [];
  if (surveyIds.length) responses = await db.responses.where("surveyId").anyOf(surveyIds).sortBy("createdAt");

  const combined = [
    ...entries.map(e => ({ type: "journal", at: e.createdAt, text: e.text, count: e.count })),
    ...responses.map(r => ({ type: "response", at: r.createdAt })),
  ].sort((a,b) => new Date(b.at) - new Date(a.at)).slice(0, 6);

  const list = $("#recentList");
  list.innerHTML = "";

  if (!combined.length) {
    list.innerHTML = `<div class="muted tiny">Ingen aktivitet enda.</div>`;
    return;
  }

  for (const item of combined) {
    const el = document.createElement("div");
    el.className = "entry";

    if (item.type === "journal") {
      el.innerHTML = `
        <div class="entry-header">
          <div>
            <strong>📝 Journal</strong>
            <div class="muted tiny">${escapeHtml(fmtDate(item.at))} • Teller: ${Number(item.count||0)}</div>
          </div>
        </div>
        <div class="tiny" style="margin-top:.5rem; white-space:pre-wrap;">${escapeHtml((item.text||"").slice(0,160))}${(item.text||"").length>160?"…":""}</div>
      `;
    } else {
      el.innerHTML = `
        <div class="entry-header">
          <div>
            <strong>🧾 Survey-svar</strong>
            <div class="muted tiny">${escapeHtml(fmtDate(item.at))}</div>
          </div>
        </div>
      `;
    }

    list.appendChild(el);
  }
}

// ---------- journal ----------
async function refreshJournal() {
  if (!activeProjectId) return;

  const list = $("#journalList");
  list.innerHTML = "";

  const entries = await db.journalEntries.where("projectId").equals(activeProjectId).sortBy("createdAt");
  if (!entries.length) {
    list.innerHTML = `<div class="muted tiny">Ingen journal-innlegg ennå.</div>`;
    return;
  }

  for (const e of entries.reverse()) {
    const el = document.createElement("div");
    el.className = "entry";
    el.innerHTML = `
      <div class="entry-header">
        <div>
          <strong>${escapeHtml(fmtDate(e.createdAt))}</strong>
          <div class="muted tiny">Teller: ${Number(e.count||0)}</div>
        </div>
        <button class="secondary" data-del="${e.id}" type="button">Slett</button>
      </div>
      <div style="margin-top:.6rem; white-space:pre-wrap;">${escapeHtml(e.text||"")}</div>
    `;

    el.querySelector("[data-del]")?.addEventListener("click", async () => {
      if (!confirm("Slette dette innlegget?")) return;
      await db.journalEntries.delete(e.id);
      await db.projects.update(activeProjectId, { updatedAt: nowISO() });
      await refreshJournal();
      await refreshOverview();
      await refreshProjects();
    });

    list.appendChild(el);
  }
}

$("#journalForm")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!activeProjectId) return;

  const text = $("#journalText").value.trim();
  const count = Number($("#journalCount").value || 0);

  await db.journalEntries.add({
    projectId: activeProjectId,
    text,
    count,
    createdAt: nowISO(),
  });

  $("#journalForm").reset();
  $("#journalCount").value = 0;

  await db.projects.update(activeProjectId, { updatedAt: nowISO() });
  await refreshJournal();
  await refreshOverview();
  await refreshProjects();
});

// ---------- survey builder ----------
function renderDraftVisibility() {
  const t = $("#qType").value;
  $("#qChoiceWrap").hidden = t !== "choice";
  $("#qRatingWrap").hidden = t !== "rating";
}

function renderDraftQuestions() {
  const list = $("#questionList");
  list.innerHTML = "";

  if (!draftQuestions.length) {
    list.innerHTML = `<div class="muted tiny">Ingen spørsmål lagt til ennå.</div>`;
    return;
  }

  draftQuestions.forEach((q, idx) => {
    const meta =
      q.type === "choice" ? `Flervalg: ${q.options.join(", ")}`
      : q.type === "rating" ? `Rating: ${q.min}–${q.max}`
      : "Tekstsvar";

    const row = document.createElement("div");
    row.className = "entry";
    row.innerHTML = `
      <div class="entry-header">
        <div>
          <strong>${idx + 1}. ${escapeHtml(q.text)}</strong>
          <div class="muted tiny">${escapeHtml(meta)}</div>
        </div>
        <button class="secondary" data-rm="${idx}" type="button">Fjern</button>
      </div>
    `;

    row.querySelector("[data-rm]")?.addEventListener("click", () => {
      draftQuestions.splice(idx, 1);
      renderDraftQuestions();
    });

    list.appendChild(row);
  });
}

$("#addQuestionBtn")?.addEventListener("click", () => {
  const text = $("#qText").value.trim();
  if (!text) return;

  const type = $("#qType").value;
  const q = { text, type };

  if (type === "choice") {
    const options = ($("#qOptions").value || "").split(",").map(s => s.trim()).filter(Boolean);
    if (options.length < 2) return alert("Legg inn minst 2 alternativer.");
    q.options = options;
  }

  if (type === "rating") {
    const min = Number($("#qMin").value || 1);
    const max = Number($("#qMax").value || 5);
    if (max <= min) return alert("Maks må være større enn min.");
    q.min = min; q.max = max;
  }

  draftQuestions.push(q);
  $("#qText").value = "";
  $("#qOptions").value = "";
  renderDraftQuestions();
});

$("#qType")?.addEventListener("change", renderDraftVisibility);

$("#surveyForm")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!activeProjectId) return;

  const title = $("#surveyTitle").value.trim();
  if (!title) return;
  if (!draftQuestions.length) return alert("Legg til minst ett spørsmål.");

  const payload = { title, questions: draftQuestions };
  const shareKey = buildSurveyKey(payload);

  const surveyId = await db.surveys.add({
    projectId: activeProjectId,
    title,
    shareKey,
    createdAt: nowISO(),
  });

  for (let i = 0; i < draftQuestions.length; i++) {
    const q = draftQuestions[i];
    await db.questions.add({
      surveyId,
      order: i,
      text: q.text,
      type: q.type,
      options: q.options ?? null,
      min: q.min ?? null,
      max: q.max ?? null,
    });
  }

  $("#surveyForm").reset();
  draftQuestions = [];
  renderDraftVisibility();
  renderDraftQuestions();

  await db.projects.update(activeProjectId, { updatedAt: nowISO() });
  await refreshSurveys();
  await refreshOverview();
  await refreshProjects();

  $("#surveyPicker").value = String(surveyId);
  activeSurveyId = surveyId;

  alert("Survey lagret ✅");
});

async function refreshSurveys() {
  if (!activeProjectId) return;

  const picker = $("#surveyPicker");
  picker.innerHTML = "";

  const surveys = await db.surveys.where("projectId").equals(activeProjectId).sortBy("createdAt");
  if (!surveys.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Ingen survey ennå";
    picker.appendChild(opt);
    activeSurveyId = null;
    $("#shareLink").value = "";
    clearQr();
    $("#responseList").innerHTML = `<div class="muted tiny">Ingen svar.</div>`;
    return;
  }

  surveys.forEach(s => {
    const opt = document.createElement("option");
    opt.value = String(s.id);
    opt.textContent = s.title;
    picker.appendChild(opt);
  });

  activeSurveyId = activeSurveyId ?? Number(picker.value);
  picker.value = String(activeSurveyId);
  await refreshResponses();
}

$("#surveyPicker")?.addEventListener("change", async (e) => {
  activeSurveyId = Number(e.target.value) || null;
  $("#shareLink").value = "";
  clearQr();
  await refreshResponses();
});

// ---------- QR share (creates ?s= link and QR) ----------
function clearQr() {
  const canvas = $("#qrCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function createShareLink() {
  if (!activeSurveyId) return alert("Velg en survey først.");

  const survey = await db.surveys.get(activeSurveyId);
  const qs = await db.questions.where("surveyId").equals(activeSurveyId).sortBy("order");

  const payload = {
    v: 1,
    shareKey: survey.shareKey,
    title: survey.title,
    questions: qs.map(q => ({
      type: q.type,
      text: q.text,
      options: q.options ?? null,
      min: q.min ?? null,
      max: q.max ?? null
    }))
  };

  const encoded = base64urlEncode(JSON.stringify(payload));
  const link = `${location.origin}${location.pathname}?s=${encoded}`;

  $("#shareLink").value = link;

  await QRCode.toCanvas($("#qrCanvas"), link, {
    margin: 1,
    width: 220,
    color: { dark: "#0b0b0c", light: "#ffffff" }
  });
}

$("#shareSurveyBtn")?.addEventListener("click", createShareLink);

$("#copyShareLinkBtn")?.addEventListener("click", async () => {
  const v = $("#shareLink").value.trim();
  if (!v) return;
  try { await navigator.clipboard.writeText(v); alert("Link kopiert ✅"); }
  catch { alert("Kunne ikke kopiere automatisk. Kopier manuelt."); }
});

// ---------- import responses ----------
$("#importResponsesBtn")?.addEventListener("click", async () => {
  const files = $("#importResponsesFile").files;
  if (!files || !files.length) return alert("Velg minst én response JSON.");

  let imported = 0, skipped = 0;

  for (const f of files) {
    let parsed;
    try { parsed = JSON.parse(await f.text()); }
    catch { skipped++; continue; }

    const shareKey = parsed?.shareKey;
    const answers = parsed?.answers;
    if (!shareKey || !answers) { skipped++; continue; }

    const localSurvey = await db.surveys.where("shareKey").equals(shareKey).first();
    if (!localSurvey) { skipped++; continue; }

    await db.responses.add({
      surveyId: localSurvey.id,
      createdAt: parsed.submittedAt || nowISO(),
      answers
    });

    imported++;
  }

  await refreshResponses();
  await refreshOverview();
  await refreshProjects();

  alert(`Import ferdig ✅\nImportert: ${imported}\nHoppet over: ${skipped}`);
});

async function refreshResponses() {
  const list = $("#responseList");
  list.innerHTML = "";
  if (!activeSurveyId) {
    list.innerHTML = `<div class="muted tiny">Velg en survey for å se svar.</div>`;
    return;
  }

  const res = await db.responses.where("surveyId").equals(activeSurveyId).sortBy("createdAt");
  if (!res.length) {
    list.innerHTML = `<div class="muted tiny">Ingen svar ennå.</div>`;
    return;
  }

  for (const r of res.reverse()) {
    const el = document.createElement("div");
    el.className = "entry";
    el.innerHTML = `
      <div class="entry-header">
        <div>
          <strong>${escapeHtml(fmtDate(r.createdAt))}</strong>
          <div class="muted tiny">Svar-ID: ${r.id}</div>
        </div>
        <button class="secondary" data-delres="${r.id}" type="button">Slett</button>
      </div>
      <details style="margin-top:.5rem;">
        <summary>Vis svar</summary>
        <pre class="tiny" style="white-space:pre-wrap; margin-top:.5rem;">${escapeHtml(JSON.stringify(r.answers, null, 2))}</pre>
      </details>
    `;

    el.querySelector("[data-delres]")?.addEventListener("click", async () => {
      if (!confirm("Slette dette svaret?")) return;
      await db.responses.delete(r.id);
      await refreshResponses();
      await refreshOverview();
      await refreshProjects();
    });

    list.appendChild(el);
  }
}

// ---------- export/import ----------
async function exportAllJson() {
  const payload = {
    version: 1,
    exportedAt: nowISO(),
    data: {
      projects: await db.projects.toArray(),
      journalEntries: await db.journalEntries.toArray(),
      surveys: await db.surveys.toArray(),
      questions: await db.questions.toArray(),
      responses: await db.responses.toArray(),
    }
  };
  downloadFile(`impact-export-all-${Date.now()}.json`, JSON.stringify(payload, null, 2));
}
$("#exportAllBtn")?.addEventListener("click", exportAllJson);

async function exportProjectJson() {
  if (!activeProjectId) return alert("Velg prosjekt først.");

  const project = await db.projects.get(activeProjectId);
  const journalEntries = await db.journalEntries.where("projectId").equals(activeProjectId).toArray();
  const surveys = await db.surveys.where("projectId").equals(activeProjectId).toArray();
  const surveyIds = surveys.map(s => s.id);
  const questions = surveyIds.length ? await db.questions.where("surveyId").anyOf(surveyIds).toArray() : [];
  const responses = surveyIds.length ? await db.responses.where("surveyId").anyOf(surveyIds).toArray() : [];

  const payload = { version: 1, exportedAt: nowISO(), data: { project, journalEntries, surveys, questions, responses } };
  downloadFile(`impact-project-${activeProjectId}-${Date.now()}.json`, JSON.stringify(payload, null, 2));
}
$("#exportProjectBtn")?.addEventListener("click", exportProjectJson);

function escapeCsv(s) {
  const v = String(s ?? "");
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
async function exportJournalCsv() {
  if (!activeProjectId) return alert("Velg prosjekt først.");

  const entries = await db.journalEntries.where("projectId").equals(activeProjectId).sortBy("createdAt");
  const header = ["createdAt", "count", "text"].join(",");
  const rows = entries.map(e => [
    escapeCsv(e.createdAt),
    String(Number(e.count || 0)),
    escapeCsv((e.text || "").replace(/\r?\n/g, " ")),
  ].join(","));

  downloadFile(`journal-${activeProjectId}-${Date.now()}.csv`, [header, ...rows].join("\n"), "text/csv");
}
$("#exportCsvBtn")?.addEventListener("click", exportJournalCsv);

async function importJsonFromFile(file) {
  if (!file) return alert("Velg en JSON-fil først.");

  let parsed;
  try { parsed = JSON.parse(await file.text()); }
  catch { return alert("Ugyldig JSON."); }

  const d = parsed?.data;
  if (!d) return alert("Fant ikke data i filen.");

  await db.transaction("rw", db.projects, db.journalEntries, db.surveys, db.questions, db.responses, async () => {
    if (d.project) await db.projects.put(d.project);
    if (Array.isArray(d.projects)) await db.projects.bulkPut(d.projects);

    if (Array.isArray(d.journalEntries)) await db.journalEntries.bulkPut(d.journalEntries);
    if (Array.isArray(d.surveys)) await db.surveys.bulkPut(d.surveys);
    if (Array.isArray(d.questions)) await db.questions.bulkPut(d.questions);
    if (Array.isArray(d.responses)) await db.responses.bulkPut(d.responses);
  });

  await refreshProjects();
  alert("Import ferdig ✅");
}

$("#importBtn")?.addEventListener("click", async () => {
  await importJsonFromFile($("#importFile").files?.[0]);
});

$("#importOpenBtn")?.addEventListener("click", () => $("#importDialog").showModal());
$("#closeImportDialog")?.addEventListener("click", (e) => { e.preventDefault(); $("#importDialog").close(); });
$("#cancelImportBtn")?.addEventListener("click", () => $("#importDialog").close());
$("#importBtn2")?.addEventListener("click", async () => {
  await importJsonFromFile($("#importFile2").files?.[0]);
  $("#importDialog").close();
});

// ---------- project dialog ----------
function openProjectDialog(mode) {
  $("#dialogTitle").textContent = mode === "edit" ? "Rediger prosjekt" : "Nytt prosjekt";
  $("#projectDialog").showModal();
  $("#pName").focus();
}
function closeProjectDialog() {
  $("#projectDialog").close();
  $("#projectForm").reset();
  editingProjectId = null;
}

$("#newProjectBtn")?.addEventListener("click", () => {
  editingProjectId = null;
  $("#projectForm").reset();
  openProjectDialog("new");
});
$("#closeDialog")?.addEventListener("click", (e) => { e.preventDefault(); closeProjectDialog(); });
$("#cancelDialogBtn")?.addEventListener("click", closeProjectDialog);

$("#projectForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = $("#pName").value.trim();
  const description = $("#pDesc").value.trim();

  if (editingProjectId) {
    await db.projects.update(editingProjectId, { name, description, updatedAt: nowISO() });
    await refreshProjects();
    await openProject(editingProjectId);
  } else {
    const id = await db.projects.add({ name, description, stage: "idea", updatedAt: nowISO() });
    await refreshProjects();
    await openProject(id);
  }

  closeProjectDialog();
});

$("#editProjectBtn")?.addEventListener("click", async () => {
  if (!activeProjectId) return;
  const p = await db.projects.get(activeProjectId);
  editingProjectId = activeProjectId;
  $("#pName").value = p?.name ?? "";
  $("#pDesc").value = p?.description ?? "";
  openProjectDialog("edit");
});

$("#deleteProjectBtn")?.addEventListener("click", async () => {
  if (!activeProjectId) return;
  if (!confirm("Slette prosjekt og data lokalt?")) return;

  const pid = activeProjectId;

  await db.journalEntries.where("projectId").equals(pid).delete();

  const surveys = await db.surveys.where("projectId").equals(pid).toArray();
  const surveyIds = surveys.map(s => s.id);
  if (surveyIds.length) {
    await db.questions.where("surveyId").anyOf(surveyIds).delete();
    await db.responses.where("surveyId").anyOf(surveyIds).delete();
  }
  await db.surveys.where("projectId").equals(pid).delete();

  await db.projects.delete(pid);

  activeProjectId = null;
  showListView();
  await refreshProjects();
  setNav("projects");
});

$("#backBtn")?.addEventListener("click", () => setNav("projects"));

$("#quickAddEntryBtn")?.addEventListener("click", () => setNav("journal"));
$("#quickAddSurveyBtn")?.addEventListener("click", () => setNav("survey"));

$("#searchInput")?.addEventListener("input", (e) => {
  searchQuery = e.target.value || "";
  refreshProjects();
});

// App nav
$$(".nav-btn").forEach(btn => btn.addEventListener("click", () => setNav(btn.dataset.nav)));

// ---------- init ----------
(async function init() {
  // If opened as shared survey link
  const payload = getSharePayload();
  if (payload?.shareKey && Array.isArray(payload.questions)) {
    showSharedMode(payload);
    return;
  }

  // Normal app mode
  $("#sharedView").hidden = true;
  $("#appView").hidden = false;

  renderStageChips();
  renderDraftVisibility();
  renderDraftQuestions();

  // Ensure defaults
  const all = await db.projects.toArray();
  for (const p of all) {
    if (!p.stage) await db.projects.update(p.id, { stage: "idea" });
    if (!p.updatedAt) await db.projects.update(p.id, { updatedAt: nowISO() });
  }

  await refreshProjects();
  setNav("projects");
  updateNavEnabled();
})();