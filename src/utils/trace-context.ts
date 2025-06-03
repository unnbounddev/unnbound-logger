import { AsyncLocalStorage } from 'async_hooks';

interface TraceContext {
  traceId: string;
}

class TraceContextManager {
  private static instance: TraceContextManager;
  private storage: AsyncLocalStorage<TraceContext>;

  private constructor() {
    this.storage = new AsyncLocalStorage<TraceContext>();
  }

  public static getInstance(): TraceContextManager {
    if (!TraceContextManager.instance) {
      TraceContextManager.instance = new TraceContextManager();
    }
    return TraceContextManager.instance;
  }

  public run(traceId: string, callback: () => Promise<void> | void): void {
    this.storage.run({ traceId }, callback);
  }

  public getTraceId(): string | undefined {
    const context = this.storage.getStore();
    return context?.traceId;
  }
}

export const traceContext = TraceContextManager.getInstance();