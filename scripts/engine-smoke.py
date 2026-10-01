#!/usr/bin/env python3
"""Engine smoke test (T-060): do real grammar engines accept the emitted grammar, accept generated documents and refuse broken ones?

  python3 scripts/engine-smoke.py            (needs: pip install lark llguidance tokenizers xgrammar)

Engines missing -> that engine is reported SKIPPED (exit 0). Any engine present and failing -> exit 1.
This checks *acceptance of the grammar by the engine's matcher*. It does not run an LLM, so it does not show that a model
produces good documents under the constraint (that is the T-061 benchmark, which needs model access).
"""
import json, os, subprocess, sys

ONLY = [e for e in os.environ.get("MDUI_ENGINES", "").split(",") if e]  # e.g. MDUI_ENGINES=llguidance


def wanted(engine):
    return not ONLY or engine in ONLY

ROOT = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()


def node(*args):
    return subprocess.check_output(["node", *args], cwd=ROOT, text=True)


lark_text = node("packages/cli/dist/bin.js", "grammar", "--format", "lark", "--max-depth", "3")
gbnf_text = node("packages/cli/dist/bin.js", "grammar", "--format", "gbnf", "--max-depth", "3")
corpus = json.loads(node("scripts/engine-corpus.mjs", "--n", "25"))
good, bad = corpus["good"], corpus["bad"]
results, failed = [], 0


def report(engine, status, detail=""):
    global failed
    results.append((engine, status, detail))
    if status == "FAIL":
        failed += 1
    print(f"{engine:<28}{status:<9}{detail}")


# ---- engine 1: Lark (Earley, dynamic lexer) ----
try:
    if not wanted("lark"):
        raise ImportError("not selected")
    from lark import Lark
    from lark.exceptions import LarkError

    parser = Lark(lark_text, parser="earley", lexer="dynamic", start="start", ambiguity="resolve")
    rej = []
    for d in good:
        try:
            parser.parse(d)
        except LarkError as e:
            rej.append((d, str(e)[:80]))
    leaked = []
    for d in bad:
        try:
            parser.parse(d)
            leaked.append(d)
        except LarkError:
            pass
    ok = not rej and not leaked
    report("lark (python, Earley)", "PASS" if ok else "FAIL",
           f"{len(good) - len(rej)}/{len(good)} good accepted, {len(bad) - len(leaked)}/{len(bad)} bad refused")
    for d, e in rej[:2]:
        print("  rejected:", repr(d[:120]), e)
    for d in leaked[:2]:
        print("  accepted bad:", repr(d[:120]))
except ImportError:
    report("lark (python, Earley)", "SKIPPED", "pip install lark")

# ---- engine 2: llguidance (Rust; the matcher used by constrained-decoding servers) ----
try:
    if not wanted("llguidance"):
        raise ImportError("not selected")
    import llguidance
    from tokenizers import Tokenizer, models, pre_tokenizers, decoders

    alphabet = sorted(pre_tokenizers.ByteLevel.alphabet())
    vocab = {ch: i for i, ch in enumerate(alphabet)}
    eos = len(vocab)
    vocab["<|eos|>"] = eos
    tok = Tokenizer(models.BPE(vocab=vocab, merges=[]))
    tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
    tok.decoder = decoders.ByteLevel()
    tok.add_special_tokens(["<|eos|>"])
    ll_tok = llguidance.LLTokenizer(tok.to_str(), eos_token=eos)
    byte_to_id = {b: vocab[ch] for b, ch in zip(range(256), [c for c in pre_tokenizers.ByteLevel.alphabet()])}
    # ByteLevel maps byte b to a printable char; build the real table from the tokenizer itself
    byte_to_id = {}
    for b in range(256):
        ids = tok.encode(bytes([b]).decode("latin-1")).ids
        byte_to_id[b] = ids[0] if len(ids) == 1 else None

    def ids_of(doc):
        return [byte_to_id[b] for b in doc.encode("utf-8")]

    def run_llg(label, spec, informational=False):
        fail = "NOTE" if informational else "FAIL"
        err = llguidance.LLMatcher.validate_grammar(spec, ll_tok)
        if err:
            report(label, fail, err[:200])
            return
        rej, leaked = [], []
        for d in good:
            m = llguidance.LLMatcher(ll_tok, spec)
            if not (m.consume_tokens(ids_of(d)) and not m.is_error() and m.is_accepting()):
                rej.append(d)
        for d in bad:
            m = llguidance.LLMatcher(ll_tok, spec)
            if m.consume_tokens(ids_of(d)) and not m.is_error() and m.is_accepting():
                leaked.append(d)
        report(label, "PASS" if not rej and not leaked else fail,
               f"{len(good) - len(rej)}/{len(good)} good accepted, {len(bad) - len(leaked)}/{len(bad)} bad refused")
        for d in rej[:2]:
            print("  rejected:", repr(d[:120]))
        for d in leaked[:2]:
            print("  accepted bad:", repr(d[:120]))

    run_llg("llguidance (Lark grammar)", llguidance.grammar_from("lark", lark_text))
    # llguidance also reads GBNF (it converts it to its Lark dialect): this exercises our GBNF text, not llama.cpp itself
    try:
        converted = llguidance.gbnf_to_lark.gbnf_to_lark(gbnf_text)
        # informational: llguidance's GBNF reader is a converter to its lexer-based Lark dialect and cannot resolve the
        # ambiguity between nested indentation and closers that a scannerless GBNF engine (llama.cpp) handles
        run_llg("llguidance (GBNF import)", llguidance.grammar_from("lark", converted), informational=True)
    except Exception as e:  # noqa: BLE001
        report("llguidance (GBNF import)", "NOTE", f"{type(e).__name__}: {str(e)[:160]}")
