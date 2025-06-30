import React, { useState } from "react";

const BlindsControl: React.FC = () => {
  const [loading, setLoading] = useState<"up" | "down" | null>(null);

  const sendBlinds = async (direction: "up" | "down") => {
    setLoading(direction);
    try {
      await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "blinds", value: direction }),
      });
    } catch (e) {
      alert("Ошибка отправки команды");
    }
    setLoading(null);
  };

  return (
    <div className="bg-[#22243c] rounded-xl p-6 flex flex-col items-center">
      <h4 className="text-lg font-semibold mb-3">Жалюзи</h4>
      <div className="flex gap-4 mb-3">
        <button
          className="px-4 py-2 rounded bg-green-700 hover:bg-green-900 text-gray-150 disabled:opacity-60"
          disabled={loading === "up"}
          onClick={() => sendBlinds("up")}
        >
          {loading === "up" ? "Отправка..." : "Поднять"}
        </button>
        <button
          className="px-4 py-2 rounded bg-yellow-700 hover:bg-yellow-900 text-gray-150 disabled:opacity-60"
          disabled={loading === "down"}
          onClick={() => sendBlinds("down")}
        >
          {loading === "down" ? "Отправка..." : "Опустить"}
        </button>
      </div>
      <span className="text-gray-350 text-xs">
        Управляйте положением жалюзи
      </span>
    </div>
  );
};

export default BlindsControl;
