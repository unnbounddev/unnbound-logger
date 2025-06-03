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

  public run<T>(traceId: string, callback: () => T): T {
    return this.storage.run({ traceId }, callback);
  }

  public getTraceId(): string | undefined {
    const context = this.storage.getStore();
    return context?.traceId;
  }
}

export const traceContext = TraceContextManager.getInstance();