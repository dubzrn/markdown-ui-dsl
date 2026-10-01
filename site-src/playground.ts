import { analyze, outline, parse } from "../packages/core/dist/index.js";
import { lint } from "../packages/lint/dist/index.js";
import { render } from "../packages/render/dist/index.js";
import { renderSvg } from "../packages/embed/dist/index.js";
import { exportA2ui, exportJsonRender } from "../packages/export/dist/index.js";

export const mdui = {
  analyze,
  outline,
  parse,
  lint,
  render,
  renderSvg,
  exportA2ui,
  exportJsonRender,
};
(globalThis as unknown as { mdui: typeof mdui }).mdui = mdui;
