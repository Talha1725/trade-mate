export type DesktopDownloadPlatform = "macArm64" | "macIntel" | "windows";

export type DesktopReleaseManifest = {
  version?: string;
  releasedAt?: string;
  notes?: string;
  macUrl?: string;
  windowsUrl?: string;
  downloads?: {
    mac?: { url?: string; fileName?: string };
    macArm64?: { url?: string; fileName?: string };
    macIntel?: { url?: string; fileName?: string };
    windows?: { url?: string; fileName?: string };
  };
};
