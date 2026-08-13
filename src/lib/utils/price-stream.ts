export const PRICE_DISPLAY_FLUSH_MS = 300;

export function createLatestValueBuffer<T>(
  getKey: (value: T) => string,
  onFlush: (values: T[]) => void,
  flushIntervalMs = PRICE_DISPLAY_FLUSH_MS,
) {
  const pendingValues = new Map<string, T>();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    if (pendingValues.size === 0) {
      return;
    }

    const values = Array.from(pendingValues.values());
    pendingValues.clear();
    onFlush(values);
  };

  const scheduleFlush = () => {
    if (!flushTimer) {
      flushTimer = setTimeout(flush, flushIntervalMs);
    }
  };

  return {
    push(value: T) {
      pendingValues.set(getKey(value), value);
      scheduleFlush();
    },
    flush,
    dispose() {
      flush();
    },
  };
}

function getBackendBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/$/, "");

  if (configured) {
    return configured;
  }

  return "http://localhost:4000";
}

export function getPriceSocketUrl() {
  const backend = new URL(getBackendBaseUrl());
  backend.protocol = backend.protocol === "https:" ? "wss:" : "ws:";
  backend.pathname = "/ws/prices";
  backend.search = "";
  backend.hash = "";
  return backend.toString();
}
