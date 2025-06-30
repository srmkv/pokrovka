import { useEffect, useState } from "react";

const API_KEY = "2b4fd247-0a59-4930-8ab1-0174e1f642ad";
const DEFAULT_LAT = 56.325905;
const DEFAULT_LON = 44.005430;

export function useYandexWeather(lat = DEFAULT_LAT, lon = DEFAULT_LON) {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(
      `https://api.weather.yandex.ru/v2/forecast?lat=${lat}&lon=${lon}&lang=ru_RU`,
      {
        headers: { "X-Yandex-Weather-Key": API_KEY },
      }
    )
      .then((res) => res.json())
      .then((json) => setWeather(json))
      .finally(() => setLoading(false));
  }, [lat, lon]);

  return { weather, loading };
}
