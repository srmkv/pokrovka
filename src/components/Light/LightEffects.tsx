import React, { useState } from "react";

// Точные названия эффектов из твоего Arduino-скетча
const effectNames = [
  "Включить",            // on
  "Выключить",           // off
  "Огонь",               // fire
  "Туда-обратно",        // firebounce
  "Эффект по умолчанию", // default
  "Затухание",           // fade
  "Реле",                // relay (можешь убрать если не надо)
];

// Точные названия для API/backend/Arduino
const effectApiNames = [
  "on",
  "off",
  "fire",
  "firebounce",
  "default",
  "fade",
  "relay", // можно убрать
];

// Универсальный конструктор адреса API
function getApiUrl(path: string) {
  const host = process.env.REACT_APP_API_HOST || "http://localhost";
  const port = process.env.REACT_APP_API_PORT || "3010";
  return `${host}:${port}${path}`;
}

const LightEffects: React.FC = () => {
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  // При монтировании компонента получаем текущий эффект
  React.useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(getApiUrl("/api/light/effects"));
        if (resp.ok) {
          const data = await resp.json();
          const idx = effectApiNames.indexOf(data.effect);
          if (idx !== -1) setActive(idx);
        }
      } catch {/* игнорируем */}
    })();
  }, []);

  const setEffect = async (idx: number) => {
    setLoadingIdx(idx);
    try {
      const resp = await fetch(getApiUrl("/api/light/effects"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effect: effectApiNames[idx],
        }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        alert("Ошибка: " + (err.error || "неизвестная ошибка"));
      } else {
        setActive(idx);
      }
    } catch (e) {
      alert("Ошибка отправки команды");
    }
    setLoadingIdx(null);
  };

  return (
    <div className="bg-[#22243c] rounded-xl p-6 flex flex-col items-center mb-8 w-full">
      <h4 className="text-lg font-semibold mb-4">Эффекты подсветки</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {effectNames.map((name, idx) => (
          <button
            key={name}
            onClick={() => setEffect(idx)}
            className={`
              py-3 px-4 rounded-lg font-medium text-gray-150 text-base
              transition-all duration-150
              border-2
              ${active === idx ? "bg-blue-700 border-blue-400 shadow-xl" : "bg-[#1a1b2d] border-[#232445]"}
              hover:bg-blue-900 hover:border-blue-500
              disabled:opacity-60
            `}
            style={{
              minWidth: 140,
              letterSpacing: 0.2,
            }}
            disabled={loadingIdx !== null}
          >
            {loadingIdx === idx ? "..." : name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LightEffects;
