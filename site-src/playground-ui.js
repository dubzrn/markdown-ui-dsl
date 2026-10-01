// Playground UI: everything runs in the page (window.mdui comes from the bundled packages). No server, no network.
(function () {
  var m = window.mdui;
  var src = document.getElementById("src");
  var out = {
    preview: document.getElementById("p-preview"),
    svg: document.getElementById("p-svg"),
    diag: document.getElementById("p-diag"),
    outline: document.querySelector("#p-outline pre"),
    a2ui: document.querySelector("#p-a2ui pre"),
    jr: document.querySelector("#p-jr pre"),
  };
  var style = document.getElementById("style");
  var theme = document.getElementById("theme");
  var state = document.getElementById("state");
  var status = document.getElementById("status");
  var root = document.documentElement.getAttribute("data-root") || "";
  var DEFAULT =
    '---\ndsl: 2.0\nlang: en\n---\n\n::: CARD :::\n# Welcome Back\nPlease log in to continue.\n\n[ text: Email Address ]{: label="Email address" required }\n[ text: Password ]{: label="Password" type=password required }\n\n=== ROW ===\n[x] Remember me\n[ Forgot Password? ](#forgot)\n--- END ---\n\n[ Login ](#login){: primary }\n--- END ---\n';
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return "&#" + c.charCodeAt(0) + ";";
    });
  }
  function setText(el, s) {
    el.textContent = s;
  }
  function run() {
    var t0 = performance.now();
    var text = src.value;
    var doc = m.parse(text);
    var diags = m.lint(text).diagnostics;
    var opts = { style: style.value, theme: theme.value };
    if (state.value) opts.state = state.value;
    var frame = out.preview.querySelector("iframe");
    frame.srcdoc = m.render(doc, opts);
    out.svg.innerHTML = m.renderSvg(doc, opts);
    out.diag.innerHTML =
      diags.length === 0
        ? "<p>No diagnostics.</p>"
        : "<ul>" +
          diags
            .map(function (d) {
              return (
                "<li><strong>" +
                esc(d.severity) +
                "</strong> " +
                d.span.start.line +
                ":" +
                d.span.start.col +
                ' <a href="' +
                root +
                "diagnostics/" +
                esc(d.code) +
                '.html">' +
                esc(d.code) +
                "</a> " +
                esc(d.message) +
                (d.rule ? " <small>[" + esc(d.rule) + "]</small>" : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul>";
    setText(out.outline, m.outline(doc));
    var a = m.exportA2ui(doc, opts.state ? { state: opts.state } : {});
    setText(
      out.a2ui,
      JSON.stringify(a.messages, null, 2) +
        (a.warnings.length
          ? "\n\n// warnings\n" +
            a.warnings
              .map(function (w) {
                return "// line " + w.line + " " + w.kind + " " + w.construct + ": " + w.message;
              })
              .join("\n")
          : ""),
    );
    var j = m.exportJsonRender(doc);
    setText(out.jr, JSON.stringify({ spec: j.spec, catalog: j.catalog }, null, 2));
    var errs = diags.filter(function (d) {
      return d.severity === "error";
    }).length;
    status.textContent =
      diags.length +
      " diagnostic(s), " +
      errs +
      " error(s), updated in " +
      Math.round(performance.now() - t0) +
      " ms";
    status.setAttribute("data-ms", String(Math.round(performance.now() - t0)));
    try {
      history.replaceState(
        null,
        "",
        "#" + encodeURIComponent(btoa(unescape(encodeURIComponent(text)))),
      );
    } catch {
      // the URL hash is optional
    }
  }
  var timer;
  function later() {
    clearTimeout(timer);
    timer = setTimeout(run, 80);
  }
  try {
    if (location.hash.length > 1)
      src.value = decodeURIComponent(escape(atob(decodeURIComponent(location.hash.slice(1)))));
  } catch {
    // the URL hash is optional
  }
  if (!src.value) src.value = DEFAULT;
  [src, style, theme, state].forEach(function (el) {
    el.addEventListener("input", later);
    el.addEventListener("change", later);
  });
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[role=tab]"));
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () {
      select(t);
    });
    t.addEventListener("keydown", function (e) {
      var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
      if (n >= 0) {
        var next = tabs[(n + tabs.length) % tabs.length];
        next.focus();
        select(next);
      }
    });
  });
  select(tabs[0]);
  run();
})();
