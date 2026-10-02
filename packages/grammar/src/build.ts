/**
 * Generation grammar for Markdown UI DSL.
 *
 * Line-oriented. Containers nest recursively, so an opener without its closer is not derivable (typed closers must match
 * in 2.0). Everything else is a leaf line with a distinguishing prefix; a plain paragraph line can never start with an
 * opener, a closer, a fence or a comment marker. In 2.0 the grammar is closed-world: `[ UPPER: … ]` can only be a widget
 * the catalog defines, and `::: NAME … :::` only a container the catalog defines.
 *
 * Profiles: `generate` (default) is the strict, emitted grammar; `recognize` is a superset (free frontmatter) used to
 * test that real documents are accepted.
 */
import type { Catalog, ComponentSpec, PropSpec } from "@mdui/catalog";
import { defaultCatalog } from "@mdui/catalog";
import {
  EPS,
  alt,
  lit,
  noneOf,
  oneOf,
  opt,
  plus,
  ref,
  seq,
  star,
  type Expr,
  type Grammar,
} from "./model.js";

export interface GrammarOptions {
  /** `"1"` = DSL 1.x, `"2.0"` (default) = DSL 2.0 with frontmatter `dsl: 2.0`. */
  dsl?: "1" | "2.0";
  profile?: "generate" | "recognize";
  /** 2.0 only: the component catalog (default: every built-in). */
  catalog?: Catalog;
  /** Directive token names (`> @md padding: compact`); when given only these may appear. */
  tokens?: string[];
  /** Data paths allowed in `{{ path }}` bindings; when given `{` is not otherwise derivable in text. */
  dataPaths?: string[];
  /** Maximum container nesting depth (unrolls the recursion); unbounded when omitted. */
  maxDepth?: number;
}

const NL = lit("\n");
const WS = star(oneOf(" ", "\t"));
const SP1 = plus(oneOf(" ", "\t"));
const NOTNL = noneOf("\n");
const REST = star(NOTNL);
const DIGIT = oneOf(["0", "9"]);
const UP = oneOf(["A", "Z"]);
const ALNUM = oneOf(["a", "z"], ["A", "Z"], ["0", "9"]);
const IDENT = seq(
  oneOf(["a", "z"], ["A", "Z"]),
  star(oneOf(["a", "z"], ["A", "Z"], ["0", "9"], "_", "-")),
);
const WORD = plus(ALNUM);
const WORDS = seq(WORD, star(seq(lit(" "), WORD)));
const INT = plus(DIGIT);
const PATH = seq(IDENT, star(seq(".", IDENT)));

/** Containers with a fixed v1 opener line. */
const FIXED: Record<string, Expr> = {
  COLUMN: lit("||| COLUMN |||"),
  ROW: lit("=== ROW ==="),
  CARD: lit("::: CARD :::"),
  MODAL: lit("::: MODAL :::"),
  HEADER: lit("::: HEADER :::"),
  FOOTER: lit("::: FOOTER :::"),
  BUBBLE: seq("::: BUBBLE ", alt("USER", "AGENT"), " :::"),
};

const INLINE_BUILTINS = new Set([
  "BUTTON",
  "LINK",
  "INPUT",
  "IMAGE",
  "BADGE",
  "CHECKBOX",
  "RADIO",
  "TOGGLE",
  "DROPDOWN",
]);

