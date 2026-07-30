"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, DownloadIcon, LaptopIcon, LogOutIcon, MonitorIcon } from "lucide-react";
import { toast } from "sonner";

import { AccountSwitcherDropdown } from "@/components/account-switcher-dropdown";
import { SymbolSelector } from "@/components/symbol-selector";
import { HeaderNotificationsDropdown } from "@/components/header-notifications-dropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { PageHeaderProps } from "@/types";
import { PlaceOrderDialog } from "@/components/place-order-dialog";
import { useAuthStore } from "@/lib/stores/auth-store";
import { get } from "@/lib/utils/api";

const CURRENT_DESKTOP_APP_VERSION =
  process.env.NEXT_PUBLIC_DESKTOP_APP_VERSION?.replace(/^v/i, "") ?? "1.0.0";
const DESKTOP_RELEASE_MANIFEST_URL =
  process.env.NEXT_PUBLIC_DESKTOP_RELEASE_MANIFEST_URL ??
  "https://trade-mate-storage.s3.us-east-2.amazonaws.com/downloads/latest.json";

const DESKTOP_DOWNLOAD_LINKS = [
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

type DesktopDownloadPlatform = (typeof DESKTOP_DOWNLOAD_LINKS)[number]["platform"];

type DesktopReleaseManifest = {
  version?: string;
  releasedAt?: string;
  notes?: string;
  macUrl?: string;
  windowsUrl?: string;
  downloads?: {
    mac?: {
      url?: string;
      fileName?: string;
    };
    macArm64?: {
      url?: string;
      fileName?: string;
    };
    macIntel?: {
      url?: string;
      fileName?: string;
    };
    windows?: {
      url?: string;
      fileName?: string;
    };
  };
};

function getReleaseDownloadUrl(
  release: DesktopReleaseManifest | null,
  platform: DesktopDownloadPlatform,
) {
  if (!release) {
    return null;
  }

  if (platform === "macArm64") {
    return release.downloads?.macArm64?.url ?? release.downloads?.mac?.url ?? release.macUrl ?? null;
  }

  if (platform === "macIntel") {
    return release.downloads?.macIntel?.url ?? release.downloads?.mac?.url ?? release.macUrl ?? null;
  }

  return release.downloads?.windows?.url ?? release.windowsUrl ?? null;
}

function isDesktopReleaseManifest(value: unknown): value is DesktopReleaseManifest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const release = value as DesktopReleaseManifest;

  return Boolean(
    release.version &&
      (getReleaseDownloadUrl(release, "macArm64") ||
        getReleaseDownloadUrl(release, "macIntel") ||
        getReleaseDownloadUrl(release, "windows")),
  );
}

function getReleaseFromApiResponse(value: unknown): DesktopReleaseManifest | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const response = value as { release?: unknown };

  return isDesktopReleaseManifest(response.release) ? response.release : null;
}

function isNewDesktopRelease(release: DesktopReleaseManifest | null) {
  if (!release?.version) {
    return false;
  }

  return release.version.replace(/^v/i, "") !== CURRENT_DESKTOP_APP_VERSION;
}

