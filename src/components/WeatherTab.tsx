// WeatherTab.tsx
import React from "react";
import { useYandexWeather } from "../hooks/useYandexWeather";
import LargeCard from "./LargeCard";
import SmallCard from "./SmallCard";
import WeatherClock from "./WeatherClock";
import { WeatherIconMap } from "./WeatherIconMap"; // путь свой!
import { conditionMap } from "../components/conditionMap"; // путь свой!

const getDayTitle = (dateStr: string, idx: number) => {
  if (idx === 0) return "Сегодня";
  if (idx === 1) return "Завтра";
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const d = new Date(dateStr);
  return `${days[d.getDay()]}, ${d.getDate()} ${d.toLocaleString("ru", { month: "short" })}`;
};

const WeatherTab: React.FC = () => {
  const { weather, loading } = useYandexWeather();

  // Для почасового прогноза (condition — raw от Яндекса)
  const todayHours = weather?.forecasts?.[0]?.hours
    ? weather.forecasts[0].hours.map((h: any) => ({
        hour: h.hour,
        temp: h.temp,
        condition: h.condition, // важно: raw-строка, например "clear" или "light-rain"
      }))
    : [];

  // Для недельного прогноза — day.parts.day.condition всегда raw
  const getIconSrc = (condition: string) => {
    const iconKey = conditionMap[condition] || "Shower";
    return WeatherIconMap[iconKey] || WeatherIconMap["Shower"];
  };

  return (
    <div className="w-full">
      {/* Прогноз на неделю — горизонтальный скролл */}
      <div className="w-full mt-2 mb-10 overflow-x-auto">
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
                  img={getIconSrc(day.parts.day.condition)}
                  max={day.parts.day.temp_max}
                  min={day.parts.day.temp_min}
                  temp="C"
                />
              </div>
            ))}
        </div>
      </div>

      {/* Погодные показатели */}
      <div className="my-10">
        <h3 className="text-2xl font-bold mb-5">Погодные показатели</h3>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Левая половина — WeatherClock */}
          <div className="flex-1 flex justify-center items-center mb-8 lg:mb-0">
            <WeatherClock hours={todayHours} />
          </div>
          {/* Правая половина — LargeCards */}
          <div className="flex-1 grid grid-cols-1 gap-5 lg:grid-cols-2">
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
    </div>
  );
};

export default WeatherTab;
