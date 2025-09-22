import React, { useEffect, useState } from "react";

const LAMP_ON = "#ffe066";
const LAMP_OFF = "#8c92a4";
const RELAY_CODE = 11868689;

// Универсальный BASE — только префикс, без host/port
const API_BASE = (process.env.REACT_APP_API_BASE || "/api").replace(/\/$/, "");
const apiUrl = (p: string) => `${API_BASE}${p.startsWith("/") ? p : `/${p}`}`;

function BulbSVG({ isOn }: { isOn: boolean }) {
  return (
    <svg
      width={120}
      height={120}
      viewBox="0 0 256 256"
      fill="none"
      style={{
        cursor: "pointer",
        filter: isOn ? "drop-shadow(0 0 30px #ffe06688)" : undefined,
        transition: "filter 0.2s"
      }}
    >
     <g>
        {/* Лампочка-груша */}
        <path
          d="M117.4,66.8C89.8,72.1,69.3,92.6,64.5,120c-1.2,6.7-1.2,13.3-0.1,18.8c2.5,11.9,10.4,26.1,21.3,38c1.7,1.9,3.9,5.1,4.8,7.1c1.5,3.4,1.7,4.4,2,15.7l0.3,12l1.9,2.8c1.1,1.5,2.9,3.4,4,4.1c1.5,1,2.1,1.9,2.4,3.8c1.2,6.8,7.9,15.4,14.6,18.6c1.9,0.9,5.5,2,7.9,2.4c13.6,2.4,27.3-6.9,30.8-20.8c0.4-1.7,1-3,1.3-3c1.2,0,5.2-4.2,6.5-6.7c1.2-2.3,1.4-4.1,1.8-14.6c0.3-11.3,0.5-12.1,2.1-15.2c1-1.8,3.3-5,5.2-7.1c10.4-11.8,17.5-24.5,20.2-36.2c0.8-3.4,1-6.4,0.7-12.5c-1.2-28.8-21.5-52.9-50.1-59.6C136,66,123.6,65.7,117.4,66.8z M136.4,76.2c20.4,3.2,37.2,17.5,43.9,37.4c2.6,7.8,3.3,18.4,1.6,25.1c-2.3,8.8-9.2,20.9-17.5,30.3c-8.4,9.5-9.4,12.3-9.9,27.5c-0.4,11.2-0.5,11.9-1.9,13.2l-1.5,1.5H128h-23.3l-1.2-1.5c-1.1-1.3-1.2-2.6-1.2-10.6c0-13.5-2.4-21.3-8.6-28.1c-7.7-8.3-14.6-19-17.9-27.9c-1.9-5-2.1-6-2.1-13.5c-0.1-8.5,0.8-12.6,3.7-20.1c5.7-14,18.2-25.9,32.8-30.9C119,75.7,127.7,74.8,136.4,76.2z M144.8,221.6c0,0.2-0.6,1.5-1.3,2.8c-2.6,5.2-9.9,9.7-15.5,9.7c-2.7,0-7.6-1.7-10.4-3.5c-2.4-1.6-6.3-6.8-6.3-8.5c0-0.6,3.4-0.8,16.8-0.8C137.3,221.3,144.8,221.4,144.8,221.6z"
          fill={isOn ? LAMP_ON : LAMP_OFF}
          style={{ transition: "fill 0.2s" }}
        />
        {/* Цоколь */}
        
        {/* Верхний штрих */}
        <path d="M125.7,13.1c-2.6,1.2-2.8,3.3-2.6,19.8c0.2,15.5,0.2,15.7,1.7,16.9c2.1,1.7,4.7,1.5,6.4-0.3c1.4-1.5,1.4-1.9,1.4-17.8V15.5L131,14C129.3,12.2,127.9,12,125.7,13.1z"
          fill={isOn ? LAMP_ON : LAMP_OFF} style={{ transition: "fill 0.2s" }}
        />
        {/* Лучи и декор */}
        <path d="M68.2,28.8c-2.8,2-2.1,4.4,6.4,19c8.2,14.1,9.2,15.2,12.6,14.4c1.9-0.5,3.5-2.6,3.5-4.5c0-1.4-13.9-26.1-16.1-28.6C73.1,27.6,70.3,27.4,68.2,28.8z" fill={isOn ? LAMP_ON : LAMP_OFF} style={{ transition: "fill 0.2s" }}/>
        <path d="M181.1,29.2c-0.7,0.8-4.5,7.2-8.4,14.1c-7.9,13.8-8.5,15.7-5.5,18c2.2,1.7,3.7,1.7,5.7-0.1c2.1-1.8,16.5-27,16.5-28.6C189.3,28.5,183.8,26.3,181.1,29.2z"  fill={isOn ? LAMP_ON : LAMP_OFF} style={{ transition: "fill 0.2s" }}/>
        <path d="M26.5,70.7c-1.7,1.7-1.9,2.6-1,5c0.8,2.1,26.8,17.2,29.7,17.2c3.6,0,5.9-4.4,3.7-7.3C57.6,84,31.2,69.1,29.5,69.1C28.7,69.1,27.3,69.8,26.5,70.7z" fill={isOn ? LAMP_ON : LAMP_OFF} style={{ transition: "fill 0.2s" }}/>
        <path d="M211.2,76.8c-7.3,4.2-13.7,8.3-14.3,9.1c-1.5,1.8-1.5,3.2,0.2,5.4c2.3,3,4.2,2.4,18-5.5c6.9-4,13.2-7.8,14.1-8.5c3-2.7,0.8-8.3-3.4-8.2C225.1,69.1,218.5,72.6,211.2,76.8z" fill={isOn ? LAMP_ON : LAMP_OFF} style={{ transition: "fill 0.2s" }}/>
        <path d="M11.3,127.1c-1.9,1.9-1.7,5.4,0.4,7c1.6,1.3,2.5,1.4,17.1,1.4c10.1,0,15.9-0.3,17-0.7c3.3-1.5,3.5-6.6,0.5-8.3c-0.8-0.5-7.3-0.7-17.4-0.7C13.5,125.8,12.6,125.9,11.3,127.1z" fill={isOn ? LAMP_ON : LAMP_OFF} style={{ transition: "fill 0.2s" }}/>
        <path d="M208.8,127.3c-1.7,1.9-1.8,4.3-0.2,6.3c1.2,1.5,1.4,1.5,16.9,1.7c16.8,0.2,18.6-0.1,19.9-2.8c1-2.4,0.9-3.4-0.9-5.1l-1.5-1.6h-16.4C210.3,125.8,210.1,125.8,208.8,127.3z" fill={isOn ? LAMP_ON : LAMP_OFF} style={{ transition: "fill 0.2s" }}/>
        <path d="M40.4,175.4c-7.3,4.2-13.7,8.3-14.4,9.1c-1.5,1.9-1.5,3.3,0.2,5.4c2.3,3,4.2,2.4,18-5.5c6.9-4,13.2-7.8,14.1-8.5c3-2.7,0.7-8.3-3.4-8.2C54.2,167.8,47.6,171.2,40.4,175.4z" fill={isOn ? LAMP_ON : LAMP_OFF} style={{ transition: "fill 0.2s" }}/>
        <path d="M197.9,168.7c-0.7,0.5-1.5,1.7-1.7,2.5c-0.8,3.4,0.3,4.4,14.4,12.6c14.6,8.4,17,9.2,19,6.4c1.2-1.7,1.4-4.4,0.3-5.9c-1.2-1.5-27.7-16.6-29.2-16.6C199.9,167.7,198.7,168.2,197.9,168.7z" fill={isOn ? LAMP_ON : LAMP_OFF} style={{ transition: "fill 0.2s" }}/>
        {/* Эффект свечения при включении */}
        {isOn && (
          <>
            <circle
              cx={128}
              cy={130}
              r={80}
              fill="#ffe06633"
              style={{ transition: "opacity 0.2s" }}
            />
            <circle
              cx={128}
              cy={130}
              r={102}
              fill="#ffe06611"
              style={{ transition: "opacity 0.2s" }}
            />
          </>
        )}
      </g>
  </svg>
  );
}

