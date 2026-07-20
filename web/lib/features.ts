import {
  BatteryCharging,
  Cpu,
  Gauge,
  Globe,
  LayoutGrid,
  MemoryStick,
  Monitor,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export type Feature = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

export const FEATURES: Feature[] = [
  { icon: Monitor, title: "System", desc: "A live overview of your PC hardware and health." },
  { icon: ScanSearch, title: "Scan", desc: "Deep scan for issues, junk and outdated components." },
  { icon: Cpu, title: "Drivers", desc: "Detect, update and roll back device drivers safely." },
  { icon: LayoutGrid, title: "Apps", desc: "Manage installed applications from a single place." },
  { icon: Gauge, title: "Optimize", desc: "Tune Windows for speed and responsiveness." },
  { icon: Trash2, title: "Uninstaller", desc: "Remove apps completely, leftovers included." },
  { icon: Sparkles, title: "Cleanup", desc: "Reclaim disk space by clearing junk and caches." },
  { icon: MemoryStick, title: "Memory", desc: "Free up RAM and monitor memory pressure." },
  { icon: ShieldCheck, title: "Defender", desc: "Quick controls for Windows Defender status." },
  { icon: Globe, title: "DNS", desc: "Switch DNS providers and flush the resolver cache." },
  { icon: BatteryCharging, title: "Power", desc: "Power plans and battery tuning on demand." },
  {
    icon: SlidersHorizontal,
    title: "Windows Customization",
    desc: "Fine-tune Explorer, taskbar and privacy toggles.",
  },
];