/** Argument grammars of the built-in widgets, matching the parser's validation exactly. */
const WIDGET_ARGS: Record<string, Expr> = {
  SLIDER: seq(
    "0..",
    oneOf(["1", "9"]),
    opt(seq(DIGIT, opt(DIGIT))),
    opt(seq(" step=", INT)),
    opt(seq(" value=", INT)),
  ),
  DATE: alt(EPS, "range", seq(DIGIT, DIGIT, DIGIT, DIGIT, "-", DIGIT, DIGIT, "-", DIGIT, DIGIT)),
  FILE: WORDS,
  PROGRESS: seq(alt(DIGIT, seq(oneOf(["1", "9"]), DIGIT)), "%"),
  CHART: seq(alt("line", "bar", "pie", "scatter"), opt(seq(' "', WORDS, '"')), " data=", WORD),
  STAT: seq('"', WORDS, '" ', WORD, opt(seq(" ", WORD))),
  SKELETON: alt(EPS, seq("rows=", INT)),
  AVATAR: WORDS,
  ICON: seq(oneOf(["a", "z"]), star(oneOf(["a", "z"], ["0", "9"], "-"))),
  CRUMBS: seq(WORDS, star(seq(" > ", WORDS))),
  PAGER: alt("1/3", "2/3", "3/3", "1/5", "3/5", "5/5"),
  STEPPER: seq(WORDS, plus(seq(" > ", WORDS))),
  MENUBAR: seq(WORDS, star(seq(" | ", WORDS))),
};

function valueOf(p: PropSpec): Expr {
  switch (p.type) {
    case "enum":
      return alt(...(p.values ?? ["x"]).map((v) => lit(v)));
    case "number":
      return seq(opt("-"), INT, opt(seq(".", INT)));
    case "boolean":
      return alt("true", "false");
    case "path":
      return PATH;
    default:
      return WORD;
  }
}

/** `positional…` then `key=value…`, separated by single spaces; optional ones are optional. */
function propsArgs(spec: ComponentSpec): Expr {
  const entries = Object.entries(spec.props);
  const pos = entries
    .filter(([, p]) => p.positional !== undefined)
    .sort(([, a], [, b]) => (a.positional ?? 0) - (b.positional ?? 0));
  const named = entries
    .filter(([, p]) => p.positional === undefined)
    .sort(
      ([an, a], [bn, b]) =>
        Number(b.required === true) - Number(a.required === true) || an.localeCompare(bn),
    );
  const parts: Expr[] = [];
  const add = (e: Expr, required: boolean): void => {
    const sep = parts.length === 0 ? EPS : lit(" ");
    parts.push(required ? seq(sep, e) : opt(seq(sep, e)));
  };
  for (const [, p] of pos) add(valueOf(p), p.required === true);
  for (const [k, p] of named) add(seq(k, "=", valueOf(p)), p.required === true);
  return parts.length === 0 ? EPS : seq(...parts);
}

