export type StyleName = "sketch" | "clean" | "wireframe" | "none";

const BASE = `
.mdui{box-sizing:border-box;max-width:960px;margin:0 auto;padding:16px;font-family:var(--mdui-font,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);line-height:1.45;color:var(--mdui-fg,#1b1b1f);background:var(--mdui-bg,#fff)}
.mdui *,.mdui *::before,.mdui *::after{box-sizing:border-box}
.mdui p,.mdui h1,.mdui h2,.mdui h3,.mdui h4,.mdui h5,.mdui h6,.mdui ul,.mdui ol,.mdui pre,.mdui fieldset{margin:0}
.mdui ul,.mdui ol{padding-left:1.4em}
.mdui-col{display:flex;flex-direction:column;gap:var(--mdui-gap,12px)}
.mdui-row{display:flex;flex-direction:row;flex-wrap:wrap;gap:var(--mdui-gap,12px);align-items:center}
.mdui-card{border:1px solid var(--mdui-line,#c9c9d1);border-radius:var(--mdui-radius,8px);padding:16px;display:flex;flex-direction:column;gap:var(--mdui-gap,12px);background:var(--mdui-surface,#fff)}
.mdui-modal{border:2px solid var(--mdui-line,#c9c9d1);border-radius:var(--mdui-radius,8px);padding:16px;max-width:520px;margin:16px auto;background:var(--mdui-surface,#fff);color:inherit;position:static}
.mdui-header,.mdui-footer{padding:12px 16px;border:1px solid var(--mdui-line,#c9c9d1);background:var(--mdui-muted,#f3f3f6);display:flex;gap:var(--mdui-gap,12px);align-items:center;flex-wrap:wrap}
.mdui-bubble{max-width:75%;padding:10px 14px;border-radius:16px;border:1px solid var(--mdui-line,#c9c9d1)}
.mdui-bubble--user{align-self:flex-end;background:var(--mdui-muted,#f3f3f6)}
.mdui-bubble--agent{align-self:flex-start}
.mdui-grid{display:grid;gap:var(--mdui-gap,12px)}
.mdui-callout{border-left:4px solid var(--mdui-line,#8b8b99);padding:8px 12px;background:var(--mdui-muted,#f3f3f6)}
.mdui-drawer{border:1px solid var(--mdui-line,#c9c9d1);padding:12px;background:var(--mdui-surface,#fff)}
.mdui-toast{border:1px solid var(--mdui-line,#c9c9d1);padding:8px 12px;border-radius:6px;background:var(--mdui-muted,#f3f3f6)}
.mdui-empty{border:1px dashed var(--mdui-line,#c9c9d1);padding:24px;text-align:center;color:var(--mdui-fg-muted,#5c5c66)}
.mdui-group{border:1px solid var(--mdui-line,#c9c9d1);padding:8px 12px}
.mdui-img{display:inline-flex;align-items:center;justify-content:center;min-width:96px;min-height:64px;padding:8px;border:1px solid var(--mdui-line,#c9c9d1);background:repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(128,128,140,.12) 6px,rgba(128,128,140,.12) 12px);color:var(--mdui-fg-muted,#5c5c66);font-size:.85em}
.mdui-badge{display:inline-block;padding:1px 8px;border:1px solid var(--mdui-line,#8b8b99);border-radius:999px;font-size:.85em}
.mdui-binding{font-family:ui-monospace,monospace;background:var(--mdui-muted,#f3f3f6);padding:0 4px;border-radius:3px}
.mdui-skeleton{height:14px;margin:6px 0;border-radius:4px;background:var(--mdui-muted,#e8e8ee)}
.mdui-chart{display:inline-flex;align-items:center;justify-content:center;min-width:240px;min-height:120px;border:1px solid var(--mdui-line,#c9c9d1);color:var(--mdui-fg-muted,#5c5c66)}
.mdui-stat dt{font-size:.85em;color:var(--mdui-fg-muted,#5c5c66)}.mdui-stat dd{margin:0;font-size:1.5em;font-weight:600}
.mdui-use{border:1px dotted var(--mdui-line,#8b8b99);padding:4px}
.mdui-region[data-state]{position:relative}
.mdui-divider{display:flex;align-items:center;gap:8px;color:var(--mdui-fg-muted,#5c5c66)}.mdui-divider::before,.mdui-divider::after{content:"";flex:1;border-top:1px solid var(--mdui-line,#c9c9d1)}
.mdui-tabs{display:flex;gap:4px;border-bottom:1px solid var(--mdui-line,#c9c9d1)}
.mdui-tabs [role=tab]{padding:6px 12px;border:1px solid transparent;border-bottom:none;background:none;font:inherit;cursor:default}
.mdui-tabs [role=tab][aria-selected=true]{border-color:var(--mdui-line,#c9c9d1);background:var(--mdui-surface,#fff);font-weight:600}
.mdui table{border-collapse:collapse;width:100%}.mdui th,.mdui td{border:1px solid var(--mdui-line,#c9c9d1);padding:6px 10px;text-align:left}
.mdui th{background:var(--mdui-muted,#f3f3f6)}
.mdui [data-align=right]{text-align:right}.mdui [data-align=center]{text-align:center}
.mdui button,.mdui select,.mdui input[type=text],.mdui input[type=email],.mdui input[type=password],.mdui input[type=date],.mdui input[type=file],.mdui input:not([type]){font:inherit;padding:6px 10px;border:1px solid var(--mdui-line,#8b8b99);border-radius:var(--mdui-radius-sm,6px);background:var(--mdui-surface,#fff);color:inherit;min-height:32px}
.mdui button[data-destructive]{border-color:var(--mdui-danger,#b3261e);color:var(--mdui-danger,#b3261e)}
.mdui button[role=switch]{min-width:44px;border-radius:999px}.mdui button[role=switch][aria-checked=true]{font-weight:600}
.mdui :focus-visible{outline:3px solid var(--mdui-focus,#2563eb);outline-offset:2px}
.mdui [data-bp-sm-layout=stacked]{flex-direction:column}
@media (min-width:640px){.mdui [data-bp-md-layout=row]{flex-direction:row}.mdui [data-bp-md-layout=stacked]{flex-direction:column}}
@media (min-width:1024px){.mdui [data-bp-lg-layout=row]{flex-direction:row}.mdui [data-bp-lg-layout=stacked]{flex-direction:column}}
@media (min-width:1280px){.mdui [data-bp-xl-layout=row]{flex-direction:row}.mdui [data-bp-xl-layout=stacked]{flex-direction:column}}
@media print{.mdui{max-width:none}}
@media (prefers-reduced-motion:reduce){.mdui *{animation:none!important;transition:none!important}}
@media (prefers-color-scheme:dark){.mdui[data-theme=auto]{--mdui-bg:#14141a;--mdui-fg:#ececf1;--mdui-surface:#1d1d25;--mdui-muted:#262631;--mdui-line:#4a4a5a;--mdui-fg-muted:#a8a8b8;--mdui-control:#33333f;--mdui-placeholder:#1d1d25}}
.mdui[data-theme=dark]{--mdui-bg:#14141a;--mdui-fg:#ececf1;--mdui-surface:#1d1d25;--mdui-muted:#262631;--mdui-line:#4a4a5a;--mdui-fg-muted:#a8a8b8;--mdui-control:#33333f;--mdui-placeholder:#1d1d25}
`;

