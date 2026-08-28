export type StablePositionLike = {
  id: string;
  status: string;
};

export type StablePositionMergeOptions = {
  closedIds?: Set<string>;
  missingThreshold?: number;
};