const LampBulbBath: React.FC = () => {
  const [isOn, setIsOn] = useState(false);
  const [loading, setLoading] = useState(false);

  // Инициализируемся с бэка — берём текущее состояние из /api/home (state.relays.bath)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(apiUrl("/home"));
        if (!r.ok) return;
        const j = await r.json();
        if (j?.relays && typeof j.relays.bath === "boolean") {
          setIsOn(j.relays.bath);
        }
      } catch {}
    })();
  }, []);

  const toggleLamp = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const newState = !isOn;
      const response = await fetch(apiUrl("/relay/send-multiple"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codes: [{ tag: "bath", code: RELAY_CODE, state: newState }]
        })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result?.sent?.[0]?.success) {
        setIsOn(newState);
      } else {
        console.error("Ошибка ответа сервера:", result);
        // можно показать toast/alert при желании
      }
    } catch (error) {
      console.error("Ошибка запроса:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", userSelect: "none" }}>
      <div onClick={toggleLamp} aria-label="toggle bath lamp" role="button">
        <BulbSVG isOn={isOn} />
      </div>
      <span style={{ color: isOn ? LAMP_ON : "#888" }}>Ванная</span>
      <div
        style={{
          marginTop: 12,
          fontSize: 18,
          fontWeight: 600,
          color: isOn ? LAMP_ON : "#888",
          letterSpacing: 1.5,
          textShadow: isOn ? "0 2px 14px #ffe066aa" : undefined,
          transition: "color 0.18s"
        }}
      >
        {loading ? "..." : isOn ? "ВКЛЮЧЕНО" : "ВЫКЛЮЧЕНО"}
      </div>
    </div>
  );
};

export default LampBulbBath;
