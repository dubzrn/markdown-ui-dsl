// Generates packages/spec/schema/ast.schema.json (T-019). `--check` fails if the committed file is stale.
// Usage: node scripts/gen-ast-schema.mjs [--check]
import fs from "node:fs";

const DSL_SCHEMA_VERSION = "2.0";
const ref = (n) => ({ $ref: `#/$defs/${n}` });
const str = { type: "string" };
const int1 = { type: "integer", minimum: 1 };
const arr = (items) => ({ type: "array", items });
const obj = (props, required = Object.keys(props)) => ({
  type: "object",
  properties: props,
  required,
  additionalProperties: false,
});
const kind = (k) => ({ const: k });
const span = { span: ref("Span") };
const withAttrs = { attrs: ref("Attrs") };

const defs = {
  Pos: obj({ line: int1, col: int1, offset: { type: "integer", minimum: 0 } }),
  Span: obj({ start: ref("Pos"), end: ref("Pos") }),
  Attrs: obj(
    {
      id: str,
      classes: arr(str),
      props: { type: "object", additionalProperties: { anyOf: [str, { const: true }] } },
    },
    ["classes", "props"],
  ),
  Diagnostic: obj(
    {
      code: { type: "string", pattern: "^[EWI][1-7][0-9]{3}$" },
      rule: str,
      severity: { enum: ["error", "warn", "info"] },
      message: str,
      span: ref("Span"),
      fix: arr(obj({ span: ref("Span"), newText: str })),
    },
    ["code", "severity", "message", "span"],
  ),
  // ---- inline nodes
  Inline: {
    oneOf: [
      "InlineText",
      "InlineStrong",
      "InlineEm",
      "InlineCode",
      "InlineButton",
      "InlineLink",
      "InlineInput",
      "InlineImage",
      "InlineBadge",
      "InlineCheckbox",
      "InlineRadio",
      "InlineToggle",
      "InlineDropdown",
      "InlineWidget",
      "InlineBinding",
      "InlineUse",
    ].map(ref),
  },
  InlineText: obj({ kind: kind("text"), value: str }),
  InlineStrong: obj({ kind: kind("strong"), children: arr(ref("Inline")) }),
  InlineEm: obj({ kind: kind("em"), children: arr(ref("Inline")) }),
  InlineCode: obj({ kind: kind("code"), value: str }),
  InlineButton: obj({ kind: kind("button"), label: str, action: str, ...withAttrs }, [
    "kind",
    "label",
  ]),
  InlineLink: obj({ kind: kind("link"), label: str, target: str, ...withAttrs }, [
    "kind",
    "label",
    "target",
  ]),
  InlineInput: obj({ kind: kind("input"), placeholder: str, ...withAttrs }, [
    "kind",
    "placeholder",
  ]),
  InlineImage: obj({ kind: kind("image"), description: str, ...withAttrs }, [
    "kind",
    "description",
  ]),
  InlineBadge: obj({ kind: kind("badge"), label: str, ...withAttrs }, ["kind", "label"]),
  InlineCheckbox: obj(
    { kind: kind("checkbox"), checked: { type: "boolean" }, label: str, ...withAttrs },
    ["kind", "checked", "label"],
  ),
  InlineRadio: obj(
    { kind: kind("radio"), checked: { type: "boolean" }, label: str, ...withAttrs },
    ["kind", "checked", "label"],
  ),
  InlineToggle: obj({ kind: kind("toggle"), on: { type: "boolean" }, label: str, ...withAttrs }, [
    "kind",
    "on",
    "label",
  ]),
  InlineDropdown: obj(
    { kind: kind("dropdown"), label: str, options: arr(str), dynamic: str, ...withAttrs },
    ["kind", "label"],
  ),
  InlineWidget: obj(
    {
      kind: kind("widget"),
      widget: {
        enum: [
          "slider",
          "date",
          "file",
          "progress",
          "chart",
          "stat",
          "skeleton",
          "avatar",
          "icon",
          "crumbs",
          "pager",
          "stepper",
          "menubar",
        ],
      },
      raw: str,
      args: obj({ positional: arr(str), named: { type: "object", additionalProperties: str } }),
      ...withAttrs,
    },
    ["kind", "widget", "raw", "args"],
  ),
  InlineBinding: obj({ kind: kind("binding"), path: str }),
  InlineUse: obj({ kind: kind("use"), path: str, ...withAttrs }, ["kind", "path"]),
  // ---- blocks
  Block: {
    oneOf: [
      "Container",
      "NamedBlock",
      "Line",
      "Heading",
      "Hint",
      "Directive",
      "Comment",
      "Divider",
      "Code",
      "Tabs",
      "Table",
      "List",
    ].map(ref),
  },
  Container: obj(
    {
      kind: {
        enum: ["column", "row", "card", "modal", "header", "footer", "bubble-user", "bubble-agent"],
      },
      attrs: ref("Attrs"),
      children: arr(ref("Block")),
      closed: { type: "boolean" },
      ...span,
    },
    ["kind", "children", "closed", "span"],
  ),
  NamedBlock: obj(
    {
      kind: kind("block"),
      name: str,
      args: str,
      attrs: ref("Attrs"),
      children: arr(ref("Block")),
      closed: { type: "boolean" },
      ...span,
    },
    ["kind", "name", "args", "children", "closed", "span"],
  ),
  Line: obj({ kind: kind("line"), text: str, inline: arr(ref("Inline")), ...span }),
  Heading: obj({
    kind: kind("heading"),
    level: { type: "integer", minimum: 1, maximum: 6 },
    text: str,
    inline: arr(ref("Inline")),
    ...span,
  }),
  Hint: obj({ kind: kind("hint"), text: str, ...span }),
  Directive: obj(
    {
      kind: kind("directive"),
      breakpoint: { enum: ["sm", "md", "lg", "xl"] },
      env: arr(str),
      tokens: arr(obj({ name: str, value: str })),
      ...span,
    },
    ["kind", "env", "tokens", "span"],
  ),
  Comment: obj({ kind: kind("comment"), text: str, ...span }),
  Divider: obj({ kind: kind("divider"), label: str, ...span }, ["kind", "span"]),
  Code: obj({ kind: kind("code"), info: str, text: str, ...span }),
  Tabs: obj({
    kind: kind("tabs"),
    tabs: arr(obj({ label: str, active: { type: "boolean" } })),
    ...span,
  }),
  Table: obj({
    kind: kind("table"),
    header: arr(str),
    rows: arr(arr(str)),
    align: arr({ enum: ["left", "center", "right", "none"] }),
    headerInline: arr(arr(ref("Inline"))),
    rowsInline: arr(arr(arr(ref("Inline")))),
    ...span,
  }),
  List: obj({ kind: kind("list"), children: arr(ref("Item")), ...span }),
  Item: obj({
    kind: kind("item"),
    ordered: { type: "boolean" },
    text: str,
    inline: arr(ref("Inline")),
    children: arr(ref("Block")),
    ...span,
  }),
  Frontmatter: obj({ kind: kind("frontmatter"), raw: str, ...span }),
};

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: `https://github.com/dubzrn/markdown-ui-dsl/schema/ast-${DSL_SCHEMA_VERSION}.schema.json`,
  title: `Markdown UI DSL document AST (DSL ${DSL_SCHEMA_VERSION})`,
  description:
    "JSON form of @mdui/core's Document. The $id encodes the DSL version; breaking changes bump it (see packages/spec/schema/README.md).",
  type: "object",
  required: ["meta", "dsl", "body", "diagnostics", "lineStarts"],
  additionalProperties: false,
  properties: {
    frontmatter: ref("Frontmatter"),
    meta: { type: "object" },
    dsl: { enum: ["1", "2.0"] },
    body: arr(ref("Block")),
    diagnostics: arr(ref("Diagnostic")),
    lineStarts: arr({ type: "integer", minimum: 0 }),
  },
  $defs: defs,
};

const out = JSON.stringify(schema, null, 2) + "\n";
const file = new URL("../packages/spec/schema/ast.schema.json", import.meta.url);
if (process.argv.includes("--check")) {
  if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== out) {
    console.error(
      "packages/spec/schema/ast.schema.json is stale: run node scripts/gen-ast-schema.mjs",
    );
    process.exit(1);
  }
  console.log("ast schema up to date");
} else {
  fs.writeFileSync(file, out);
  console.log(`wrote ${file.pathname}`);
}
