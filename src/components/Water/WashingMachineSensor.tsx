import React from "react";
import WashingMachineSvg from "./WashingMachineSvg";
import { useLeakSensorsState } from "../../hooks/useLeakSensorsState";

const WashingMachineSensor: React.FC = () => {
  // Берём данные только из общего hook!
  const { washingMachineSensor = "unknown", lastLeakWashing } = useLeakSensorsState();

  // Цвет и анимация по состоянию
  let color = "#38bdf8";
  let ringClass = "bg-blue-400 animate-pulse";
  if (washingMachineSensor === "leak") {
    color = "#e53e3e";
    ringClass = "bg-red-500 animate-ping";
  }
  if (washingMachineSensor === "unknown") {
    color = "#9ca3af";
    ringClass = "bg-gray-400 animate-pulse";
  }

  return (
    <div className="flex flex-col items-center justify-center py-7 px-4">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <span
          className={`absolute w-full h-full rounded-full ${ringClass} opacity-30`}
          style={{ zIndex: 0 }}
        />
        <div className="z-10 flex items-center justify-center w-full h-full">
          <WashingMachineSvg color={color} width={100} height={100} />
        </div>
      </div>

      <div className="text-center mt-6">
        {washingMachineSensor === "dry" && (
          <>
            <span className="text-2xl font-semibold text-blue-500">Всё сухо</span>
            <div className="text-sm text-gray-400 mt-1">Утечек воды не обнаружено</div>
          </>
        )}
        {washingMachineSensor === "leak" && (
          <>
            <span className="text-2xl font-bold text-red-600 animate-bounce">ПРОТЕЧКА!</span>
            <div className="text-sm text-red-400 mt-1">
              Обнаружена вода
              {lastLeakWashing && <> • {formatLeakTime(lastLeakWashing)}</>}
            </div>
          </>
        )}
        {washingMachineSensor === "unknown" && (
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

export default WashingMachineSensor;
