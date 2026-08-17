import { describe, expect, it } from "vitest";

import { clipTrendlineSegmentToPlot, distanceToSegment, getExtendedTrendlinePoints } from "@/lib/utils/chart/geometry";

describe("chart geometry", () => {
  it("clips a segment to the plot bounds", () => {
    expect(clipTrendlineSegmentToPlot({ x: -10, y: 50 }, { x: 110, y: 50 }, 100, 100)).toEqual({
      start: { x: 0, y: 50 },
      end: { x: 100, y: 50 },
    });
  });

  it("measures the closest point on a segment", () => {
    expect(distanceToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
  });

  it("extends a trendline only when requested", () => {
    const result = getExtendedTrendlinePoints({ x: 25, y: 25 }, { x: 75, y: 75 }, 100, 100, true, true);
    expect(result.start).toEqual({ x: 0, y: 0 });
    expect(result.end).toEqual({ x: 100, y: 100 });
  });
});

