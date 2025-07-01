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
  const host = process.env.REACT_APP_API_HOST || "http://localhost";
  const port = process.env.REACT_APP_API_PORT || "3010";
  const base = process.env.REACT_APP_API_BASE || "/api/home";
  return `${host}:${port}${base}`;
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
        const data = await resp.json();
        if (!mounted) return;
        setState({
          leakSensor: data.leakSensor,
          washingMachineSensor: data.washingMachineSensor,
          dishwasherSensor: data.dishwasherSensor,
          lastLeak: data.lastLeak,
          lastLeakWashing: data.lastLeakWashing,
          lastLeakDishwasher: data.lastLeakDishwasher,
        });
      } catch {
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
    fetchState();
    const interval = setInterval(fetchState, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return state;
}
