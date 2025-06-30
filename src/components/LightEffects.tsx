import React, { useState } from "react";

const effectNames = [
  "Бегущий огонь",
  "Плавное затухание",
  "Змейка",
  "Навстречу",
];

const LightEffects: React.FC = () => {
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  const setEffect = async (idx: number) => {
    setLoadingIdx(idx);
    try {
      await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "set_effect",
          value: idx + 1,
        }),
      });
      setActive(idx);
    } catch {
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
              minWidth: 120,
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
