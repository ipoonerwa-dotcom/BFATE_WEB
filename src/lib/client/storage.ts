"use client";

import { useSyncExternalStore } from "react";

/* 本机存储读写：用 useSyncExternalStore 订阅，服务端渲染时视为「还没有」，水合后再读真实值，不会出现内容不一致。 */
const EVENT = "bfate-storage";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 订阅某个键的原始字符串；服务端与首次水合时为 null。 */
export function useStoredString(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
}

export function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* 隐私模式下存不了也不影响使用 */
  }
  window.dispatchEvent(new Event(EVENT));
}

const noop = () => () => {};
/** 是否已在浏览器里完成水合（服务端为 false）。 */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
