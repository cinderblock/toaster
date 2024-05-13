type CancelableTimeout = Promise<void> & { cancel: () => void };

export function sleep(ms: number): CancelableTimeout {
  let cancel: () => void;

  const ret = new Promise<void>(resolve => {
    const to = setTimeout(resolve, ms);
    cancel = () => {
      clearTimeout(to);
      resolve();
    };
  }) as CancelableTimeout;

  if (!cancel!) throw new Error('cancel is not defined?');
  ret.cancel = cancel;

  return ret;
}
