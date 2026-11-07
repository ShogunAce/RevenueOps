import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import timing from "./timing.json";
import targets from "./targets.json";

export const FPS = 30;
const LEAD = 0.28; // seconds a scene starts ahead of its sentence
const FADE = 14; // crossfade frames
const TAIL = 1.1; // end-card hold after the last word

const C = {
  bg: "#080c0b",
  core: "#0f1513",
  hair: "rgba(183,227,206,0.14)",
  ink: "#eef5f1",
  ink2: "#9fb3aa",
  mint: "#b7e3ce",
};
const SANS = "'Manrope Variable', sans-serif";
const MONO = "'IBM Plex Mono', monospace";
const ease = Easing.bezier(0.32, 0.72, 0, 1);
const glide = Easing.bezier(0.45, 0, 0.2, 1);

// One entry per narration sentence, in order. Focus points are fractions of the screenshot.
const SCENES = [
  { kind: "title" },
  {
    shot: "overview",
    label: ["01", "Overview"],
    cam: [{ x: 0.3, y: 0.3, s: 1.18 }, { x: 0.35, y: 0.42, s: 1.04 }],
    intro: true,
  },
  {
    shot: "overview-chart",
    label: ["01", "Pipeline health"],
    cam: [{ x: 0.55, y: 0.38, s: 1.22 }, { x: 0.5, y: 0.78, s: 1.12 }],
  },
  {
    shot: "prospects-table",
    label: ["02", "Prospects"],
    cam: [{ x: 0.5, y: 0.3, s: 1.02 }, { x: 0.45, y: 0.55, s: 1.16 }],
  },
  {
    shot: "prospects-search",
    label: ["02", "Instant search"],
    cam: [{ x: 0.35, y: 0.62, s: 1.35 }, { x: 0.4, y: 0.7, s: 1.18 }],
    cursor: { from: [0.62, 0.86], to: [0.3, targets.search[1]], click: 0.35 },
  },
  {
    shot: "prospect-detail",
    label: ["02", "Full context"],
    cam: [{ x: 0.5, y: 0.25, s: 1.08 }, { x: 0.5, y: 0.58, s: 1.3 }],
  },
  {
    shot: "add-prospect",
    label: ["02", "Add a prospect"],
    cam: [{ x: 0.5, y: 0.35, s: 1.04 }, { x: 0.55, y: 0.72, s: 1.2 }],
    cursor: { from: [0.45, 0.62], to: targets.create, click: 0.82 },
  },
  {
    shot: "pipeline",
    label: ["03", "Pipeline"],
    cam: [{ x: 0.3, y: 0.3, s: 1.16 }, { x: 0.5, y: 0.75, s: 1.06 }],
  },
  {
    shot: "pipeline-board",
    label: ["03", "Move with intent"],
    cam: [{ x: 0.55, y: 0.3, s: 1.08 }, { x: 0.6, y: 0.36, s: 1.32 }],
    cursor: { from: [0.75, 0.62], to: targets.stage, click: 0.5 },
  },
  {
    shot: "drafts",
    label: ["04", "Outreach drafts"],
    cam: [{ x: 0.3, y: 0.3, s: 1.12 }, { x: 0.55, y: 0.88, s: 1.24 }],
  },
  {
    shot: "drafts-editor",
    label: ["04", "Review, then copy"],
    cam: [{ x: 0.6, y: 0.3, s: 1.1 }, { x: 0.58, y: 0.62, s: 1.22 }],
    cursor: { from: [0.8, 0.4], to: targets.copy, click: 0.55 },
  },
  {
    shot: "drafts-editor",
    label: ["04", "Draft only, always"],
    cam: [{ x: 0.58, y: 0.62, s: 1.22 }, { x: 0.5, y: 0.7, s: 1.34 }],
    hold: true,
  },
  {
    shot: "activity",
    label: ["05", "Activity"],
    cam: [{ x: 0.3, y: 0.25, s: 1.12 }, { x: 0.45, y: 0.7, s: 1.2 }],
  },
  {
    shot: "settings",
    label: ["06", "Local by design"],
    cam: [{ x: 0.35, y: 0.3, s: 1.1 }, { x: 0.38, y: 0.75, s: 1.24 }],
  },
  { kind: "end" },
];

