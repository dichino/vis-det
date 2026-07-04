export type AccentColor = 'yellow' | 'lavender' | 'sky' | 'mint' | 'peach'

export const project = {
  name: 'Nabolagets kraft',
  period: 'January 2025 – June 2026',
  description:
    'Recurring local meeting point for social entrepreneurs, residents and partners to build networks, share learning and develop local initiatives.',
  lastUpdated: '24 Jun 2026',
}

export const projects = [
  { name: 'Nabolagets kraft', entries: 21, active: true },
  { name: 'Ungdomsworkshop', entries: 9, active: false },
  { name: 'Mentorprogram', entries: 6, active: false },
]

export const metrics = [
  { label: 'Entries', value: '21', accent: 'sky' as AccentColor },
  { label: 'People Reached', value: '704', accent: 'mint' as AccentColor },
  { label: 'Attachments', value: '11', accent: 'peach' as AccentColor },
  { label: 'Surveys', value: '3', accent: 'lavender' as AccentColor },
]

export const topTags = [
  { tag: 'workshop', count: 6 },
  { tag: 'innsikt', count: 5 },
  { tag: 'nettverk', count: 5 },
  { tag: 'nabolag', count: 4 },
  { tag: 'partnerskap', count: 4 },
  { tag: 'læring', count: 4 },
]

export type JournalEntry = {
  title: string
  summary: string
  reached: number
  tags: string[]
  date: string
  accent: AccentColor
}

export const journalEntries: JournalEntry[] = [
  {
    title: 'Reporting preparation',
    summary:
      'Summarized the strongest signals of change and listed evidence gaps for the next reporting period.',
    reached: 12,
    tags: ['dokumentasjon', 'innsikt', 'rapportering'],
    date: '24 Jun 2026',
    accent: 'lavender',
  },
  {
    title: 'Peer learning meetup',
    summary:
      'Participants shared progress and named confidence, contacts and structure as useful outcomes.',
    reached: 26,
    tags: ['ungdom', 'nettverk'],
    date: '20 Feb 2026',
    accent: 'mint',
  },
  {
    title: 'Follow-up mentoring',
    summary:
      'Participants asked for practical help with budgeting, outreach and presenting their ideas.',
    reached: 18,
    tags: ['ungdom', 'mentor', 'oppfølging'],
    date: '2 Nov 2025',
    accent: 'sky',
  },
  {
    title: 'Youth workshop pilot',
    summary:
      'Young participants mapped local challenges and sketched small initiatives they could test.',
    reached: 22,
    tags: ['workshop', 'ungdom', 'læring'],
    date: '18 Sep 2025',
    accent: 'yellow',
  },
  {
    title: 'Partner breakfast',
    summary:
      'Local partners discussed collaboration opportunities and shared concrete support needs.',
    reached: 34,
    tags: ['partnerskap', 'nettverk', 'nabolag'],
    date: '12 Aug 2025',
    accent: 'peach',
  },
  {
    title: 'Local initiative mapping',
    summary:
      'Residents and entrepreneurs mapped neighbourhood needs and possible early-stage initiatives.',
    reached: 41,
    tags: ['innsikt', 'nabolag', 'workshop'],
    date: '3 Jun 2025',
    accent: 'mint',
  },
]

export type Survey = {
  title: string
  category: string
  description: string
  questions: number
  responses: number
  status: 'Active' | 'Draft'
  accent: AccentColor
}

export const surveys: Survey[] = [
  {
    title: 'Partner follow-up pulse',
    category: 'Feedback collection',
    description: 'Short follow-up survey after collaboration meetings.',
    questions: 3,
    responses: 5,
    status: 'Active',
    accent: 'sky',
  },
  {
    title: 'Youth workshop reflection',
    category: 'Learning feedback',
    description:
      'Captures what young participants learned and what support they need next.',
    questions: 4,
    responses: 7,
    status: 'Draft',
    accent: 'mint',
  },
  {
    title: 'Mentor session check-in',
    category: 'Follow-up',
    description: 'Simple pulse check after mentoring sessions.',
    questions: 3,
    responses: 3,
    status: 'Active',
    accent: 'lavender',
  },
]

export const summary = {
  narrative:
    'Between January 2025 and June 2026, Nabolagets kraft documented 21 activities and reached 704 people through workshops, insight work, neighbourhood meetings, partner conversations and learning activities. The journal entries show recurring work around local network building, mentorship, youth participation and early-stage social entrepreneurship. Survey responses and imported evidence support the reporting workflow, while remaining local and draft-level.',
  themes: [
    'Local network building',
    'Youth participation',
    'Mentorship and follow-up',
    'Community learning',
    'Partner collaboration',
    'Early-stage social entrepreneurship',
  ],
  signals: [
    'Participants repeatedly described the meeting point as useful for building confidence, contacts and local belonging.',
    'Several local ideas moved from informal discussion to concrete follow-up actions with mentors or partners.',
    'Partner conversations created new opportunities for collaboration and resource sharing.',
    'Youth workshops helped participants map challenges and express what kind of support they need next.',
  ],
  gaps: [
    'More direct participant quotes would strengthen the next report.',
    'Survey response volume is still low compared with total reach.',
    'Attachment metadata should be more consistently linked to specific outcomes.',
    'Follow-up evidence is needed to show what happened after workshops and mentoring sessions.',
  ],
  nextSteps: [
    'Collect 5–10 stronger participant quotes.',
    'Add follow-up notes to the highest-impact journal entries.',
    'Import remaining survey responses.',
    'Tag evidence consistently across projects.',
    'Prepare a reporting-ready export for review.',
    'Use the copied AI prompt only in a secure backend/serverless AI workflow.',
  ],
  summaryMetrics: [
    { label: 'People Reached', value: '704', accent: 'mint' as AccentColor },
    { label: 'Entries', value: '21', accent: 'sky' as AccentColor },
    { label: 'Surveys', value: '3', accent: 'lavender' as AccentColor },
    { label: 'Attachments', value: '11', accent: 'peach' as AccentColor },
    { label: 'Top tag', value: 'workshop', accent: 'yellow' as AccentColor },
  ],
}

export const accentStrip: Record<AccentColor, string> = {
  yellow: 'bg-yellow',
  lavender: 'bg-lavender',
  sky: 'bg-sky',
  mint: 'bg-mint',
  peach: 'bg-peach',
}

export const accentSoft: Record<AccentColor, string> = {
  yellow: 'bg-yellow/25 text-ink',
  lavender: 'bg-lavender-soft text-navy',
  sky: 'bg-sky-soft text-navy',
  mint: 'bg-mint-soft text-ink',
  peach: 'bg-peach/40 text-ink',
}
