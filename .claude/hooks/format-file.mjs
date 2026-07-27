#!/usr/bin/env node
// PostToolUse hook: after Write/Edit, run Prettier (and ESLint --fix for React
// files) on the touched file. Scoped to this project only — see the root
// guard below. Never blocks the tool call; at most it surfaces leftover
// ESLint errors as additional context.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const REACT_EXTENSIONS = new Set([".tsx", ".jsx"]);
const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function exit(code, output) {
  if (output) process.stdout.write(JSON.stringify(output));
  process.exit(code);
}

const raw = readStdin();
let payload;
try {
  payload = JSON.parse(raw || "{}");
} catch {
  exit(0); // malformed input — never block
}

const filePath = payload?.tool_response?.filePath ?? payload?.tool_input?.file_path;
if (!filePath) exit(0);

const projectRoot = process.env.CLAUDE_PROJECT_DIR
  ? path.resolve(process.env.CLAUDE_PROJECT_DIR)
  : path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");

const absFile = path.resolve(filePath);

// Scope guard: only ever touch files inside this project.
const rel = path.relative(projectRoot, absFile);
if (rel.startsWith("..") || path.isAbsolute(rel)) exit(0);

if (!existsSync(absFile)) exit(0);

const ext = path.extname(absFile).toLowerCase();
const isReact = REACT_EXTENSIONS.has(ext);
const isMarkdown = MARKDOWN_EXTENSIONS.has(ext);
if (!isReact && !isMarkdown) exit(0);

function run(bin, args) {
  const binPath = path.join(projectRoot, "node_modules", ".bin", bin);
  if (!existsSync(binPath)) return { ok: true, output: "" };
  const result = spawnSync(binPath, args, { cwd: projectRoot, encoding: "utf8" });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

run("prettier", ["--write", absFile]);

if (isReact) {
  const eslintResult = run("eslint", ["--fix", absFile]);
  if (!eslintResult.ok && eslintResult.output) {
    exit(0, {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `ESLint found issues in ${rel} that autofix could not resolve:\n${eslintResult.output}`,
      },
    });
  }
}

exit(0);
