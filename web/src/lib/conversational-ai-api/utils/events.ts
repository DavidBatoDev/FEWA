type EventHandler<T extends readonly unknown[]> = (...args: T) => void;

type EventMapBase = Record<PropertyKey, (...args: never[]) => void>;

type ListenerStore<TMap extends EventMapBase> = {
  [K in keyof TMap]?: Array<EventHandler<Parameters<TMap[K]>>>;
};

export class EventEmitter<TMap extends EventMapBase> {
  private listeners: ListenerStore<TMap> = {};

  on<K extends keyof TMap>(event: K, handler: TMap[K]) {
    const list = (this.listeners[event] ?? []) as Array<EventHandler<Parameters<TMap[K]>>>;
    list.push(handler as EventHandler<Parameters<TMap[K]>>);
    this.listeners[event] = list;
    return this;
  }

  off<K extends keyof TMap>(event: K, handler: TMap[K]) {
    const list = (this.listeners[event] ?? []) as Array<EventHandler<Parameters<TMap[K]>>>;
    this.listeners[event] = list.filter(
      (item) => item !== (handler as EventHandler<Parameters<TMap[K]>>),
    );
    return this;
  }

  emit<K extends keyof TMap>(event: K, ...args: Parameters<TMap[K]>) {
    const list = (this.listeners[event] ?? []) as Array<EventHandler<Parameters<TMap[K]>>>;
    list.forEach((handler) => {
      handler(...args);
    });
  }

  removeAllListeners() {
    this.listeners = {};
  }
}