const WIREFRAME = `
.mdui-style-wireframe{--mdui-line:#666;--mdui-radius:0;--mdui-radius-sm:0;--mdui-muted:#eee;--mdui-font:Arial,Helvetica,sans-serif}
.mdui-style-wireframe .mdui-img{background:var(--mdui-placeholder,#f6f6f6);border:1px solid var(--mdui-line,#666)}
.mdui-style-wireframe button{background:var(--mdui-control,#ddd)}
`;

const SKETCH = `
.mdui-style-sketch{--mdui-font:"Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive;--mdui-line:#333;--mdui-radius:12px 4px 10px 6px/6px 10px 4px 12px;--mdui-radius-sm:8px 3px 7px 4px/4px 7px 3px 8px;--mdui-muted:#fbf7e6;--mdui-bg:#fffef8}
.mdui-style-sketch .mdui-card,.mdui-style-sketch .mdui-modal,.mdui-style-sketch button,.mdui-style-sketch input,.mdui-style-sketch select,.mdui-style-sketch .mdui-img{border-width:2px;border-style:solid}
.mdui-style-sketch .mdui-empty,.mdui-style-sketch .mdui-use{border-style:dashed}
.mdui-style-sketch .mdui-card:nth-child(odd){transform:rotate(-.15deg)}.mdui-style-sketch .mdui-card:nth-child(even){transform:rotate(.15deg)}
@media print,(prefers-reduced-motion:reduce){.mdui-style-sketch .mdui-card{transform:none}}
`;

const CLEAN = `
.mdui-style-clean{--mdui-line:#d6d6de;--mdui-radius:12px;--mdui-radius-sm:8px}
.mdui-style-clean .mdui-card{box-shadow:0 1px 3px rgba(0,0,0,.08)}
.mdui-style-clean button:not([role=tab]):not([role=switch]){background:#2563eb;color:#fff;border-color:#2563eb}
.mdui-style-clean button[data-destructive]{background:#fff;color:var(--mdui-danger,#b3261e)}
`;

export function stylesheet(style: StyleName): string {
  switch (style) {
    case "none":
      return "";
    case "wireframe":
      return BASE + WIREFRAME;
    case "sketch":
      return BASE + SKETCH;
    case "clean":
      return BASE + CLEAN;
  }
}
