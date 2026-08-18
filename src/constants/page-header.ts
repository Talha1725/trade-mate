import { LaptopIcon, MonitorIcon } from "lucide-react";

export const CURRENT_DESKTOP_APP_VERSION =
  process.env.NEXT_PUBLIC_DESKTOP_APP_VERSION?.replace(/^v/i, "") ?? "1.0.0";

export const DESKTOP_RELEASE_MANIFEST_URL =
  process.env.NEXT_PUBLIC_DESKTOP_RELEASE_MANIFEST_URL ??
  "https://trade-mate-storage.s3.us-east-2.amazonaws.com/downloads/latest.json";

export const DESKTOP_DOWNLOAD_LINKS = [
  {
    platform: "macArm64",
    label: "Mac Apple Silicon",
    description: "For M1, M2, M3, M4 Macs",
    href: "/downloads/TradeMate-mac-arm64-v1.0.0.zip",
    icon: LaptopIcon,
  },
  {
    platform: "macIntel",
    label: "Mac Intel",
    description: "For Intel chip Macs",
    href: "/downloads/TradeMate-mac-intel-v1.0.0.zip",
    icon: LaptopIcon,
  },
  {
    platform: "windows",
    label: "Download for Windows",
    description: "ZIP with setup and instructions",
    href: "/downloads/TradeMate-windows-v1.0.0.zip",
    icon: MonitorIcon,
  },
] as const;
