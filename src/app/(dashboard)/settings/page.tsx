"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AccountInformationCard } from "@/components/settings/account-information-card";
import { SecurityOverviewCard } from "@/components/settings/security-overview-card";
import { SettingsDialog } from "@/components/settings-dialog";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { settingsApi } from "@/lib/services/settings.api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useSelectedAccountStore } from "@/lib/stores/account-store";
import type { AccountInformationStat } from "@/types/account-information-card";
import type { SettingsDialogView } from "@/types/settings";

function formatFundingType(fundingType: string | null | undefined) {
  if (!fundingType) {
    return "N/A";
  }

  return fundingType
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b(one|two|instant|funding|pro|lite)\b/gi, (match) => match.charAt(0).toUpperCase() + match.slice(1))
    .replace(/\bId\b/g, "ID");
}

function formatAccountStatus(status: string | null | undefined) {
  if (!status) {
    return "N/A";
  }

  return status
    .toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

export default function SettingsPage() {
  const [activeView, setActiveView] = useState<SettingsDialogView>(null);
  const token = useAuthStore((state) => state.session?.token ?? null);
  const selectedAccountId = useSelectedAccountStore((state) => state.selectedAccountId);

  const { data: overview, isLoading } = useQuery({
    queryKey: ["settings", "overview", selectedAccountId, token],
    enabled: !!token,
    queryFn: () => settingsApi.getOverview(selectedAccountId ?? undefined),
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const accountInfo = useMemo(() => {
    const user = overview?.user;
    const account = overview?.account;
    const fullName = user?.name?.trim() || account?.name?.trim() || "Trader";
    const initials = fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      || (user?.email?.slice(0, 2).toUpperCase() ?? "TM");

    const stats: AccountInformationStat[] = [
     
      {
        id: "account-number",
        label: "Account Number",
        value: account?.accountNumber ?? "N/A",
        valueTone: "default",
      },
      {
        id: "funding-type",
        label: "Funding Type",
        value: formatFundingType(account?.fundingType ?? null),
      },
      {
        id: "account-status",
        label: "Account Status",
        value: formatAccountStatus(account?.status ?? null),
        valueTone: account?.status === "ACTIVE" ? "positive" : "negative",
      },
    ];

    return {
      initials,
      fullName,
      email: user?.email ?? "—",
      memberSince: user?.createdAt
        ? new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(new Date(user.createdAt))
        : "—",
      avatarUrl: user?.avatarUrl ?? null,
      stats,
    };
  }, [overview]);

  const profile = useMemo(
    () => ({
      fullName: accountInfo.fullName,
      email: accountInfo.email,
      avatarUrl: accountInfo.avatarUrl,
    }),
    [accountInfo.avatarUrl, accountInfo.email, accountInfo.fullName],
  );

  if (isLoading && !overview) {
    return (
      <AppShell>
        <div className="flex h-[80vh] w-full items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SettingsDialog view={activeView} onViewChange={setActiveView} profile={profile} />
      <div className="flex w-full min-w-0 flex-col gap-6">
        <PageHeader title="Settings" />
        <div className="flex flex-col gap-5 md:gap-6 max-w-3xl">
          <AccountInformationCard
            className=""
            initials={accountInfo.initials}
            fullName={accountInfo.fullName}
            email={accountInfo.email}
            memberSince={accountInfo.memberSince}
            avatarUrl={accountInfo.avatarUrl}
            stats={accountInfo.stats}
            onEditProfile={() => setActiveView("edit-profile")}
          />
          <SecurityOverviewCard
            onChangePassword={() => setActiveView("change-password")}
            onManageEmailVerification={() => setActiveView("email-verification")}
            onManageLoginAlerts={() =>
              toast.info("Login alert settings are not editable yet.")
            }
          />
        </div>

        {/* image */}
        <Image src="/images/setting/settinggraphs.png" alt="Settings" width={3000} height={200} className="w-full mt-4" />
      </div>
    </AppShell>
  );
}
