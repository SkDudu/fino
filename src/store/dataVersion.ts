import { useSyncExternalStore } from "react";
import type { Transaction } from "@/types/transaction";

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

let _pendingTx: Transaction | null = null;
let _pendingNid: string | null = null;
let pendingVer = 0;
const pendingListeners = new Set<() => void>();

function subscribePending(cb: () => void) {
  pendingListeners.add(cb);
  return () => pendingListeners.delete(cb);
}

function getPendingSnapshot() {
  return pendingVer;
}

export function setPending(tx: Transaction | null, nid: string | null) {
  _pendingTx = tx;
  _pendingNid = nid;
  pendingVer++;
  for (const cb of pendingListeners) cb();
}

export function usePendingTransaction() {
  useSyncExternalStore(subscribePending, getPendingSnapshot);
  return { pendingTransaction: _pendingTx, pendingNotificationId: _pendingNid };
}
