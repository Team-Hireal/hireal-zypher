// Type declarations for @zypher/agent
// This package is installed from JSR and may not be available during npm install
// These types help TypeScript understand the package structure

declare module '@zypher/agent' {
  export class AnthropicModelProvider {
    constructor(options: { apiKey: string });
  }

  export function createZypherContext(cwd: string): Promise<any>;

  export class ZypherAgent {
    constructor(context: any, provider: AnthropicModelProvider);
    mcp: {
      registerServer(options: {
        id: string;
        type: string;
        command: {
          command: string;
          args: string[];
          env: Record<string, string>;
        };
      }): Promise<void>;
    };
    runTask(task: string, model: string): any;
  }
}

