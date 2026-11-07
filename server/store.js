import fs from "node:fs";
import path from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { validateState, makeDraft } from "../src/model.js";
const empty = () => ({ version: 1, prospects: [], drafts: [], activities: [] });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
export function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "workspace.json"),
    tokenFile = path.join(dir, "agent-token");
  if (!fs.existsSync(tokenFile))
    fs.writeFileSync(tokenFile, randomBytes(32).toString("hex"), {
      mode: 0o600,
    });
  const token = fs.readFileSync(tokenFile, "utf8").trim();
  let doc = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : { revision: 0, state: empty(), migrations: [] };
  if (!validateState(doc.state))
    throw Error("Invalid server data; refusing to overwrite workspace.json");
  function commit(state, migrations = doc.migrations) {
    if (!validateState(state)) fail("Invalid workspace data");
    const next = { revision: doc.revision + 1, state, migrations };
    const temp = file + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(next, null, 2));
    fs.renameSync(temp, file);
    doc = next;
    return snapshot();
  }
  const snapshot = () =>
    structuredClone({ revision: doc.revision, state: doc.state });
  function migrate({ migrationId, state }) {
    if (typeof migrationId !== "string" || !validateState(state))
      fail("Invalid migration");
    if (doc.migrations.includes(migrationId)) return snapshot();
    fs.mkdirSync(path.join(dir, "migration-backups"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "migration-backups", randomUUID() + ".json"),
      JSON.stringify(state, null, 2),
    );
    const next = structuredClone(doc.state),
      ids = new Map();
    for (const p of state.prospects) {
      const old = next.prospects.find((x) => x.id === p.id);
      let id = p.id;
      if (old && !same(old, p)) id = randomUUID();
      ids.set(p.id, id);
      if (!old || id !== p.id) next.prospects.push({ ...p, id });
    }
    for (const key of ["drafts", "activities"])
      for (const row of state[key]) {
        const mapped = { ...row, prospectId: ids.get(row.prospectId) };
        const old = next[key].find((x) => x.id === row.id);
        if (!old) next[key].push(mapped);
        else if (!same(old, mapped))
          next[key].push({ ...mapped, id: randomUUID() });
      }
    return commit(next, [...doc.migrations, migrationId]);
  }
  function sync({ base, state }) {
    if (!validateState(base) || !validateState(state))
      fail("Invalid workspace data");
    const next = structuredClone(doc.state);
    for (const key of ["prospects", "drafts", "activities"]) {
      const before = new Map(base[key].map((x) => [x.id, x])),
        after = new Map(state[key].map((x) => [x.id, x]));
      for (const id of new Set([...before.keys(), ...after.keys()])) {
        const a = before.get(id),
          b = after.get(id);
        if (same(a, b)) continue;
        const current = next[key].find((x) => x.id === id);
        if (!same(a, current) && !same(b, current))
          fail(
            "Another writer changed this record. Export your local work and reload before retrying.",
            409,
          );
        next[key] = next[key].filter((x) => x.id !== id);
        if (b) next[key].push(b);
      }
    }
    return commit(next);
  }
  function action({ tool, args = {} }) {
    if (tool === "list_prospects")
      return doc.state.prospects.filter(
        (p) =>
          !args.query ||
          `${p.company} ${p.contact}`
            .toLowerCase()
            .includes(String(args.query).toLowerCase()),
      );
    if (tool === "get_state") return snapshot();
    const next = structuredClone(doc.state),
      now = new Date().toISOString();
    let result;
    const activity = (id, text, kind = "Update") =>
      next.activities.unshift({
        id: randomUUID(),
        prospectId: id,
        text,
        kind,
        at: now,
      });
    if (tool === "create_prospect") {
      if (typeof args.company !== "string" || !args.company.trim())
        fail("company is required");
      if (
        next.prospects.some(
          (p) =>
            p.company.trim().toLowerCase() ===
            args.company.trim().toLowerCase(),
        )
      )
        fail("Company already exists. Find its ID and update it.", 409);
      result = {
        contact: "",
        role: "",
        email: "",
        industry: "",
        problem: "",
        nextAction: "",
        due: "",
        stage: "New",
        priority: "Medium",
        value: 0,
        source: "User-provided",
        ...args,
        id: randomUUID(),
        company: args.company.trim(),
        createdAt: now,
      };
      next.prospects.push(result);
      activity(result.id, "Prospect created by Switch agent.");
    } else if (tool === "update_prospect") {
      const p = next.prospects.find((p) => p.id === args.id);
      if (!p) fail("Prospect not found", 404);
      const allowed = [
        "company",
        "contact",
        "role",
        "email",
        "industry",
        "problem",
        "nextAction",
        "due",
        "stage",
        "priority",
        "value",
      ];
      if (
        !args.changes ||
        Object.keys(args.changes).some((k) => !allowed.includes(k))
      )
        fail("Invalid prospect fields");
      Object.assign(p, args.changes);
      result = p;
      activity(p.id, "Prospect updated by Switch agent.");
    } else if (tool === "log_activity") {
      if (!next.prospects.some((p) => p.id === args.prospectId))
        fail("Prospect not found", 404);
      if (typeof args.text !== "string" || !args.text.trim())
        fail("text is required");
      activity(args.prospectId, args.text, args.kind || "Note");
      result = next.activities[0];
    } else if (tool === "save_draft") {
      const p = next.prospects.find((p) => p.id === args.prospectId);
      if (!p) fail("Prospect not found", 404);
      let draft = args.id
        ? next.drafts.find((d) => d.id === args.id && d.prospectId === p.id)
        : null;
      if (args.id && !draft) fail("Draft not found for this prospect", 404);
      if (!draft) {
        draft = makeDraft(p);
        next.drafts.unshift(draft);
      }
      for (const key of ["subject", "body"])
        if (args[key] !== undefined) {
          if (typeof args[key] !== "string" || !args[key].trim())
            fail(key + " must be nonempty text");
          draft[key] = args[key];
        }
      draft.status = "Draft";
      draft.updatedAt = now;
      result = draft;
      activity(p.id, "Draft saved by Switch agent. No message sent.", "Draft");
    } else
      fail(
        "Unknown tool. Available: list_prospects, get_state, create_prospect, update_prospect, log_activity, save_draft",
      );
    commit(next);
    return { result, revision: doc.revision, outreachStatus: "DRAFT ONLY" };
  }
  return { token, snapshot, migrate, sync, action };
}
