const StartDefault = true;

export class Watchdog {
  private timeout: NodeJS.Timeout | undefined;
  private state: 'done' | 'running' | 'stopped' = 'stopped';
  private duration: number;
  private callbacks: (() => void)[] = [];

  constructor(duration: number, start = StartDefault, callback?: () => void) {
    this.duration = duration;
    if (callback) this.callbacks.push(callback);

    if (start) this.start();
  }

  isDone() {
    return this.state === 'done';
  }

  isRunning() {
    return this.state === 'running';
  }

  isStopped() {
    return this.state === 'stopped';
  }

  feed(): void {
    this.start();
  }
  start(): void;
  start(opts: { duration?: number; callback?: () => void }): void;
  start(duration: number): void;
  start(callback: () => void): void;
  start(opts?: { duration?: number; callback?: () => void } | number | (() => void)) {
    if (typeof opts === 'number') {
      this.duration = opts;
    } else if (typeof opts === 'function') {
      this.callbacks.push(opts);
    } else if (opts) {
      if (opts.duration) this.duration = opts.duration;
      if (opts.callback) this.callbacks.push(opts.callback);
    }

    this.stop();

    this.timeout = setTimeout(this.done.bind(this), this.duration);

    this.state = 'running';
  }

  stop() {
    // clearTimeout on undefined or cleared timeout is a no-op
    clearTimeout(this.timeout);
    this.state = 'stopped';
  }

  private done() {
    this.state = 'done';
    this.callbacks.forEach(cb => cb());
  }

  removeCallback(callback: () => void) {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  removeCallbacks() {
    this.callbacks = [];
  }
}

export function newWatchdogPromise(duration: number, start = StartDefault): Promise<void> & Watchdog {
  let watchdog: Watchdog;

  const ret = new Promise<void>(resolve => {
    watchdog = new Watchdog(duration, start, resolve);
    watchdog.start = watchdog.start.bind(watchdog);
    watchdog.stop = watchdog.stop.bind(watchdog);
    watchdog.feed = watchdog.feed.bind(watchdog);
    watchdog.removeCallback = watchdog.removeCallback.bind(watchdog);
    watchdog.removeCallbacks = watchdog.removeCallbacks.bind(watchdog);
    watchdog.isDone = watchdog.isDone.bind(watchdog);
    watchdog.isRunning = watchdog.isRunning.bind(watchdog);
    watchdog.isStopped = watchdog.isStopped.bind(watchdog);
  });

  if (!watchdog!) throw new Error('Watchdog not initialized');

  return Object.assign(ret, watchdog);
}
