import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export default function AlertsPage() {
  return (
    <AppShell>
      <div className="flex w-full min-w-0 flex-col gap-6">
        <PageHeader title="Alerts" description="Monitor account alerts and risk events." />

        <section className="rounded-[20px] border border-white/20 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Alerts center coming soon</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
            Alert configuration and event history are not wired up yet. This page will host
            trading alerts, risk notifications, and account event monitoring once the backend
            surface is ready.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
