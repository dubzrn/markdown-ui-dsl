/** Everything the CLI needs from the outside world, injectable for tests. */
export interface Io {
  cwd: string;
  stdout: (s: string) => void;
  stderr: (s: string) => void;
  /** File text, or undefined when it does not exist / cannot be read. */
  readFile: (absPath: string) => string | undefined;
  /** Directory entries, or undefined when the path is not a directory. */
  readDir: (absPath: string) => { name: string; isDir: boolean }[] | undefined;
  /** Write a file (used by `fmt --write`, `migrate --write`). */
  writeFile: (absPath: string, text: string) => void;
  /** Delete a file (used for the sync journal). */
  removeFile: (absPath: string) => void;
}
