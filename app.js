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
const LANG_KEY        = 'visdetLanguage';
let currentLanguage   = localStorage.getItem(LANG_KEY) || 'en';

const i18n = {
  en: {
    mainSections: 'Main sections',
    newProject: '+ New Project',
    productStatus: 'Local-first MVP',
    productStatusText: 'Impact documentation workspace',
    navJournal: 'Journal',
    navSurveys: 'Surveys',
    navSummary: 'Impact Summary',
    navAbout: 'About Vis Det',
    navNotes: 'Project Notes',
    projectsLabel: 'Projects',
    import: 'Import',
    export: 'Export',
    prototypeNotice: 'Local-first prototype. Not a production Norge Unlimited system.',
    demoBanner: 'Demo data loaded. This is sample impact documentation for exploring the prototype.',
    dismiss: 'Dismiss',
    dismissNotice: 'Dismiss notice',
    emptyTitle: 'Document what happened.',
    emptyText: 'Capture project notes, people reached, evidence and lightweight survey feedback before it becomes formal reporting.',
    createProject: 'Create Project',
    loadDemoData: 'Load Demo Data',
    resetDemoData: 'Reset demo data',
    aboutEyebrow: 'About Vis Det',
    aboutLede: 'A local-first prototype for structured impact documentation. It helps teams document projects, observations, evidence, people reached and lightweight survey feedback in one place.',
    openJournal: 'Open Journal',
    whyExists: 'Why this exists',
    whyExistsText: "The prototype is inspired by Norge Unlimited's work with local social entrepreneurship, neighbourhood incubators and impact documentation. It explores how early impact data can be captured before it becomes formal reporting.",
    aboutPoint1Kicker: 'Journal evidence',
    aboutPoint1Title: 'Document evidence',
    aboutPoint1Text: 'Log entries with people reached, tags, and optional files so progress can be reviewed later.',
    aboutPoint2Kicker: 'People reached',
    aboutPoint2Title: 'Track reach',
    aboutPoint2Text: 'Keep simple counts close to the qualitative notes that explain what changed.',
    aboutPoint3Kicker: 'Surveys and QR',
    aboutPoint3Title: 'Collect responses',
    aboutPoint3Text: 'Create lightweight surveys, export them as standalone HTML, and import response JSON files.',
    aboutPoint4Kicker: 'Local-first data',
    aboutPoint4Title: 'Stay local',
    aboutPoint4Text: 'Data is stored in this browser with IndexedDB. Export and import are explicit file actions.',
    howItWorks: 'How it works',
    workflow1Title: 'Document activities',
    workflow1Text: 'Write short notes from workshops, meetings and follow-ups.',
    workflow2Title: 'Add evidence and reach',
    workflow2Text: 'Record people reached, tags and optional attachments.',
    workflow3Title: 'Collect feedback',
    workflow3Text: 'Use lightweight surveys and import responses locally.',
    workflow4Title: 'Summarize impact',
    workflow4Text: 'Export data or draft a report-ready summary from local evidence.',
    prototypeDisclaimer: 'Prototype disclaimer',
    prototypeDisclaimerText: 'This is a local-first prototype for exploring impact documentation. It is not an official production system for Norge Unlimited.',
    notesEyebrow: 'Project Notes',
    notesTitle: 'Built as a focused app prototype.',
    notesLede: 'A small, inspectable MVP for recruiters and technical reviewers: plain files, local storage, real import/export flows and no fake service layer.',
    builtBy: 'Built by',
    builtByText: 'Dichino Nguyen as an app development prototype for Norge Unlimited.',
    techStack: 'Tech stack',
    tech1: 'HTML, CSS and vanilla JavaScript',
    tech2: 'Dexie.js with IndexedDB',
    tech3: 'Local JSON import and export',
    prototypeScope: 'Prototype scope',
    scope1: 'Project-based journal entries',
    scope2: 'Tags, attachments and people reached',
    scope3: 'Survey builder, QR sharing flow and response imports',
    currentLimits: 'Current limits',
    limit1: 'Local-only data',
    limit2: 'No authentication, backend or multi-user sync',
    limit3: 'Not a production CRM or reporting system',
    architecture: 'Architecture',
    architectureText: 'Projects, entries, surveys and responses are stored locally in IndexedDB with Dexie.js. Export/import uses JSON. A production version would need backend sync, authentication and role-based access before supporting shared teams.',
    possibleNextSteps: 'Possible next steps',
    possibleNextStepsText: 'Backend sync, user accounts, role-based access, CSV/PDF exports, hosted survey pages, analytics views and admin reporting could be explored after validating the core documentation workflow.',
    summaryEyebrow: 'AI-ready reporting workflow',
    summaryTitle: 'Impact Summary Draft',
    summaryLede: 'Generated from local journal, survey and evidence data. No real AI API is used in this static prototype.',
    selectedProject: 'Selected project',
    noProjectSelected: 'No project selected',
    noReportingPeriod: 'No reporting period yet',
    localFirstDraft: 'Local-first draft',
    narrativeSummary: 'Narrative summary',
    keyThemes: 'Key themes',
    signalsOfChange: 'Signals of change',
    evidenceGaps: 'Evidence gaps',
    recommendedNextSteps: 'Recommended next steps',
    exportActions: 'Export actions',
    exportActionsText: 'Copy a clean markdown draft, or copy a prompt for ChatGPT or another AI tool. The prompt uses only local project data.',
    copyMarkdown: 'Copy Markdown summary',
    copyAiPrompt: 'Copy AI prompt',
    statEntries: 'Entries',
    statPeople: 'People Reached',
    statAttachments: 'Attachments',
    statSurveys: 'Surveys',
    tabJournal: 'Journal',
    tabSurveys: 'Surveys',
    searchEntries: 'Search entries...',
    allTime: 'All time',
    last7: 'Last 7 days',
    last30: 'Last 30 days',
    addEntry: '+ Add Entry',
    noEntries: 'No entries yet — start documenting your impact!',
    noEntriesShort: 'No entries yet',
    surveyHint: 'Build a survey, share it via QR or file, then import the responses here.',
    newSurvey: '+ New Survey',
    noSurveys: 'No surveys yet. Create one to start collecting responses!',
    backToProject: 'Back to project',
    deleteSurvey: 'Delete survey',
    tabQuestions: 'Questions',
    tabResponses: 'Responses',
    tabShare: 'Share & QR',
    responsesHint: 'Import response JSON files after people complete the exported survey.',
    importResponse: 'Import Response JSON',
    noResponses: 'No responses yet. Import a response JSON file to see results here.',
    shareStep1Title: 'Export survey',
    shareStep1Text: 'Download a self-contained HTML file. Respondents open it in any browser, fill it in, and download their answers as a JSON file to send back to you.',
    downloadSurveyHtml: 'Download Survey HTML',
    shareStep2Title: 'Host or share file',
    forQrCode: '(for QR code)',
    shareStep2Text: 'Host the HTML file online when you want a QR code, or share the file directly for small pilots.',
    netlifyNote: 'Drag & drop the HTML file — get a live URL in seconds.',
    shareStep3Title: 'Generate QR code',
    shareStep3Text: 'Paste your hosted URL below to generate a QR code you can print, display at events, or share digitally.',
    generateQr: 'Generate QR',
    modalNewProject: 'New Project',
    modalEditProject: 'Edit Project',
    projectNameLabel: 'Project Name',
    descriptionLabel: 'Description',
    optional: '(optional)',
    projectDescPlaceholder: 'What is this project about?',
    cancel: 'Cancel',
    saveProject: 'Save Project',
    modalNewEntry: 'New Entry',
    modalEditEntry: 'Edit Entry',
    whatHappened: 'What happened?',
    entryTextPlaceholder: 'Describe what took place and the impact you observed...',
    peopleReachedLabel: 'People Reached',
    tagsLabel: 'Tags',
    commaSeparated: '(comma-separated)',
    tagsPlaceholder: 'workshop, youth, online',
    attachmentsLabel: 'Attachments',
    photosDocs: '(photos, docs)',
    dragDropOr: 'Drag & drop or',
    browse: 'browse',
    saveEntry: 'Save Entry',
    modalNewSurvey: 'New Survey',
    close: 'Close',
    surveyTitleLabel: 'Survey Title',
    optionalShown: '(optional — shown to respondents)',
    surveyDescPlaceholder: 'A short intro for your respondents',
    questionsLabel: 'Questions',
    addQuestion: '+ Add Question',
    noBuilderQuestions: 'No questions yet — click "+ Add Question" to start building.',
    saveSurvey: 'Save Survey',
    areYouSure: 'Are you sure?',
    cannotUndo: 'This action cannot be undone.',
    delete: 'Delete',
    feedbackCollection: 'Feedback collection',
    updated: 'Updated {date}',
    questionCount: '{count} questions',
    responseCount: '{count} response{plural}',
    peopleReached: '{count} people reached',
    copied: 'Copied',
    copyFailed: 'Copy failed. You can still select and copy the generated text manually from the page.',
    lastUpdatedLocal: 'Last updated {date} · Local-first prototype',
    noTagsYet: 'No tags yet',
    noQuestionsSurvey: 'No questions in this survey.',
    questionRequired: 'Question {number} · Required',
    questionPlain: 'Question {number}',
    required: 'Required',
    shortText: 'Short text',
    multipleChoice: 'Multiple choice (pick one)',
    linearScale: 'Linear scale',
    checkboxes: 'Checkboxes (pick many)',
    scaleRange: 'Scale: {min} – {max}',
    responsesCollected: '{count} response{plural} collected',
    noAnswersYet: 'No answers yet.',
    avgOutOf: 'avg out of {max} · {count} answer{plural}',
    answeredCount: '{answered} of {total} answered',
    downloadQr: 'Download QR as PNG',
    qrNotReady: 'QR not ready yet, try again.',
    deleteEntryConfirm: 'Delete this entry? This cannot be undone.',
    deleteProjectConfirm: 'Delete this project and all its data? This cannot be undone.',
    deleteSurveyConfirm: 'Delete this survey and all its responses? This cannot be undone.',
    demoExistsConfirm: 'Demo data already exists. Add another copy anyway?',
    mergeDemoConfirm: 'Add demo projects to your existing local data?',
    addQuestionAlert: 'Add at least one question to the survey.',
    fillLabelsAlert: 'Please fill in all question labels before saving.',
    importInvalidJson: 'Invalid JSON file.',
    importUnknownFormat: 'Unrecognized file format.',
    importMergeConfirm: 'Merge {projects} project(s) and {entries} entries into your data?\n\nThis will not overwrite existing data.',
    importComplete: 'Import complete: {projects} project(s) and {entries} entries imported.',
    fileTooLarge: '"{name}" is too large (max 10 MB).',
    untitledEvidenceNote: 'Untitled evidence note',
    selectedPeriod: 'the selected period',
    openSummary: 'Open Summary',
    workspaceKicker: 'Impact workspace',
    projectOverview: 'Project overview',
    topTags: 'Top tags',
    latestSurveyActivity: 'Latest survey activity',
    evidenceReadiness: 'Evidence readiness',
    noSurveyActivity: 'No survey activity yet.',
    evidenceSnapshot: '{attachments} attachments across {entries} evidence notes',
    noTopTags: 'No tags yet',
    resetDemoConfirm: 'Reset local data and load the full Nabolagets kraft demo dataset?',
    demoResetBanner: 'Demo data reset. Nabolagets kraft is ready with rich sample impact documentation.',
    dataModel: 'Data model',
    modelProjects: 'Projects',
    modelEntries: 'Entries',
    modelSurveys: 'Surveys',
    modelResponses: 'Responses',
    modelExport: 'Export / Import',
    modelSummary: 'Impact Summary'
  },
  no: {
    mainSections: 'Hovedseksjoner',
    newProject: '+ Nytt prosjekt',
    productStatus: 'Lokal MVP',
    productStatusText: 'Arbeidsflate for effektdokumentasjon',
    navJournal: 'Journal',
    navSurveys: 'Spørreskjema',
    navSummary: 'Effektsammendrag',
    navAbout: 'Om Vis Det',
    navNotes: 'Prosjektnotater',
    projectsLabel: 'Prosjekter',
    import: 'Importer',
    export: 'Eksporter',
    prototypeNotice: 'Lokal prototype. Ikke et produksjonssystem for Norge Unlimited.',
    demoBanner: 'Demodata er lastet inn. Dette er eksempeldokumentasjon for å utforske prototypen.',
    dismiss: 'Lukk',
    dismissNotice: 'Lukk varsel',
    emptyTitle: 'Dokumenter det som skjedde.',
    emptyText: 'Samle prosjektnotater, personer nådd, evidens og enkle tilbakemeldinger før det blir formell rapportering.',
    createProject: 'Opprett prosjekt',
    loadDemoData: 'Last demodata',
    resetDemoData: 'Reset demodata',
    aboutEyebrow: 'Om Vis Det',
    aboutLede: 'En lokal prototype for strukturert effektdokumentasjon. Den hjelper team med å dokumentere prosjekter, observasjoner, evidens, personer nådd og enkle spørreskjema på ett sted.',
    openJournal: 'Åpne journal',
    whyExists: 'Hvorfor dette finnes',
    whyExistsText: 'Prototypen er inspirert av Norge Unlimited sitt arbeid med lokalt sosialt entreprenørskap, nabolagsinkubatorer og effektdokumentasjon. Den utforsker hvordan tidlige effektdata kan fanges før de blir formell rapportering.',
    aboutPoint1Kicker: 'Journalevidens',
    aboutPoint1Title: 'Dokumenter evidens',
    aboutPoint1Text: 'Loggfør notater med personer nådd, tags og valgfrie filer slik at fremdrift kan vurderes senere.',
    aboutPoint2Kicker: 'Personer nådd',
    aboutPoint2Title: 'Følg rekkevidde',
    aboutPoint2Text: 'Hold enkle tall tett på de kvalitative notatene som forklarer hva som endret seg.',
    aboutPoint3Kicker: 'Skjema og QR',
    aboutPoint3Title: 'Samle svar',
    aboutPoint3Text: 'Lag enkle spørreskjema, eksporter dem som frittstående HTML og importer svar som JSON.',
    aboutPoint4Kicker: 'Lokale data',
    aboutPoint4Title: 'Behold data lokalt',
    aboutPoint4Text: 'Data lagres i denne nettleseren med IndexedDB. Eksport og import er tydelige filhandlinger.',
    howItWorks: 'Slik fungerer det',
    workflow1Title: 'Dokumenter aktiviteter',
    workflow1Text: 'Skriv korte notater fra workshops, møter og oppfølging.',
    workflow2Title: 'Legg til evidens og rekkevidde',
    workflow2Text: 'Registrer personer nådd, tags og valgfrie vedlegg.',
    workflow3Title: 'Samle tilbakemeldinger',
    workflow3Text: 'Bruk enkle spørreskjema og importer svar lokalt.',
    workflow4Title: 'Oppsummer effekt',
    workflow4Text: 'Eksporter data eller lag et rapportklart utkast fra lokal evidens.',
    prototypeDisclaimer: 'Prototypeavklaring',
    prototypeDisclaimerText: 'Dette er en lokal prototype for å utforske effektdokumentasjon. Det er ikke et offisielt produksjonssystem for Norge Unlimited.',
    notesEyebrow: 'Prosjektnotater',
    notesTitle: 'Bygget som en fokusert app-prototype.',
    notesLede: 'En liten, inspiserbar MVP for rekrutterere og tekniske vurderinger: enkle filer, lokal lagring, ekte import/eksport og ingen falsk tjenestelogikk.',
    builtBy: 'Bygget av',
    builtByText: 'Dichino Nguyen som en apputviklingsprototype for Norge Unlimited.',
    techStack: 'Teknologi',
    tech1: 'HTML, CSS og vanilla JavaScript',
    tech2: 'Dexie.js med IndexedDB',
    tech3: 'Lokal JSON-import og -eksport',
    prototypeScope: 'Prototypeomfang',
    scope1: 'Prosjektbaserte journalnotater',
    scope2: 'Tags, vedlegg og personer nådd',
    scope3: 'Skjemabygger, QR-deling og import av svar',
    currentLimits: 'Nåværende begrensninger',
    limit1: 'Kun lokale data',
    limit2: 'Ingen innlogging, backend eller flerbrukersynk',
    limit3: 'Ikke et produksjonsklart CRM- eller rapporteringssystem',
    architecture: 'Arkitektur',
    architectureText: 'Prosjekter, notater, spørreskjema og svar lagres lokalt i IndexedDB med Dexie.js. Eksport/import bruker JSON. En produksjonsversjon ville trenge backend-synk, innlogging og rollebasert tilgang før teamdeling.',
    possibleNextSteps: 'Mulige neste steg',
    possibleNextStepsText: 'Backend-synk, brukerkontoer, rollebasert tilgang, CSV/PDF-eksport, hostede spørreskjema, analysevisninger og adminrapportering kan utforskes etter validering av dokumentasjonsflyten.',
    summaryEyebrow: 'AI-klar rapporteringsflyt',
    summaryTitle: 'Utkast til effektsammendrag',
    summaryLede: 'Generert fra lokale journal-, skjema- og evidensdata. Ingen ekte AI-API brukes i denne statiske prototypen.',
    selectedProject: 'Valgt prosjekt',
    noProjectSelected: 'Ingen prosjekt valgt',
    noReportingPeriod: 'Ingen rapporteringsperiode ennå',
    localFirstDraft: 'Lokalt utkast',
    narrativeSummary: 'Narrativ oppsummering',
    keyThemes: 'Hovedtemaer',
    signalsOfChange: 'Tegn på endring',
    evidenceGaps: 'Evidensgap',
    recommendedNextSteps: 'Anbefalte neste steg',
    exportActions: 'Eksporthandlinger',
    exportActionsText: 'Kopier et rent markdown-utkast, eller kopier en prompt til ChatGPT eller et annet AI-verktøy. Prompten bruker bare lokale prosjektdata.',
    copyMarkdown: 'Kopier Markdown-sammendrag',
    copyAiPrompt: 'Kopier AI-prompt',
    statEntries: 'Notater',
    statPeople: 'Personer nådd',
    statAttachments: 'Vedlegg',
    statSurveys: 'Skjema',
    tabJournal: 'Journal',
    tabSurveys: 'Skjema',
    searchEntries: 'Søk i notater...',
    allTime: 'Hele perioden',
    last7: 'Siste 7 dager',
    last30: 'Siste 30 dager',
    addEntry: '+ Nytt notat',
    noEntries: 'Ingen notater ennå — start med å dokumentere effekt.',
    noEntriesShort: 'Ingen notater ennå',
    surveyHint: 'Lag et skjema, del det via QR eller fil, og importer svarene her.',
    newSurvey: '+ Nytt skjema',
    noSurveys: 'Ingen skjema ennå. Lag ett for å begynne å samle svar.',
    backToProject: 'Tilbake til prosjekt',
    deleteSurvey: 'Slett skjema',
    tabQuestions: 'Spørsmål',
    tabResponses: 'Svar',
    tabShare: 'Deling og QR',
    responsesHint: 'Importer JSON-svar etter at personer har fylt ut det eksporterte skjemaet.',
    importResponse: 'Importer svar-JSON',
    noResponses: 'Ingen svar ennå. Importer en JSON-fil for å se resultater her.',
    shareStep1Title: 'Eksporter skjema',
    shareStep1Text: 'Last ned en frittstående HTML-fil. Respondenter åpner den i en nettleser, fyller den ut og laster ned svarene som en JSON-fil som kan sendes tilbake.',
    downloadSurveyHtml: 'Last ned skjema-HTML',
    shareStep2Title: 'Host eller del filen',
    forQrCode: '(for QR-kode)',
    shareStep2Text: 'Host HTML-filen på nett når du vil bruke QR-kode, eller del filen direkte for små piloter.',
    netlifyNote: 'Dra og slipp HTML-filen — få en live URL på sekunder.',
    shareStep3Title: 'Lag QR-kode',
    shareStep3Text: 'Lim inn hostet URL under for å lage en QR-kode du kan printe, vise på arrangement eller dele digitalt.',
    generateQr: 'Lag QR',
    modalNewProject: 'Nytt prosjekt',
    modalEditProject: 'Rediger prosjekt',
    projectNameLabel: 'Prosjektnavn',
    descriptionLabel: 'Beskrivelse',
    optional: '(valgfritt)',
    projectDescPlaceholder: 'Hva handler prosjektet om?',
    cancel: 'Avbryt',
    saveProject: 'Lagre prosjekt',
    modalNewEntry: 'Nytt notat',
    modalEditEntry: 'Rediger notat',
    whatHappened: 'Hva skjedde?',
    entryTextPlaceholder: 'Beskriv hva som skjedde og hvilken effekt du observerte...',
    peopleReachedLabel: 'Personer nådd',
    tagsLabel: 'Tags',
    commaSeparated: '(kommaseparert)',
    tagsPlaceholder: 'workshop, ungdom, digitalt',
    attachmentsLabel: 'Vedlegg',
    photosDocs: '(bilder, dokumenter)',
    dragDropOr: 'Dra og slipp eller',
    browse: 'bla gjennom',
    saveEntry: 'Lagre notat',
    modalNewSurvey: 'Nytt skjema',
    close: 'Lukk',
    surveyTitleLabel: 'Skjematittel',
    optionalShown: '(valgfritt — vises til respondenter)',
    surveyDescPlaceholder: 'En kort introduksjon til respondentene',
    questionsLabel: 'Spørsmål',
    addQuestion: '+ Legg til spørsmål',
    noBuilderQuestions: 'Ingen spørsmål ennå — klikk "+ Legg til spørsmål" for å starte.',
    saveSurvey: 'Lagre skjema',
    areYouSure: 'Er du sikker?',
    cannotUndo: 'Denne handlingen kan ikke angres.',
    delete: 'Slett',
    feedbackCollection: 'Tilbakemeldingsinnsamling',
    updated: 'Oppdatert {date}',
    questionCount: '{count} spørsmål',
    responseCount: '{count} svar',
    peopleReached: '{count} personer nådd',
    copied: 'Kopiert',
    copyFailed: 'Kopiering feilet. Du kan fortsatt markere og kopiere teksten manuelt fra siden.',
    lastUpdatedLocal: 'Sist oppdatert {date} · Lokal prototype',
    noTagsYet: 'Ingen tags ennå',
    noQuestionsSurvey: 'Ingen spørsmål i dette skjemaet.',
    questionRequired: 'Spørsmål {number} · Påkrevd',
    questionPlain: 'Spørsmål {number}',
    required: 'Påkrevd',
    shortText: 'Kort tekst',
    multipleChoice: 'Flervalg (velg ett)',
    linearScale: 'Lineær skala',
    checkboxes: 'Avkryssing (velg flere)',
    scaleRange: 'Skala: {min} – {max}',
    responsesCollected: '{count} svar samlet',
    noAnswersYet: 'Ingen svar ennå.',
    avgOutOf: 'snitt av {max} · {count} svar',
    answeredCount: '{answered} av {total} besvart',
    downloadQr: 'Last ned QR som PNG',
    qrNotReady: 'QR er ikke klar ennå, prøv igjen.',
    deleteEntryConfirm: 'Slette dette notatet? Dette kan ikke angres.',
    deleteProjectConfirm: 'Slette dette prosjektet og alle data? Dette kan ikke angres.',
    deleteSurveyConfirm: 'Slette dette skjemaet og alle svar? Dette kan ikke angres.',
    demoExistsConfirm: 'Demodata finnes allerede. Vil du legge til en ny kopi likevel?',
    mergeDemoConfirm: 'Legge demoprosjekter til dine eksisterende lokale data?',
    addQuestionAlert: 'Legg til minst ett spørsmål i skjemaet.',
    fillLabelsAlert: 'Fyll ut alle spørsmålstekster før du lagrer.',
    importInvalidJson: 'Ugyldig JSON-fil.',
    importUnknownFormat: 'Ukjent filformat.',
    importMergeConfirm: 'Slå sammen {projects} prosjekt(er) og {entries} notater med dine data?\n\nDette overskriver ikke eksisterende data.',
    importComplete: 'Import fullført: {projects} prosjekt(er) og {entries} notater importert.',
    fileTooLarge: '"{name}" er for stor (maks 10 MB).',
    untitledEvidenceNote: 'Notat uten tittel',
    selectedPeriod: 'den valgte perioden',
    openSummary: 'Åpne sammendrag',
    workspaceKicker: 'Effektarbeidsflate',
    projectOverview: 'Prosjektoversikt',
    topTags: 'Topp-tags',
    latestSurveyActivity: 'Siste skjemaaktivitet',
    evidenceReadiness: 'Evidensstatus',
    noSurveyActivity: 'Ingen skjemaaktivitet ennå.',
    evidenceSnapshot: '{attachments} vedlegg på {entries} evidensnotater',
    noTopTags: 'Ingen tags ennå',
    resetDemoConfirm: 'Nullstille lokale data og laste hele Nabolagets kraft-demoen?',
    demoResetBanner: 'Demodata er nullstilt. Nabolagets kraft er klar med rik eksempeldokumentasjon.',
    dataModel: 'Datamodell',
    modelProjects: 'Prosjekter',
    modelEntries: 'Notater',
    modelSurveys: 'Skjema',
    modelResponses: 'Svar',
    modelExport: 'Eksport / import',
    modelSummary: 'Effektsammendrag'
  }
};

