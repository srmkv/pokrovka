// WeatherFactIndicators.tsx
import React from "react";

interface WeatherFactIndicatorsProps {
  humidity?: number | string;
  pressure_mm?: number | string;
  wind_speed?: number | string;
  wind_dir?: string;
}

const WeatherFactIndicators: React.FC<WeatherFactIndicatorsProps> = ({
  humidity,
  pressure_mm,
  wind_speed,
  wind_dir,
}) => (
  <div className="flex flex-col items-center text-gray-350 text-lg mt-2 space-y-1">
    <div>💧 Влажность: {humidity ?? "--"}%</div>
    <div>🌡 Давление: {pressure_mm ?? "--"} мм</div>
    <div>
      💨 Ветер: {wind_speed ?? "--"} м/с{wind_dir ? `, ${wind_dir}` : ""}
    </div>
  </div>
);

export default WeatherFactIndicators;
