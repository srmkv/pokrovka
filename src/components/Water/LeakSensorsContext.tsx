import React, { createContext, useContext, useEffect, useState } from "react";

// Типы
type LeakState = "dry" | "leak" | "unknown";
interface LeakSensors {
  leakSensor: LeakState;
  lastLeak: string | null;
  washingMachineSensor: LeakState;
  lastLeakWashing: string | null;
  dishwasherSensor: LeakState;
  lastLeakDishwasher: string | null;
}

// Значения по умолчанию
const defaultState: LeakSensors = {
  leakSensor: "unknown",
  lastLeak: null,
  washingMachineSensor: "unknown",
  lastLeakWashing: null,
  dishwasherSensor: "unknown",
  lastLeakDishwasher: null
};

const LeakSensorsContext = createContext<LeakSensors>(defaultState);

export const useLeakSensorsState = () => useContext(LeakSensorsContext);

export const LeakSensorsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LeakSensors>(defaultState);

  useEffect(() => {
    let mounted = true;
    async function fetchState() {
      try {
        const resp = await fetch(process.env.REACT_APP_API_URL || "http://localhost:3010/api/home");
        const json = await resp.json();
        if (!mounted) return;
        setState({
          leakSensor: json.leakSensor,
          lastLeak: json.lastLeak,
          washingMachineSensor: json.washingMachineSensor,
          lastLeakWashing: json.lastLeakWashing,
          dishwasherSensor: json.dishwasherSensor,
          lastLeakDishwasher: json.lastLeakDishwasher
        });
      } catch {
        if (!mounted) return;
        setState(defaultState);
      }
    }
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <LeakSensorsContext.Provider value={state}>
      {children}
    </LeakSensorsContext.Provider>
  );
};
