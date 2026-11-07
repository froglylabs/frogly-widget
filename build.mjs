// Builds the static core script and prints its hashes.
//
// From this folder:
//   cd packages/widget && npm run build
//
// It writes dist/core.v4.js, dist/integrity.json, and dist/core.v4.js.sha256.
// It fails when the script does not parse, grows past 15 KB, contains a word
// an intruder must not see, or contains a construct the core must never use.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { CORE_SCRIPT, CORE_VERSION } from "./src/core.js";

export const MAX_BYTES = 15 * 1024;

export const BANNED_WORDS = [
  "decoy",
  "trap",
  "honeypot",
  "canary",
  "bait",
  "fake",
  "test",
  "demo",
  "dummy",
  "frogly",
  "lure",
  "sample",
];

// Things the core must never contain. The build fails on any of them.
export const FORBIDDEN = [
  "eval(",
  "new Function",
  "Function(",
  "innerHTML",
  "outerHTML",
  "insertAdjacentHTML",
  "document.write",
  "document.cookie",
  "createElement(\"script\")",
  "createElement('script')",
  "importScripts",
  "import(",
  "javascript:",
  "setTimeout(\"",
  "setInterval(\"",
];

export function wordTokens(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .map((token) => token.toLowerCase())
    .filter(Boolean);
}

export function bannedWordsIn(value) {
  const tokens = new Set(wordTokens(value));
  return BANNED_WORDS.filter((word) => tokens.has(word));
}

export function forbiddenIn(value) {
  return FORBIDDEN.filter((needle) => value.includes(needle));
}

export function hashes(script) {
  const bytes = Buffer.from(script, "utf8");
  return {
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sri: `sha384-${createHash("sha384").update(bytes).digest("base64")}`,
  };
}

/** Every check the build runs. Returns a list of problems; empty means clean. */
export function problemsIn(script) {
  const problems = [];
  try {
    new vm.Script(script);
  } catch (error) {
    problems.push(`does not parse: ${error instanceof Error ? error.message : "syntax"}`);
  }
  const size = Buffer.byteLength(script, "utf8");
  if (size > MAX_BYTES) problems.push(`too large: ${size} bytes, limit ${MAX_BYTES}`);
  const banned = bannedWordsIn(script);
  if (banned.length > 0) problems.push(`banned words: ${banned.join(", ")}`);
  const forbidden = forbiddenIn(script);
  if (forbidden.length > 0) problems.push(`forbidden constructs: ${forbidden.join(", ")}`);
  if (!script.includes("createElement") || !script.includes("textContent")) {
    problems.push("the core must build nodes with createElement and textContent");
  }
  return problems;
}

export function build(outDir) {
  const problems = problemsIn(CORE_SCRIPT);
  if (problems.length > 0) throw new Error(problems.join("\n"));
  const summary = { version: CORE_VERSION, file: `core.v${CORE_VERSION}.js`, ...hashes(CORE_SCRIPT) };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, summary.file), CORE_SCRIPT);
  writeFileSync(path.join(outDir, `${summary.file}.sha256`), `${summary.sha256}  ${summary.file}\n`);
  writeFileSync(path.join(outDir, "integrity.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

const here = path.dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(here, "build.mjs")) {
  try {
    const summary = build(path.join(here, "dist"));
    console.log(`wrote dist/${summary.file}`);
    console.log(`bytes ${summary.bytes}`);
    console.log(`sha256 ${summary.sha256}`);
    console.log(`sri ${summary.sri}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
