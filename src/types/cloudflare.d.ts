declare type PagesFunction<Env = Record<string, unknown>> = (
  context: {
    request: Request;
    env: Env;
    params: Record<string, string>;
    waitUntil: (promise: Promise<unknown>) => void;
    next: () => Promise<Response>;
  }
) => Promise<Response> | Response;

declare interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