export function buildGrammar(o: GrammarOptions = {}): Grammar {
  const v2 = (o.dsl ?? "2.0") === "2.0";
  const recognize = o.profile === "recognize";
  const catalog = o.catalog ?? defaultCatalog();
  const has = (n: string): boolean => Object.hasOwn(catalog.components, n);
  const rules = new Map<string, Expr>();
  const def = (n: string, e: Expr): void => void rules.set(n, e);

  // ---------- text ----------
  const bindingsOnly = o.dataPaths !== undefined;
  const noBrace: string[] = bindingsOnly ? ["{"] : [];
  if (!v2) {
    def("text", REST);
  } else {
    // `[` may only open something that is not `[ UPPER:`; right-recursive so an uppercase run can end the text.
    def(
      "text",
      alt(EPS, seq(noneOf("[", "\n", ...noBrace), ref("text")), seq("[", WS, ref("btail"))),
    );
    def(
      "btail",
      alt(
        EPS,
        seq(noneOf(["A", "Z"], "\n", "[", " ", "\t", ...noBrace), ref("text")),
        seq("[", WS, ref("btail")),
        seq(plus(UP), alt(EPS, seq(noneOf(["A", "Z"], ":", "\n", "[", ...noBrace), ref("text")))),
      ),
    );
    def(
      "ibody",
      alt(EPS, seq(noneOf("[", "]", "\n", ...noBrace), ref("ibody")), seq("[", WS, ref("ibtail"))),
    );
    def(
      "ibtail",
      alt(
        EPS,
        seq(noneOf(["A", "Z"], "[", "]", "\n", " ", "\t", ...noBrace), ref("ibody")),
        seq("[", WS, ref("ibtail")),
        seq(
          plus(UP),
          alt(EPS, seq(noneOf(["A", "Z"], ":", "[", "]", "\n", ...noBrace), ref("ibody"))),
        ),
      ),
    );
  }
  const TEXT = ref("text");

  // ---------- attributes (2.0) ----------
  const attrQuoted = seq('"', plus(noneOf('"', "\n")), '"');
  const attr = alt(
    ...(recognize ? [seq("#", IDENT)] : []),
    seq(".", IDENT),
    seq(IDENT, "=", alt(IDENT, INT, attrQuoted)),
    IDENT,
  );
  def("attrs", opt(seq(opt(" "), "{: ", attr, star(seq(" ", attr)), " }")));
  const ATTRS: Expr = v2 ? ref("attrs") : EPS;

  // ---------- widget lines (2.0) ----------
  const widgetForms: Expr[] = [];
  if (v2) {
    for (const spec of Object.values(catalog.components)) {
      if (spec.kind !== "widget" || INLINE_BUILTINS.has(spec.name)) continue;
      const args =
        Object.hasOwn(WIDGET_ARGS, spec.name) && spec.trust === "core"
          ? (WIDGET_ARGS[spec.name] as Expr)
          : propsArgs(spec);
      widgetForms.push(seq("[ ", spec.name, ":", args === EPS ? EPS : seq(" ", args), " ]", ATTRS));
    }
    if (has("IMAGE")) widgetForms.push(seq("[ IMG: ", WORDS, " ]", ATTRS));
    widgetForms.push(
      recognize
        ? seq("[[ ", WS, "USE:", WS, plus(noneOf(" ", "]", "\n")), WS, "]]", ATTRS)
        : seq("[[ USE: ./", WORD, ".ui.md ]]", ATTRS),
    );
  }
  const bracketGeneric = v2 ? seq("[", WS, ref("ibtail"), "]", TEXT) : seq("[", TEXT);
  def("inline_leaf", alt(...widgetForms, bracketGeneric));
  const inlineLeaf: Expr = ref("inline_leaf");

  // ---------- bindings ----------
  const bindingExpr: Expr | undefined = v2
    ? o.dataPaths !== undefined
      ? o.dataPaths.length > 0
        ? seq("{{ ", alt(...o.dataPaths.map((p) => lit(p))), " }}")
        : undefined
      : seq("{{ ", PATH, " }}")
    : undefined;

  // ---------- hints / directives ----------
  const tokenName =
    o.tokens !== undefined && o.tokens.length > 0 ? alt(...o.tokens.map((t) => lit(t))) : IDENT;
  const pair = seq(tokenName, ": ", plus(oneOf(["a", "z"], ["0", "9"], "-")));
  const env = v2 ? star(seq(alt("@dark", "@light", "@touch", "@hover", "@print"), " ")) : EPS;
  const directive = seq(
    ">",
    " ",
    env,
    "@",
    alt("sm", "md", "lg", "xl"),
    " ",
    pair,
    star(seq(", ", pair)),
  );
  // With an enumerated token set every `@…` hint must be a directive over those names; otherwise `> @x …` is plain text.
  const tokensGiven = o.tokens !== undefined && o.tokens.length > 0;
  const hint = tokensGiven
    ? alt(seq(">", WS, alt(EPS, seq(noneOf("@", "\n", " ", "\t"), REST))), directive)
    : alt(seq(">", REST), directive);

  // ---------- leaf lines ----------
  const notAfter1 = (c: string, more: Expr): Expr => alt(EPS, seq(noneOf(c, "\n"), TEXT), more);
  const pstartExcl = [
    "\n",
    " ",
    "\t",
    "|",
    "=",
    ":",
    "-",
    "#",
    ">",
    "*",
    "<",
    "`",
    "[",
    "(",
    "{",
    ["0", "9"] as [string, string],
  ];
  const para = alt(
    seq(noneOf(...pstartExcl), TEXT),
    seq(plus(DIGIT), alt(EPS, seq(noneOf(["0", "9"], ".", "\n"), TEXT))),
    seq("(", TEXT),
    seq("***", noneOf(" ", "\t", "\n", "*"), TEXT),
    ...(recognize ? [seq("#", noneOf(" ", "\t", "\n", "#"), TEXT), seq("---", WS)] : []),
    seq("**", alt(EPS, seq(noneOf("*", "\n"), TEXT))),
    seq("*", seq(noneOf("*", " ", "\t", "\n"), TEXT)),
    seq(
      "`",
      alt(EPS, seq(noneOf("`", "\n"), TEXT), seq("`", alt(EPS, seq(noneOf("`", "\n"), TEXT)))),
    ),
    seq(
      "<",
      alt(
        EPS,
        seq(noneOf("!", "\n"), TEXT),
        seq(
          "!",
          alt(EPS, seq(noneOf("-", "\n"), TEXT), seq("-", alt(EPS, seq(noneOf("-", "\n"), TEXT)))),
        ),
      ),
    ),
    seq("|", alt(EPS, seq(noneOf("|", "\n"), TEXT))),
    seq("=", notAfter1("=", seq("=", alt(EPS, seq(noneOf("=", "\n"), TEXT))))),
    seq(":", notAfter1(":", seq(":", alt(EPS, seq(noneOf(":", "\n"), TEXT))))),
    inlineLeaf,
    ...(bindingsOnly ? [] : [seq("{", TEXT)]),
    ...(bindingExpr !== undefined ? [bindingExpr] : []),
  );
  const heading = seq(plus(lit("#")), SP1, TEXT);
  const divider = alt(
    seq("***", WS),
    ...(v2 ? [seq("*** ", plus(noneOf("*", "\n")), " ***", WS)] : []),
  );
  const marker = alt("-", "*", seq(INT, "."));
  const itemText = alt(
    seq(noneOf(" ", "\t", "\n", "|", "=", ":", "["), TEXT),
    seq("|", alt(EPS, seq(noneOf("|", "\n"), TEXT))),
    seq("=", notAfter1("=", seq("=", alt(EPS, seq(noneOf("=", "\n"), TEXT))))),
    seq(":", notAfter1(":", seq(":", alt(EPS, seq(noneOf(":", "\n"), TEXT))))),
    inlineLeaf,
  );
  const listItem = seq(marker, SP1, alt(EPS, itemText));
  const codeLine = seq(
    WS,
    alt(
      EPS,
      seq(noneOf(" ", "\t", "\n", "`"), REST),
      seq(
        "`",
        alt(EPS, seq(noneOf("`", "\n"), REST), seq("`", alt(EPS, seq(noneOf("`", "\n"), REST)))),
      ),
    ),
  );
  const fence = seq("```", REST, NL, star(seq(codeLine, NL)), WS, "```", WS);
  const comment = seq(
    "<!--",
    star(alt(noneOf("-"), seq("-", noneOf("-")), seq("--", noneOf(">")))),
    "-->",
    REST,
  );
  def("leaf", seq(WS, alt(EPS, para, heading, hint, divider, listItem, fence, comment)));
  def("line", seq(ref("leaf"), NL));

  // ---------- containers ----------
  const kinds: { name: string; opener: Expr }[] = [];
  if (!v2) for (const [n, e] of Object.entries(FIXED)) kinds.push({ name: n, opener: e });
  else
    for (const spec of Object.values(catalog.components)) {
      if (spec.kind !== "container") continue;
      if (Object.hasOwn(FIXED, spec.name))
        kinds.push({ name: spec.name, opener: FIXED[spec.name] as Expr });
      else if (spec.name === "EACH")
        kinds.push({
          name: "EACH",
          opener: seq(
            "::: EACH ",
            IDENT,
            " in ",
            o.dataPaths !== undefined && o.dataPaths.length > 0
              ? alt(...o.dataPaths.map((p) => lit(p)))
              : PATH,
            " :::",
          ),
        });
      else if (spec.name === "IF")
        kinds.push({
          name: "IF",
          opener: seq(
            "::: IF ",
            opt("!"),
            o.dataPaths !== undefined && o.dataPaths.length > 0
              ? alt(...o.dataPaths.map((p) => lit(p)))
              : PATH,
            " :::",
          ),
        });
      else if (spec.name === "REGION" || spec.name === "STATE")
        kinds.push({
          name: spec.name,
          opener: seq(`::: ${spec.name} `, recognize ? IDENT : plus(oneOf(["a", "z"])), " :::"),
        });
      else {
        const args = propsArgs(spec);
        const quoted = seq('"', plus(noneOf('"', "\n")), '"');
        const generic = star(
          seq(
            " ",
            alt(IDENT, INT, quoted, seq(IDENT, "=", alt(IDENT, INT, quoted, seq("#", IDENT)))),
          ),
        );
        kinds.push({
          name: spec.name,
          opener: seq(
            `::: ${spec.name}`,
            Object.keys(spec.props).length > 0 ? seq(args === EPS ? EPS : seq(" ", args)) : generic,
            " :::",
          ),
        });
      }
    }

  const depthLimit = o.maxDepth;
  const blocksName = (d: number): string => (depthLimit === undefined ? "blocks" : `blocks_${d}`);
  const levels =
    depthLimit === undefined ? [0] : Array.from({ length: depthLimit + 1 }, (_, i) => i);
  def("item_prefix", seq(WS, marker, SP1));
  const regionName = (d: number): string => (depthLimit === undefined ? "rblocks" : `rblocks_${d}`);
  for (const d of levels) {
    const here = blocksName(d);
    const below =
      depthLimit === undefined ? "blocks" : d < depthLimit ? blocksName(d + 1) : undefined;
    const belowRegion =
      depthLimit === undefined ? "rblocks" : d < depthLimit ? regionName(d + 1) : undefined;
    const alts: Expr[] = [ref("line")];
    const stateAlts: Expr[] = [];
    if (below !== undefined && belowRegion !== undefined)
      for (const k of kinds) {
        const closer = seq(
          WS,
          v2 ? alt("--- END ---", `--- END ${k.name} ---`) : lit("--- END ---"),
          WS,
          NL,
        );
        const open = seq(k.opener, ATTRS, NL);
        if (k.name === "STATE") {
          // a STATE is only valid directly inside a REGION
          const sb = `state${depthLimit === undefined ? "" : `_${d}`}`;
          def(`box_${sb}`, seq(WS, open, ref(below), closer));
          stateAlts.push(ref(`box_${sb}`));
          continue;
        }
        const inner: Expr =
          k.name === "REGION"
            ? ref(belowRegion)
            : k.name === "MODAL" && !recognize
              ? seq(WS, "# ", WORDS, NL, ref(below))
              : ref(below);
        const base = `${k.name.toLowerCase()}${depthLimit === undefined ? "" : `_${d}`}`;
        def(`box_${base}`, seq(WS, open, inner, closer));
        def(`item_box_${base}`, seq(ref("item_prefix"), open, inner, closer));
        alts.push(ref(`box_${base}`), ref(`item_box_${base}`));
      }
    def(here, star(alt(...alts)));
    def(regionName(d), star(alt(...alts, ...stateAlts)));
  }

  // ---------- frontmatter + document ----------
  const known = ["framework", "theme", "title", "caption", "component", "catalog", "map"];
  // Strict profile: each known key at most once, in a fixed order (no duplicate-key errors by construction).
  const fmStrict = seq(
    ...known.map((k) => opt(seq(k, ": ", WORDS, NL))),
    opt(seq("lang: ", alt("en", "fr"), NL)),
    opt(seq("dir: ", alt("ltr", "rtl"), NL)),
  );
  const fmFree = alt(
    seq(oneOf(["a", "z"], ["A", "Z"], "_"), star(noneOf("\n"))),
    seq(plus(oneOf(" ", "\t")), REST),
  );
  const fmBody = recognize ? star(seq(fmFree, NL)) : fmStrict;
  const frontmatter = v2
    ? seq("---\ndsl: 2.0\n", fmBody, "---\n")
    : opt(seq("---\n", fmBody, "---\n"));
  def("document", seq(frontmatter, ref(blocksName(0))));
  return { start: "document", rules };
}
