import React, { useState } from "react";

const BlindsControlKitchen: React.FC = () => {
  const [loading, setLoading] = useState<"up" | "down" | null>(null);
  const [position, setPosition] = useState<0 | 1>(0);

  // параметры окна и шторки
  const windowHeight = 120;
  const windowWidth = 180;
  const blindClosedHeight = windowHeight - 6;
  const blindOpenHeight = 18;

  const currentHeight = position === 1 ? blindClosedHeight : blindOpenHeight;
  const currentTop = 3;

  const sendBlinds = async (direction: "up" | "down") => {
    setLoading(direction);
    try {
      await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "blinds", value: direction }),
      });
      setPosition(direction === "down" ? 1 : 0);
    } catch (e) {
      alert("Ошибка отправки команды");
    }
    setTimeout(() => setLoading(null), 700);
  };

  return (
    <div className="bg-[#22243c] rounded-xl p-6 flex flex-col items-center w-full">
      <h4 className="text-lg font-semibold mb-3">Жалюзи Кухня</h4>
      <div
        className="relative flex justify-center items-center mb-4"
        style={{
          width: windowWidth,
          height: windowHeight,
        }}
      >
        {/* Стекло — ГОЛУБОЙ ГРАДИЕНТ */}
        <div
          style={{
            position: "absolute",
            width: "98%",
            height: "98%",
            background: "linear-gradient(180deg, #e0ecfa 60%, #b6e4ff 100%)",
            borderRadius: 16,
            boxShadow: "0 6px 18px #0007, 0 0 0 4px #b3b6c3 inset",
            zIndex: 1,
          }}
        />

        {/* Жалюзи — ТЁМНЫЕ */}
        <div
          style={{
            position: "absolute",
            top: currentTop,
            left: 0,
            width: "100%",
            height: currentHeight,
            borderRadius: position === 0 ? "16px 16px 8px 8px" : "16px",
            background:
              "repeating-linear-gradient(180deg, #323540 0px, #44475a 8px, #323540 16px)",
            boxShadow:
              position === 1
                ? "0 8px 18px #131521"
                : "0 2px 8px #282a36",
            border: "1px solid #2c2e38",
            transition:
              "height 0.7s cubic-bezier(.8,1.7,.5,1), border-radius 0.5s",
            zIndex: 2,
            overflow: "hidden",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          {/* "ручка" */}
          <div
            style={{
              marginTop: 5,
              width: 42,
              height: 7,
              borderRadius: 8,
              background: "linear-gradient(90deg, #595c6c, #868998 70%)",
              boxShadow: "0 1px 6px #3b3d4f",
              opacity: 0.85,
            }}
          />
        </div>

        {/* Рама */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            border: "6px solid #23243a",
            borderRadius: 16,
            pointerEvents: "none",
            boxSizing: "border-box",
            zIndex: 10,
          }}
        />
      </div>
      <div className="flex gap-4 mb-1">
        <button
          className="px-4 py-2 rounded bg-green-700 hover:bg-green-900 text-gray-150 disabled:opacity-60 shadow"
          disabled={loading === "up" || position === 0}
          onClick={() => sendBlinds("up")}
        >
          {loading === "up" ? "Отправка..." : "Поднять"}
        </button>
        <button
          className="px-4 py-2 rounded bg-yellow-700 hover:bg-yellow-900 text-gray-150 disabled:opacity-60 shadow"
          disabled={loading === "down" || position === 1}
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

export default BlindsControlKitchen;
