import React from "react";

interface WeekForecastProps {
  forecasts: any[];
}

const yandexToIcon = (condition: string) => {
  const map: Record<string, string> = {
    "clear": "Clear",
    "partly-cloudy": "LightCloud",
    "cloudy": "HeavyCloud",
    "overcast": "HeavyCloud",
    "drizzle": "LightRain",
    "light-rain": "LightRain",
    "rain": "Shower",
    "moderate-rain": "Shower",
    "heavy-rain": "HeavyRain",
    "continuous-heavy-rain": "HeavyRain",
    "showers": "Shower",
    "wet-snow": "Sleet",
    "light-snow": "Snow",
    "snow": "Snow",
    "snow-showers": "Snow",
    "hail": "Hail",
    "thunderstorm": "Thunderstorm",
    "thunderstorm-with-rain": "Thunderstorm",
    "thunderstorm-with-hail": "Thunderstorm",
  };
  return map[condition] || "Shower";
};

const getDayOfWeek = (date: string) => {
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const d = new Date(date);
  return days[d.getDay()];
};

const WeekForecast: React.FC<WeekForecastProps> = ({ forecasts }) => (
  <div className="bg-darkblue rounded-xl p-5 mt-8">
    <h3 className="text-xl font-bold text-gray-150 mb-3">Прогноз на неделю</h3>
    {/* Важно: flex + overflow-x-auto */}
    <div className="flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
      {forecasts.map((day, i) => (
        <div
          key={day.date}
          className="flex-shrink-0 flex flex-col items-center bg-[#22243c] rounded-lg py-4 px-4 min-w-[100px] max-w-[120px]"
          style={{ width: 110 }}
        >
          <span className="font-semibold text-gray-150">
            {i === 0 ? "Сегодня" : getDayOfWeek(day.date)}
          </span>
          <img
            src={`/images/${yandexToIcon(day.parts.day.condition)}.png`}
            alt={day.parts.day.condition}
            className="max-h-10 my-2"
          />
          <span className="text-lg text-gray-150">
            {day.parts.day.temp_max}&deg; / {day.parts.day.temp_min}&deg;
          </span>
          <span className="text-xs text-gray-350">{day.parts.day.condition}</span>
        </div>
      ))}
    </div>
  </div>
);

export default WeekForecast;
