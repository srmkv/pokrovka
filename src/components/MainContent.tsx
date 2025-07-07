import React, { useState } from "react";
import LightSlider from "./Light/LightSlider";
import BlindsControlRoom from "./Blinds/BlindsControlRoom";
import BlindsControlKitchen from "./Blinds/BlindsControlKitchen";
import BlindsControlHoll from "./Blinds/BlindsControlHoll";
import LightEffects from "./Light/LightEffects";
import FloorHeatingWidget from "./Floor/FloorHeatingWidget";
import FloorHeatingWidgetBath from "./Floor/FloorHeatingWidgetBath";
import TrafficWidget from "./TrafficWidget";
import WeatherTab from "./Weather/WeatherTab";
import LeakSensorBathroom from "../components/Water/LeakSensorBathroom";
import WashingMachineSensor from "../components/Water/WashingMachineSensor";
import DishwasherSensor  from "../components/Water/DishwasherSensor";
import LeakSensorsRow from "./Water/LeakSensorsRow";
import LampBulbPrihozhaya from "./LightOsn/LampBulbPrihozhaya";
import LampBulbHoll from "./LightOsn/LampBulbHoll";
import LampBulbKitchen from "./LightOsn/LampBulbKitchen";
import LampBulbBath from "./LightOsn/LampBulbBath";
import LampBulbGarderob from "./LightOsn/LampBulbGarderob";

const MainContent: React.FC = () => {
  const [tab, setTab] = useState<"weather" | "control" | "traffic">("weather");

  return (
    <div className="text-gray-150 p-5 flex-grow w-full">
      {/* Табы по правому краю */}
      <div className="flex items-center justify-between mb-8">
  <div>
    <LeakSensorsRow />
  </div>
  <div className="flex gap-4">
    <button
      onClick={() => setTab("weather")}
      className={`
        px-6 py-2 rounded-lg font-medium text-base transition-all duration-150 border-2
        ${tab === "weather"
          ? "bg-blue-700 border-blue-400 shadow-xl text-gray-100"
          : "bg-[#1a1b2d] border-[#232445] text-gray-350 hover:bg-blue-900 hover:border-blue-500"}
      `}
    >
      Погода
    </button>
    <button
      onClick={() => setTab("control")}
      className={`
        px-6 py-2 rounded-lg font-medium text-base transition-all duration-150 border-2
        ${tab === "control"
          ? "bg-blue-700 border-blue-400 shadow-xl text-gray-100"
          : "bg-[#1a1b2d] border-[#232445] text-gray-350 hover:bg-blue-900 hover:border-blue-500"}
      `}
    >
      Управление
    </button>
    <button
      onClick={() => setTab("traffic")}
      className={`
        px-6 py-2 rounded-lg font-medium text-base transition-all duration-150 border-2
        ${tab === "traffic"
          ? "bg-blue-700 border-blue-400 shadow-xl text-gray-100"
          : "bg-[#1a1b2d] border-[#232445] text-gray-350 hover:bg-blue-900 hover:border-blue-500"}
      `}
    >
      Пробки
    </button>
  </div>
</div>


      {tab === "weather" ? (
        <WeatherTab />
      ) : tab === "control" ? (
        <>
          {/* Управление умным домом */}
          <div className="my-10">
            <h3 className="text-2xl font-bold mb-5">Управление умным домом</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 justify-center">
              <LightSlider />
              <LightEffects />
            </div>
          </div>
          <div className="my-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 justify-center">
              <BlindsControlKitchen />
              <BlindsControlHoll />
              <BlindsControlRoom />
            </div>
          </div>
          <div className="my-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 justify-center">
              <FloorHeatingWidget />
              <FloorHeatingWidgetBath />
              
            </div>
          </div>
           <div className="my-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 justify-center">
              <LeakSensorBathroom />
              <WashingMachineSensor />
              <DishwasherSensor />
            </div>
          </div>
          <div className="my-10">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5 justify-center">
              <LampBulbPrihozhaya />
              <LampBulbHoll />
              <LampBulbKitchen />
              <LampBulbBath />
              <LampBulbGarderob />
            </div>
          </div>
          
        </>
      ) : (
        // TRAFFIC
        <div className="flex flex-col items-center justify-center my-10">
          <h3 className="text-2xl font-bold mb-5">Пробки в городе</h3>
          <div className="w-full">
            <TrafficWidget />
          </div>
        </div>
      )}
    </div>
  );
};

export default MainContent;
