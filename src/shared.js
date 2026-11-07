import { useEffect, useRef, useState } from "react";
import { STORAGE_KEY, validateState } from "./model";
export function useShared(data, setData, locked) {
  const [status, setStatus] = useState("Connecting to shared workspace…");
  const current = useRef(data),
    base = useRef(null),
    busy = useRef(false),
    applying = useRef(null),
    failed = useRef(false);
  current.current = data;
  useEffect(() => {
    if (locked) return;
    let stopped = false;
    const api = async (url, body) => {
      const r = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          "X-RevenueOps": "browser",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const value = await r.json();
      if (!r.ok) throw Error(value.error);
      return value.state;
    };
    async function tick() {
      if (stopped || busy.current || failed.current) return;
      busy.current = true;
      try {
        if (!base.current) {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw && !validateState(JSON.parse(raw)))
            throw Error("Invalid browser data; migration paused.");
          let id = localStorage.getItem("css-revenueops.migration-id");
          if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem("css-revenueops.migration-id", id);
          }
          if (!localStorage.getItem("css-revenueops.pre-shared-backup"))
            localStorage.setItem(
              "css-revenueops.pre-shared-backup",
              raw || JSON.stringify(current.current),
            );
          const sent = current.current;
          const previousBase = localStorage.getItem(
            "css-revenueops.shared-base",
          );
          const state = previousBase
            ? await api("/api/sync", {
                base: JSON.parse(previousBase),
                state: sent,
              })
            : await api("/api/migrate", {
                migrationId: id,
                state: sent,
              });
          base.current = state;
          if (current.current === sent) {
            current.current = state;
            applying.current = state;
            setData(state);
          } else {
            base.current = sent;
          }
        } else {
          const sent = current.current;
          const dirty = JSON.stringify(sent) !== JSON.stringify(base.current);
          const state = dirty
            ? await api("/api/sync", { base: base.current, state: sent })
            : await api("/api/state");
          if (current.current === sent) {
            base.current = state;
            current.current = state;
            setData((old) =>
              JSON.stringify(old) === JSON.stringify(state) ? old : state,
            );
          } else if (dirty) base.current = sent;
        }
        localStorage.setItem(
          "css-revenueops.shared-base",
          JSON.stringify(base.current),
        );
        if (!stopped) setStatus("");
      } catch (e) {
        if (!stopped)
          setStatus(
            "Shared sync paused: " +
              e.message +
              " Your local copy is retained.",
          );
        if (e.message.includes("Another writer")) failed.current = true;
      } finally {
        busy.current = false;
      }
    }
    tick();
    const timer = setInterval(tick, 1200);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [locked, setData]);
  return status;
}
