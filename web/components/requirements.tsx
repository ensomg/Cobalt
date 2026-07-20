import { HardDrive, MonitorSmartphone, Package } from "lucide-react";

const REQS = [
  {
    icon: MonitorSmartphone,
    label: "Operating system",
    value: "Windows 10 or Windows 11",
  },
  {
    icon: HardDrive,
    label: "Architecture",
    value: "64-bit (x64)",
  },
  {
    icon: Package,
    label: "Installer size",
    value: "~120 MB",
  },
];

export function Requirements() {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          System requirements
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {REQS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-border/70 bg-card/40 p-5"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Icon className="size-4" />
                {label}
              </div>
              <div className="mt-2 text-lg font-medium">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