async function getReleaseFromManifestFallback() {
  const response = await fetch(DESKTOP_RELEASE_MANIFEST_URL, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const manifest: unknown = await response.json();

  return isDesktopReleaseManifest(manifest) ? manifest : null;
}

function getUserInitials(userLabel?: string | null) {
  if (!userLabel) {
    return "TM";
  }

  const initials = userLabel
    .trim()
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "TM";
}

export function PageHeader({
  className,
}: PageHeaderProps) {
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);
  const user = useAuthStore((state) => state.session?.user);
  const userName = user?.name || user?.email || "Trader";
  const avatarUrl = user?.avatarUrl ?? null;
  const userInitials = getUserInitials(userName);
  const [desktopRelease, setDesktopRelease] = React.useState<DesktopReleaseManifest | null>(null);

  React.useEffect(() => {
    let isActive = true;

    async function loadDesktopRelease() {
      try {
        let data: DesktopReleaseManifest | null = null;

        try {
          data = getReleaseFromApiResponse(await get("/api/desktop-releases/latest"));
        } catch {
          data = await getReleaseFromManifestFallback();
        }

        if (!data) {
          data = await getReleaseFromManifestFallback();
        }

        if (!isActive || !data) {
          return;
        }

        setDesktopRelease(data);

      } catch {
        // Keep existing local download links if release metadata is unavailable.
      }
    }

    void loadDesktopRelease();

    return () => {
      isActive = false;
    };
  }, []);

  const desktopDownloadLinks = React.useMemo(
    () =>
      DESKTOP_DOWNLOAD_LINKS.map((item) => {
        const releaseHref = getReleaseDownloadUrl(desktopRelease, item.platform);
        const releaseVersion = desktopRelease?.version ?? CURRENT_DESKTOP_APP_VERSION;

        return {
          ...item,
          href: releaseHref ?? item.href,
          description: releaseHref ? `Latest v${releaseVersion}` : item.description,
        };
      }),
    [desktopRelease],
  );
  const hasDesktopUpdate = isNewDesktopRelease(desktopRelease);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    router.replace("/login");
  };

  return (
    <header
      suppressHydrationWarning
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6",
        className,
      )}
    >
      {/* Global symbol selector — one shared selection across the whole app */}
      <div className="w-full min-w-0 lg:w-auto">
        <SymbolSelector className="w-full lg:w-[220px]" />
      </div>

      {/* Actions — 2-col grid on mobile/tablet, flex row on desktop */}
      <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:gap-3">
        <PlaceOrderDialog>
          <button className="flex gap-2 cursor-pointer hover:opacity-80 duration-300 items-center justify-center trade-btn px-4 py-[9px] rounded-lg btn-new-trade text-white text-sm font-medium whitespace-nowrap">
            <Image src="/header/add circle.svg" alt="add" width={18} height={18} className=" shrink-0" />
            New Trade
          </button>
        </PlaceOrderDialog>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border/20 px-4 py-[9px] text-sm font-medium text-white outline-none transition-colors hover:bg-white/5 whitespace-nowrap lg:max-xl:size-10 lg:max-xl:px-0">
            <DownloadIcon className="size-4" />
            <span className="lg:max-xl:hidden">Desktop App</span>
            {hasDesktopUpdate ? (
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold leading-none text-primary lg:max-xl:hidden">
                v{desktopRelease?.version}
              </span>
            ) : null}
            <ChevronDown className="size-4 text-white/70 lg:max-xl:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              {desktopDownloadLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <DropdownMenuItem
                    key={item.label}
                    className="cursor-pointer gap-3 px-3 py-2.5"
                    onClick={() => window.location.assign(item.href)}
                  >
                    <Icon className="size-4 text-primary" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{item.label}</span>
                      <span className="truncate text-xs text-white/50">{item.description}</span>
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* <button className="flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-border/20 text-medium-500 text-sm">
          <span className="size-2.5 animate-pulse rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          Live Market
        </button> */}
        {/* Account Switcher Dropdown */}
        <AccountSwitcherDropdown />

        {/* <HeaderNotificationsDropdown
          onNotificationClick={() =>
            toast.info("Notification details are not available yet.")
          }
        /> */}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex cursor-pointer items-center justify-center gap-0 md:gap-2 px-3 py-0.5 rounded-lg border border-border/20 text-white outline-none">
            <Avatar className="size-8">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={userName} />
              ) : null}
              <AvatarFallback className="bg-linear-to-br from-[#0CE9A0] to-[#3B82F6] text-[11px] font-bold text-black">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm lg:max-xl:hidden">{userName}</span>
            <ChevronDown className="size-4 text-white" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" className="cursor-pointer" onClick={handleSignOut}>
                <LogOutIcon className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
