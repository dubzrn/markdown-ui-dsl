#!/usr/bin/env node
// `prepack` for every published package: the licence requires a copy of LICENSE (and the NOTICE) with every distribution, and npm
// only picks up files inside the package directory. Run from a package directory; the copies are git-ignored.
import { copyFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
for (const f of ["LICENSE", "NOTICE"]) copyFileSync(join(root, f), join(process.cwd(), f));
