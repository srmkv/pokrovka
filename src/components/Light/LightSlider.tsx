import React, { useState } from "react";

// Генератор полного API-URL с учётом ENV
function apiUrl(path: string) {
  const host = process.env.REACT_APP_API_HOST || "http://localhost";
  const port = process.env.REACT_APP_API_PORT || "3010";
  return `${host}:${port}${path.startsWith("/") ? path : "/" + path}`;
}

// Формирует rgba строку для тени по текущим r/g/b
function rgba(r: number, g: number, b: number, alpha: number) {
  return `rgba(${r},${g},${b},${alpha})`;
}

interface LightSliderProps {
  initialBrightness?: number;
  initialR?: number;
  initialG?: number;
  initialB?: number;
}

const LightSlider: React.FC<LightSliderProps> = ({
  initialBrightness = 50,
  initialR = 255,
  initialG = 255,
  initialB = 255,
}) => {
  const [brightness, setBrightness] = useState(initialBrightness);
  const [r, setR] = useState(initialR);
  const [g, setG] = useState(initialG);
  const [b, setB] = useState(initialB);
  const [loading, setLoading] = useState(false);

  // Отправка яркости и цвета на сервер
  const sendLight = async () => {
    setLoading(true);
    try {
      await fetch(apiUrl("/api/light/slider"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brightness }),
      });
      await fetch(apiUrl("/api/light/color"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r, g, b }),
      });
    } catch {
      alert("Ошибка отправки команды");
    }
    setLoading(false);
  };

  const color = `rgb(${r},${g},${b})`;
  const shadowAlpha = 0.2 + 0.6 * (brightness / 100);
  const shadowRadius = 20 + 30 * (brightness / 100);

  return (
    <div className="bg-[#22243c] rounded-xl p-6 flex flex-col items-center">
      <h4 className="text-lg font-semibold mb-4">Регулятор цвета ленты</h4>
      <div className="flex flex-col items-center mb-3 w-full">
        <div
          style={{
            filter: `drop-shadow(0 0 ${shadowRadius}px ${rgba(r, g, b, shadowAlpha)})`,
            transition: "filter 0.3s",
            display: "inline-block",
          }}
        >
          <svg width={52} height={52}>
            <circle
              cx={26}
              cy={26}
              r={22}
              fill={color}
              stroke="#22243c"
              strokeWidth="4"
            />
          </svg>
        </div>
        <div className="text-sm text-gray-150 mb-1 mt-2">
          Цвет: <b>rgb({r},{g},{b})</b>
        </div>
      </div>
      {/* Ползунки для R/G/B */}
      <div className="w-full mb-4">
        <label className="block text-xs mb-1 text-red-300">Красный: <b>{r}</b></label>
        <input
          type="range"
          min={0}
          max={255}
          value={r}
          onChange={e => setR(Number(e.target.value))}
          className="w-full accent-red-500 mb-2"
        />
        <label className="block text-xs mb-1 text-green-300">Зелёный: <b>{g}</b></label>
        <input
          type="range"
          min={0}
          max={255}
          value={g}
          onChange={e => setG(Number(e.target.value))}
          className="w-full accent-green-500 mb-2"
        />
        <label className="block text-xs mb-1 text-blue-300">Синий: <b>{b}</b></label>
        <input
          type="range"
          min={0}
          max={255}
          value={b}
          onChange={e => setB(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>
      {/* Яркость */}
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
          className="w-full accent-yellow-300"
        />
      </div>
      <button
        className={`
          py-3 px-4 rounded-lg font-medium text-gray-150 text-base
          transition-all duration-150
          border-2
          bg-[#1a1b2d] border-[#232445]
          hover:bg-blue-900 hover:border-blue-500
          disabled:opacity-60
          mt-2
        `}
        disabled={loading}
        onClick={sendLight}
      >
        {loading ? "..." : "Установить параметры"}
      </button>
    </div>
  );
};

export default LightSlider;
