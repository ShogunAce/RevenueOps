export const STAGES = [
  "New",
  "Qualified",
  "Discovery",
  "Proposal",
  "Won",
  "Lost",
];
export const PROBABILITY = {
  New: 0.1,
  Qualified: 0.25,
  Discovery: 0.5,
  Proposal: 0.75,
  Won: 1,
  Lost: 0,
};
export const STORAGE_KEY = "css-revenueops.v1";
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
export const isOpen = (p) => !["Won", "Lost"].includes(p.stage);
export const uid = () => crypto.randomUUID();
export function metrics(prospects) {
  const open = prospects.filter(isOpen);
  return {
    open: open.length,
    pipeline: open.reduce((n, p) => n + p.value, 0),
    weighted: open.reduce((n, p) => n + p.value * PROBABILITY[p.stage], 0),
    won: prospects
      .filter((p) => p.stage === "Won")
      .reduce((n, p) => n + p.value, 0),
  };
}
export function createSeed() {
  const date = today();
  const rows = [
    [
      "Alder Demo Consulting",
      "Mara Ellis",
      "Operations director",
      "Consulting",
      "Discovery",
      8400,
      "High",
      "Two hours per week spent copying inbound inquiries into a spreadsheet.",
      "Map the inquiry handoff",
    ],
    [
      "Northline Studio",
      "Theo Mercer",
      "Founder",
      "Design services",
      "Proposal",
      12500,
      "High",
      "Project leads arrive through three disconnected inboxes.",
      "Review the proposal",
    ],
    [
      "Fieldwork Partners",
      "Simone Reed",
      "Head of growth",
      "Professional services",
      "Qualified",
      6200,
      "Medium",
      "Follow-up ownership is unclear after introductory calls.",
      "Schedule discovery",
    ],
    [
      "Morrow Supply Co.",
      "Elias Brooks",
      "Sales manager",
      "Wholesale",
      "New",
      4800,
      "Medium",
      "Quotes are tracked manually and difficult to follow up.",
      "Confirm the workflow",
    ],
    [
      "Cedar House Creative",
      "Nina Vale",
      "Managing partner",
      "Creative services",
      "Discovery",
      9600,
      "High",
      "Weekly reporting requires combining several spreadsheets.",
      "Document reporting needs",
    ],
    [
      "Briar & Finch",
      "Owen Hart",
      "Founder",
      "Consulting",
      "Won",
      7200,
      "Low",
      "A shared intake process for new client requests.",
      "Plan onboarding",
    ],
    [
      "Stillwater Works",
      "Lena Park",
      "Operations lead",
      "Manufacturing",
      "Qualified",
      15800,
      "Medium",
      "Sales and delivery teams use separate customer records.",
      "Identify key stakeholders",
    ],
    [
      "Westward Collective",
      "Remy Cole",
      "Studio director",
      "Design services",
      "Lost",
      5400,
      "Low",
      "A single place to track new business conversations.",
      "Revisit next quarter",
    ],
  ];
  const prospects = rows.map((r, i) => ({
    id: `sample-${i}`,
    company: r[0],
    contact: r[1],
    role: r[2],
    industry: r[3],
    stage: r[4],
    value: r[5],
    priority: r[6],
    problem: r[7],
    nextAction: r[8],
    due: date,
    email: "",
    source: "Fictional sample",
    createdAt: new Date().toISOString(),
  }));
  return {
    version: 1,
    prospects,
    drafts: [],
    activities: [
      {
        id: uid(),
        prospectId: "sample-0",
        kind: "Note",
        text: "Estimate corrected from five hours to two hours per week. User-provided information; not independently verified.",
        at: new Date().toISOString(),
      },
    ],
  };
}
export function validateState(s) {
  const validTime = (value) =>
    typeof value === "string" && !Number.isNaN(Date.parse(value));
  const uniqueIds = (rows) =>
    rows.every(
      (row) => row && typeof row.id === "string" && row.id.length > 0,
    ) && new Set(rows.map((row) => row.id)).size === rows.length;
  return (
    s?.version === 1 &&
    Array.isArray(s.prospects) &&
    Array.isArray(s.drafts) &&
    Array.isArray(s.activities) &&
    [s.prospects, s.drafts, s.activities].every(uniqueIds) &&
    s.prospects.every(
      (p) =>
        typeof p.id === "string" &&
        typeof p.company === "string" &&
        p.company.trim().length > 0 &&
        ["High", "Medium", "Low"].includes(p.priority) &&
        validTime(p.createdAt) &&
        (p.due === "" ||
          (/^\d{4}-\d{2}-\d{2}$/.test(p.due) && validTime(p.due))) &&
        STAGES.includes(p.stage) &&
        Number.isFinite(p.value) &&
        p.value >= 0 &&
        [
          "contact",
          "role",
          "industry",
          "priority",
          "problem",
          "nextAction",
          "due",
          "email",
          "source",
        ].every((k) => typeof p[k] === "string"),
    ) &&
    s.drafts.every(
      (d) =>
        typeof d.id === "string" &&
        typeof d.prospectId === "string" &&
        typeof d.subject === "string" &&
        typeof d.body === "string" &&
        validTime(d.updatedAt) &&
        s.prospects.some((p) => p.id === d.prospectId) &&
        ["Draft", "Reviewed"].includes(d.status),
    ) &&
    s.activities.every(
      (a) =>
        typeof a.id === "string" &&
        typeof a.prospectId === "string" &&
        typeof a.text === "string" &&
        typeof a.kind === "string" &&
        validTime(a.at) &&
        s.prospects.some((p) => p.id === a.prospectId),
    )
  );
}
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: createSeed(), error: "" };
    const data = JSON.parse(raw);
    if (!validateState(data)) throw new Error("Invalid saved data");
    return { data, error: "" };
  } catch {
    return {
      data: { version: 1, prospects: [], drafts: [], activities: [] },
      error:
        "Saved data could not be loaded. To protect it, saving is paused. Export any current work, then reload or restore a valid backup in Settings.",
      locked: true,
    };
  }
}
export function makeDraft(p) {
  return {
    id: uid(),
    prospectId: p.id,
    subject: `A question about ${p.company}’s workflow`,
    body: `Hi ${p.contact.split(" ")[0] || "there"},\n\n${p.problem ? `Based on the information shared with us: ${p.problem}` : `I’m reaching out to learn more about the operations workflow at ${p.company}.`}\n\nWould you be open to a brief conversation about where the process takes the most time and what a better handoff would look like?\n\nBest,\nCole\nCole Slay Solutions`,
    status: "Draft",
    updatedAt: new Date().toISOString(),
  };
}
