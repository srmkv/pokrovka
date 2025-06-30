//WeatherClock.jsx
import React from "react";
import { WeatherIconMap } from "./WeatherIconMap"; // путь уточни!
import { conditionMap } from "./conditionMap"; // путь уточни!

type HourData = {
  hour: string; // "0".."23"
  temp: number;
  condition: string; // теперь передаём raw-condition из Яндекса
};

interface WeatherClockProps {
  hours: HourData[];
}

const CLOCK_SIZE = 530;
const CLOCK_RADIUS = 240;
const CENTER = CLOCK_SIZE / 2;

const WeatherClock: React.FC<WeatherClockProps> = ({ hours }) => {
  if (!hours || !hours.length) {
    return (
      <div className="flex items-center justify-center h-72 text-lg text-gray-350">
        Нет данных о погоде
      </div>
    );
  }

  return (
    <div style={{ width: CLOCK_SIZE, height: CLOCK_SIZE, position: "relative" }}>
      <svg width={CLOCK_SIZE} height={CLOCK_SIZE}>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={CLOCK_RADIUS + 20}
          fill="#1a1b2d"
          stroke="#232445"
          strokeWidth={4}
        />
        {hours.map((h, idx) => {
          const angle = ((idx - 6) / 24) * 2 * Math.PI;
          const x = CENTER + Math.cos(angle) * (CLOCK_RADIUS - 42);
          const y = CENTER + Math.sin(angle) * (CLOCK_RADIUS - 42);

          const tx = CENTER + Math.cos(angle) * (CLOCK_RADIUS - 5);
          const ty = CENTER + Math.sin(angle) * (CLOCK_RADIUS - 5);

          const timex = CENTER + Math.cos(angle) * (CLOCK_RADIUS - 75);
          const timey = CENTER + Math.sin(angle) * (CLOCK_RADIUS - 75);

          const isCurrent = Number(h.hour) === new Date().getHours();

          // Получаем название картинки
          const iconKey = conditionMap[h.condition] || "Shower";
          const iconSrc = WeatherIconMap[iconKey] || WeatherIconMap["Shower"];

          return (
            <g key={idx}>
              <foreignObject x={x - 22} y={y - 22} width={44} height={44}>
                <div style={{ opacity: isCurrent ? 1 : 0.7, width: 40 }}>
                  <img src={iconSrc} alt={h.condition} style={{ width: 40}} />
                </div>
              </foreignObject>
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize="18"
                fontWeight={isCurrent ? 700 : 600}
                fill={isCurrent ? "#fff" : "#ffd"}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {h.temp > 0 ? `+${h.temp}` : h.temp}
              </text>
              <text
                x={timex}
                y={timey}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize="18"
                fill={isCurrent ? "#4fc3f7" : "#888"}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {h.hour}
              </text>
            </g>
          );
        })}
        {/* Центр — текущее время */}
        <circle cx={CENTER} cy={CENTER} r={80} fill="#232445" />
        <text
          x={CENTER}
          y={CENTER}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize="30"
          fontWeight={700}
          fill="#fff"
        >
          {`${String(new Date().getHours()).padStart(2, "0")}:${String(
            new Date().getMinutes()
          ).padStart(2, "0")}`}
        </text>
      </svg>
    </div>
  );
};

export default WeatherClock;
