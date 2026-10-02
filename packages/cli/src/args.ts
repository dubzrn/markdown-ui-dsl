export interface Args {
  command: string | undefined;
  positional: string[];
  flags: {
    json: boolean;
    help: boolean;
    version: boolean;
    failOn: string | undefined;
    config: string | undefined;
    compact: boolean;
    check: boolean;
    fix: boolean;
    write: boolean;
    force: boolean;
    style: string | undefined;
    state: string | undefined;
    theme: string | undefined;
    out: string | undefined;
    to: string | undefined;
    agent: string | undefined;
    catalog: string | undefined;
    map: string | undefined;
    design: string | undefined;
    requirements: string | undefined;
    format: string | undefined;
    dsl: string | undefined;
    maxDepth: string | undefined;
    tokens: string | undefined;
    data: string | undefined;
    all: boolean;
    auditWaivers: boolean;
    confirm: boolean;
    url: string | undefined;
    html: string | undefined;
    minFidelity: string | undefined;
    baseline: string | undefined;
    nameMatch: string | undefined;
    chromium: string | undefined;
    strict: boolean;
    writeBaseline: boolean;
    code: string | undefined;
    lock: string | undefined;
    resolve: string | undefined;
    port: string | undefined;
    scale: string | undefined;
    dpi: string | undefined;
    png: string | undefined;
    watch: boolean;
    width: string | undefined;
    outDir: string | undefined;
    keepSource: boolean;
  };
}

export class UsageError extends Error {}

const VALUE_FLAGS = [
  "--fail-on",
  "--config",
  "--style",
  "--state",
  "--theme",
  "--out",
  "--to",
  "--agent",
  "--catalog",
  "--map",
  "--design",
  "--requirements",
  "--format",
  "--dsl",
  "--max-depth",
  "--tokens",
  "--data",
  "--code",
  "--lock",
  "--resolve",
  "--url",
  "--html",
  "--min-fidelity",
  "--baseline",
  "--name-match",
  "--chromium",
  "--port",
  "--scale",
  "--dpi",
  "--png",
  "--width",
  "--out-dir",
];

export function parseArgs(argv: string[]): Args {
  const out: Args = {
    command: undefined,
    positional: [],
    flags: {
      json: false,
      help: false,
      version: false,
      failOn: undefined,
      config: undefined,
      compact: false,
      check: false,
      fix: false,
      write: false,
      force: false,
      style: undefined,
      state: undefined,
      theme: undefined,
      out: undefined,
      to: undefined,
      agent: undefined,
      catalog: undefined,
      map: undefined,
      design: undefined,
      requirements: undefined,
      format: undefined,
      dsl: undefined,
      maxDepth: undefined,
      tokens: undefined,
      data: undefined,
      all: false,
      auditWaivers: false,
      confirm: false,
      url: undefined,
      html: undefined,
      minFidelity: undefined,
      baseline: undefined,
      nameMatch: undefined,
      chromium: undefined,
      strict: false,
      writeBaseline: false,
      code: undefined,
      lock: undefined,
      resolve: undefined,
      port: undefined,
      scale: undefined,
      dpi: undefined,
      png: undefined,
      watch: false,
      width: undefined,
      outDir: undefined,
      keepSource: false,
    },
  };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === "--") {
      rest.push(...argv.slice(i + 1));
      break;
    }
    if (a === "--json") out.flags.json = true;
    else if (a === "--help" || a === "-h") out.flags.help = true;
    else if (a === "--version" || a === "-v") out.flags.version = true;
    else if (a === "--compact") out.flags.compact = true;
    else if (a === "--check") out.flags.check = true;
    else if (a === "--fix") out.flags.fix = true;
    else if (a === "--write") out.flags.write = true;
    else if (a === "--force") out.flags.force = true;
    else if (a === "--all") out.flags.all = true;
    else if (a === "--audit-waivers") out.flags.auditWaivers = true;
    else if (a === "--confirm") out.flags.confirm = true;
    else if (a === "--strict") out.flags.strict = true;
    else if (a === "--watch") out.flags.watch = true;
    else if (a === "--keep-source") out.flags.keepSource = true;
    else if (a === "--write-baseline") out.flags.writeBaseline = true;
    else if (VALUE_FLAGS.includes(a) || VALUE_FLAGS.some((f) => a.startsWith(`${f}=`))) {
      const eq = a.indexOf("=");
      const name = eq === -1 ? a : a.slice(0, eq);
      const value = eq === -1 ? argv[++i] : a.slice(eq + 1);
      if (value === undefined || value.startsWith("--"))
        throw new UsageError(`${name} needs a value`);
      if (name === "--fail-on") out.flags.failOn = value;
      else if (name === "--config") out.flags.config = value;
      else if (name === "--style") out.flags.style = value;
      else if (name === "--state") out.flags.state = value;
      else if (name === "--theme") out.flags.theme = value;
      else if (name === "--to") out.flags.to = value;
      else if (name === "--agent") out.flags.agent = value;
      else if (name === "--catalog") out.flags.catalog = value;
      else if (name === "--map") out.flags.map = value;
      else if (name === "--design") out.flags.design = value;
      else if (name === "--requirements") out.flags.requirements = value;
      else if (name === "--format") out.flags.format = value;
      else if (name === "--dsl") out.flags.dsl = value;
      else if (name === "--max-depth") out.flags.maxDepth = value;
      else if (name === "--tokens") out.flags.tokens = value;
      else if (name === "--data") out.flags.data = value;
      else if (name === "--code") out.flags.code = value;
      else if (name === "--lock") out.flags.lock = value;
      else if (name === "--resolve") out.flags.resolve = value;
      else if (name === "--url") out.flags.url = value;
      else if (name === "--html") out.flags.html = value;
      else if (name === "--min-fidelity") out.flags.minFidelity = value;
      else if (name === "--baseline") out.flags.baseline = value;
      else if (name === "--name-match") out.flags.nameMatch = value;
      else if (name === "--chromium") out.flags.chromium = value;
      else if (name === "--port") out.flags.port = value;
      else if (name === "--scale") out.flags.scale = value;
      else if (name === "--dpi") out.flags.dpi = value;
      else if (name === "--png") out.flags.png = value;
      else if (name === "--width") out.flags.width = value;
      else if (name === "--out-dir") out.flags.outDir = value;
      else out.flags.out = value;
    } else if (a.startsWith("-") && a !== "-") throw new UsageError(`unknown option ${a}`);
    else rest.push(a);
  }
  out.command = rest[0];
  out.positional = rest.slice(1);
  return out;
}
