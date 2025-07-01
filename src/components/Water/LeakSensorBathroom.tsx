import React from "react";
import LeakDropSvg from "./LeakDropSvg";
import { useLeakSensorsState } from "../../hooks/useLeakSensorsState";

const LeakSensorBathroom: React.FC = () => {
  const { leakSensor = "unknown", lastLeak } = useLeakSensorsState();

  let color = "#06C1F2";
  let ringClass = "bg-blue-400 animate-pulse";
  if (leakSensor === "leak") {
    color = "#e53e3e";
    ringClass = "bg-red-500 animate-ping";
  }
  if (leakSensor === "unknown") {
    color = "#9ca3af";
    ringClass = "bg-gray-400 animate-pulse";
  }

  return (
    <div className="flex flex-col items-center justify-center py-7 px-4">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <span className={`absolute w-full h-full rounded-full ${ringClass} opacity-30`} style={{ zIndex: 0 }} />
        <div className="z-10 flex items-center justify-center w-full h-full">
          <LeakDropSvg color={color} width={90} height={120} />
        </div>
      </div>

      <div className="text-center mt-6">
        {leakSensor === "dry" && (
          <>
            <span className="text-2xl font-semibold text-blue-500">Всё сухо</span>
            <div className="text-sm text-gray-400 mt-1">Утечек воды не обнаружено</div>
          </>
        )}
        {leakSensor === "leak" && (
          <>
            <span className="text-2xl font-bold text-red-600 animate-bounce">ПРОТЕЧКА!</span>
            <div className="text-sm text-red-400 mt-1">
              Обнаружена вода
              {lastLeak && <> • {formatLeakTime(lastLeak)}</>}
            </div>
          </>
        )}
        {leakSensor === "unknown" && (
          <>
            <span className="text-2xl font-semibold text-gray-500">Нет данных</span>
            <div className="text-sm text-gray-400 mt-1">Проверьте подключение</div>
          </>
        )}
      </div>
    </div>
  );
};

function formatLeakTime(lastLeak: string) {
  if (!lastLeak) return "";
  const start = new Date(lastLeak);
  const delta = Math.floor((Date.now() - start.getTime()) / 1000);
  if (delta < 60) return `(${delta} сек назад)`;
  return `(${Math.floor(delta / 60)} мин назад)`;
}

export default LeakSensorBathroom;
