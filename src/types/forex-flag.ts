import type { CryptoIconCode } from "@/types/asset-icon";

export type ResolvedForexPairIcon =
  | {
      kind: "forex";
      flagCodes: [string, string];
    }
  | {
      kind: "forex-mixed";
      cryptoCode: CryptoIconCode;
      quoteFlag: string;
    };
