import type { StaticImageData } from "next/image";
import type { CryptoIconCode } from "@/types/asset-icon";
import adaIcon from "cryptocurrency-icons/svg/color/ada.svg";
import avaxIcon from "cryptocurrency-icons/svg/color/avax.svg";
import bnbIcon from "cryptocurrency-icons/svg/color/bnb.svg";
import btcIcon from "cryptocurrency-icons/svg/color/btc.svg";
import dogeIcon from "cryptocurrency-icons/svg/color/doge.svg";
import dotIcon from "cryptocurrency-icons/svg/color/dot.svg";
import ethIcon from "cryptocurrency-icons/svg/color/eth.svg";
import goldIcon from "cryptocurrency-icons/svg/color/gold.svg";
import linkIcon from "cryptocurrency-icons/svg/color/link.svg";
import ltcIcon from "cryptocurrency-icons/svg/color/ltc.svg";
import solIcon from "cryptocurrency-icons/svg/color/sol.svg";
import trxIcon from "cryptocurrency-icons/svg/color/trx.svg";
import xrpIcon from "cryptocurrency-icons/svg/color/xrp.svg";

export const CRYPTO_ICON_SRC_MAP: Record<CryptoIconCode, StaticImageData | string> = {
  btc: btcIcon, eth: ethIcon, sol: solIcon, bnb: bnbIcon, xrp: xrpIcon, ada: adaIcon, doge: dogeIcon,
  avax: avaxIcon, link: linkIcon, ton: "/images/coins/ton.svg", trx: trxIcon, dot: dotIcon,
  ltc: ltcIcon, sui: "/images/coins/sui.svg", gold: goldIcon,
};
