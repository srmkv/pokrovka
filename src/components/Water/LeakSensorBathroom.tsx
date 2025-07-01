import React, { useEffect, useState } from "react";
import LeakDropSvg from "./LeakDropSvg";

const API_HOST = process.env.REACT_APP_API_HOST || "http://localhost";
const API_PORT = process.env.REACT_APP_API_PORT || "3010";
const API_BASE = process.env.REACT_APP_API_BASE || "/api/home";
const API_URL = `${API_HOST}:${API_PORT}${API_BASE}`;

type LeakState = "dry" | "leak" | "unknown";

async function fetchLeakState(): Promise<LeakState> {
  try {
    const resp = await fetch(API_URL, { cache: "no-store" });
    if (!resp.ok) return "unknown";
    const json = await resp.json();
    if (json.leakSensor === "leak") return "leak";
    if (json.leakSensor === "dry") return "dry";
    return "unknown";
  } catch {
    return "unknown";
  }
}

const LeakSensorBathroom: React.FC = () => {
  const [state, setState] = useState<LeakState>("unknown");
  const [leakTime, setLeakTime] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const status = await fetchLeakState();
      if (!mounted) return;
      setState(status);
      if (status === "leak" && !leakTime) setLeakTime(new Date());
      if (status === "dry") setLeakTime(null);
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [leakTime]);

  // Цвета градиента под состояние
  let color = "#06C1F2";
  let color2 = "#0078C2";
  let glareColor = "#fff";
  let ringClass = "bg-blue-400 animate-pulse";
  if (state === "leak") {
    color = "#e53e3e";
    color2 = "#b91c1c";
    glareColor = "#fbbf24";
    ringClass = "bg-red-500 animate-ping";
  }
  if (state === "unknown") {
    color = "#9ca3af";
    color2 = "#64748b";
    glareColor = "#fff";
    ringClass = "bg-gray-400 animate-pulse";
  }

  return (
    <div className="flex flex-col items-center justify-center py-7 px-4">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <span className={`absolute w-full h-full rounded-full ${ringClass} opacity-30`} style={{ zIndex: 0 }} />
        <div className="z-10 flex items-center justify-center w-full h-full">
          <LeakDropSvg color={color}   width={90} height={120} />
        </div>
      </div>

      <div className="text-center mt-6">
        {state === "dry" && (
          <>
           
            <span className="text-2xl font-semibold text-blue-500">Всё сухо</span>
            <div className="text-sm text-gray-400 mt-1">Утечек воды не обнаружено</div>
          </>
        )}
        {state === "leak" && (
          <>
           
            <span className="text-2xl font-bold text-red-600 animate-bounce">ПРОТЕЧКА!</span>
            <div className="text-sm text-red-400 mt-1">
              Обнаружена вода{leakTime && (
                <> • {formatLeakTime(leakTime)}</>
              )}
            </div>
          </>
        )}
        {state === "unknown" && (
          <>
            <span className="text-2xl font-semibold text-gray-500">Нет данных</span>
            <div className="text-sm text-gray-400 mt-1">Проверьте подключение</div>
          </>
        )}
      </div>
    </div>
  );
};

function formatLeakTime(start: Date) {
  const delta = Math.floor((Date.now() - start.getTime()) / 1000);
  if (delta < 60) return `(${delta} сек назад)`;
  return `(${Math.floor(delta / 60)} мин назад)`;
}

export default LeakSensorBathroom;
