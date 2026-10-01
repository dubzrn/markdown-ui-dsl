// Client-side search over window.__MDUI_INDEX (a JS file so it works from file:// too). No dependencies.
(function () {
  var input = document.getElementById("q");
  var list = document.getElementById("results");
  if (!input || !list || !window.__MDUI_INDEX) return;
  var idx = window.__MDUI_INDEX;
  var root = document.documentElement.getAttribute("data-root") || "";
  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return "&#" + c.charCodeAt(0) + ";";
    });
  }
  function run() {
    var terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      list.hidden = true;
      list.innerHTML = "";
      return;
    }
    var hits = [];
    idx.forEach(function (p) {
      var score = 0;
      var ok = terms.every(function (t) {
        var s = 0;
        if (p.t.toLowerCase().indexOf(t) >= 0) s += 10;
        if (p.h.toLowerCase().indexOf(t) >= 0) s += 4;
        if (p.x.indexOf(t) >= 0) s += 1;
        score += s;
        return s > 0;
      });
      if (ok) hits.push({ p: p, s: score });
    });
    hits.sort(function (a, b) {
      return b.s - a.s || (a.p.t < b.p.t ? -1 : 1);
    });
    list.innerHTML =
      hits.length === 0
        ? '<li><a href="#" tabindex="-1">No results</a></li>'
        : hits
            .slice(0, 12)
            .map(function (h) {
              return (
                '<li><a href="' +
                root +
                h.p.u +
                '">' +
                esc(h.p.t) +
                "<small>" +
                esc(h.p.k) +
                "</small></a></li>"
              );
            })
            .join("");
    list.hidden = false;
  }
  input.addEventListener("input", run);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      list.hidden = true;
      input.value = "";
    }
  });
  document.addEventListener("click", function (e) {
    if (!list.contains(e.target) && e.target !== input) list.hidden = true;
  });
})();
