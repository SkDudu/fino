import { useSyncExternalStore } from "react";

let version = 0;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return version;
}

export function bumpData() {
  version++;
  for (const cb of listeners) cb();
}

export function useDataVersion() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