const demoNorwegianText = new Map([
  ['Recurring local meeting point for social entrepreneurs, residents and partners to build networks, share learning and develop local initiatives. Period: January 2025 – June 2026.', 'Tilbakevendende møtepunkt for sosiale entreprenører, beboere og partnere som bygger nettverk, deler læring og utvikler lokale initiativer. Periode: januar 2025 – juni 2026.'],
  ['Focused youth workshop series connected to confidence, belonging and practical project ideas.', 'Målrettet workshopserie for ungdom knyttet til mestring, tilhørighet og praktiske prosjektideer.'],
  ['Mentor gatherings and practical follow-up with local changemakers.', 'Mentorsamlinger og praktisk oppfølging med lokale endringsaktører.'],
  ['Needs mapping kickoff. Held a local workshop with residents and social entrepreneurs to map current needs and possible collaborations.', 'Oppstart for behovskartlegging. Gjennomførte en lokal workshop med beboere og sosiale entreprenører for å kartlegge behov og mulige samarbeid.'],
  ['Partner check-in. Followed up with partner organisation after community meeting and documented possible collaboration points for spring activities.', 'Partnersjekk. Fulgte opp partnerorganisasjon etter nabolagsmøte og dokumenterte mulige samarbeidspunkter for vårens aktiviteter.'],
  ['Youth ideas workshop. Participants shared challenges around funding, visibility and local recruitment, then sketched small initiative ideas.', 'Idéworkshop for ungdom. Deltakerne delte utfordringer rundt finansiering, synlighet og lokal rekruttering, og skisserte små initiativideer.'],
  ['Mentor follow-up. Collected feedback after a mentoring session and documented early signs of increased confidence among participants.', 'Mentoroppfølging. Samlet tilbakemeldinger etter en mentorsamtale og dokumenterte tidlige tegn på økt trygghet hos deltakerne.'],
  ['Founder stories evening. Local changemakers shared early project stories and practical questions about testing ideas with residents.', 'Kveld med gründerhistorier. Lokale endringsaktører delte tidlige prosjekterfaringer og praktiske spørsmål om å teste ideer med beboere.'],
  ['Evidence routine test. Documented recurring questions that should inform the next workshop format and future reporting structure.', 'Test av evidensrutine. Dokumenterte tilbakevendende spørsmål som bør forme neste workshopformat og fremtidig rapportering.'],
  ['Community partner roundtable. Several ideas moved from early exploration to concrete follow-up actions with local partners.', 'Rundebord med lokale partnere. Flere ideer gikk fra tidlig utforsking til konkrete oppfølgingspunkter med lokale partnere.'],
  ['Summer learning session. Residents and entrepreneurs compared what had been tested so far and identified where peer learning was most useful.', 'Sommerøkt for læring. Beboere og entreprenører sammenlignet det som var testet så langt og pekte på hvor erfaringsdeling var mest nyttig.'],
  ['Mentor clinic. Three early-stage initiatives received practical feedback on budgets, local recruitment and next-step planning.', 'Mentorklinikk. Tre initiativer i tidlig fase fikk praktiske tilbakemeldinger på budsjett, lokal rekruttering og planlegging av neste steg.'],
  ['Youth network evening. Participants described the meeting point as useful for building confidence, contacts and local belonging.', 'Ungdomskveld for nettverk. Deltakerne beskrev møtepunktet som nyttig for å bygge trygghet, kontakter og lokal tilhørighet.'],
  ['Impact documentation workshop. The group tested simple ways to describe change without turning every activity into formal reporting.', 'Workshop om effektdokumentasjon. Gruppen testet enkle måter å beskrive endring på uten å gjøre hver aktivitet til formell rapportering.'],
  ['Municipality dialogue. Followed up on partner questions about what early evidence would be useful for future funding conversations.', 'Dialog med kommunen. Fulgte opp partnerspørsmål om hvilken tidlig evidens som er nyttig i fremtidige finansieringssamtaler.'],
  ['Neighbourhood listening session. Residents mapped barriers to participation and suggested more informal formats for first-time attendees.', 'Lyttemøte i nabolaget. Beboere kartla barrierer for deltakelse og foreslo mer uformelle formater for førstegangsbesøkende.'],
  ['End-of-year reflection. Participants reviewed what helped initiatives move forward and where longer follow-up data is still missing.', 'Årsrefleksjon. Deltakerne vurderte hva som hjalp initiativene videre, og hvor lengre oppfølgingsdata fortsatt mangler.'],
  ['New year project lab. Social entrepreneurs refined project ideas and identified concrete tests for the next six weeks.', 'Prosjektlab ved nyttår. Sosiale entreprenører spisset prosjektideer og identifiserte konkrete tester for de neste seks ukene.'],
  ['Mentor matching session. New mentor connections were formed around communication, local partnerships and measuring early outcomes.', 'Mentor-matching. Nye mentorkoblinger ble etablert rundt kommunikasjon, lokale partnerskap og måling av tidlige resultater.'],
  ['Youth participation follow-up. Young participants reviewed previous ideas and selected two concepts for practical testing.', 'Oppfølging av ungdomsdeltakelse. Unge deltakere vurderte tidligere ideer og valgte to konsepter for praktisk testing.'],
  ['Evidence review. The team reviewed journal notes and identified activities with strong stories but limited attachments.', 'Evidensgjennomgang. Teamet gikk gjennom journalnotater og fant aktiviteter med sterke historier, men få vedlegg.'],
  ['Partner follow-up sprint. Several partner conversations created new opportunities for collaboration and shared venues.', 'Oppfølgingssprint med partnere. Flere partnersamtaler skapte nye muligheter for samarbeid og delte lokaler.'],
  ['Open neighbourhood gathering. Participants exchanged learning across initiatives and invited new residents into the network.', 'Åpen nabolagssamling. Deltakerne delte læring på tvers av initiativer og inviterte nye beboere inn i nettverket.'],
  ['Reporting preparation. Summarized the strongest signals of change and listed evidence gaps for the next reporting period.', 'Forberedelse til rapportering. Oppsummerte de sterkeste tegnene på endring og listet evidensgap for neste rapporteringsperiode.'],
  ['Youth workshop pilot. Young participants mapped local challenges and sketched small initiatives they could test.', 'Pilot for ungdomsworkshop. Unge deltakere kartla lokale utfordringer og skisserte små initiativer de kunne teste.'],
  ['Follow-up mentoring. Participants asked for practical help with budgeting, outreach and presenting their ideas.', 'Oppfølgende mentoring. Deltakerne ba om praktisk hjelp med budsjett, synlighet og presentasjon av ideene sine.'],
  ['Peer learning meetup. Participants shared progress and named confidence, contacts and structure as useful outcomes.', 'Møte for erfaringsdeling. Deltakerne delte fremdrift og trakk frem trygghet, kontakter og struktur som nyttige resultater.'],
  ['Mentor gathering. Case discussions focused on role clarity, useful documentation routines and practical next steps.', 'Mentorsamling. Case-diskusjoner handlet om rolleavklaring, nyttige dokumentasjonsrutiner og praktiske neste steg.'],
  ['Mentor reflection session. Mentors shared patterns they observed across local initiatives and where support was still thin.', 'Refleksjonsøkt for mentorer. Mentorene delte mønstre de så på tvers av lokale initiativer, og hvor støtten fortsatt var tynn.'],
  ['Impact note review. Mentors tested a short reflection template for capturing observed progress after conversations.', 'Gjennomgang av effektnotater. Mentorene testet en kort refleksjonsmal for å fange observert fremgang etter samtaler.'],
  ['Quick participant feedback after local workshops and learning sessions.', 'Kort deltakertilbakemelding etter lokale workshops og læringsøkter.'],
  ['Short survey for partners after collaboration meetings.', 'Kort spørreskjema til partnere etter samarbeidsmøter.'],
  ['Lightweight reflection after mentor clinics and follow-up sessions.', 'Enkel refleksjon etter mentorklinikker og oppfølgingsøkter.'],
  ['How useful was the session?', 'Hvor nyttig var økten?'],
  ['What was the most valuable part?', 'Hva var mest verdifullt?'],
  ['Do you want follow-up?', 'Ønsker du oppfølging?'],
  ['Which topic should be covered next?', 'Hvilket tema bør tas opp neste gang?'],
  ['How valuable was the collaboration conversation?', 'Hvor verdifull var samarbeidssamtalen?'],
  ['Is there a clear next step?', 'Finnes det et tydelig neste steg?'],
  ['What should be followed up?', 'Hva bør følges opp?'],
  ['Did the session increase confidence to move forward?', 'Ga økten mer trygghet til å gå videre?'],
  ['What support is still needed?', 'Hvilken støtte trengs fortsatt?'],
  ['Any useful observation?', 'Noen nyttige observasjoner?'],
  ['Yes', 'Ja'],
  ['Maybe', 'Kanskje'],
  ['No', 'Nei'],
  ['Partly', 'Delvis'],
  ['Funding', 'Finansiering'],
  ['Visibility', 'Synlighet'],
  ['Partnerships', 'Partnerskap'],
  ['Measuring impact', 'Måle effekt'],
  ['Budgeting', 'Budsjett'],
  ['Communication', 'Kommunikasjon'],
  ['Recruitment', 'Rekruttering'],
  ['Impact documentation', 'Effektdokumentasjon'],
  ['Meeting others with similar ideas made the project feel possible.', 'Å møte andre med lignende ideer gjorde at prosjektet føltes mulig.'],
  ['The practical examples helped us understand next steps.', 'De praktiske eksemplene hjalp oss å forstå neste steg.'],
  ['I left with a clearer idea and two people to contact.', 'Jeg gikk derfra med en tydeligere idé og to personer å kontakte.'],
  ['Good energy and useful structure.', 'God energi og nyttig struktur.'],
  ['The group discussion made local collaboration easier.', 'Gruppediskusjonen gjorde lokalt samarbeid enklere.'],
  ['It helped me explain my idea more clearly.', 'Det hjalp meg å forklare ideen min tydeligere.'],
  ['Share venue calendar and invite two initiatives to the next meeting.', 'Del kalender for lokaler og inviter to initiativer til neste møte.'],
  ['Explore a joint workshop around recruitment and local visibility.', 'Utforsk en felles workshop om rekruttering og lokal synlighet.'],
  ['Clarify what data is useful for reporting before summer.', 'Avklar hvilke data som er nyttige for rapportering før sommeren.'],
  ['Connect youth project leads with communications support.', 'Koble ungdomsprosjektledere med kommunikasjonsstøtte.'],
  ['Follow up on shared space and available mentor capacity.', 'Følg opp delt lokale og tilgjengelig mentorkapasitet.'],
  ['The participant had a clearer next step after mapping costs.', 'Deltakeren hadde et tydeligere neste steg etter å ha kartlagt kostnader.'],
  ['Good progress, but needs more help finding local volunteers.', 'God fremdrift, men trenger mer hjelp til å finne lokale frivillige.'],
  ['Useful to write down small changes directly after sessions.', 'Nyttig å skrive ned små endringer rett etter øktene.'],
  ['The pitch became more grounded and easier to understand.', 'Pitchen ble mer forankret og lettere å forstå.']
]);

