import React from "react";
import LeakDropSvg from "./LeakDropSvg";
import WashingMachineSvg from "./WashingMachineSvg";
import DishwasherSvg from "./DishwasherSvg";
import { useLeakSensorsState } from "../../hooks/useLeakSensorsState";

const sensorIcons = [
  {
    key: "leakSensor",
    label: "Ванная",
    Svg: LeakDropSvg,
    colorMap: { dry: "#22d3ee", leak: "#ef4444", unknown: "#9ca3af" },
    width: 32, height: 32,
    lastKey: "lastLeak"
  },
  {
    key: "washingMachineSensor",
    label: "Стиралка",
    Svg: WashingMachineSvg,
    colorMap: { dry: "#22d3ee", leak: "#ef4444", unknown: "#9ca3af" },
    width: 32, height: 32,
    lastKey: "lastLeakWashing"
  },
  {
    key: "dishwasherSensor",
    label: "Посудом.",
    Svg: DishwasherSvg,
    colorMap: { dry: "#22d3ee", leak: "#ef4444", unknown: "#9ca3af" },
    width: 32, height: 32,
    lastKey: "lastLeakDishwasher"
  }
] as const;

function formatLeakTime(lastLeak: string | null) {
  if (!lastLeak) return "";
  const start = new Date(lastLeak);
  const delta = Math.floor((Date.now() - start.getTime()) / 1000);
  if (delta < 60) return `(${delta} сек назад)`;
  return `(${Math.floor(delta / 60)} мин назад)`;
}

const LeakSensorsRow: React.FC = () => {
  const sensors = useLeakSensorsState();

  return (
    <div className="w-full flex items-center justify-center gap-6 mt-2 py-1 border-t border-gray-600/30">
      {sensorIcons.map(({ key, label, Svg, colorMap, width, height, lastKey }) => {
        const state = sensors[key as keyof typeof sensors] as keyof typeof colorMap;
        const lastLeak = sensors[lastKey as keyof typeof sensors] as string | null;
        return (
          <div key={key} className="flex flex-col items-center text-xs">
            <Svg width={width} height={height} color={colorMap[state]} />
            <span
              className={`mt-0.5 font-medium ${
                state === "leak" ? "text-red-500 animate-pulse" : "text-gray-350"
              }`}
              style={{ fontSize: 11 }}
            >
              {label}
            </span>
            {state === "leak" && lastLeak && (
              <span className="text-[10px] text-red-400">{formatLeakTime(lastLeak)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LeakSensorsRow;
