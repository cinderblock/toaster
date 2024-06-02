import { State } from '../state';
import { StatusUpdate } from '../oven';
import { useEffect, useState } from 'react';

const serverStateProxy: State = {
  status: [],
  activeProfile: undefined,
};

const updates = new EventTarget();

export function handleStateUpdate(payload: { state: State }) {
  const {
    state: { status, activeProfile },
  } = payload;

  console.log('Received state update', status.length, activeProfile);
  console.log('Status', updateToString(status[0]));

  serverStateProxy.status.splice(0);
  serverStateProxy.status.push(...status);
  serverStateProxy.activeProfile = activeProfile;

  updates.dispatchEvent(new Event('statusUpdate'));
}

// 10 minutes, 4 updates per second
const historyLimit = 10 * 60 * 4;

export function handleUpdate(payload: { update: StatusUpdate }) {
  const { update } = payload;
  // console.log('Received update', updateToString(update));

  serverStateProxy.status.unshift(update);
  serverStateProxy.status.splice(historyLimit);

  updates.dispatchEvent(new Event('statusUpdate'));
}

// Temporary print function
function updateToString(update: StatusUpdate) {
  if (!update) return 'undefined';
  return Object.entries(update)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

function useEvent(event: string, listener: () => void) {
  useEffect(() => {
    updates.addEventListener(event, listener);
    return () => updates.removeEventListener(event, listener);
  });
}

export type StatusReducer<T> = (state: StatusUpdate) => T;

function fastEqual<T>(a: T, b: T): boolean {
  if (typeof a === 'object' && typeof b === 'object') {
    if (a === null || b === null) return a === b;
    for (const key in a) if (a[key] !== b[key]) return !1;
    return Object.keys(a).length === Object.keys(b).length;
  }
  return a === b;
}

type Equal<T> = (next: T, curr: T) => boolean;

export function useStatusUpdates<T>(reducer: StatusReducer<T>, equal?: Equal<T>): T {
  if (!equal) {
    equal = fastEqual;
  }

  const [state, setState] = useState<T>(reducer(serverStateProxy.status[0]) as T);

  // reducer = noFail(reducer);

  useEvent('statusUpdate', () => {
    const reduced = reducer(serverStateProxy.status[0]);
    if (equal(reduced, state)) return;
    setState(reduced);
  });

  return state;
}

export function LatestStatus<T>({ reducer, equal }: { reducer: StatusReducer<T>; equal?: Equal<T> }): JSX.Element {
  return <>{useStatusUpdates(reducer, equal)}</>;
}

export function useServerStateHistory() {
  const [state, setState] = useState(serverStateProxy.status);
  useEvent('statusUpdate', () => {
    // if (state.length) return;
    // console.log('Updating state', serverStateProxy.status);
    setState(serverStateProxy.status);
  });
  return state;
}
