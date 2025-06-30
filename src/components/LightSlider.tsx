import React, { useState } from "react";

// Массив контрольных точек: [K, [R,G,B]]
const points: [number, [number, number, number]][] = [
  [2700, [255, 181, 71]],   // теплый желтый
  [4000, [255, 245, 203]],  // нейтральный
  [6500, [195, 220, 255]],  // холодный голубой-белый
];

// Интерполяция RGB по температуре
function interpolateColor(kelvin: number) {
  if (kelvin <= points[0][0]) return `rgb(${points[0][1].join(",")})`;
  if (kelvin >= points[points.length - 1][0])
    return `rgb(${points[points.length - 1][1].join(",")})`;
  let i = 0;
  for (; i < points.length - 1; i++) {
    if (kelvin < points[i + 1][0]) break;
  }
  const [k1, c1] = points[i];
  const [k2, c2] = points[i + 1];
  const t = (kelvin - k1) / (k2 - k1);
  const color = c1.map((v, idx) => Math.round(v + (c2[idx] - v) * t));
  return `rgb(${color.join(",")})`;
}

// Получить alpha-hex для свечения
function rgba(color: string, alpha: number) {
  // color = rgb(r,g,b)
  const [r, g, b] = color
    .replace(/[^\d,]/g, "")
    .split(",")
    .map(Number);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface LightSliderProps {
  initialBrightness?: number;
  initialTemperature?: number;
}

const LightSlider: React.FC<LightSliderProps> = ({
  initialBrightness = 50,
  initialTemperature = 4000,
}) => {
  const [brightness, setBrightness] = useState(initialBrightness);
  const [temperature, setTemperature] = useState(initialTemperature);
  const [loading, setLoading] = useState(false);

  const sendLight = async () => {
    setLoading(true);
    try {
      await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "set_light",
          value: { brightness, temperature },
        }),
      });
    } catch {
      alert("Ошибка отправки команды");
    }
    setLoading(false);
  };

  const gradId = "tempGrad";

  // Сила свечения: от 0 (0%) до 1 (100%) -> переводим в 0.2 до 0.8 для alpha
  const shadowAlpha = 0.2 + 0.6 * (brightness / 100);
  // Радиус свечения: 20px (минимум) - 50px (максимум)
  const shadowRadius = 20 + 30 * (brightness / 100);

  const color = interpolateColor(temperature);

  return (
    <div className="bg-[#22243c] rounded-xl p-6 flex flex-col items-center">
      <h4 className="text-lg font-semibold mb-4">Регулятор подсветки</h4>

      {/* Кружок с градиентом и светящейся тенью */}
      <div className="flex flex-col items-center mb-3 w-full">
        <div
          style={{
            filter: `drop-shadow(0 0 ${shadowRadius}px ${rgba(color, shadowAlpha)})`,
            transition: "filter 0.3s",
            display: "inline-block",
          }}
        >
          <svg width={52} height={52}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(255,181,71)" />
                <stop offset="50%" stopColor="rgb(255,245,203)" />
                <stop offset="100%" stopColor="rgb(195,220,255)" />
              </linearGradient>
            </defs>
            <circle
              cx={26}
              cy={26}
              r={22}
              fill={`url(#${gradId})`}
              stroke="#22243c"
              strokeWidth="4"
            />
            {/* Маленький кружок-указатель */}
            <circle
              cx={
                26 +
                18 *
                  Math.cos(
                    ((temperature - 2700) / (6500 - 2700)) * Math.PI - Math.PI
                  )
              }
              cy={
                26 +
                18 *
                  Math.sin(
                    ((temperature - 2700) / (6500 - 2700)) * Math.PI - Math.PI
                  )
              }
              r={5}
              fill={color}
              stroke="#22243c"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div className="text-sm text-gray-150 mb-1 mt-2">
          Температура света: <b>{temperature}K</b>
        </div>
      </div>

      {/* Слайдер температуры */}
      <div className="w-full mb-5">
        <input
          type="range"
          min={2700}
          max={6500}
          step={50}
          value={temperature}
          onChange={e => setTemperature(Number(e.target.value))}
          className="w-full accent-yellow-400"
          style={{
            accentColor: color,
            background:
              "linear-gradient(90deg, #FFD547 0%, #FFF5CB 50%, #C3DCFF 100%)",
          }}
        />
        <div className="flex justify-between w-full mt-1 text-xs text-gray-350">
          <span>Тёплый</span>
          <span>Нейтральный</span>
          <span>Холодный</span>
        </div>
      </div>

      {/* Слайдер яркости */}
      <div className="w-full mb-4 flex flex-col items-center">
        <label className="block text-sm mb-1">
          Яркость: <b>{brightness}%</b>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={brightness}
          onChange={e => setBrightness(Number(e.target.value))}
          className="w-full accent-blue-400"
        />
      </div>

      <button
        className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-900 text-gray-150 disabled:opacity-60 mt-2"
        disabled={loading}
        onClick={sendLight}
      >
        {loading ? "Отправка..." : "Установить параметры"}
      </button>
    </div>
  );
};

export default LightSlider;
