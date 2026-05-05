import React, { useEffect, useState } from "react";

const API_BASE = (process.env.REACT_APP_API_BASE || "/api").replace(/\/$/, "");

interface NotificationItem {
  id: string;
  title: string;
  text: string;
  source: string;
  priority: "info" | "warning" | "critical";
  sticky?: boolean;
  acknowledgedAt?: string | null;
  createdAt: string;
}

const stylesByPriority = {
  info: {
    wrap: "border-blue-400/50 bg-[#22243c]",
    badge: "bg-blue-500/20 text-blue-300 border-blue-400/40",
  },
  warning: {
    wrap: "border-amber-400/60 bg-[#2d2619]",
    badge: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  },
  critical: {
    wrap: "border-red-500/70 bg-[#311b22]",
    badge: "bg-red-500/20 text-red-200 border-red-400/40",
  },
};

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      try {
        const resp = await fetch(`${API_BASE}/notifications?limit=20`);
        if (!resp.ok) throw new Error(String(resp.status));
        const data = await resp.json();
        if (mounted) {
          setNotifications((Array.isArray(data) ? data : []).filter((item) => !item.acknowledgedAt));
        }
      } catch {
        if (mounted) setNotifications([]);
      }
    }

    fetchNotifications();
    const timer = window.setInterval(fetchNotifications, 4000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  async function closeNotification(id: string) {
    try {
      await fetch(`${API_BASE}/notifications/${id}/ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      setNotifications((prev) => prev.filter((note) => note.id !== id));
    }
  }

  if (!notifications.length) return null;

  return (
    <div className="fixed right-5 bottom-5 z-50 w-96 max-w-[90vw] flex flex-col items-end gap-3">
      {notifications.slice(0, 5).map((note, idx) => {
        const isLatest = idx === 0;
        const styles = stylesByPriority[note.priority] || stylesByPriority.info;

        return (
          <div
            key={note.id}
            className={`w-full rounded-lg border p-4 shadow-lg text-gray-150 relative flex flex-col ${styles.wrap} ${isLatest ? "animate-pulse" : ""}`}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-100 p-1 rounded-full transition"
              onClick={() => closeNotification(note.id)}
              aria-label="Закрыть"
            >
              <svg width={18} height={18} viewBox="0 0 18 18">
                <line x1="4" y1="4" x2="14" y2="14" stroke="currentColor" strokeWidth="2" />
                <line x1="14" y1="4" x2="4" y2="14" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>

            <div className="mb-2 flex items-center gap-2 pr-7">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${styles.badge}`}>
                {note.priority}
              </span>
              <span className="text-xs text-gray-350">{note.source}</span>
            </div>

            <div className="font-semibold text-sm mb-1">{note.title}</div>
            <div className="text-sm leading-5">{note.text}</div>
            <div className="text-xs text-gray-400 mt-3">
              {new Date(note.createdAt).toLocaleString("ru-RU")}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationCenter;