function t(key, params = {}) {
  const source = i18n[currentLanguage] || i18n.en;
  const fallback = i18n.en[key] || key;
  const template = source[key] || fallback;
  return Object.entries(params).reduce((text, [name, value]) => {
    return text.replaceAll(`{${name}}`, value);
  }, template);
}

function plural(count) {
  return count === 1 ? '' : 's';
}

function getLocale() {
  return currentLanguage === 'no' ? 'nb-NO' : 'en-GB';
}

function localizeDemoText(text) {
  if (currentLanguage !== 'no') return text || '';
  if (Array.isArray(text)) return text.map(localizeDemoText);
  return demoNorwegianText.get(text) || text || '';
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage === 'no' ? 'no' : 'en';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  document.querySelectorAll('.language-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLanguage);
    btn.setAttribute('aria-pressed', btn.dataset.lang === currentLanguage ? 'true' : 'false');
  });
}

async function setLanguage(lang) {
  if (!i18n[lang]) return;
  currentLanguage = lang;
  localStorage.setItem(LANG_KEY, lang);
  applyLanguage();

  if (currentProjectId) {
    await renderProjectList(false);
    if (!document.getElementById('projectView').classList.contains('hidden')) {
      await renderProjectView(currentProjectTab);
    }
    if (!document.getElementById('impactSummaryView').classList.contains('hidden')) {
      await renderImpactSummary();
    }
  }

  if (currentSurveyId && !document.getElementById('surveyDetailView').classList.contains('hidden')) {
    await openSurveyDetail(currentSurveyId, currentSurveyTab);
  }
}