except ImportError as e:
    report("llguidance", "SKIPPED", f"pip install llguidance tokenizers ({e})")

# ---- engine 3: xgrammar (its own EBNF parser, compiler and matcher) ----
try:
    if not wanted("xgrammar"):
        raise ImportError("not selected")
    import xgrammar as xgr

    # a byte-level vocabulary (one token per byte + eos): the matcher is exercised through accept_token like a decoder would
    vocab = [bytes([b]) for b in range(256)] + [b"<eos>"]
    info = xgr.TokenizerInfo(vocab, xgr.VocabType.RAW, vocab_size=len(vocab), stop_token_ids=[256])
    compiled = xgr.GrammarCompiler(info).compile_grammar(xgr.Grammar.from_ebnf(gbnf_text))

    def xg_accepts(doc):
        m = xgr.GrammarMatcher(compiled, terminate_without_stop_token=True)
        for b in doc.encode("utf-8"):
            if not m.accept_token(b):
                return False
        return m.is_terminated() or m.accept_token(256)

    rej = [d for d in good if not xg_accepts(d)]
    leaked = [d for d in bad if xg_accepts(d)]
    report("xgrammar (GBNF)", "PASS" if not rej and not leaked else "FAIL",
           f"{len(good) - len(rej)}/{len(good)} good accepted, {len(bad) - len(leaked)}/{len(bad)} bad refused")
    for d in rej[:2]:
        print("  rejected:", repr(d[:120]))
    for d in leaked[:2]:
        print("  accepted bad:", repr(d[:120]))
except ImportError as e:
    report("xgrammar", "SKIPPED", f"pip install xgrammar ({e})")
except Exception as e:  # noqa: BLE001
    report("xgrammar (GBNF)", "FAIL", f"{type(e).__name__}: {str(e)[:200]}")

# ---- engine 4: llama.cpp (native GBNF, its own parser and matcher) ----
# Build once:  cmake --build <llama.cpp>/build --target test-gbnf-validator   then   LLAMA_GBNF_VALIDATOR=<path to binary>
validator = os.environ.get("LLAMA_GBNF_VALIDATOR", "")
if not wanted("llama.cpp"):
    pass
elif not validator or not os.path.exists(validator):
    report("llama.cpp (GBNF)", "SKIPPED", "set LLAMA_GBNF_VALIDATOR to llama.cpp's test-gbnf-validator binary")
else:
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        gpath = os.path.join(tmp, "ui.gbnf")
        open(gpath, "w").write(gbnf_text)

        def valid(doc):
            ipath = os.path.join(tmp, "in.txt")
            open(ipath, "w").write(doc)
            out = subprocess.run([validator, gpath, ipath], capture_output=True, text=True).stdout
            return "is valid according to the grammar" in out

        rej = [d for d in good if not valid(d)]
        leaked = [d for d in bad if valid(d)]
        report("llama.cpp (GBNF)", "PASS" if not rej and not leaked else "FAIL",
               f"{len(good) - len(rej)}/{len(good)} good accepted, {len(bad) - len(leaked)}/{len(bad)} bad refused")
        for d in rej[:2]:
            print("  rejected:", repr(d[:120]))
        for d in leaked[:2]:
            print("  accepted bad:", repr(d[:120]))

sys.exit(1 if failed else 0)
