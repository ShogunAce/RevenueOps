import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [tool, input] = process.argv.slice(2);
if (!tool || tool === "--help") {
  console.log(
    "Usage: node scripts/agent.mjs TOOL [arguments.json]\nTools: list_prospects, get_state, create_prospect, update_prospect, log_activity, save_draft\nArguments are read from a JSON file or stdin. No outreach is sent.",
  );
  process.exit(0);
}
try {
  const args = input
    ? JSON.parse(fs.readFileSync(path.resolve(input), "utf8"))
    : process.stdin.isTTY
      ? {}
      : JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const token = fs
    .readFileSync(path.join(root, "data", "agent-token"), "utf8")
    .trim();
  const response = await fetch("http://127.0.0.1:5173/api/tools", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tool, args }),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error("RevenueOps tool failed: " + e.message);
  process.exitCode = 1;
}
