import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(useGSAP, ScrollTrigger);
import { createRoot } from "react-dom/client";
import {
  SquaresFour,
  Users,
  Kanban,
  NotePencil,
  ClockCounterClockwise,
  GearSix,
  Plus,
  ArrowUpRight,
  ArrowRight,
  MagnifyingGlass,
  X,
  Check,
  Copy,
  DownloadSimple,
  ShieldCheck,
  CaretRight,
  Tray,
  CheckCircle,
  IconContext,
} from "@phosphor-icons/react";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./styles.css";
import { useShared } from "./shared";
import {
  STAGES,
  PROBABILITY,
  STORAGE_KEY,
  today,
  money,
  isOpen,
  uid,
  metrics,
  loadState,
  validateState,
  makeDraft,
} from "./model";

const NAV = [
  ["Overview", SquaresFour],
  ["Prospects", Users],
  ["Pipeline", Kanban],
  ["Drafts", NotePencil],
  ["Activity", ClockCounterClockwise],
];
const initials = (s) =>
  s
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0])
    .join("");
const dateLabel = (s) =>
  s
    ? new Date(`${s}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "No date";
const timestamp = (s) =>
  new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
// Kenosis frame mark: corner brackets around a rising signal.
function Mark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M11 4H5a1 1 0 0 0-1 1v6m17-7h6a1 1 0 0 1 1 1v6M4 21v6a1 1 0 0 0 1 1h6m10 0h6a1 1 0 0 0 1-1v-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9.5 21.5l4.5-4.5 3.5 3 5-6.5m0 0h-3.5m3.5 0v3.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
// Eases a number from its last rendered value to the new one.
function CountUp({ value, format }) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  const from = useRef(reducedMotion() ? value : 0);
  useEffect(() => {
    if (reducedMotion() || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    const state = { v: start };
    const tween = gsap.to(state, {
      v: value,
      duration: 1.1,
      ease: "expo.out",
      onUpdate: () => setShown(Math.round(state.v)),
      onComplete: () => setShown(value),
    });
    from.current = value;
    return () => tween.kill();
  }, [value]);
  return format(shown);
}
// One delegated listener drives the cursor spotlight and magnetic primary buttons.
function usePointerFx() {
  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    let magnet = null;
    const release = () => {
      if (!magnet) return;
      magnet.style.removeProperty("--tx");
      magnet.style.removeProperty("--ty");
      magnet = null;
    };
    const move = (e) => {
      const glow = e.target.closest?.(".spotlight");
      if (glow) {
        const r = glow.getBoundingClientRect();
        glow.style.setProperty("--mx", `${e.clientX - r.left}px`);
        glow.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      const button = e.target.closest?.(".button.primary, .button.dark");
      if (button !== magnet) release();
      if (!button || button.disabled || reducedMotion()) return;
      magnet = button;
      const r = button.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      button.style.setProperty("--tx", `${(x * 6).toFixed(2)}px`);
      button.style.setProperty("--ty", `${(y * 4 - 1).toFixed(2)}px`);
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", release);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", release);
    };
  }, []);
}
const Trail = ({ icon: Icon = ArrowRight }) => (
  <span className="btn-icon" aria-hidden="true">
    <Icon weight="regular" />
  </span>
);
const HEADLINES = {
  Overview: ["A clearer path", "to your next client."],
  Prospects: ["Know the people.", "Hold the context."],
  Pipeline: ["See every stage.", "Move with intent."],
  Drafts: ["Write it once.", "Review it twice."],
  Activity: ["Every touchpoint.", "Remembered."],
  Settings: ["Your workspace.", "Your control."],
};
function Badge({ children, type = "" }) {
  return (
    <span className={`badge ${type || String(children).toLowerCase()}`}>
      {children}
    </span>
  );
}
function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <Tray size={32} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "wide" : ""}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function ProspectForm({ prospect, onSave, onClose }) {
  const [p, setP] = useState(
    prospect || {
      company: "",
      contact: "",
      role: "",
      email: "",
      industry: "",
      stage: "New",
      value: 0,
      priority: "Medium",
      problem: "",
      nextAction: "",
      due: "",
      source: "User-provided",
    },
  );
  const set = (k, v) => setP({ ...p, [k]: v });
  const field = (key, label, type = "text", required = false) => (
    <label>
      {label}
      <input
        type={type}
        required={required}
        maxLength={type === "text" ? 200 : undefined}
        min={type === "number" ? 0 : undefined}
        max={type === "number" ? 1e12 : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={p[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </label>
  );
  return (
    <Modal
      title={prospect ? "Edit prospect" : "Add a prospect"}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!p.company.trim()) return;
          onSave({ ...p, company: p.company.trim(), value: Number(p.value) });
        }}
      >
        <div className="form-grid">
          {field("company", "Company", "text", true)}
          {field("contact", "Contact name")}
          {field("role", "Role")}
          {field("email", "Email", "email")}
          {field("industry", "Industry")}
          <label>
            Stage
            <select
              value={p.stage}
              onChange={(e) => set("stage", e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {field("value", "Opportunity value (USD)", "number", true)}
          <label>
            Priority
            <select
              value={p.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              {["High", "Medium", "Low"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="span-2">
            Business problem
            <textarea
              value={p.problem}
              maxLength={4000}
              rows={3}
              onChange={(e) => set("problem", e.target.value)}
              placeholder="What has the prospect shared?"
            />
            <small>
              Treat prospect details as user-provided, not independently
              verified.
            </small>
          </label>
          {field("nextAction", "Next action")}
          {field("due", "Follow-up date", "date")}
        </div>
        <div className="dialog-foot">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            {prospect ? "Save changes" : "Create prospect"}
            <Trail />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function App() {
  const [initial] = useState(loadState);
  const [data, setData] = useState(initial.data);
  const [storageError, setStorageError] = useState(initial.error);
  const [locked, setLocked] = useState(initial.locked || false);
  const sharedStatus = useShared(data, setData, locked);
  const [page, setPage] = useState(
    () => decodeURIComponent(location.hash.slice(1)) || "Overview",
  );
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("All stages");
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [toast, setToast] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("Note");
  const [confirm, setConfirm] = useState(null);
  const importRef = useRef(null);
  usePointerFx();
  useEffect(() => {
    if (locked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError("");
    } catch {
      setStorageError(
        "Changes are only in memory: browser storage is unavailable or full. Export a backup before closing this tab.",
      );
    }
  }, [data, locked]);
  useEffect(() => {
    const onHash = () =>
      setPage(decodeURIComponent(location.hash.slice(1)) || "Overview");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  const go = (p) => {
    setPage(p);
    location.hash = p;
    setQuery("");
    setStage("All stages");
  };
  const log = (id, text, kind = "Update") => ({
    id: uid(),
    prospectId: id,
    kind,
    text,
    at: new Date().toISOString(),
  });
  const saveProspect = (p) => {
    const id = p.id || uid();
    const existing = !!p.id;
    setData((d) => ({
      ...d,
      prospects: existing
        ? d.prospects.map((x) => (x.id === id ? p : x))
        : [...d.prospects, { ...p, id, createdAt: new Date().toISOString() }],
      activities: [
        log(id, existing ? "Prospect details updated." : "Prospect created."),
        ...d.activities,
      ],
    }));
    setForm(null);
    setToast(existing ? "Prospect updated" : "Prospect added");
  };
  const move = (p, s) => {
    if (p.stage === s) return;
    setData((d) => ({
      ...d,
      prospects: d.prospects.map((x) =>
        x.id === p.id ? { ...x, stage: s } : x,
      ),
      activities: [
        log(p.id, `Stage changed from ${p.stage} to ${s}.`),
        ...d.activities,
      ],
    }));
    setToast(`Moved to ${s}`);
  };
  const generate = (p) => {
    const draft = makeDraft(p);
    setData((d) => ({
      ...d,
      drafts: [draft, ...d.drafts],
      activities: [
        log(
          p.id,
          "Outreach draft created from a local template. No message sent.",
          "Draft",
        ),
        ...d.activities,
      ],
    }));
    setSelected(null);
    setDraftId(draft.id);
    go("Drafts");
    setToast("Draft created for your review");
  };
  const exportData = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `css-revenueops-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Backup exported");
  };
  const restore = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 5e6) throw Error("Backup must be under 5 MB.");
      const s = JSON.parse(await file.text());
      if (!validateState(s))
        throw Error("This is not a valid RevenueOps backup.");
      setConfirm({
        title: "Restore backup?",
        text: `Replace this workspace with ${s.prospects.length} prospects, ${s.drafts.length} drafts, and ${s.activities.length} activities? Export your current work first if you need to keep it.`,
        action: () => {
          setLocked(false);
          setData(s);
          setSelected(null);
          setDraftId(null);
          setToast("Backup restored");
        },
      });
    } catch (err) {
      setToast(err.message || "Could not read backup");
    }
  };
  const stats = metrics(data.prospects);
  const filtered = data.prospects.filter(
    (p) =>
      (stage === "All stages" || p.stage === stage) &&
      `${p.company} ${p.contact} ${p.industry}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const due = data.prospects
    .filter((p) => isOpen(p) && p.due && p.due <= today())
    .sort((a, b) => a.due.localeCompare(b.due));
  const p = data.prospects.find((x) => x.id === selected);
  const activeDraft =
    data.drafts.find((x) => x.id === draftId) || data.drafts[0];
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rise = {
          y: 28,
          opacity: 0,
          filter: "blur(8px)",
          duration: 0.95,
          ease: "expo.out",
          clearProps: "filter,transform,opacity",
        };
        gsap.from(".page-heading .eyebrow, .page-heading h1 > span", {
          ...rise,
          y: 40,
          stagger: 0.08,
        });
        gsap.from(".page-heading p, .heading-actions, .sample-banner", {
          ...rise,
          delay: 0.18,
          stagger: 0.06,
        });
        const above = gsap.utils
          .toArray(
            ".metric, .overview-grid > *, .pipeline-summary > span, .kanban-column, .draft-notice, .draft-workspace, main > .panel, .settings-grid > *",
          )
          .filter((el) => el.getBoundingClientRect().top < innerHeight);
        gsap.from(above, { ...rise, delay: 0.25, stagger: 0.06 });
        if (document.querySelector(".chart-bar"))
          gsap.from(".chart-bar", {
            scaleY: 0,
            duration: 1.3,
            delay: 0.45,
            stagger: 0.07,
            ease: "expo.out",
          });
        gsap.utils
          .toArray(".overview-bottom > .panel, .page-footer")
          .forEach((el) =>
            gsap.from(el, {
              ...rise,
              scrollTrigger: { trigger: el, start: "top 92%", once: true },
            }),
          );
      });
      return () => mm.revert();
    },
    { dependencies: [page], revertOnUpdate: true },
  );
  const title =
    NAV.some((x) => x[0] === page) || page === "Settings" ? page : "Overview";
  const company = (id) =>
    data.prospects.find((p) => p.id === id)?.company || "Deleted prospect";
  function activityList(items) {
    return items.length ? (
      <div className="activity-list">
        {items.map((a) => (
          <div className="activity-item" key={a.id}>
            <span className="activity-icon">
              {a.kind === "Draft" ? (
                <NotePencil size={17} />
              ) : a.kind === "Update" ? (
                <ArrowRight size={17} />
              ) : (
                <ClockCounterClockwise size={17} />
              )}
            </span>
            <div>
              <button
                className="text-button"
                onClick={() => setSelected(a.prospectId)}
              >
                {company(a.prospectId)}
              </button>
              <p>{a.text}</p>
              <small>
                {a.kind} <span>·</span> {timestamp(a.at)}
              </small>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <Empty title="A clean slate">
        Notes and changes will appear here as you work.
      </Empty>
    );
  }
  const attention = Boolean(storageError || sharedStatus);
  const [lead, tail] = HEADLINES[title];
  return (
    <IconContext.Provider value={{ weight: "light" }}>
      <div className="app-shell">
        <div className="atmosphere" aria-hidden="true" />
        <div className="reading-progress" aria-hidden="true" />
        <a
          className="skip-link"
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("main-content").focus();
          }}
        >
          Skip to content
        </a>
        <aside className="sidebar">
          <a href="#Overview" className="brand" onClick={() => go("Overview")}>
            <span className="brand-mark">
              <Mark />
            </span>
            <div>
              RevenueOps<span className="period">.</span>
              <small>COLE SLAY SOLUTIONS</small>
            </div>
          </a>
          <div className="workspace-label">
            WORKSPACE <span>01</span>
          </div>
          <nav aria-label="Main navigation">
            {NAV.map(([n, Icon]) => (
              <button
                key={n}
                aria-label={n}
                className={`nav-item ${title === n ? "active" : ""}`}
                onClick={() => go(n)}
              >
                <Icon size={21} />
                <span>{n}</span>
                {n === "Drafts" && data.drafts.length > 0 && (
                  <b>{data.drafts.length}</b>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="safety-card">
              <ShieldCheck size={24} />
              <strong>Context before contact.</strong>
              <p>
                Every message stays a draft.
                <br />
                People stay in control.
              </p>
              <span className="mono">DRAFT-ONLY MODE</span>
            </div>
            <button
              className={`nav-item ${title === "Settings" ? "active" : ""}`}
              onClick={() => go("Settings")}
            >
              <GearSix size={21} />
              Settings
            </button>
            <div className="profile">
              <span className="avatar">CS</span>
              <div>
                Cole Slay<small>Personal workspace</small>
              </div>
              <span className="status-dot" />
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              Workspace <CaretRight size={13} />
              <span>{title}</span>
            </div>
            <div className="topbar-right">
              <span className="local-status">
                <span className={`status-dot ${attention ? "warn" : ""}`} />
                {storageError
                  ? "Storage needs attention"
                  : sharedStatus
                    ? "Sync needs attention"
                    : "Shared workspace connected"}
              </span>
              <button
                className="icon-button"
                aria-label="Workspace settings"
                onClick={() => go("Settings")}
              >
                <GearSix size={19} />
              </button>
              <span className="top-avatar">CS</span>
            </div>
          </header>
          <main id="main-content" tabIndex={-1}>
            {(storageError || sharedStatus) && (
              <div role="alert" className="warning">
                {storageError || sharedStatus}{" "}
                <button className="text-button" onClick={exportData}>
                  Export backup
                </button>
              </div>
            )}
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span>
                    <Mark />
                  </span>
                  Context before contact
                </div>
                <h1>
                  <span>{lead}</span> <span className="muted-line">{tail}</span>
                </h1>
                <p>
                  {
                    {
                      Overview:
                        "Keep the right conversations moving. One thoughtful step at a time.",
                      Prospects:
                        "Know the people, the problems, and the next step.",
                      Pipeline: "See where every opportunity stands.",
                      Drafts: "Make every first impression a considered one.",
                      Activity: "The context behind every conversation.",
                      Settings: "Your workspace, your data, your control.",
                    }[title]
                  }
                </p>
              </div>
              <div className="heading-actions">
                {title !== "Settings" && (
                  <button
                    className="button primary"
                    onClick={() => setForm({})}
                  >
                    Add prospect
                    <Trail icon={Plus} />
                  </button>
                )}
              </div>
            </div>
            {data.prospects.some((p) => p.source === "Fictional sample") && (
              <div className="sample-banner">
                <span>
                  <span className="sample-dot" />
                  Demo workspace{" "}
                  <span className="muted">
                    · Fictional prospects to help you explore.
                  </span>
                </span>
                <button className="text-button" onClick={() => go("Settings")}>
                  Manage data <ArrowRight size={14} />
                </button>
              </div>
            )}
            {title === "Overview" && (
              <>
                <section className="metrics-grid" aria-label="Pipeline metrics">
                  {[
                    [
                      "Open pipeline",
                      stats.pipeline,
                      `${stats.open} active opportunities`,
                    ],
                    [
                      "Weighted forecast",
                      stats.weighted,
                      "Based on stage probabilities",
                    ],
                    [
                      "Won revenue",
                      stats.won,
                      "Total value of won opportunities",
                    ],
                    ["Follow-ups due", due.length, "Today and overdue"],
                  ].map(([label, value, sub], i) => (
                    <div className="metric spotlight" key={label}>
                      <div>
                        {label}
                        {i === 3 ? <ClockCounterClockwise /> : <ArrowUpRight />}
                      </div>
                      <strong>
                        <CountUp
                          value={value}
                          format={
                            i === 3 ? (n) => String(n).padStart(2, "0") : money
                          }
                        />
                      </strong>
                      <small>{sub}</small>
                    </div>
                  ))}
                </section>
                <div className="overview-grid">
                  <section className="panel spotlight">
                    <div className="panel-head">
                      <div>
                        <h2>Pipeline at a glance</h2>
                        <p>From first conversation to a new partnership.</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => go("Pipeline")}
                      >
                        View pipeline <ArrowUpRight size={16} />
                      </button>
                    </div>
                    <div className="pipeline-chart">
                      {STAGES.slice(0, 5).map((s, i) => {
                        const group = data.prospects.filter(
                          (p) => p.stage === s,
                        );
                        const amount = group.reduce((n, p) => n + p.value, 0);
                        const max = Math.max(
                          1,
                          ...STAGES.slice(0, 5).map((st) =>
                            data.prospects
                              .filter((p) => p.stage === st)
                              .reduce((n, p) => n + p.value, 0),
                          ),
                        );
                        return (
                          <button
                            className="chart-col"
                            key={s}
                            onClick={() => {
                              go("Prospects");
                              setStage(s);
                            }}
                            aria-label={`${s}: ${group.length} prospects, ${money(amount)}`}
                          >
                            <span className="chart-value">{money(amount)}</span>
                            <div className="bar-track">
                              <div
                                className={`chart-bar bar-${i}`}
                                style={{ height: `${(amount / max) * 100}%` }}
                              />
                            </div>
                            <strong>{s}</strong>
                            <small>{group.length} prospects</small>
                          </button>
                        );
                      })}
                    </div>
                    <div className="chart-footer">
                      <span>
                        <span className="legend-dot" />
                        Opportunity value by stage
                      </span>
                      <span className="mono">USD</span>
                    </div>
                  </section>
                  <section className="focus-panel spotlight">
                    <div className="eyebrow plain">The next right step</div>
                    <h2>
                      Good relationships <span>start with follow-through.</span>
                    </h2>
                    <p>
                      You have <strong>{due.length} follow-ups</strong> ready
                      for your attention. Start with a conversation, not a
                      pitch.
                    </p>
                    <div className="focus-orbit" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <i />
                    </div>
                    <button
                      className="button dark"
                      onClick={() =>
                        document
                          .getElementById("follow-ups")
                          .scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      Review follow-ups <Trail />
                    </button>
                    <small>
                      <ShieldCheck size={16} />
                      No outreach is sent from this workspace.
                    </small>
                  </section>
                </div>
                <div className="overview-bottom">
                  <section className="panel spotlight" id="follow-ups">
                    <div className="panel-head">
                      <div>
                        <h2>
                          On your radar{" "}
                          <span className="count">{due.length}</span>
                        </h2>
                        <p>Due today and anything that needs a nudge.</p>
                      </div>
                      <ClockCounterClockwise size={20} />
                    </div>
                    {due.length ? (
                      <div className="follow-list">
                        {due.slice(0, 5).map((p) => (
                          <button
                            className="follow-item"
                            key={p.id}
                            onClick={() => setSelected(p.id)}
                          >
                            <span className="company-avatar">
                              {initials(p.company)}
                            </span>
                            <span className="grow">
                              <strong>{p.company}</strong>
                              <small>
                                {p.nextAction || "Set a next action"}
                              </small>
                            </span>
                            <span
                              className={
                                p.due < today() ? "due overdue" : "due"
                              }
                            >
                              {p.due === today() ? "Today" : dateLabel(p.due)}
                            </span>
                            <CaretRight size={16} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <Empty title="You’re all caught up">
                        Add a follow-up date to a prospect to bring it onto your
                        radar.
                      </Empty>
                    )}
                    {due.length > 5 && (
                      <button
                        className="text-button panel-link"
                        onClick={() => go("Prospects")}
                      >
                        View all prospects <ArrowRight />
                      </button>
                    )}
                  </section>
                  <section className="panel spotlight">
                    <div className="panel-head">
                      <div>
                        <h2>Recent activity</h2>
                        <p>A little context goes a long way.</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => go("Activity")}
                      >
                        View all <ArrowUpRight size={16} />
                      </button>
                    </div>
                    {activityList(data.activities.slice(0, 3))}
                  </section>
                </div>
              </>
            )}
            {title === "Prospects" && (
              <section className="panel spotlight">
                <div className="table-toolbar">
                  <label className="search">
                    <MagnifyingGlass size={19} />
                    <input
                      aria-label="Search prospects"
                      placeholder="Search companies, contacts, industries…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Filter by stage"
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                  >
                    {["All stages", ...STAGES].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <span className="muted">{filtered.length} prospects</span>
                </div>
                {filtered.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {[
                            "Company / contact",
                            "Stage",
                            "Value",
                            "Priority",
                            "Next follow-up",
                            "",
                          ].map((s, i) => (
                            <th key={i}>{s}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <button
                                className="company-cell"
                                onClick={() => setSelected(p.id)}
                              >
                                <span className="company-avatar">
                                  {initials(p.company)}
                                </span>
                                <span>
                                  <strong>{p.company}</strong>
                                  <small>
                                    {p.contact || "No contact"}
                                    {p.role && ` · ${p.role}`}
                                  </small>
                                </span>
                              </button>
                            </td>
                            <td>
                              <Badge>{p.stage}</Badge>
                            </td>
                            <td className="mono">{money(p.value)}</td>
                            <td>
                              <span
                                className={`priority ${p.priority.toLowerCase()}`}
                              >
                                ●
                              </span>{" "}
                              {p.priority}
                            </td>
                            <td>
                              <span
                                className={
                                  p.due && p.due < today() && isOpen(p)
                                    ? "overdue"
                                    : ""
                                }
                              >
                                {dateLabel(p.due)}
                              </span>
                              <small className="table-sub">
                                {p.nextAction || "No next action"}
                              </small>
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                aria-label={`Open ${p.company}`}
                                onClick={() => setSelected(p.id)}
                              >
                                <ArrowUpRight size={19} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty title="No prospects found">
                    Try another search or add your first prospect.
                  </Empty>
                )}
              </section>
            )}
            {title === "Pipeline" && (
              <>
                <div className="pipeline-summary">
                  <span>
                    <strong>{money(stats.pipeline)}</strong> open pipeline
                  </span>
                  <span>
                    <strong>{stats.open}</strong> active opportunities
                  </span>
                  <span className="muted">
                    Move opportunities using the stage menu on each card.
                  </span>
                </div>
                <div className="kanban">
                  {STAGES.map((s) => (
                    <section className="kanban-column" key={s}>
                      <div className="column-head">
                        <span>
                          <span className={`stage-dot ${s.toLowerCase()}`} />
                          {s}
                          <b>
                            {data.prospects.filter((p) => p.stage === s).length}
                          </b>
                        </span>
                        <strong>
                          {money(
                            data.prospects
                              .filter((p) => p.stage === s)
                              .reduce((n, p) => n + p.value, 0),
                          )}
                        </strong>
                      </div>
                      {data.prospects
                        .filter((p) => p.stage === s)
                        .map((p) => (
                          <article className="deal" key={p.id}>
                            <div className="deal-top">
                              <span className="company-avatar">
                                {initials(p.company)}
                              </span>
                              <span
                                className={`priority ${p.priority.toLowerCase()}`}
                                title={`${p.priority} priority`}
                              >
                                ●
                              </span>
                            </div>
                            <button
                              className="deal-name"
                              onClick={() => setSelected(p.id)}
                            >
                              {p.company}
                            </button>
                            <small>{p.contact || "No contact"}</small>
                            <strong className="deal-value mono">
                              {money(p.value)}
                            </strong>
                            <p>{p.nextAction || "Add a next action"}</p>
                            <div className="deal-footer">
                              <span>{dateLabel(p.due)}</span>
                              <select
                                aria-label={`Stage for ${p.company}`}
                                value={p.stage}
                                onChange={(e) => move(p, e.target.value)}
                              >
                                {STAGES.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          </article>
                        ))}
                      {!data.prospects.some((p) => p.stage === s) && (
                        <div className="column-empty">No opportunities yet</div>
                      )}
                    </section>
                  ))}
                </div>
              </>
            )}
            {title === "Drafts" && (
              <>
                <div className="draft-notice">
                  <ShieldCheck size={21} />
                  <div>
                    <strong>
                      Drafts stay here until you decide what’s next.
                    </strong>
                    <span>
                      Local templates use your prospect notes. Review every
                      detail before copying. Nothing is sent.
                    </span>
                  </div>
                </div>
                {data.drafts.length ? (
                  <div className="draft-workspace spotlight">
                    <div className="draft-list">
                      {data.drafts.map((d) => (
                        <button
                          key={d.id}
                          className={activeDraft?.id === d.id ? "selected" : ""}
                          onClick={() => setDraftId(d.id)}
                        >
                          <div>
                            <strong>{company(d.prospectId)}</strong>
                            <Badge>{d.status}</Badge>
                          </div>
                          <p>{d.subject}</p>
                          <small>{timestamp(d.updatedAt)}</small>
                        </button>
                      ))}
                    </div>
                    <DraftEditor
                      key={activeDraft.id}
                      draft={activeDraft}
                      onEdit={(draft) =>
                        setData((d) => ({
                          ...d,
                          drafts: d.drafts.map((x) =>
                            x.id === draft.id ? draft : x,
                          ),
                        }))
                      }
                      company={company(activeDraft.prospectId)}
                      onSave={(draft) => {
                        setData((d) => ({
                          ...d,
                          drafts: d.drafts.map((x) =>
                            x.id === draft.id ? draft : x,
                          ),
                          activities: [
                            log(
                              draft.prospectId,
                              `Outreach draft ${draft.status === "Reviewed" ? "reviewed" : "saved"}. No message sent.`,
                              "Draft",
                            ),
                            ...d.activities,
                          ],
                        }));
                        setToast(
                          draft.status === "Reviewed"
                            ? "Marked as reviewed — not sent"
                            : "Draft saved",
                        );
                      }}
                      onCopy={async (text) => {
                        try {
                          await navigator.clipboard.writeText(text);
                          setToast("Copied to clipboard — not sent");
                        } catch {
                          setToast(
                            "Clipboard unavailable. Select and copy the draft text manually.",
                          );
                        }
                      }}
                      onDelete={() =>
                        setConfirm({
                          title: "Delete this draft?",
                          text: "This removes the draft from this workspace. No prospect information will be changed.",
                          action: () => {
                            setData((d) => ({
                              ...d,
                              drafts: d.drafts.filter(
                                (x) => x.id !== activeDraft.id,
                              ),
                            }));
                            setDraftId(null);
                          },
                        })
                      }
                    />
                  </div>
                ) : (
                  <Empty
                    title="Your next conversation starts here"
                    action={
                      <button
                        className="button primary"
                        onClick={() => go("Prospects")}
                      >
                        Choose a prospect <Trail />
                      </button>
                    }
                  >
                    Open a prospect and create a draft based on their business
                    problem.
                  </Empty>
                )}
              </>
            )}
            {title === "Activity" && (
              <section className="panel spotlight">
                <div className="panel-head">
                  <div>
                    <h2>Workspace history</h2>
                    <p>Notes, stage changes, and draft updates.</p>
                  </div>
                  <span className="count">{data.activities.length}</span>
                </div>
                {activityList(data.activities)}
              </section>
            )}
            {title === "Settings" && (
              <div className="settings-grid">
                <section className="panel settings-panel spotlight">
                  <ShieldCheck size={28} />
                  <h2>A personal, local workspace</h2>
                  <p>
                    Records are saved in the shared data store on this PC, with
                    a browser backup. There is no server, shared account,
                    external AI service, or email connection. The Switch agent
                    and dashboard use the same records.
                  </p>
                  <dl>
                    <div>
                      <dt>Outreach</dt>
                      <dd>
                        <Badge type="reviewed">Draft only</Badge>
                      </dd>
                    </div>
                    <div>
                      <dt>Currency</dt>
                      <dd>USD</dd>
                    </div>
                    <div>
                      <dt>Storage</dt>
                      <dd>
                        {storageError
                          ? "Needs attention"
                          : "Shared local server + browser backup"}
                      </dd>
                    </div>
                    <div>
                      <dt>Data provenance</dt>
                      <dd>User-provided or fictional sample</dd>
                    </div>
                  </dl>
                  <h3>Forecast assumptions</h3>
                  <p>Weighted forecast includes open opportunities only.</p>
                  <div className="probabilities">
                    {STAGES.slice(0, 4).map((s) => (
                      <div key={s}>
                        <span>{s}</span>
                        <strong className="mono">
                          {PROBABILITY[s] * 100}%
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel settings-panel spotlight">
                  <h2>Keep a copy of your work</h2>
                  <p>
                    Export a JSON backup before changing devices or clearing
                    browser data. Backups contain your prospect details and
                    drafts; keep them somewhere private.
                  </p>
                  <div className="settings-actions">
                    <button className="button primary" onClick={exportData}>
                      <DownloadSimple />
                      Export backup
                    </button>
                    <button
                      className="button"
                      onClick={() => importRef.current.click()}
                    >
                      Restore backup
                    </button>
                    <input
                      type="file"
                      accept="application/json,.json"
                      ref={importRef}
                      hidden
                      onChange={restore}
                    />
                  </div>
                  <hr />
                  <h3>Start with your own prospects</h3>
                  <p>
                    Remove fictional sample prospects and their linked drafts
                    and activities. Your own records will remain.
                  </p>
                  <button
                    className="button"
                    disabled={
                      !data.prospects.some(
                        (p) => p.source === "Fictional sample",
                      )
                    }
                    onClick={() =>
                      setConfirm({
                        title: "Remove sample data?",
                        text: "Fictional sample prospects and their linked drafts and activities will be removed. Your own prospects will remain.",
                        action: () => {
                          const ids = new Set(
                            data.prospects
                              .filter((p) => p.source === "Fictional sample")
                              .map((p) => p.id),
                          );
                          setData((d) => ({
                            ...d,
                            prospects: d.prospects.filter(
                              (p) => !ids.has(p.id),
                            ),
                            drafts: d.drafts.filter(
                              (x) => !ids.has(x.prospectId),
                            ),
                            activities: d.activities.filter(
                              (x) => !ids.has(x.prospectId),
                            ),
                          }));
                          setToast("Sample data removed");
                        },
                      })
                    }
                  >
                    Remove sample data
                  </button>
                </section>
              </div>
            )}
            <footer className="page-footer">
              <span>
                <Mark />
                CSS REVENUEOPS
              </span>
              <span>
                Built by <strong>Kenosis Interactive</strong> for Cole Slay
                Solutions.
                <span className="footer-separator">/</span>Draft only, always.
              </span>
            </footer>
          </main>
        </div>
        {form && (
          <ProspectForm
            prospect={form.id ? form : null}
            onSave={saveProspect}
            onClose={() => setForm(null)}
          />
        )}
        {p && !form && (
          <Modal
            title="Prospect details"
            onClose={() => {
              setSelected(null);
              setNote("");
            }}
            wide
          >
            <div className="detail-content">
              <div className="detail-title">
                <span className="company-avatar large">
                  {initials(p.company)}
                </span>
                <div>
                  <h2>{p.company}</h2>
                  <p>
                    {p.industry || "Industry not set"} · {p.source}
                  </p>
                </div>
                <button className="button" onClick={() => setForm(p)}>
                  Edit
                </button>
              </div>
              <div className="detail-stats">
                <label>
                  Stage
                  <select
                    aria-label="Prospect stage"
                    value={p.stage}
                    onChange={(e) => move(p, e.target.value)}
                  >
                    {STAGES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <small>Opportunity value</small>
                  <strong className="mono">{money(p.value)}</strong>
                </div>
                <div>
                  <small>Priority</small>
                  <strong>{p.priority}</strong>
                </div>
              </div>
              <dl className="details">
                <div>
                  <dt>Contact</dt>
                  <dd>
                    {p.contact || "Not set"}
                    {p.role && ` · ${p.role}`}
                    <small>{p.email || "No email added"}</small>
                  </dd>
                </div>
                <div>
                  <dt>Business problem</dt>
                  <dd>{p.problem || "No problem documented yet."}</dd>
                </div>
                <div>
                  <dt>Next action</dt>
                  <dd>
                    {p.nextAction || "Not set"}
                    <small>{dateLabel(p.due)}</small>
                  </dd>
                </div>
              </dl>
              <div className="detail-actions">
                <button className="button primary" onClick={() => generate(p)}>
                  <NotePencil size={18} />
                  Create outreach draft
                </button>
                {(p.nextAction || p.due) && (
                  <button
                    className="button"
                    onClick={() => {
                      setData((d) => ({
                        ...d,
                        prospects: d.prospects.map((x) =>
                          x.id === p.id ? { ...x, nextAction: "", due: "" } : x,
                        ),
                        activities: [
                          log(
                            p.id,
                            `Completed follow-up: ${p.nextAction || "Scheduled follow-up"}.`,
                            "Task",
                          ),
                          ...d.activities,
                        ],
                      }));
                      setToast("Follow-up completed");
                    }}
                  >
                    <Check size={18} />
                    Complete follow-up
                  </button>
                )}
              </div>
              <hr />
              <h3>Add to the conversation</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  setData((d) => ({
                    ...d,
                    activities: [log(p.id, note.trim(), kind), ...d.activities],
                  }));
                  setNote("");
                  setToast("Activity logged");
                }}
              >
                <label>
                  Activity type
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    {["Note", "Call", "Meeting"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="note-label">
                  Notes
                  <textarea
                    required
                    maxLength={4000}
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What did you learn? What happens next?"
                  />
                </label>
                <button type="submit" className="button">
                  Log activity
                </button>
              </form>
              {activityList(
                data.activities
                  .filter((a) => a.prospectId === p.id)
                  .slice(0, 8),
              )}
              <button
                className="text-button danger"
                onClick={() =>
                  setConfirm({
                    title: `Delete ${p.company}?`,
                    text: "This permanently removes the prospect, linked drafts, and activities from this browser. Export a backup first if you need a copy.",
                    action: () => {
                      setData((d) => ({
                        ...d,
                        prospects: d.prospects.filter((x) => x.id !== p.id),
                        drafts: d.drafts.filter((x) => x.prospectId !== p.id),
                        activities: d.activities.filter(
                          (x) => x.prospectId !== p.id,
                        ),
                      }));
                      setSelected(null);
                      setToast("Prospect deleted");
                    },
                  })
                }
              >
                Delete prospect
              </button>
            </div>
          </Modal>
        )}
        {confirm && (
          <Modal title={confirm.title} onClose={() => setConfirm(null)}>
            <div className="confirm-content">
              <p>{confirm.text}</p>
            </div>
            <div className="dialog-foot">
              <button className="button" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className="button primary"
                onClick={() => {
                  confirm.action();
                  setConfirm(null);
                }}
              >
                Confirm
              </button>
            </div>
          </Modal>
        )}
        {toast && (
          <div role="status" className="toast">
            <CheckCircle weight="bold" />
            {toast}
          </div>
        )}
      </div>
    </IconContext.Provider>
  );
}
function DraftEditor({ draft, company, onSave, onCopy, onDelete, onEdit }) {
  const edit = draft;
  const setEdit = (value) =>
    onEdit({ ...value, updatedAt: new Date().toISOString() });
  const save = (status) =>
    onSave({ ...edit, status, updatedAt: new Date().toISOString() });

  return (
    <section className="draft-editor">
      <div className="panel-head">
        <div>
          <div className="eyebrow">OUTREACH DRAFT</div>
          <h2>{company}</h2>
        </div>
        <Badge>{draft.status}</Badge>
      </div>
      <div className="draft-fields">
        <label htmlFor="draft-subject">
          Subject
          <input
            id="draft-subject"
            aria-label="Subject"
            value={edit.subject}
            maxLength={300}
            onChange={(e) =>
              setEdit({ ...edit, subject: e.target.value, status: "Draft" })
            }
          />
        </label>
        <label htmlFor="draft-message">
          Message
          <textarea
            id="draft-message"
            aria-label="Message"
            rows={15}
            value={edit.body}
            maxLength={12000}
            onChange={(e) =>
              setEdit({ ...edit, body: e.target.value, status: "Draft" })
            }
          />
        </label>
        <small className="muted">
          Edits save automatically. Template-generated, not researched; verify
          every detail.
        </small>
      </div>
      <div className="draft-actions">
        <button
          className="button primary"
          disabled={!edit.subject.trim() || !edit.body.trim()}
          onClick={() => save("Draft")}
        >
          Save draft
        </button>
        <button
          className="button"
          disabled={!edit.subject.trim() || !edit.body.trim()}
          onClick={() => save("Reviewed")}
        >
          <Check />
          Mark reviewed
        </button>
        <button
          className="button"
          onClick={() => onCopy(`Subject: ${edit.subject}\n\n${edit.body}`)}
        >
          <Copy />
          Copy
        </button>
        <button className="text-button danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </section>
  );
}
createRoot(document.getElementById("root")).render(<App />);
