// WeatherIcon.tsx
import React from "react";
import { WeatherIconMap } from "./WeatherIconMap";

interface WeatherIconProps {
  iconName: string;
  width?: number | string;
  hight?: number | string;
  className?: string;
  alt?: string;
}

const WeatherIcon: React.FC<WeatherIconProps> = ({
  iconName,
  width = 80,
  hight = 80,
  className = "",
  alt = "",
}) => {
  const src = WeatherIconMap[iconName] || WeatherIconMap["Clear"];
  return (
    <img
      src={src}
      alt={alt || iconName}
      style={{ width: width}}
      className={className}
      draggable={false}
    />
  );
};

export default WeatherIcon;
