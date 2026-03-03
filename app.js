// Journal-only MVP (local-first)
// Stores projects + entries + attachments in IndexedDB via Dexie.

const db = new Dexie("impact_journal_mvp_v1");
db.version(1).stores({
  projects: "++id, name, updatedAt",
  entries: "++id, projectId, createdAt",
  attachments: "++id, entryId"
});

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const nowISO = () => new Date().toISOString();

let activeProjectId = null;
let editingProjectId = null;
let activeFilter = "all"; // all | week | month

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}

function fmtDate(iso){
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function downloadFile(filename, content, mime="application/json"){
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

function setActiveProjectUI(enabled){
  $("#addEntryBtn").disabled = !enabled;
  $("#deleteProjectBtn").disabled = !enabled;
  $("#renameProjectBtn").disabled = !enabled;
}

function setFilter(next){
  activeFilter = next;
  $$(".filters .chip").forEach(b => b.setAttribute("aria-selected", String(b.dataset.filter === next)));
  refreshEntries();
}

function getFilterFromDate(createdAt){
  const ts = new Date(createdAt).getTime();
  const now = Date.now();
  const days = (now - ts) / (1000*60*60*24);
  if (activeFilter === "week") return days <= 7;
  if (activeFilter === "month") return days <= 30;
  return true;
}

// ---------- Projects ----------
async function refreshProjects(){
  const list = $("#projectList");
  list.innerHTML = "";

  const projects = await db.projects.orderBy("updatedAt").reverse().toArray();

  if (projects.length === 0){
    const empty = document.createElement("div");
    empty.className = "muted tiny";
    empty.textContent = "Ingen prosjekter ennå.";
    list.appendChild(empty);
    return;
  }

  for (const p of projects){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "project-btn secondary";
    btn.setAttribute("aria-selected", String(p.id === activeProjectId));
    btn.innerHTML = `<strong>${escapeHtml(p.name)}</strong><br><span class="muted tiny">${escapeHtml(p.description || "")}</span>`;
    btn.onclick = () => openProject(p.id);
    list.appendChild(btn);
  }
}

async function openProject(projectId){
  activeProjectId = projectId;
  const p = await db.projects.get(projectId);

  $("#activeProjectTitle").textContent = p?.name ?? "—";
  $("#activeProjectDesc").textContent = p?.description ?? "—";

  setActiveProjectUI(true);
  await refreshProjects();
  await refreshEntries();
}

function openProjectDialog(mode){
  $("#projectDialogTitle").textContent = mode === "edit" ? "Rediger prosjekt" : "Nytt prosjekt";
  $("#projectDialog").showModal();
  $("#pName").focus();
}

function closeProjectDialog(){
  $("#projectDialog").close();
  $("#projectForm").reset();
  editingProjectId = null;
}

$("#newProjectBtn").addEventListener("click", () => {
  editingProjectId = null;
  $("#projectForm").reset();
  openProjectDialog("new");
});

$("#renameProjectBtn").addEventListener("click", async () => {
  if (!activeProjectId) return;
  const p = await db.projects.get(activeProjectId);
  editingProjectId = activeProjectId;
  $("#pName").value = p?.name ?? "";
  $("#pDesc").value = p?.description ?? "";
  openProjectDialog("edit");
});

$("#closeProjectDialog").addEventListener("click", (e) => { e.preventDefault(); closeProjectDialog(); });
$("#cancelProjectBtn").addEventListener("click", closeProjectDialog);

$("#projectForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = $("#pName").value.trim();
  const description = $("#pDesc").value.trim();

  if (!name) return;

  if (editingProjectId){
    await db.projects.update(editingProjectId, { name, description, updatedAt: nowISO() });
    await refreshProjects();
    await openProject(editingProjectId);
  } else {
    const id = await db.projects.add({ name, description, updatedAt: nowISO() });
    await refreshProjects();
    await openProject(id);
  }

  closeProjectDialog();
});

$("#deleteProjectBtn").addEventListener("click", async () => {
  if (!activeProjectId) return;
  if (!confirm("Slette prosjektet og alle innlegg lokalt?")) return;

  const pid = activeProjectId;

  const entries = await db.entries.where("projectId").equals(pid).toArray();
  const entryIds = entries.map(e => e.id);
  if (entryIds.length){
    await db.attachments.where("entryId").anyOf(entryIds).delete();
  }
  await db.entries.where("projectId").equals(pid).delete();
  await db.projects.delete(pid);

  activeProjectId = null;

  $("#activeProjectTitle").textContent = "Velg et prosjekt";
  $("#activeProjectDesc").textContent = "—";
  $("#entryList").innerHTML = "";
  $("#entryEmpty").hidden = true;

  setActiveProjectUI(false);
  await refreshProjects();
  await refreshStats();
});

// ---------- Entries ----------
function openEntryDialog(){
  if (!activeProjectId) return;
  $("#entryDialog").showModal();
  $("#eText").focus();
}

function closeEntryDialog(){
  $("#entryDialog").close();
  $("#entryForm").reset();
  $("#eCount").value = 0;
}

$("#addEntryBtn").addEventListener("click", openEntryDialog);
$("#closeEntryDialog").addEventListener("click", (e) => { e.preventDefault(); closeEntryDialog(); });
$("#cancelEntryBtn").addEventListener("click", closeEntryDialog);

$("#entryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeProjectId) return;

  const text = $("#eText").value.trim();
  const count = Number($("#eCount").value || 0);
  const tags = ($("#eTags").value || "")
    .split(",").map(t => t.trim()).filter(Boolean);

  const files = $("#eFiles").files;

  const entryId = await db.entries.add({
    projectId: activeProjectId,
    text,
    count,
    tags,
    createdAt: nowISO()
  });

  if (files && files.length){
    for (const f of files){
      await db.attachments.add({
        entryId,
        name: f.name,
        type: f.type,
        size: f.size,
        data: f // Blob/File
      });
    }
  }

  await db.projects.update(activeProjectId, { updatedAt: nowISO() });

  closeEntryDialog();
  await refreshProjects();
  await refreshEntries();
});