const starts = timing.sentences.map((s) => Math.max(0, s - LEAD));
export const TOTAL_FRAMES = Math.round((timing.end + TAIL) * FPS);
const fr = (sec) => Math.round(sec * FPS);

const Mark = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <g stroke={C.mint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H5a1 1 0 0 0-1 1v6m17-7h6a1 1 0 0 1 1 1v6M4 21v6a1 1 0 0 0 1 1h6m10 0h6a1 1 0 0 0 1-1v-6" />
      <path d="M9.5 21.5l4.5-4.5 3.5 3 5-6.5m0 0h-3.5m3.5 0v3.5" />
    </g>
  </svg>
);

const Backdrop = () => {
  const f = useCurrentFrame();
  const drift = Math.sin(f / 90) * 40;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 55% at ${30 + drift / 10}% 0%, rgba(80,160,125,0.22), transparent 70%),
            radial-gradient(45% 50% at 100% 100%, rgba(60,130,105,0.14), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.05,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </AbsoluteFill>
  );
};

const Cursor = ({ cursor, t, scale }) => {
  const move = interpolate(t, [0.05, cursor.click], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: glide,
  });
  const x = interpolate(move, [0, 1], [cursor.from[0], cursor.to[0]]);
  const y = interpolate(move, [0, 1], [cursor.from[1], cursor.to[1]]);
  const since = t - cursor.click;
  const press = since > 0 && since < 0.08 ? 0.85 : 1;
  const ring = interpolate(since, [0, 0.22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const appear = interpolate(t, [0, 0.06], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: `scale(${1 / scale})`,
        transformOrigin: "0 0",
        opacity: appear,
      }}
    >
      {since > 0 && (
        <div
          style={{
            position: "absolute",
            left: -36,
            top: -36,
            width: 72,
            height: 72,
            borderRadius: 99,
            border: `2px solid ${C.mint}`,
            transform: `scale(${0.3 + ring * 1.1})`,
            opacity: 1 - ring,
          }}
        />
      )}
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        style={{ transform: `scale(${press})`, filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.5))" }}
      >
        <path d="M4 2.5l15 8.2-6.6 1.6 3.9 7.4-2.7 1.4-3.9-7.4-4.7 4.8z" fill="#fff" stroke="#0b1210" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const Shot = ({ scene, frames }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / frames;
  const k = interpolate(t, [0, 1], [0, 1], { easing: glide });
  const [a, b] = scene.cam;
  const s = interpolate(k, [0, 1], [a.s, b.s]);
  const ox = interpolate(k, [0, 1], [a.x, b.x]) * 100;
  const oy = interpolate(k, [0, 1], [a.y, b.y]) * 100;

  const enter = scene.hold
    ? 1
    : interpolate(f, [0, FADE], [0, 1], { extrapolateRight: "clamp", easing: ease });
  const rise = scene.intro
    ? spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: 34 })
    : 1;
  const labelIn = spring({ frame: f - 6, fps, config: { damping: 200 }, durationInFrames: 26 });

  return (
    <AbsoluteFill style={{ opacity: scene.intro ? 1 : enter, filter: `blur(${(1 - enter) * 10}px)` }}>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 72,
          width: 1620,
          height: 911,
          padding: 9,
          borderRadius: 34,
          background: "rgba(183,227,206,0.04)",
          boxShadow: `0 0 0 1px ${C.hair}, 0 60px 120px -40px rgba(0,0,0,0.8), 0 0 140px -30px rgba(120,200,165,0.18)`,
          transform: `perspective(2200px) translateY(${(1 - rise) * 140}px) rotateX(${(1 - rise) * 16}deg) scale(${0.985 + enter * 0.015})`,
          opacity: scene.intro ? rise : 1,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 26,
            overflow: "hidden",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${s})`,
              transformOrigin: `${ox}% ${oy}%`,
            }}
          >
            <Img src={staticFile(`shots/${scene.shot}.png`)} style={{ width: "100%", height: "100%", display: "block" }} />
            {scene.cursor && <Cursor cursor={scene.cursor} t={t} scale={s} />}
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 104,
          bottom: 44,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 26px 14px 16px",
          borderRadius: 999,
          background: "rgba(10,16,14,0.78)",
          backdropFilter: "blur(18px)",
          boxShadow: `0 0 0 1px ${C.hair}, 0 20px 50px -20px rgba(0,0,0,0.7)`,
          opacity: labelIn,
          transform: `translateY(${(1 - labelIn) * 24}px)`,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 17,
            letterSpacing: "0.14em",
            color: C.bg,
            background: C.mint,
            borderRadius: 999,
            padding: "6px 12px",
          }}
        >
          {scene.label[0]}
        </span>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: "-0.02em", color: C.ink }}>
          {scene.label[1]}
          <span style={{ color: C.mint }}>.</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};

const Words = ({ lines, delay = 0, size = 112 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return lines.map((line, i) => {
    const p = spring({ frame: f - delay - i * 7, fps, config: { damping: 200 }, durationInFrames: 30 });
    return (
      <div
        key={i}
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.02,
          letterSpacing: "-0.045em",
          color: i ? C.mint : C.ink,
          opacity: p,
          filter: `blur(${(1 - p) * 10}px)`,
          transform: `translateY(${(1 - p) * 40}px)`,
        }}
      >
        {line}
      </div>
    );
  });
};

const Eyebrow = ({ text, delay = 0 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - delay, fps, config: { damping: 200 }, durationInFrames: 24 });
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 20px 10px 12px",
        borderRadius: 999,
        boxShadow: `0 0 0 1px ${C.hair}`,
        background: "rgba(183,227,206,0.05)",
        fontFamily: MONO,
        fontSize: 18,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: C.mint,
        opacity: p,
        marginBottom: 40,
      }}
    >
      <Mark size={28} />
      {text}
    </div>
  );
};

const Title = ({ frames }) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [frames - FADE, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 190, opacity: out }}>
      <div>
        <Eyebrow text="RevenueOps · Cole Slay Solutions" />
        <Words lines={["Every great client relationship", "starts with a conversation."]} delay={4} size={92} />
      </div>
    </AbsoluteFill>
  );
};

const End = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = interpolate(f, [0, FADE], [0, 1], { extrapolateRight: "clamp", easing: ease });
  const mark = spring({ frame: f, fps, config: { damping: 14, stiffness: 120 }, durationInFrames: 40 });
  return (
    <AbsoluteFill style={{ background: C.bg, opacity: enter }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 38,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(0deg, #2c5a49, #12221c)",
            boxShadow: `0 0 0 1px ${C.hair}, 0 0 0 10px rgba(183,227,206,0.04), 0 0 120px -10px rgba(120,200,165,0.35)`,
            transform: `scale(${mark})`,
            marginBottom: 44,
          }}
        >
          <Mark size={78} />
        </div>
        <div style={{ textAlign: "center" }}>
          <Words lines={["RevenueOps."]} delay={6} size={120} />
          <div style={{ height: 18 }} />
          <Words lines={["", "Context before contact."]} delay={14} size={64} />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 70,
            fontFamily: MONO,
            fontSize: 17,
            letterSpacing: "0.24em",
            color: C.ink2,
            opacity: interpolate(f, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          BUILT BY KENOSIS INTERACTIVE · DRAFT ONLY, ALWAYS
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Demo = () => {
  const progress = useCurrentFrame() / TOTAL_FRAMES;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop />
      {SCENES.map((scene, i) => {
        const from = fr(starts[i]);
        const until = i + 1 < SCENES.length ? fr(starts[i + 1]) + FADE : TOTAL_FRAMES;
        const frames = until - from;
        return (
          <Sequence key={i} from={from} durationInFrames={frames}>
            {scene.kind === "title" ? (
              <Title frames={frames} />
            ) : scene.kind === "end" ? (
              <End />
            ) : (
              <Shot scene={scene} frames={frames} />
            )}
          </Sequence>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 3,
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, transparent, ${C.mint})`,
          opacity: 0.7,
        }}
      />
      <Audio src={staticFile("narration.mp3")} />
    </AbsoluteFill>
  );
};
