import { useEffect, useState } from "react";

export interface LeakSensorsState {
  leakSensor: "dry" | "leak" | "unknown";
  washingMachineSensor: "dry" | "leak" | "unknown";
  dishwasherSensor: "dry" | "leak" | "unknown";
  lastLeak: string | null;
  lastLeakWashing: string | null;
  lastLeakDishwasher: string | null;
}

function getApiUrl() {
  const base = (process.env.REACT_APP_API_BASE || "/api").replace(/\/$/, "");
  return `${base}/home`;
}


export function useLeakSensorsState(): LeakSensorsState {
  const [state, setState] = useState<LeakSensorsState>({
    leakSensor: "unknown",
    washingMachineSensor: "unknown",
    dishwasherSensor: "unknown",
    lastLeak: null,
    lastLeakWashing: null,
    lastLeakDishwasher: null,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchState() {
      try {
        const resp = await fetch(getApiUrl());
        if (!resp.ok) throw new Error(String(resp.status));
        const data = await resp.json();
        if (!mounted) return;
        setState({
          leakSensor: data.leakSensor ?? "unknown",
          washingMachineSensor: data.washingMachineSensor ?? "unknown",
          dishwasherSensor: data.dishwasherSensor ?? "unknown",
          lastLeak: data.lastLeak ?? null,
          lastLeakWashing: data.lastLeakWashing ?? null,
          lastLeakDishwasher: data.lastLeakDishwasher ?? null,
        });
      } catch {
        if (mounted) {
          setState({
            leakSensor: "unknown",
            washingMachineSensor: "unknown",
            dishwasherSensor: "unknown",
            lastLeak: null,
            lastLeakWashing: null,
            lastLeakDishwasher: null,
          });
        }
      }
    }

    fetchState();
    const interval = setInterval(fetchState, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return state;
}