async function refreshEntries(){
  const list = $("#entryList");
  const q = ($("#searchInput").value || "").trim().toLowerCase();

  list.innerHTML = "";

  if (!activeProjectId){
    $("#entryEmpty").hidden = true;
    await refreshStats();
    return;
  }

  let entries = await db.entries.where("projectId").equals(activeProjectId).sortBy("createdAt");
  entries = entries.reverse();

  // filter by time
  entries = entries.filter(e => getFilterFromDate(e.createdAt));

  // search
  if (q){
    entries = entries.filter(e => {
      const inText = String(e.text || "").toLowerCase().includes(q);
      const inTags = Array.isArray(e.tags) && e.tags.join(",").toLowerCase().includes(q);
      return inText || inTags;
    });
  }

  $("#entryEmpty").hidden = entries.length !== 0;

  for (const e of entries){
    const atts = await db.attachments.where("entryId").equals(e.id).toArray();

    const el = document.createElement("div");
    el.className = "entry";

    const tags = Array.isArray(e.tags) ? e.tags : [];
    const tagsHtml = tags.slice(0, 6).map(t => `<span class="badge tag">#${escapeHtml(t)}</span>`).join(" ");

    el.innerHTML = `
      <div class="entry-head">
        <div>
          <strong>${escapeHtml(fmtDate(e.createdAt))}</strong>
          <div class="entry-meta">
            <span class="badge">👥 ${Number(e.count || 0)}</span>
            ${atts.length ? `<span class="badge">📎 ${atts.length}</span>` : ""}
            ${tagsHtml || ""}
          </div>
        </div>
        <button class="secondary" data-del="${e.id}" type="button">Slett</button>
      </div>

      <div style="margin-top:.6rem; white-space:pre-wrap;">${escapeHtml(e.text || "")}</div>

      ${atts.length ? `
        <div class="attach-list">
          ${atts.map(a => `
            <div class="attach-item tiny">
              📎 <a href="#" data-open="${a.id}">${escapeHtml(a.name)}</a>
              <span class="muted">(${Math.round((a.size||0)/1024)} KB)</span>
            </div>
          `).join("")}
        </div>
      ` : ""}
    `;

    // delete entry
    el.querySelector("[data-del]")?.addEventListener("click", async () => {
      if (!confirm("Slette dette innlegget?")) return;
      await db.attachments.where("entryId").equals(e.id).delete();
      await db.entries.delete(e.id);
      await db.projects.update(activeProjectId, { updatedAt: nowISO() });
      await refreshProjects();
      await refreshEntries();
    });

    // open attachment (local blob)
    el.querySelectorAll("[data-open]").forEach(aEl => {
      aEl.addEventListener("click", async (evt) => {
        evt.preventDefault();
        const attId = Number(aEl.getAttribute("data-open"));
        const att = await db.attachments.get(attId);
        if (!att?.data) return;
        const url = URL.createObjectURL(att.data);
        window.open(url, "_blank", "noopener,noreferrer");
        // let browser keep it; revoke later
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      });
    });

    list.appendChild(el);
  }

  await refreshStats();
}

