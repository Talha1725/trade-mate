"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TradeMarkerOverlay } from "@/components/dashboard/trade-marker-overlay";
// import { ChartToolbarPanel } from "./chart-toolbar-panel";
import { ChartIndicatorPanel } from "./chart-indicator-panel";
import { formatTrendlinePrice } from "@/lib/utils/chart/formatters";
import type { FibonacciDrawing } from "@/types/lightweight-trading-chart";
import type { ChartShellContext } from "@/types/chart/chart-shell";

export function ChartShell({ context }: { context: ChartShellContext }) {
  const { className, activeTool = "crosshair", setActiveTool = () => undefined, setDraftPoints = () => undefined, setIsDrawing = () => undefined, draggingTrendlineRef, draggingDraftTrendlineRef, draftTrendlineAnchorRef, draftTrendlineMovedRef, draftTrendlinePointerStartRef, draftTrendlinePendingClickPointRef, draggingTextRef, setTextEditor = () => undefined, magnetMode = "off", enabledIndicators = [], setMagnetMode = () => undefined, setMagnetLastEnabledMode = () => undefined, toggleIndicator = () => undefined, zoomIn = () => undefined, zoomOut = () => undefined, resetView = () => undefined, undoDrawing = () => undefined, redoDrawing = () => undefined, redoDrawings = [], isChartLoading = false, isError = false, mainContainerRef, drawingOverlayRef, overlayRevision = 0, renderedDrawings = [], snapPixel, allTradeMarkers = [], displayCandles = [], tradeMarkerBucketSeconds = 0, showTradeMarkers = true, toPixelPoint = () => null, onTradeMarkerClick, indicatorPeriods, setIndicatorPeriods, vwapSettings, setVwapSettings, latestVwapPoint, isVwapSettingsOpen, setIsVwapSettingsOpen, vwapSettingsTab, setVwapSettingsTab, textEditor, textEditorPixel, commitTextEditor = () => undefined, selectedFibonacci, updateSelectedFibonacci = () => undefined, deleteSelectedDrawing = () => undefined, lastDisplayedClose, priceLabelRef, subContainerRef, handleDrawingPointerDown = () => undefined, handleDrawingPointerMove = () => undefined, handleDrawingPointerUp = () => undefined } = context;
  return (
    <div
      className={cn(
        "overflow-hidden h-full",
        className,
      )}
    >
      <div className="flex min-h-0 h-full gap-x-2">
        {/* Temporarily hidden at the user's request; restore when the chart sidebar is needed again. */}
        {/* <ChartToolbarPanel
          activeTool={activeTool}
          magnetMode={magnetMode}
          enabledIndicators={enabledIndicators}
          onToolChange={(tool) => {
            setActiveTool(tool);
            setDraftPoints([]);
            setIsDrawing(false);
            draggingTrendlineRef.current = null;
            draggingDraftTrendlineRef.current = false;
            draftTrendlineAnchorRef.current = null;
            draftTrendlineMovedRef.current = false;
            draftTrendlinePointerStartRef.current = null;
            draftTrendlinePendingClickPointRef.current = null;
            draggingTextRef.current = null;
            setTextEditor(null);
          }}
          onMagnetToggle={() => {
            setMagnetMode((current: string) => {
              const next = current === "off" ? "weak" : current === "weak" ? "strong" : "off";
              if (next !== "off") setMagnetLastEnabledMode(next);
              return next;
            });
          }}
          onIndicatorToggle={toggleIndicator}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetView}
          onUndo={undoDrawing}
          onRedo={redoDrawings.length > 0 ? redoDrawing : () => undefined}
        /> */}

        <div className="relative flex min-w-0 flex-1 flex-col h-full rounded-[12px] border-[1.5px] border-white/20 bg-linear-to-t from-white/7 to-white/5">
          {isChartLoading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 text-sm text-white/60">
              <Loader2 className="size-4 animate-spin text-primary" />
              Loading chart data...
            </div>
          ) : null}

          {isError ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/60">
              <AlertTriangle className="size-5 text-orange" />
              <p className="font-medium text-white">Chart data unavailable</p>
              <p>Verify the EODHD token and selected symbol, then try again.</p>
            </div>
          ) : null}

          <div
            className="relative min-h-0 flex-1"
            onPointerDownCapture={(event) => {
              const target = event.target as HTMLElement;
              if (activeTool !== "crosshair" && !target.closest("button, input, textarea, select, [role=\"dialog\"]")) {
                event.preventDefault();
                event.stopPropagation();
                handleDrawingPointerDown(event);
              }
            }}
            onPointerMove={handleDrawingPointerMove}
            onPointerUp={handleDrawingPointerUp}
            onPointerCancel={handleDrawingPointerUp}
          >
            <div ref={mainContainerRef} className="absolute inset-0 min-w-0 [&_.tv-lightweight-charts]:bg-transparent" style={{ width: "100%", height: "100%" }} />
            <svg
              ref={drawingOverlayRef}
              data-revision={overlayRevision}
              className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
            >
              {renderedDrawings}
              {snapPixel ? (
                <circle cx={snapPixel.x} cy={snapPixel.y} r="5" fill="#FFFFFF" stroke="#2962FF" strokeWidth="2" pointerEvents="none" />
              ) : null}
            </svg>
            <TradeMarkerOverlay
              markers={allTradeMarkers}
              candles={displayCandles}
              bucketSeconds={tradeMarkerBucketSeconds}
              viewportRevision={overlayRevision}
              showTradeMarkers={showTradeMarkers}
              getPixelPoint={toPixelPoint}
              formatPrice={(price) => formatTrendlinePrice(price)}
              onTradeMarkerClick={onTradeMarkerClick}
            />
            <ChartIndicatorPanel
              enabledIndicators={enabledIndicators}
              indicatorPeriods={indicatorPeriods}
              setIndicatorPeriods={setIndicatorPeriods}
              vwapSettings={vwapSettings}
              setVwapSettings={setVwapSettings}
              latestVwapPoint={latestVwapPoint}
              symbol={context.symbol}
              isVwapSettingsOpen={isVwapSettingsOpen}
              setIsVwapSettingsOpen={setIsVwapSettingsOpen}
              vwapSettingsTab={vwapSettingsTab}
              setVwapSettingsTab={setVwapSettingsTab}
            />
            {textEditor && textEditorPixel ? (
              <input
                autoFocus
                onPointerDown={(event) => event.stopPropagation()}
                value={textEditor.value}
                onChange={(event) => setTextEditor({ ...textEditor, value: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitTextEditor();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setTextEditor(null);
                  }
                }}
                placeholder="Enter text"
                className="absolute z-30 min-w-28 rounded border border-[#2962FF] bg-black px-2 py-1 text-xs text-white outline-none"
                style={{ left: textEditorPixel.x, top: textEditorPixel.y - 12 }}
              />
            ) : null}
            {selectedFibonacci ? (
              <div onPointerDown={(event) => event.stopPropagation()} className="pointer-events-auto absolute left-3 top-3 z-20 flex items-center gap-1 rounded-md border border-white/20 bg-black/95 p-1 shadow-lg">
                <button type="button" title="Reverse Fibonacci" aria-label="Reverse Fibonacci" onClick={() => updateSelectedFibonacci((drawing: FibonacciDrawing) => ({ ...drawing, style: { ...drawing.style, reverse: !drawing.style.reverse }, updatedAt: Date.now() }))} className="rounded px-2 py-1 text-[11px] text-white/80 hover:bg-white/10">Reverse</button>
                <button type="button" title="Extend left" aria-label="Extend left" onClick={() => updateSelectedFibonacci((drawing: FibonacciDrawing) => ({ ...drawing, style: { ...drawing.style, extendLeft: !drawing.style.extendLeft }, updatedAt: Date.now() }))} className="rounded px-2 py-1 text-[11px] text-white/80 hover:bg-white/10">L</button>
                <button type="button" title="Extend right" aria-label="Extend right" onClick={() => updateSelectedFibonacci((drawing: FibonacciDrawing) => ({ ...drawing, style: { ...drawing.style, extendRight: !drawing.style.extendRight }, updatedAt: Date.now() }))} className="rounded px-2 py-1 text-[11px] text-white/80 hover:bg-white/10">R</button>
                <button type="button" title="Toggle Fibonacci background" aria-label="Toggle Fibonacci background" onClick={() => updateSelectedFibonacci((drawing: FibonacciDrawing) => ({ ...drawing, style: { ...drawing.style, showBackground: !drawing.style.showBackground }, updatedAt: Date.now() }))} className="rounded px-2 py-1 text-[11px] text-white/80 hover:bg-white/10">Fill</button>
                <button type="button" title="Toggle Fibonacci baseline" aria-label="Toggle Fibonacci baseline" onClick={() => updateSelectedFibonacci((drawing: FibonacciDrawing) => ({ ...drawing, style: { ...drawing.style, showBaseline: !drawing.style.showBaseline }, updatedAt: Date.now() }))} className="rounded px-2 py-1 text-[11px] text-white/80 hover:bg-white/10">Base</button>
                <button type="button" title="Delete drawing" aria-label="Delete drawing" onClick={deleteSelectedDrawing} className="rounded px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20">Delete</button>
              </div>
            ) : null}
          </div>

          <div className="h-px w-full overflow-hidden border-t border-white/10 opacity-0" aria-hidden="true">
            <div ref={subContainerRef} className="h-px w-full [&_.tv-lightweight-charts]:bg-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
