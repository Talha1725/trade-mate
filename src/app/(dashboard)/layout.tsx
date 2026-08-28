import * as React from "react";

import { AppShell } from "@/components/app-shell";
import { RouteGuard } from "@/components/auth/route-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}
