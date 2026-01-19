declare namespace Deno {
  interface Env {
    get(name: string): string | undefined;
    set(name: string, value: string): void;
  }

  const env: Env;

  namespace errors {
    class NotFound extends Error {}
  }

  function readTextFile(path: string): Promise<string>;
  function cwd(): string;
}

declare const Deno: typeof Deno;

