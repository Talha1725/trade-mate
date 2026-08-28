import type { StablePositionLike, StablePositionMergeOptions } from "@/types/stable-positions";

export function mergeStablePositions<T extends StablePositionLike>(
  current: T[],
  incoming: T[],
  missingCounts: Map<string, number>,
  options: StablePositionMergeOptions = {},
): T[] {
  const closedIds = options.closedIds ?? new Set<string>();
  const missingThreshold = options.missingThreshold ?? 2;
  const incomingById = new Map(incoming.map((position) => [position.id, position] as const));
  const next: T[] = [];
  const seen = new Set<string>();

  for (const position of current) {
    if (closedIds.has(position.id)) {
      missingCounts.delete(position.id);
      continue;
    }

    const fresh = incomingById.get(position.id);

    if (fresh) {
      next.push(fresh);
      seen.add(position.id);
      missingCounts.set(position.id, 0);
      continue;
    }

    const nextMissingCount = (missingCounts.get(position.id) ?? 0) + 1;
    missingCounts.set(position.id, nextMissingCount);

    if (nextMissingCount <= missingThreshold) {
      next.push(position);
    } else {
      missingCounts.delete(position.id);
    }
  }

  for (const position of incoming) {
    if (seen.has(position.id) || next.some((item) => item.id === position.id)) {
      continue;
    }

    missingCounts.set(position.id, 0);
    next.push(position);
  }

  return next;
}
