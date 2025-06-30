import React from "react";
import { useYandexWeather } from "../hooks/useYandexWeather";
import LargeCard from "./LargeCard";
import SmallCard from "./SmallCard";
import LightSlider from "./LightSlider";
import BlindsControl from "./BlindsControl";

type WeatherIcon =
  | "Shower"
  | "Clear"
  | "LightCloud"
  | "HeavyCloud"
  | "LightRain"
  | "HeavyRain"
  | "Sleet"
  | "Snow"
  | "Hail"
  | "Thunderstorm";

const yandexToIcon = (condition: string): WeatherIcon => {
  const map: Record<string, WeatherIcon> = {
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

const getDayTitle = (dateStr: string, idx: number) => {
  if (idx === 0) return "Сегодня";
  if (idx === 1) return "Завтра";
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const d = new Date(dateStr);
  return `${days[d.getDay()]}, ${d.getDate()} ${d.toLocaleString("ru", { month: "short" })}`;
};

const MainContent = () => {
  const { weather, loading } = useYandexWeather();

  return (
    <div className="text-gray-150 p-10 flex-grow">
      {/* Кнопки C/F */}
      <div className="space-x-3 text-right">
        <button className="bg-gray-150 rounded-full w-10 h-10 text-darkblue font-bold text-xl">
          &deg;C
        </button>
        <button className="bg-[#585676] rounded-full w-10 h-10 text-gray-150 font-bold text-xl">
          &deg;F
        </button>
      </div>

      {/* Прогноз на неделю — горизонтальный скролл */}
      <div className="w-full mt-5 mb-10 overflow-x-auto">
        <div className="flex gap-6 min-w-max px-2">
          {loading && (
            <div className="flex justify-center items-center w-full h-32">
              Загрузка прогноза...
            </div>
          )}
          {!loading &&
            weather?.forecasts?.slice(0, 7).map((day: any, idx: number) => (
              <div key={day.date} className="flex-shrink-0" style={{ minWidth: 140 }}>
                <SmallCard
                  dayTitle={getDayTitle(day.date, idx)}
                  img={yandexToIcon(day.parts.day.condition)}
                  max={day.parts.day.temp_max}
                  min={day.parts.day.temp_min}
                  temp="C"
                />
              </div>
            ))}
        </div>
      </div>

      {/* Домашние виджеты */}
      <div className="my-10">
        <h3 className="text-2xl font-bold mb-5">Управление умным домом</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 justify-center">
          <LightSlider />
          <BlindsControl />
        </div>
      </div>

      {/* Сегодняшние погодные показатели */}
      <div className="my-10">
        <h3 className="text-2xl font-bold mb-5">Погодные показатели</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 justify-center">
          <LargeCard
            title="Ветер"
            num={weather?.fact?.wind_speed ?? 0}
            desc="м/с"
          >
            <div className="flex justify-between space-x-5 items-center">
              <div className="bg-gray-500 rounded-full w-[30px] h-[30px] flex justify-center items-center">
                <i className="fas fa-location-arrow"></i>
              </div>
              <p className="text-gray-150 text-sm">
                {weather?.fact?.wind_dir?.toUpperCase() ?? ""}
              </p>
            </div>
          </LargeCard>

          <LargeCard
            title="Влажность"
            num={weather?.fact?.humidity ?? 0}
            desc="%"
          >
            <div className="self-stretch text-gray-250 text-xs space-y-1">
              <div className="flex justify-between space-x-5 items-center px-1">
                <p>0</p>
                <p>50</p>
                <p>100</p>
              </div>
              <div className="w-full h-2 bg-gray-150 rounded-full overflow-hidden">
                <div
                  className="bg-[#FFEC65] h-2"
                  style={{
                    width: `${weather?.fact?.humidity ?? 0}%`,
                  }}
                ></div>
              </div>
              <p className="text-right">%</p>
            </div>
          </LargeCard>

          <LargeCard
            title="Видимость"
            num={weather?.fact?.visibility ?? 0}
            desc=" м"
          />

          <LargeCard
            title="Давление"
            num={weather?.fact?.pressure_mm ?? 0}
            desc=" мм"
          />
        </div>
      </div>
    </div>
  );
};

export default MainContent;
