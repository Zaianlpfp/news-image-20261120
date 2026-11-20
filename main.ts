// main.ts — entrypoint for news-image-20261120 (program/v1, Node 22).
// Copies the pre-built front page (entry.png, composed in this session from
// model-generated lead photos plus code-drawn text and map) to /output.
// Deterministic: the same bytes are written on every run. No network.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const here = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(path.join(here, "entry.png"), path.join(outDir, "entry.png"));
