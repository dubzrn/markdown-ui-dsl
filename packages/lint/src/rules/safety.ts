import { ALLOWED_URL_SCHEMES, schemeOf, walkBlocks, type BlockNode } from "@vrillabs/mdui-core";
import type { Rule } from "../rule.js";
import { eachInline } from "../util.js";

/** Schemes a spec may link to. Everything else (javascript:, data:, file:, vbscript:, …) is E7002. */
export const ALLOWED_SCHEMES: readonly string[] = ALLOWED_URL_SCHEMES;
export { schemeOf };

export const urlScheme: Rule = {
  id: "url-scheme",
  category: "safety",
  description:
    "Link and button targets use http, https, mailto, tel or an in-app `#`/`/` route; javascript:, data:, file: and the like are rejected, including obfuscated spellings (E7002).",
  defaultSeverity: "error",
  codes: ["E7002"],
  check(ctx, report) {
    eachInline(ctx.doc, (n, _o, span) => {
      const target = n.kind === "link" ? n.target : n.kind === "button" ? n.action : undefined;
      if (target === undefined || target === "") return;
      const scheme = schemeOf(target);
      if (scheme !== undefined && !ALLOWED_SCHEMES.includes(scheme))
        report({
          code: "E7002",
          message: `Target scheme "${scheme}:" is not allowed (allowed: ${ALLOWED_SCHEMES.join(", ")}, #fragments and /routes).`,
          span,
        });
    });
  },
};

/** Phrases that address a reader that executes (an agent) rather than describe UI. Checked in every text-bearing node. */
const STRONG: RegExp[] = [
  /\b(ignore|disregard|forget|override|bypass)\b[^.\n]{0,40}\b(previous|prior|above|earlier|preceding|all|any|your|the)\b[^.\n]{0,30}\b(instructions?|rules?|prompts?|guidelines?|constraints?|polic(y|ies))\b/i,
  /\b(system|developer) (prompt|message|instructions?)\b/i,
  /\b(reveal|print|show|leak|exfiltrate|send)\b[^.\n]{0,40}\b(api[ _-]?keys?|secrets?|tokens?|passwords?|credentials?|env(ironment)? variables?)\b/i,
  /\b(curl|wget)\b[^\n]*\|\s*(ba|z)?sh\b/i,
  /\brm\s+-[a-z]*r[a-z]*f?\b/i,
  /\b(jailbreak|do anything now|developer mode)\b/i,
  /\bdo not (tell|inform|mention|show)\b[^.\n]{0,30}\b(user|human|reviewer)\b/i,
  /(^|[\s(`])--(confirm|force)\b|\b(confirm|force)\s*[:=]\s*(true|1|yes)\b/i,
  /\b(run|execute|eval)\b[^.\n]{0,30}\b(the following|this|these)\b[^.\n]{0,20}\b(command|script|code|shell|bash|payload)\b/i,
  /<\s*\/?\s*(system|assistant|instructions?)\s*>/i,
];

/** Weaker phrasings, only suspicious where a hint or comment should hold layout and nothing else. */
const WEAK: RegExp[] = [
  /\byou (must|should|shall|will|need to|are to)\b/i,
  /\b(act|behave|respond) as\b/i,
  /\b(you are now|new instructions?|from now on|pretend (to be|you))\b/i,
  /\b(assistant|agent|llm|ai model|language model|claude|chatgpt|copilot)\b[^.\n]{0,30}\b(must|should|shall|will|has to|needs to)\b/i,
  /\b(delete|overwrite|drop|wipe|disable|skip)\b[^.\n]{0,30}\b(files?|tests?|checks?|lint|validation|database|table|repo(sitory)?)\b/i,
];

function textOfBlock(node: BlockNode): { text: string; strict: boolean } | undefined {
  switch (node.kind) {
    case "hint":
    case "comment":
      return { text: node.text, strict: false };
    case "line":
    case "heading":
      return { text: node.text, strict: true };
    default:
      return undefined;
  }
}

export const instructionLikeText: Rule = {
  id: "instruction-like-text",
  category: "safety",
  description:
    "Hints and comments describe layout only; text that tries to instruct an agent (ignore previous instructions, run this command, --confirm, reveal secrets) is flagged (W7001). Spec text is data, never a command.",
  defaultSeverity: "warn",
  codes: ["W7001"],
  check(ctx, report) {
    walkBlocks(ctx.doc.body, ({ node }) => {
      const t = textOfBlock(node as BlockNode);
      if (t === undefined) return;
      const patterns = t.strict ? STRONG : [...STRONG, ...WEAK];
      if (patterns.some((p) => p.test(t.text)))
        report({
          code: "W7001",
          message: `${node.kind === "comment" ? "Comment" : node.kind === "hint" ? "Hint" : "Text"} reads as an instruction to an agent; specs are data and cannot grant permissions or commands.`,
          span: node.span,
        });
    });
  },
};

export const safetyRules: Rule[] = [urlScheme, instructionLikeText];
