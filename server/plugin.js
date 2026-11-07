import path from "node:path";
import { createStore } from "./store.js";
export function revenueApi() {
  let store;
  const testStores = new Map();
  const mount = (server) => {
    store ??= createStore(
      path.resolve(process.env.REVENUEOPS_DATA_DIR || "data"),
    );
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith("/api/")) return next();
      const send = (code, value) => {
        res.statusCode = code;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(value));
      };
      try {
        let active = store;
        const scope = req.headers["x-revenueops-test"];
        if (
          process.env.REVENUEOPS_TEST_MODE === "1" &&
          /^[a-zA-Z0-9-]+$/.test(scope || "")
        ) {
          if (!testStores.has(scope))
            testStores.set(
              scope,
              createStore(path.resolve(process.env.REVENUEOPS_DATA_DIR, scope)),
            );
          active = testStores.get(scope);
        }
        const host = req.headers.host;
        if (!/^127\.0\.0\.1:\d+$/.test(host || ""))
          return send(403, { error: "Use the 127.0.0.1 localhost address" });
        const browser =
          req.headers["x-revenueops"] === "browser" &&
          (!req.headers.origin || req.headers.origin === `http://${host}`) &&
          req.headers.referer?.startsWith(`http://${host}/`);
        if (!browser && req.headers.authorization !== `Bearer ${active.token}`)
          return send(401, { error: "Authentication required" });
        if (req.method === "GET" && req.url === "/api/state")
          return send(200, active.snapshot());
        if (req.method !== "POST")
          return send(405, { error: "Method not allowed" });
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 5e6)
            throw Object.assign(Error("Request too large"), { status: 413 });
        }
        const input = JSON.parse(body);
        const fn = {
          "/api/migrate": active.migrate,
          "/api/sync": active.sync,
          "/api/tools": active.action,
        }[req.url];
        if (!fn) return send(404, { error: "Not found" });
        send(200, fn(input));
      } catch (e) {
        send(e.status || 400, { error: e.message });
      }
    });
  };
  return {
    name: "revenueops-api",
    configureServer: mount,
    configurePreviewServer: mount,
  };
}
