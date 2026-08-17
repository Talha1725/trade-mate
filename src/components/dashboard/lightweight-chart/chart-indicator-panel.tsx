"use client";

import * as React from "react";
import { Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_VWAP_CALCULATION, type VwapCalculationSettings, type VwapPoint } from "@/lib/utils/chart-indicators";
import type { ChartIndicatorId } from "@/types/lightweight-trading-chart";
import { VWAP_BAND_COLORS } from "@/constants/chart/lightweight-chart";
import { formatChartPrice } from "@/lib/utils/chart/formatters";

type ChartIndicatorPanelProps = {
  enabledIndicators: ChartIndicatorId[];
  indicatorPeriods: { ema: number };
  setIndicatorPeriods: React.Dispatch<React.SetStateAction<{ ema: number }>>;
  vwapSettings: VwapCalculationSettings;
  setVwapSettings: React.Dispatch<React.SetStateAction<VwapCalculationSettings>>;
  latestVwapPoint: VwapPoint | null;
  symbol: string;
  isVwapSettingsOpen: boolean;
  setIsVwapSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  vwapSettingsTab: "inputs" | "style" | "visibility";
  setVwapSettingsTab: React.Dispatch<React.SetStateAction<"inputs" | "style" | "visibility">>;
};

export function ChartIndicatorPanel({ enabledIndicators, indicatorPeriods, setIndicatorPeriods, vwapSettings, setVwapSettings, latestVwapPoint, symbol, isVwapSettingsOpen, setIsVwapSettingsOpen, vwapSettingsTab, setVwapSettingsTab }: ChartIndicatorPanelProps) {
  return (
    <>
            {enabledIndicators.length > 0 ? (
              <div
                className="pointer-events-auto absolute left-3 top-3 z-20 flex items-center gap-2 rounded-md border border-white/20 bg-black/90 px-2 py-1.5 text-[11px] text-white shadow-lg"
                onPointerDown={(event) => event.stopPropagation()}
              >
                {enabledIndicators.includes("ema") ? (
                  <label className="flex items-center gap-1.5 text-[#3B82F6]">
                    <span>EMA</span>
                    <input
                      aria-label="EMA period"
                      type="number"
                      min={1}
                      max={500}
                      value={indicatorPeriods.ema}
                      onChange={(event) => setIndicatorPeriods((current) => ({ ...current, ema: Math.max(1, Math.min(500, Number(event.target.value) || 1)) }))}
                      className="w-12 appearance-none rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-center text-white outline-none focus:border-[#3B82F6] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </label>
                ) : null}
                {enabledIndicators.includes("vwap") ? (
                  <div className="relative flex items-center gap-1.5 text-[#FF8000]">
                    <span className="size-1.5 rounded-full bg-[#FF8000]" />
                    <span className="font-medium">VWAP</span>
                    <span className="text-white/45">{vwapSettings.anchorPeriod[0].toUpperCase() + vwapSettings.anchorPeriod.slice(1)}</span>
                    {latestVwapPoint ? (
                      <span className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="text-[#FF8000]">{formatChartPrice(latestVwapPoint.value, symbol)}</span>
                        {latestVwapPoint.upperBands.map((upperValue, index) => {
                          const lowerValue = latestVwapPoint.lowerBands[index];
                          if (upperValue == null && lowerValue == null) return null;
                          return (
                            <React.Fragment key={`vwap-status-band-${index}`}>
                              {upperValue == null ? null : <span style={{ color: VWAP_BAND_COLORS[index] }}>{formatChartPrice(upperValue, symbol)}</span>}
                              {lowerValue == null ? null : <span style={{ color: VWAP_BAND_COLORS[index] }}>{formatChartPrice(lowerValue, symbol)}</span>}
                            </React.Fragment>
                          );
                        })}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Open VWAP settings"
                      title="VWAP settings"
                      onClick={() => setIsVwapSettingsOpen((current) => !current)}
                      className={cn(
                        "rounded p-1 text-white/60 transition hover:bg-white/10 hover:text-white",
                        isVwapSettingsOpen && "bg-white/10 text-[#FF8000]",
                      )}
                    >
                      <Settings2 className="size-3.5" />
                    </button>

                    {isVwapSettingsOpen ? (
                      <div
                        role="dialog"
                        aria-label="VWAP settings"
                        className="absolute left-0 top-8 z-40 w-[310px] rounded-xl border border-white/15 bg-[#0b0f14]/[.98] p-3 text-white shadow-2xl shadow-black/60"
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-white">
                              <span className="size-2 rounded-full bg-[#FF8000]" />
                              VWAP Settings
                            </div>
                            <p className="mt-0.5 text-[10px] text-white/45">Volume Weighted Average Price</p>
                          </div>
                          <button
                            type="button"
                            aria-label="Close VWAP settings"
                            onClick={() => setIsVwapSettingsOpen(false)}
                            className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
                          >
                            <X className="size-4" />
                          </button>
                        </div>

                        <div className="mb-3 grid grid-cols-3 border-b border-white/10">
                          {(["inputs", "style", "visibility"] as const).map((tab) => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setVwapSettingsTab(tab)}
                              className={cn(
                                "border-b-2 px-2 pb-2 text-[11px] font-medium capitalize transition",
                                vwapSettingsTab === tab ? "border-[#FF8000] text-white" : "border-transparent text-white/45 hover:text-white/80",
                              )}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-3">
                          {vwapSettingsTab === "inputs" ? (
                            <>
                          <div>
                            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Inputs</div>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="space-y-1 text-[11px] text-white/65">
                                <span>Source</span>
                                <select
                                  aria-label="VWAP source"
                                  value={vwapSettings.source}
                                  onChange={(event) => setVwapSettings((current) => ({ ...current, source: event.target.value as typeof current.source }))}
                                  className="h-8 w-full rounded-md border border-white/15 bg-white/[.06] px-2 text-xs text-white outline-none transition focus:border-[#FF8000] focus:ring-1 focus:ring-[#FF8000]/40"
                                >
                                  <option value="hlc3">HLC3</option>
                                  <option value="hl2">HL2</option>
                                  <option value="ohlc4">OHLC4</option>
                                  <option value="open">Open</option>
                                  <option value="high">High</option>
                                  <option value="low">Low</option>
                                  <option value="close">Close</option>
                                </select>
                              </label>
                              <label className="space-y-1 text-[11px] text-white/65">
                                <span>Anchor period</span>
                                <select
                                  aria-label="VWAP anchor period"
                                  value={vwapSettings.anchorPeriod}
                                  onChange={(event) => setVwapSettings((current) => ({ ...current, anchorPeriod: event.target.value as typeof current.anchorPeriod }))}
                                  className="h-8 w-full rounded-md border border-white/15 bg-white/[.06] px-2 text-xs text-white outline-none transition focus:border-[#FF8000] focus:ring-1 focus:ring-[#FF8000]/40"
                                >
                                  <option value="session">Session</option>
                                  <option value="week">Week</option>
                                  <option value="month">Month</option>
                                  <option value="quarter">Quarter</option>
                                  <option value="year">Year</option>
                                  <option value="decade">Decade</option>
                                  <option value="century">Century</option>
                                </select>
                              </label>
                            </div>
                          </div>

                          <div>
                            <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                              <span>Bands</span>
                              <select
                                aria-label="VWAP band mode"
                                value={vwapSettings.bandMode}
                                onChange={(event) => setVwapSettings((current) => ({ ...current, bandMode: event.target.value as typeof current.bandMode }))}
                                className="h-7 rounded-md border border-white/15 bg-white/[.06] px-2 text-[10px] font-normal normal-case tracking-normal text-white outline-none focus:border-[#FF8000]"
                              >
                                <option value="standard-deviation">Standard deviation</option>
                                <option value="percentage">Percentage</option>
                              </select>
                            </div>
                            <div className="space-y-1.5 rounded-lg border border-white/10 bg-white/[.03] p-2">
                              {vwapSettings.bands.map((band, index) => (
                                <div key={`vwap-band-${index}`} className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={band.visible}
                                      aria-label={`Toggle VWAP band ${index + 1}`}
                                      onClick={() => setVwapSettings((current) => ({
                                        ...current,
                                        bands: current.bands.map((item, itemIndex) => itemIndex === index ? { ...item, visible: !item.visible } : item) as typeof current.bands,
                                      }))}
                                      className={cn(
                                        "relative h-5 w-9 rounded-full border transition",
                                        band.visible ? "border-[#FF8000]/70 bg-[#FF8000]/25" : "border-white/20 bg-white/10",
                                      )}
                                    >
                                      <span className={cn("absolute top-0.5 size-3.5 rounded-full transition", band.visible ? "left-[17px] bg-[#FF8000]" : "left-0.5 bg-white/45")} />
                                    </button>
                                    <span className="flex items-center gap-1.5 text-xs text-white/80">
                                      <span className="size-2 rounded-full" style={{ backgroundColor: VWAP_BAND_COLORS[index] }} />
                                      Band {index + 1}
                                    </span>
                                  </div>
                                  <label className="flex items-center gap-1 text-[10px] text-white/45">
                                    Multiplier
                                    <input
                                      aria-label={`VWAP band ${index + 1} multiplier`}
                                      type="number"
                                      min={0}
                                      max={1000}
                                      step="0.1"
                                      value={band.multiplier}
                                      onChange={(event) => setVwapSettings((current) => ({
                                        ...current,
                                        bands: current.bands.map((item, itemIndex) => itemIndex === index
                                          ? { ...item, multiplier: Math.max(0, Math.min(1000, Number(event.target.value) || 0)) }
                                          : item) as typeof current.bands,
                                      }))}
                                      className="h-7 w-14 rounded-md border border-white/15 bg-white/[.06] px-1.5 text-center text-xs text-white outline-none focus:border-[#FF8000]"
                                    />
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>

                            </>
                          ) : vwapSettingsTab === "style" ? (
                            <div className="space-y-3">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Style</div>
                              <div className="space-y-2 rounded-lg border border-white/10 bg-white/[.03] p-2.5">
                                <div className="flex items-center justify-between text-xs text-white/75">
                                  <span>VWAP line</span>
                                  <span className="flex items-center gap-2 text-white/45"><span className="h-0.5 w-8 rounded-full bg-[#FF8000]" /> Orange</span>
                                </div>
                                {vwapSettings.bands.map((band, index) => (
                                  <div key={`vwap-style-band-${index}`} className="flex items-center justify-between text-xs text-white/75">
                                    <span>Band {index + 1}</span>
                                    <span className="flex items-center gap-2 text-white/45"><span className="h-0.5 w-8 rounded-full" style={{ backgroundColor: VWAP_BAND_COLORS[index] }} /> {band.visible ? "Visible" : "Hidden"}</span>
                                  </div>
                                ))}
                              </div>
                              <p className="text-[10px] leading-4 text-white/40">VWAP colors follow the chart indicator palette. Band visibility and multipliers can be changed in Inputs.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Visibility</div>
                              <div className="space-y-2 rounded-lg border border-white/10 bg-white/[.03] p-2.5">
                                <div className="flex items-center justify-between text-xs text-white/75">
                                  <span>VWAP line</span>
                                  <span className="rounded-full bg-[#FF8000]/15 px-2 py-0.5 text-[10px] text-[#FF8000]">Visible</span>
                                </div>
                                {vwapSettings.bands.map((band, index) => (
                                  <div key={`vwap-visibility-band-${index}`} className="flex items-center justify-between gap-3 text-xs text-white/75">
                                    <span>Band {index + 1}</span>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={band.visible}
                                      aria-label={`Toggle VWAP band ${index + 1} visibility`}
                                      onClick={() => setVwapSettings((current) => ({
                                        ...current,
                                        bands: current.bands.map((item, itemIndex) => itemIndex === index ? { ...item, visible: !item.visible } : item) as typeof current.bands,
                                      }))}
                                      className={cn("relative h-5 w-9 rounded-full border transition", band.visible ? "border-[#FF8000]/70 bg-[#FF8000]/25" : "border-white/20 bg-white/10")}
                                    >
                                      <span className={cn("absolute top-0.5 size-3.5 rounded-full transition", band.visible ? "left-[17px] bg-[#FF8000]" : "left-0.5 bg-white/45")} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-white/10 pt-2">
                            <div className="flex items-center gap-2 text-[11px] text-white/65">
                              <span className="h-0.5 w-5 rounded-full bg-[#FF8000]" />
                              VWAP line
                            </div>
                            <button
                              type="button"
                              onClick={() => setVwapSettings(DEFAULT_VWAP_CALCULATION)}
                              className="rounded-md px-2 py-1 text-[11px] text-white/55 transition hover:bg-white/10 hover:text-white"
                            >
                              Reset defaults
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

    </>
  );
}