async function refreshStats(){
  if (!activeProjectId){
    $("#statEntries").textContent = "0";
    $("#statPeople").textContent = "0";
    $("#statFiles").textContent = "0";
    return;
  }

  const entries = await db.entries.where("projectId").equals(activeProjectId).toArray();
  const people = entries.reduce((sum, e) => sum + Number(e.count || 0), 0);

  const entryIds = entries.map(e => e.id);
  let filesCount = 0;
  if (entryIds.length){
    filesCount = await db.attachments.where("entryId").anyOf(entryIds).count();
  }

  $("#statEntries").textContent = String(entries.length);
  $("#statPeople").textContent = String(people);
  $("#statFiles").textContent = String(filesCount);
}

// search
$("#searchInput").addEventListener("input", () => refreshEntries());

// filters
$$(".filters .chip").forEach(b => {
  b.addEventListener("click", () => setFilter(b.dataset.filter));
});

// ---------- Export / Import ----------
$("#exportAllBtn").addEventListener("click", async () => {
  const payload = {
    version: 1,
    exportedAt: nowISO(),
    data: {
      projects: await db.projects.toArray(),
      entries: await db.entries.toArray(),
      // keep file export lightweight: metadata only
      attachments: (await db.attachments.toArray()).map(a => ({
        id: a.id, entryId: a.entryId, name: a.name, type: a.type, size: a.size
      }))
    }
  };

  downloadFile(`impact-journal-export-${Date.now()}.json`, JSON.stringify(payload, null, 2));
});

function openImportDialog(){
  $("#importDialog").showModal();
}
function closeImportDialog(){
  $("#importDialog").close();
  $("#importFile").value = "";
}
$("#importOpenBtn").addEventListener("click", openImportDialog);
$("#closeImportDialog").addEventListener("click", (e)=>{ e.preventDefault(); closeImportDialog(); });
$("#cancelImportBtn").addEventListener("click", closeImportDialog);

$("#importBtn").addEventListener("click", async () => {
  const file = $("#importFile").files?.[0];
  if (!file) return alert("Velg en JSON-fil først.");

  let parsed;
  try { parsed = JSON.parse(await file.text()); }
  catch { return alert("Ugyldig JSON."); }

  const d = parsed?.data;
  if (!d) return alert("Fant ikke data i filen.");

  await db.transaction("rw", db.projects, db.entries, db.attachments, async () => {
    if (Array.isArray(d.projects)) await db.projects.bulkPut(d.projects);
    if (Array.isArray(d.entries)) await db.entries.bulkPut(d.entries);
    // metadata only (no blobs)
    if (Array.isArray(d.attachments)) await db.attachments.bulkPut(d.attachments);
  });

  await refreshProjects();
  await refreshEntries();

  alert("Import ferdig ✅ (vedlegg importeres kun som metadata i denne MVP-en)");
  closeImportDialog();
});

// ---------- Init ----------
(async function init(){
  setActiveProjectUI(false);
  renderFirstProjectIfAny();

  async function renderFirstProjectIfAny(){
    await refreshProjects();
    const first = await db.projects.orderBy("updatedAt").reverse().first();
    if (first?.id){
      await openProject(first.id);
    } else {
      await refreshStats();
    }
  }
})();