// ============ INIT ============

document.addEventListener('DOMContentLoaded', async () => {
  let seededDemo = await autoSeedDemoIfEmpty();
  if (!seededDemo && await isWeakLegacyDemo()) {
    await replaceAllDataWithDemo();
    seededDemo = true;
  }
  await renderProjectList();
  attachEventListeners();
  applyLanguage();
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

async function renderProjectList(renderCurrentView = true) {
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

  for (const project of projects) {
    const entryCount = await db.entries.where('projectId').equals(project.id).count();
    const btn = document.createElement('button');
    btn.className = 'project-item' + (project.id === currentProjectId ? ' active' : '');
    btn.dataset.id = project.id;
    btn.innerHTML = `
      <div class="project-item-row">
        <span class="project-item-dot" aria-hidden="true"></span>
        <div class="project-item-name">${escapeHtml(project.name)}</div>
        <span class="project-item-count">${entryCount}</span>
      </div>
      <div class="project-item-meta">${formatDate(project.updatedAt)}</div>
    `;
    btn.addEventListener('click', () => selectProject(project.id));
    list.appendChild(btn);
  }

  if (renderCurrentView) renderProjectView(currentProjectTab || 'journal');
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
  descEl.textContent = localizeDemoText(project.description || '');
  descEl.style.display = project.description ? '' : 'none';

  switchProjectTab(tab);

  await renderStats();
  await renderProjectOverview();
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
    const duplicateOk = confirm(t('demoExistsConfirm'));
    if (!duplicateOk) return;
  } else if (existingCount > 0) {
    const mergeOk = confirm(t('mergeDemoConfirm'));
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
  if (existingCount > 0) return false;

  currentProjectId = await createDemoData();
  currentProjectTab = 'journal';
  localStorage.setItem('visdetDemoSeeded', 'true');
  return true;
}

async function isWeakLegacyDemo() {
  const projects = await db.projects.toArray();
  if (projects.length === 0) return false;
  if (projects.some(project => project.name === 'Nabolagets kraft')) {
    const nabolag = projects.find(project => project.name === 'Nabolagets kraft');
    const entries = await db.entries.where('projectId').equals(nabolag.id).toArray();
    const surveys = await db.surveys.where('projectId').equals(nabolag.id).toArray();
    const entryIds = entries.map(entry => entry.id);
    const attachments = entryIds.length
      ? await db.attachments.where('entryId').anyOf(entryIds).count()
      : 0;
    const people = entries.reduce((sum, entry) => sum + (parseInt(entry.count) || 0), 0);
    return entries.length > 0 && (entries.length < 15 || surveys.length < 3 || attachments < 8 || people < 600);
  }
  if (projects.length !== 1) return false;

  const project = projects[0];
  const entries = await db.entries.where('projectId').equals(project.id).toArray();
  const surveys = await db.surveys.where('projectId').equals(project.id).toArray();
  const people = entries.reduce((sum, entry) => sum + (parseInt(entry.count) || 0), 0);
  const weakName = /te\s*med\s*tu|te med|tu/i.test(project.name || '');

  return weakName || (entries.length <= 2 && surveys.length === 0 && people <= 50);
}

async function clearLocalData() {
  await db.transaction('rw', db.responses, db.surveys, db.attachments, db.entries, db.projects, async () => {
    await db.responses.clear();
    await db.surveys.clear();
    await db.attachments.clear();
    await db.entries.clear();
    await db.projects.clear();
  });
}

async function replaceAllDataWithDemo() {
  await clearLocalData();
  currentProjectId = await createDemoData();
  currentProjectTab = 'journal';
  currentSurveyId = null;
  localStorage.setItem('visdetDemoSeeded', 'true');
}

async function resetDemoData() {
  const ok = confirm(t('resetDemoConfirm'));
  if (!ok) return;
  await replaceAllDataWithDemo();
  setActiveNav('journal');
  await renderProjectList();
  showDemoBanner(t('demoResetBanner'));
}

function showDemoBanner(message) {
  const banner = document.getElementById('demoBanner');
  const text = banner?.querySelector('span');
  if (message && text) text.textContent = message;
  banner?.classList.remove('hidden');
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

async function renderProjectOverview() {
  const project = await db.projects.get(currentProjectId);
  if (!project) return;

  const entries = await db.entries.where('projectId').equals(currentProjectId).toArray();
  entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const entryIds = entries.map(e => e.id);
  const attachments = entryIds.length
    ? await db.attachments.where('entryId').anyOf(entryIds).toArray()
    : [];
  const surveys = await db.surveys.where('projectId').equals(currentProjectId).toArray();
  surveys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const period = getDateRange(entries);
  document.getElementById('projectPeriodChip').textContent = period.label;

  const tagCounts = {};
  entries.forEach(entry => (entry.tags || []).forEach(tag => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }));
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  document.getElementById('projectTopTags').innerHTML = topTags.length
    ? `<div class="overview-tags">${topTags.map(([tag, count]) => `<span class="overview-tag">${escapeHtml(tag)} <small>${count}</small></span>`).join('')}</div>`
    : `<p>${escapeHtml(t('noTopTags'))}</p>`;

  const latestSurvey = surveys[0];
  if (latestSurvey) {
    const responseCount = await db.responses.where('surveyId').equals(latestSurvey.id).count();
    document.getElementById('projectSurveySnapshot').innerHTML = `
      <div class="overview-snapshot">
        <span class="overview-icon overview-icon-blue">SV</span>
        <div>
          <strong>${escapeHtml(latestSurvey.title)}</strong>
          <p>${escapeHtml(t('questionCount', { count: (latestSurvey.questions || []).length }))} · ${escapeHtml(t('responseCount', { count: responseCount, plural: plural(responseCount) }))}</p>
        </div>
      </div>
    `;
  } else {
    document.getElementById('projectSurveySnapshot').innerHTML = `<p>${escapeHtml(t('noSurveyActivity'))}</p>`;
  }

  document.getElementById('projectEvidenceSnapshot').innerHTML = `
    <div class="overview-snapshot">
      <span class="overview-icon overview-icon-mint">EV</span>
      <div>
        <strong>${escapeHtml(t('evidenceSnapshot', { attachments: attachments.length, entries: entries.length }))}</strong>
        <p>${escapeHtml(project.name)} · ${escapeHtml(period.label)}</p>
      </div>
    </div>
  `;
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

  const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || t('noTagsYet');
  const period = getDateRange(entries);

  return { project, entries, attachments, surveys, responsesBySurvey, responseCount, totalPeople, tagCounts, topTag, period };
}

async function renderImpactSummary() {
  const data = await getImpactSummaryData();
  if (!data) return;

  const { project, entries, attachments, surveys, responseCount, totalPeople, topTag, period } = data;

  document.getElementById('summaryProjectName').textContent = project.name;
  document.getElementById('summaryPeriod').textContent = period.label;
  document.getElementById('summaryUpdated').textContent = t('lastUpdatedLocal', { date: formatDate(project.updatedAt || project.createdAt) });

  document.getElementById('summaryMetrics').innerHTML = [
    [t('statPeople'), totalPeople.toLocaleString(getLocale())],
    [t('statEntries'), entries.length],
    [t('statSurveys'), surveys.length],
    [t('statAttachments'), attachments.length],
    [currentLanguage === 'no' ? 'Topp-tag' : 'Top tag', topTag]
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
  const activityTypes = topTags.length ? topTags.join(', ') : (currentLanguage === 'no' ? 'dokumenterte lokale aktiviteter' : 'documented local activities');

  if (currentLanguage === 'no') {
    return [
      `Mellom ${period.plain} dokumenterte ${project.name} ${entries.length} aktiviteter og nådde ${totalPeople.toLocaleString(getLocale())} personer gjennom ${activityTypes}. Journalnotatene viser gjentakende arbeid med lokale nettverk, mentoring, læring og sosialt entreprenørskap i tidlig fase.`,
      `${surveys.length} skjema og ${responseCount} importerte svar støtter rapporteringsflyten. Dataene er fortsatt lokale og på utkastnivå, men de er strukturerte nok til å lage et effektsammendrag, identifisere evidensgap og forberede en AI-klar rapporteringsprompt uten å eksponere API-nøkler i frontend.`
    ];
  }

  return [
    `Between ${period.plain}, ${project.name} documented ${entries.length} activities and reached ${totalPeople.toLocaleString()} people through ${activityTypes}. The journal entries show recurring work around local network building, mentorship, learning and early-stage social entrepreneurship.`,
    `${surveys.length} survey${surveys.length !== 1 ? 's' : ''} and ${responseCount} imported response${responseCount !== 1 ? 's' : ''} support the reporting workflow. The data is still local and draft-level, but it is structured enough to prepare an impact summary, identify evidence gaps and create an AI-ready reporting prompt without exposing API keys in the frontend.`
  ];
}

function inferThemes(data) {
  const text = data.entries.map(e => `${e.text} ${(e.tags || []).join(' ')}`).join(' ').toLowerCase();
  const no = currentLanguage === 'no';
  const candidates = [
    [no ? 'Lokal nettverksbygging' : 'Local network building', ['nabolag', 'nettverk', 'partnerskap', 'collaboration']],
    [no ? 'Ungdomsdeltakelse' : 'Youth participation', ['ungdom', 'young', 'youth']],
    [no ? 'Mentoring og oppfølging' : 'Mentorship and follow-up', ['mentor', 'oppfølging', 'follow-up']],
    [no ? 'Læring i fellesskap' : 'Community learning', ['læring', 'workshop', 'innsikt', 'learning']],
    [no ? 'Tidlig effektdokumentasjon' : 'Early impact documentation', ['effektmåling', 'rapportering', 'evidence', 'impact']],
    [no ? 'Sosialt entreprenørskap' : 'Social entrepreneurship', ['sosialt entreprenørskap', 'entrepreneur']]
  ];

  const themes = candidates
    .filter(([, words]) => words.some(word => text.includes(word)))
    .map(([label]) => label);

  return themes.length ? themes.slice(0, 5) : (no
    ? ['Strukturert aktivitetsdokumentasjon', 'Lokal læring og oppfølging']
    : ['Structured activity documentation', 'Local learning and follow-up']);
}

function buildSignals(data) {
  if (currentLanguage === 'no') {
    const signals = [
      'Deltakere beskriver gjentatte ganger møtepunktet som nyttig for å bygge trygghet, kontakter og lokal tilhørighet.',
      'Flere lokale ideer gikk fra uformell samtale til konkrete oppfølgingspunkter med mentorer eller partnere.',
      'Partnersamtaler skapte nye muligheter for samarbeid, delte lokaler og praktisk støtte.',
      'Journalnotatene viser gjentakende læring om finansiering, synlighet, rekruttering og effektdokumentasjon.'
    ];

    if (data.responseCount > 0) {
      signals.push(`${data.responseCount} importerte skjemasvar legger til enkel deltaker- og partnertilbakemelding i evidensgrunnlaget.`);
    }

    return signals.slice(0, 5);
  }

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
  if (currentLanguage === 'no') {
    const gaps = [
      'Mer strukturert deltakertilbakemelding trengs på tvers av de gjentakende aktivitetsformatene.',
      'Langsiktige resultater etter 3–6 måneder er ennå ikke dokumentert jevnt.',
      'Noen aktiviteter har få vedlegg eller oppfølgingsnotater.'
    ];

    if (data.responseCount < data.entries.length) {
      gaps.push('Skjemasvarene er nyttige, men dekningen er fortsatt ufullstendig sammenlignet med antall journalførte aktiviteter.');
    }

    return gaps;
  }

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
  if (currentLanguage === 'no') {
    const steps = [
      'Legg til oppfølgende skjemasvar etter sentrale workshops og mentorøkter.',
      'Knytt bilder, notater eller partneroppsummeringer til aktivitetene med høyest verdi.',
      'Eksporter markdown-sammendraget til rapportering eller finansieringssamtaler.',
      'Følg opp deltakerresultater etter 3–6 måneder.',
      'Legg til partnernotater der samarbeidsmuligheter ble identifisert.'
    ];

    return data.attachments.length ? steps : ['Legg ved evidens fra de sterkeste journalnotatene.', ...steps.slice(0, 4)];
  }

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

  if (currentLanguage === 'no') {
    return `# Utkast til effektsammendrag: ${project.name}

**Rapporteringsperiode:** ${period.label}
**Personer nådd:** ${totalPeople.toLocaleString(getLocale())}
**Journalnotater:** ${entries.length}
**Skjema:** ${surveys.length}
**Skjemasvar:** ${responseCount}
**Vedlegg:** ${attachments.length}
**Topp-tag:** ${topTag}

## Narrativ Oppsummering

${narrative.join('\n\n')}

## Hovedtemaer
${inferThemes(data).map(item => `- ${item}`).join('\n')}

## Tegn På Endring
${buildSignals(data).map(item => `- ${item}`).join('\n')}

## Evidensgap
${buildEvidenceGaps(data).map(item => `- ${item}`).join('\n')}

## Anbefalte Neste Steg
${buildNextSteps(data).map(item => `- ${item}`).join('\n')}
`;
  }

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
  const recentEntries = entries.slice(-8).map(e => {
    const text = localizeDemoText(e.text);
    const suffix = currentLanguage === 'no'
      ? `${e.count || 0} personer; tags: ${(e.tags || []).join(', ') || 'ingen'}`
      : `${e.count || 0} people; tags: ${(e.tags || []).join(', ') || 'none'}`;
    return `- ${formatDate(e.createdAt)}: ${text} (${suffix})`;
  }).join('\n');
  const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => `${tag} (${count})`).join(', ');

  if (currentLanguage === 'no') {
    return `Du hjelper med å forberede et effektsammendrag fra lokal prosjektdokumentasjon.

Prosjekttittel: ${project.name}
Beskrivelse: ${localizeDemoText(project.description) || 'Ingen beskrivelse lagt inn.'}
Datoperiode: ${period.label}

Nøkkeltall:
- Personer nådd: ${totalPeople.toLocaleString(getLocale())}
- Journalnotater: ${entries.length}
- Vedlegg: ${attachments.length}
- Skjema: ${surveys.length}
- Importerte skjemasvar: ${responseCount}
- Tags: ${tags || 'Ingen tags ennå'}

Nyeste aktivitetsnotater:
${recentEntries || '- Ingen notater ennå.'}

Skjemanotater:
${surveys.map(s => `- ${s.title}: ${(s.questions || []).length} spørsmål`).join('\n') || '- Ingen skjema ennå.'}

Instruksjon:
Skriv et polert effektsammendrag i en profesjonell, men jordnær tone. Vær ærlig om evidensgap og unngå å overdrive resultater.

Implementeringsnotat:
Denne statiske prototypen kaller ikke et AI-API. I en produksjonsversjon bør AI-genererte sammendrag håndteres via backend eller serverless-funksjon slik at API-nøkler ikke eksponeres i frontend.`;
  }

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
Write a polished impact report summary in a professional but grounded tone. Be honest about evidence gaps and avoid overstating outcomes.

Implementation note:
This static prototype does not call an AI API. In a production version, AI-generated summaries should be handled through a backend or serverless function so API keys are not exposed in the frontend.`;
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
    flashButton(button, t('copied'));
  } catch {
    alert(t('copyFailed'));
  }
}

function flashButton(button, text) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => button.textContent = original, 1400);
}

function getDateRange(entries) {
  if (!entries.length) return { label: t('noEntriesShort'), plain: t('selectedPeriod') };
  const first = entries[0].createdAt;
  const last = entries[entries.length - 1].createdAt;
  return {
    label: `${formatMonthYear(first)} – ${formatMonthYear(last)}`,
    plain: currentLanguage === 'no'
      ? `${formatMonthYear(first)} og ${formatMonthYear(last)}`
      : `${formatMonthYear(first)} and ${formatMonthYear(last)}`
  };
}

function formatMonthYear(iso) {
  return new Date(iso).toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' });
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

  const localizedText = localizeDemoText(entry.text);
  const entryTitle = getEntryTitle(localizedText);
  const entryPreview = getEntryPreview(localizedText, entryTitle);
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
      ${entry.count ? `<span class="entry-count">${t('peopleReached', { count: parseInt(entry.count).toLocaleString(getLocale()) })}</span>` : ''}
      <div class="entry-tags">${tagsHtml}</div>
      <span class="entry-date">${formatDate(entry.createdAt)}</span>
    </div>
    ${attachHtml ? `<div class="entry-attachments">${attachHtml}</div>` : ''}
  `;

  card.querySelector(`[data-edit="${entry.id}"]`).addEventListener('click', () => openEditEntry(entry.id));
  card.querySelector(`[data-delete="${entry.id}"]`).addEventListener('click', () => {
    openConfirm(t('deleteEntryConfirm'), async () => {
      await db.attachments.where('entryId').equals(entry.id).delete();
      await db.entries.delete(entry.id);
      await db.projects.update(currentProjectId, { updatedAt: new Date().toISOString() });
      await renderStats();
      await renderProjectOverview();
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
  return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean || t('untitledEvidenceNote');
}

function getEntryPreview(text, title) {
  const clean = String(text || '').trim();
  const withoutTitle = clean.startsWith(title) ? clean.slice(title.length).replace(/^[.!?\s]+/, '') : clean;
  const preview = withoutTitle || clean;
  return preview.length > 220 ? `${preview.slice(0, 217)}...` : preview;
}

// ============ PROJECT CRUD ============

function openNewProject() {
  document.getElementById('projectModalTitle').dataset.i18n = 'modalNewProject';
  document.getElementById('projectModalTitle').textContent = t('modalNewProject');
  document.getElementById('inputProjectName').value  = '';
  document.getElementById('inputProjectDesc').value  = '';
  document.getElementById('projectModal').dataset.editing = '';
  document.getElementById('projectModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('inputProjectName').focus(), 50);
}

async function openEditProject() {
  const project = await db.projects.get(currentProjectId);
  if (!project) return;
  document.getElementById('projectModalTitle').dataset.i18n = 'modalEditProject';
  document.getElementById('projectModalTitle').textContent = t('modalEditProject');
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
  openConfirm(t('deleteProjectConfirm'), async () => {
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
  document.getElementById('entryModalTitle').dataset.i18n = 'modalNewEntry';
  document.getElementById('entryModalTitle').textContent  = t('modalNewEntry');
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
  document.getElementById('entryModalTitle').dataset.i18n = 'modalEditEntry';
  document.getElementById('entryModalTitle').textContent = t('modalEditEntry');
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
  await renderProjectOverview();
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
    if (file.size > 10 * 1024 * 1024) { alert(t('fileTooLarge', { name: file.name })); return; }
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
  catch { alert(t('importInvalidJson')); return; }

  if (!payload.projects || !payload.entries) { alert(t('importUnknownFormat')); return; }

  const ok = confirm(t('importMergeConfirm', { projects: payload.projects.length, entries: payload.entries.length }));
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
  alert(t('importComplete', { projects: payload.projects.length, entries: payload.entries.length }));
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
        <div class="survey-card-label">${escapeHtml(t('feedbackCollection'))}</div>
        <div class="survey-card-title">${escapeHtml(survey.title)}</div>
        ${survey.description ? `<div class="survey-card-desc">${escapeHtml(localizeDemoText(survey.description))}</div>` : ''}
        <div class="survey-card-chips">
          <span class="meta-chip">${escapeHtml(t('questionCount', { count: (survey.questions || []).length }))}</span>
          <span class="meta-chip">${escapeHtml(t('responseCount', { count: responseCount, plural: plural(responseCount) }))}</span>
          <span class="meta-chip">${escapeHtml(t('updated', { date: formatDate(survey.updatedAt || survey.createdAt) }))}</span>
        </div>
      </div>
      <div class="survey-card-arrow" aria-hidden="true"></div>
    `;
    card.addEventListener('click', () => openSurveyDetail(survey.id));
    list.appendChild(card);
  }
}

// ============ OPEN SURVEY DETAIL ============

async function openSurveyDetail(surveyId, preferredTab = 'questions') {
  currentSurveyId = surveyId;
  const survey    = await db.surveys.get(surveyId);
  if (!survey) return;

  showView('surveyDetailView');

  document.getElementById('surveyDetailTitle').textContent = survey.title;
  const descEl = document.getElementById('surveyDetailDesc');
  descEl.textContent = localizeDemoText(survey.description || '');
  descEl.style.display = survey.description ? '' : 'none';

  switchSurveyTab(preferredTab || 'questions');

  const responseCount = await db.responses.where('surveyId').equals(surveyId).count();
  document.getElementById('surveyQChip').textContent = t('questionCount', { count: (survey.questions || []).length });
  document.getElementById('surveyRChip').textContent = t('responseCount', { count: responseCount, plural: plural(responseCount) });

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
    list.innerHTML = `<p style="color:var(--text-muted);font-size:14px;">${escapeHtml(t('noQuestionsSurvey'))}</p>`;
    return;
  }

  questions.forEach((q, i) => {
    const typeLabels = { text: t('shortText'), mc: t('multipleChoice'), scale: t('linearScale'), checkboxes: t('checkboxes') };
    const card = document.createElement('div');
    card.className = 'question-display-card';

    let optionsHtml = '';
    if (q.type === 'mc' || q.type === 'checkboxes') {
      optionsHtml = `<div class="question-options-preview">
        ${(q.options || []).map(o => `<span class="option-pill-preview">${escapeHtml(localizeDemoText(o))}</span>`).join('')}
      </div>`;
    } else if (q.type === 'scale') {
      optionsHtml = `<div class="question-options-preview">
        <span class="option-pill-preview">${escapeHtml(t('scaleRange', { min: q.scaleMin, max: q.scaleMax }))}</span>
      </div>`;
    }

    card.innerHTML = `
      <div class="question-display-num">${escapeHtml(t(q.required ? 'questionRequired' : 'questionPlain', { number: i + 1 }))}</div>
      <div class="question-display-label">${escapeHtml(localizeDemoText(q.label))}</div>
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
        <p class="q-options-label">${escapeHtml(currentLanguage === 'no' ? 'Alternativer — ett per linje (eller kommaseparert)' : 'Options — one per line (or comma-separated)')}</p>
        <textarea class="q-options-input" rows="3" placeholder="Option A&#10;Option B&#10;Option C">${escapeHtml((q.options || []).join('\n'))}</textarea>
      `;
    } else if (q.type === 'scale') {
      extraHtml = `
        <div class="scale-range-row">
          <label>${currentLanguage === 'no' ? 'Min' : 'Min'} <input type="number" class="q-scale-min" value="${q.scaleMin ?? 1}" min="0" max="10" /></label>
          <label>${currentLanguage === 'no' ? 'Maks' : 'Max'} <input type="number" class="q-scale-max" value="${q.scaleMax ?? 5}" min="1" max="10" /></label>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="question-builder-top">
        <span class="q-num-badge">Q${i + 1}</span>
        <select class="q-type-select">
          <option value="text"       ${q.type === 'text'       ? 'selected' : ''}>${escapeHtml(t('shortText'))}</option>
          <option value="mc"         ${q.type === 'mc'         ? 'selected' : ''}>${escapeHtml(t('multipleChoice'))}</option>
          <option value="scale"      ${q.type === 'scale'      ? 'selected' : ''}>${escapeHtml(t('linearScale'))}</option>
          <option value="checkboxes" ${q.type === 'checkboxes' ? 'selected' : ''}>${escapeHtml(t('checkboxes'))}</option>
        </select>
        <label class="q-required-wrap">
          <input type="checkbox" class="q-required-cb" ${q.required ? 'checked' : ''} /> ${escapeHtml(t('required'))}
        </label>
        <button class="btn-icon btn-danger q-delete-btn" title="${escapeHtml(currentLanguage === 'no' ? 'Fjern spørsmål' : 'Remove question')}">✕</button>
      </div>
      <input type="text" class="q-label-input" placeholder="${escapeHtml(currentLanguage === 'no' ? 'Ditt spørsmål...' : 'Your question...')}" value="${escapeHtml(q.label || '')}" />
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
  if (buildingQuestions.length === 0) { alert(t('addQuestionAlert')); return; }

  // Validate labels
  for (const q of buildingQuestions) {
    if (!q.label.trim()) { alert(t('fillLabelsAlert')); return; }
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
  await renderProjectOverview();
  await renderSurveyList();
  openSurveyDetail(id);
}

function deleteCurrentSurvey() {
  openConfirm(t('deleteSurveyConfirm'), async () => {
    await db.responses.where('surveyId').equals(currentSurveyId).delete();
    await db.surveys.delete(currentSurveyId);
    await db.projects.update(currentProjectId, { updatedAt: new Date().toISOString() });
    currentSurveyId = null;
    await renderStats();
    await renderProjectOverview();
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
    description: localizeDemoText(survey.description || ''),
    language:    currentLanguage === 'no' ? 'no' : 'en',
    questions:   (survey.questions || []).map(q => ({
      ...q,
      label: localizeDemoText(q.label),
      options: (q.options || []).map(localizeDemoText)
    }))
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
<html lang="${currentLanguage === 'no' ? 'no' : 'en'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f6f1; color: #171717; min-height: 100vh; padding: 40px 20px 80px; font-size: 16px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
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
    const UI = SURVEY.language === 'no'
      ? {
          question: 'Spørsmål',
          answer: 'Ditt svar...',
          low: 'Lav',
          high: 'Høy',
          required: 'Dette spørsmålet er påkrevd.',
          submit: 'Send svar',
          successTitle: 'Svar lagret',
          successMsg: 'Svaret ditt er lastet ned som en JSON-fil.<br><br>Send den tilbake til arrangøren slik at de kan importere den i Vis Det.'
        }
      : {
          question: 'Question',
          answer: 'Your answer...',
          low: 'Low',
          high: 'High',
          required: 'This question is required.',
          submit: 'Submit Response',
          successTitle: 'Response saved',
          successMsg: 'Your response has been downloaded as a JSON file.<br><br>Please send it back to the organiser so they can import it into Vis Det.'
        };

    function esc(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function render() {
      let html = '<div class="survey-header"><h1 class="survey-title">' + esc(SURVEY.title) + '</h1>';
      if (SURVEY.description) html += '<p class="survey-desc">' + esc(SURVEY.description) + '</p>';
      html += '</div>';

      SURVEY.questions.forEach(function(q, i) {
        html += '<div class="question-card" data-qid="' + q.id + '">';
        html += '<div class="q-num">' + UI.question + ' ' + (i+1) + (q.required ? ' <span class="required-star">*</span>' : '') + '</div>';
        html += '<div class="q-label">' + esc(q.label) + '</div>';

        if (q.type === 'text') {
          html += '<textarea class="text-input" data-qid="' + q.id + '" placeholder="' + UI.answer + '"></textarea>';
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
          html += '</div><div class="scale-labels"><span>' + min + ' — ' + UI.low + '</span><span>' + UI.high + ' — ' + max + '</span></div>';
        }

        html += '<div class="error-msg" id="err-' + q.id + '">' + UI.required + '</div>';
        html += '</div>';
      });

      html += '<div class="submit-bar"><button class="btn-submit" id="btnSubmit">' + UI.submit + '</button></div>';
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

      document.getElementById('app').innerHTML = '<div class="success-screen"><h2 class="success-title">' + UI.successTitle + '</h2><p class="success-msg">' + UI.successMsg + '</p></div>';
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
  header.textContent   = t('responsesCollected', { count: total, plural: plural(total) });
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
        ? textAnswers.map(a => `<div class="response-text-answer">${escapeHtml(localizeDemoText(a))}</div>`).join('')
        : `<p style="color:var(--text-muted);font-size:13px;">${escapeHtml(t('noAnswersYet'))}</p>`;

    } else if (q.type === 'mc') {
      const counts = {};
      (q.options || []).forEach(o => { counts[o] = 0; });
      allAnswers.forEach(a => { if (counts[a] !== undefined) counts[a]++; });
      contentHtml = (q.options || []).map(opt => {
        const count = counts[opt] || 0;
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
        return `<div class="response-bar-row">
          <span class="response-bar-label">${escapeHtml(localizeDemoText(opt))}</span>
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
          <span class="response-bar-label">${escapeHtml(localizeDemoText(opt))}</span>
          <div class="response-bar-track"><div class="response-bar-fill" style="width:${pct}%"></div></div>
          <span class="response-bar-pct">${pct}% (${count})</span>
        </div>`;
      }).join('');

    } else if (q.type === 'scale') {
      const nums = allAnswers.filter(a => typeof a === 'number');
      if (nums.length === 0) {
        contentHtml = `<p style="color:var(--text-muted);font-size:13px;">${escapeHtml(t('noAnswersYet'))}</p>`;
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
          <div class="response-scale-sub">${escapeHtml(t('avgOutOf', { max: q.scaleMax || 5, count: nums.length, plural: plural(nums.length) }))}</div>
          ${distHtml}
        `;
      }
    }

    block.innerHTML = `
      <div class="response-q-label">${escapeHtml(localizeDemoText(q.label))}</div>
      <span class="response-count-note">${escapeHtml(t('answeredCount', { answered: allAnswers.length, total }))}</span>
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
  dlBtn.textContent = t('downloadQr');
  dlBtn.addEventListener('click', () => {
    setTimeout(() => {
      const canvas = wrap.querySelector('canvas');
      if (!canvas) { alert(t('qrNotReady')); return; }
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

  document.querySelector('.language-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.language-option');
    if (btn) setLanguage(btn.dataset.lang);
  });

  // New project
  document.getElementById('btnNewProject').addEventListener('click', openNewProject);
  document.getElementById('btnNewProjectEmpty').addEventListener('click', openNewProject);
  document.getElementById('btnLoadDemoEmpty').addEventListener('click', loadDemoData);
  document.getElementById('btnLoadDemo').addEventListener('click', loadDemoData);
  document.getElementById('btnResetDemo').addEventListener('click', resetDemoData);
  document.getElementById('btnAboutBack').addEventListener('click', () => navigateToSection('journal'));
  document.getElementById('btnDismissDemoBanner').addEventListener('click', () => document.getElementById('demoBanner').classList.add('hidden'));
  document.getElementById('btnCopyMarkdown').addEventListener('click', copyMarkdownSummary);
  document.getElementById('btnCopyAiPrompt').addEventListener('click', copyAiPrompt);
  document.getElementById('btnHeaderEntry').addEventListener('click', openNewEntry);
  document.getElementById('btnHeaderSummary').addEventListener('click', () => navigateToSection('summary'));

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
  return new Date(iso).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
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
