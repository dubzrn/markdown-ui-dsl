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
  };
}

export class UsageError extends Error {}

const VALUE_FLAGS = ["--fail-on", "--config"];

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
    else if (VALUE_FLAGS.includes(a) || VALUE_FLAGS.some((f) => a.startsWith(`${f}=`))) {
      const eq = a.indexOf("=");
      const name = eq === -1 ? a : a.slice(0, eq);
      const value = eq === -1 ? argv[++i] : a.slice(eq + 1);
      if (value === undefined || value.startsWith("--"))
        throw new UsageError(`${name} needs a value`);
      if (name === "--fail-on") out.flags.failOn = value;
      else out.flags.config = value;
    } else if (a.startsWith("-") && a !== "-") throw new UsageError(`unknown option ${a}`);
    else rest.push(a);
  }
  out.command = rest[0];
  out.positional = rest.slice(1);
  return out;
}
