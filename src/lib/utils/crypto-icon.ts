import type { CryptoIconCode } from "@/types/asset-icon";
import { CRYPTO_ICON_SRC_MAP } from "@/constants/crypto-icons";

export function getCryptoIconSrc(code: CryptoIconCode) {
  return CRYPTO_ICON_SRC_MAP[code];
}
