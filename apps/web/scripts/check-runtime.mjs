import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const nodeVersion = process.versions.node;
const npmVersion = process.env.npm_config_user_agent?.match(/npm\/([0-9]+\.[0-9]+\.[0-9]+)/)?.[1];
const nodeRange = pkg.engines?.node;
const npmRange = pkg.engines?.npm;

function parseVersion(v) {
  const [major = "0", minor = "0", patch = "0"] = String(v).split(".");
  return [Number(major), Number(minor), Number(patch)];
}

function compare(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (va[i] > vb[i]) return 1;
    if (va[i] < vb[i]) return -1;
  }
  return 0;
}

function matchesComparator(version, comparator) {
  const match = comparator.match(/^(>=|<=|>|<|=)?\s*([0-9]+(?:\.[0-9]+){0,2})$/);
  if (!match) return true;
  const op = match[1] || "=";
  const target = match[2];
  const cmp = compare(version, target);
  if (op === ">=") return cmp >= 0;
  if (op === "<=") return cmp <= 0;
  if (op === ">") return cmp > 0;
  if (op === "<") return cmp < 0;
  return cmp === 0;
}

function satisfies(version, range) {
  if (!range) return true;
  return range
    .split(/\s+/)
    .filter(Boolean)
    .every((comparator) => matchesComparator(version, comparator));
}

const nodeOk = satisfies(nodeVersion, nodeRange);
const npmOk = npmVersion ? satisfies(npmVersion, npmRange) : true;

if (process.env.SKIP_RUNTIME_CHECK === "1") {
  console.warn("Skipping runtime check because SKIP_RUNTIME_CHECK=1.");
  process.exit(0);
}

if (!nodeOk || !npmOk) {
  console.error("\nRuntime version check failed:");
  console.error(`- Required node: ${nodeRange || "not specified"}`);
  console.error(`- Current  node: ${nodeVersion}`);
  if (npmRange) {
    console.error(`- Required npm : ${npmRange}`);
    console.error(`- Current  npm : ${npmVersion || "unknown"}`);
  }
  console.error("\nUse `nvm use` (or your version manager) before running project scripts.\n");
  process.exit(1);
}

console.log(`Runtime check passed (node ${nodeVersion}${npmVersion ? `, npm ${npmVersion}` : ""}).`);
