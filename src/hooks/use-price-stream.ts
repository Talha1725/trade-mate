"use client";

import * as React from "react";
import { unstable_batchedUpdates } from "react-dom";

import { createLatestValueBuffer, getPriceSocketUrl } from "@/lib/utils/price-stream";
import { useLivePriceStore } from "@/lib/stores/live-price-store";
import type {
  PriceSocketPortfolioMessage,
  PriceSocketQuote,
  PriceSocketServerMessage,
  PriceStreamOptions,
} from "@/types/price";

function normalize(values?: string[]) {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter((value) => value.length > 0)));
}

export function usePriceStream({
  symbols,
  accountIds,
  enabled = true,
  onQuotes,
  onPortfolio,
  onError,
}: PriceStreamOptions) {
  const callbacksRef = React.useRef({ onQuotes, onPortfolio, onError });
  const subscription = React.useMemo(() => {
    const resolvedSymbols = normalize(symbols);
    const resolvedAccountIds = normalize(accountIds);

    return {
      key: `${resolvedSymbols.join("|")}::${resolvedAccountIds.join("|")}`,
      resolvedSymbols,
      resolvedAccountIds,
    };
  }, [accountIds, symbols]);

  React.useEffect(() => {
    callbacksRef.current = { onQuotes, onPortfolio, onError };
  }, [onQuotes, onPortfolio, onError]);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const { resolvedSymbols, resolvedAccountIds } = subscription;

    if (resolvedSymbols.length === 0 && resolvedAccountIds.length === 0) {
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;
    let intentionalClose = false;
    let closeAfterOpen = false;
    const latestQuoteTimestamps = new Map<string, number>();
    const quoteBuffer = createLatestValueBuffer<PriceSocketQuote>(
      (quote) => quote.symbol.toUpperCase(),
      (quotes) => {
        useLivePriceStore.getState().setQuotes(quotes);
        unstable_batchedUpdates(() => {
          callbacksRef.current.onQuotes?.(quotes);
        });
      },
    );
    const portfolioBuffer = createLatestValueBuffer<PriceSocketPortfolioMessage>(
      () => "portfolio",
      (messages) => {
        const latestPortfolio = messages[messages.length - 1];
        if (!latestPortfolio) {
          return;
        }

        unstable_batchedUpdates(() => {
          callbacksRef.current.onPortfolio?.(latestPortfolio);
        });
      },
    );

    const onlyLatestQuotes = (quotes: PriceSocketQuote[]) => {
      const latestQuotes: PriceSocketQuote[] = [];

      for (const quote of quotes) {
        const timestamp = Date.parse(quote.timestamp);
        const key = quote.symbol.toUpperCase();
        const previousTimestamp = latestQuoteTimestamps.get(key) ?? 0;

        // A REST snapshot may arrive after a websocket tick. Do not let that
        // older value overwrite the quote already rendered by the browser.
        if (
          Number.isFinite(timestamp) &&
          timestamp < previousTimestamp
        ) {
          continue;
        }

        if (
          Number.isFinite(timestamp) &&
          timestamp === previousTimestamp &&
          quote.source !== "eodhd-ws"
        ) {
          continue;
        }

        if (Number.isFinite(timestamp)) {
          latestQuoteTimestamps.set(key, timestamp);
        }
        latestQuotes.push(quote);
      }

      return latestQuotes;
    };

    const connect = () => {
      if (isDisposed) {
        return;
      }

      socket = new WebSocket(getPriceSocketUrl());

      socket.onopen = () => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          return;
        }

        if (isDisposed || closeAfterOpen) {
          intentionalClose = true;
          socket.close();
          return;
        }

        socket.send(
          JSON.stringify({
            type: "subscribe",
            symbols: resolvedSymbols,
            accountIds: resolvedAccountIds.length > 0 ? resolvedAccountIds : undefined,
          }),
        );
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as PriceSocketServerMessage;

          unstable_batchedUpdates(() => {
            if (payload.type === "snapshot" || payload.type === "update") {
              const latestQuotes = onlyLatestQuotes(payload.quotes);
              latestQuotes.forEach((quote) => quoteBuffer.push(quote));
              return;
            }

            if (payload.type === "portfolio") {
              portfolioBuffer.push(payload);
              return;
            }

            if (payload.type === "error") {
              callbacksRef.current.onError?.(payload.message);
            }
          });
        } catch {
          unstable_batchedUpdates(() => {
            callbacksRef.current.onError?.("Unable to parse live market update.");
          });
        }
      };

      socket.onerror = () => {
        unstable_batchedUpdates(() => {
          callbacksRef.current.onError?.("Live market stream is temporarily unavailable.");
        });
      };

      socket.onclose = () => {
        quoteBuffer.flush();
        portfolioBuffer.flush();

        if (isDisposed || intentionalClose) {
          return;
        }

        reconnectTimer = setTimeout(() => {
          connect();
        }, 2000);
      };
    };

    connect();

    return () => {
      isDisposed = true;
      intentionalClose = true;
      quoteBuffer.dispose();
      portfolioBuffer.dispose();

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (socket && socket.readyState === WebSocket.CONNECTING) {
        closeAfterOpen = true;
        return;
      }

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "unsubscribe",
            symbols: resolvedSymbols,
            accountIds: resolvedAccountIds.length > 0 ? resolvedAccountIds : undefined,
          }),
        );
      }

      socket?.close();
    };
  }, [enabled, subscription.key]);
}
