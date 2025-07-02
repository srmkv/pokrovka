import { useState, useEffect } from "react";

// Тип для зоны: living (прихожая) или bath (ванная)
type Zone = "living" | "bath";

interface FloorState {
  on: boolean;
  temp: number;
  currentTemp: number;
  loading: boolean;
  setTemp: (t: number) => void;
  setOn: (value: boolean) => void;
  reload: () => void;
}

export function useFloorHeating(zone: Zone): FloorState {
  const [on, setOnLocal] = useState(false);
  const [temp, setTempLocal] = useState(24);
  const [currentTemp, setCurrentTemp] = useState(24);
  const [loading, setLoading] = useState(false);

  const API_HOST = process.env.REACT_APP_API_HOST || "http://localhost";
  const API_PORT = process.env.REACT_APP_API_PORT || "3010";
  const apiUrl = `${API_HOST}:${API_PORT}/api/floor/${zone}`;

  // Получаем состояние с сервера
  const reload = () => {
    setLoading(true);
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        setOnLocal(data.on ?? false);
        setTempLocal(data.temp ?? 24);
        setCurrentTemp(data.currentTemp ?? data.temp ?? 24);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line
  }, [zone]);

  // Установка температуры
  const setTemp = (newTemp: number) => {
    setLoading(true);
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on, temp: newTemp }),
    })
      .then(res => res.json())
      .then(data => {
        setTempLocal(data.temp ?? newTemp);
        setCurrentTemp(data.currentTemp ?? data.temp ?? newTemp);
      })
      .finally(() => setLoading(false));
  };

  // Вкл/выкл
  const setOn = (value: boolean) => {
    setLoading(true);
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on: value, temp }),
    })
      .then(res => res.json())
      .then(data => {
        setOnLocal(data.on ?? value);
      })
      .finally(() => setLoading(false));
  };

  return { on, temp, currentTemp, loading, setTemp, setOn, reload };
}
