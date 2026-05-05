import React, { useEffect, useState } from "react";

const API_BASE = (process.env.REACT_APP_API_BASE || "/api").replace(/\/$/, "");

type OverallStatus = "normal" | "warning" | "critical";

interface HomeSummary {
  overallStatus: OverallStatus;
  onlineDevices: number;
  offlineDevices: number;
  totalDevices: number;
  sensorsTotal: number;
  sensorsOk: number;
  sensorsUnknown: number;
  activeLeaks: number;
  unreadNotifications: number;
  unreadCritical: number;
  unreadWarning: number;
  lastEvent?: { title?: string; createdAt?: string; priority?: string } | null;
}

const statusView: Record<OverallStatus, { title: string; className: string; dot: string }> = {
  normal: { title: "Норма", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200", dot: "bg-emerald-400" },
  warning: { title: "Внимание", className: "border-amber-500/40 bg-amber-500/10 text-amber-200", dot: "bg-amber-400" },
  critical: { title: "Авария", className: "border-red-500/50 bg-red-500/10 text-red-200", dot: "bg-red-400 animate-pulse" },
};

function formatLastEvent(summary: HomeSummary | null) {
  if (!summary?.lastEvent?.title) return "событий нет";
  const createdAt = summary.lastEvent.createdAt ? new Date(summary.lastEvent.createdAt) : null;
  const time = createdAt ? createdAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";
  return `${time ? `${time} · ` : ""}${summary.lastEvent.title}`;
}

const HomeStatusBar: React.FC = () => {
  const [summary, setSummary] = useState<HomeSummary | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch(`${API_BASE}/system/summary`);
        if (!resp.ok) throw new Error(String(resp.status));
        const data = await resp.json();
        if (mounted) setSummary(data);
      } catch {
        if (mounted) setSummary(null);
      }
    }

    load();
    const timer = window.setInterval(load, 5000);
    window.addEventListener("sensors-registry-refresh", load);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener("sensors-registry-refresh", load);
    };
  }, []);

  const status = summary?.overallStatus || "warning";
  const view = statusView[status];

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${view.className}`}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2 font-bold">
          <span className={`h-2.5 w-2.5 rounded-full ${view.dot}`} />
          <span>Дом: {view.title}</span>
        </div>
        <div>Устройства online: <b>{summary ? `${summary.onlineDevices}/${summary.totalDevices}` : "—"}</b></div>
        <div>Датчики: <b>{summary ? `${summary.sensorsOk}/${summary.sensorsTotal}` : "—"}</b></div>
        <div>Активные тревоги: <b>{summary?.activeLeaks ?? "—"}</b></div>
        <div>Уведомления: <b>{summary?.unreadNotifications ?? "—"}</b></div>
        <div className="min-w-0 flex-1 truncate text-gray-300">Последнее событие: {formatLastEvent(summary)}</div>
      </div>
    </div>
  );
};

export default HomeStatusBar;
