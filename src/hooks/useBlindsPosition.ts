// src/hooks/useBlindsPosition.ts
import { useState, useEffect } from "react";

type Zone = "kitchen" | "room" | "holl";

export function useBlindsPosition(zone: Zone) {
  const [position, setPositionState] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Сборка URL
  const API_HOST = process.env.REACT_APP_API_HOST || "http://localhost";
  const API_PORT = process.env.REACT_APP_API_PORT || "3010";
  const API_BASE = process.env.REACT_APP_API_BASE || "/api";
  const apiUrl = `${API_HOST}:${API_PORT}${API_BASE}/blinds/${zone}`;

  // polling состояния с сервера
  useEffect(() => {
    let ignore = false;
    function fetchState() {
      fetch(apiUrl)
        .then(res => res.json())
        .then(data => {
          if (!ignore && typeof data.position === "number") {
            setPositionState(data.position);
          }
        })
        .catch(() => {});
    }
    fetchState();
    const interval = setInterval(fetchState, 4000);
    return () => { ignore = true; clearInterval(interval); };
  }, [apiUrl]);

  // установка жалюзи
  const setBlinds = async (next: number) => {
    setLoading(true);
    try {
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: next }),
      });
      const json = await resp.json();
      if (typeof json.position === "number") setPositionState(json.position);
    } catch (e) {
      // можно показать ошибку
    }
    setTimeout(() => setLoading(false), 500);
  };

  return { position, setBlinds, loading };
}
