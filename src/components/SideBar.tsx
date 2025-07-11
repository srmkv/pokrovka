import { useState } from "react";
import SearchLocation from "./SearchLocation";
import { useYandexWeather } from "../hooks/useYandexWeather";
import WeatherIcon from "./Weather/WeatherIcon";
import WeatherFactIndicators from "./Weather/WeatherFactIndicators";
import { conditionMap } from "./Weather/conditionMap";
import { yandexConditionRu } from "./Weather/yandexConditionRu"; // Можно вынести в отдельный файл



const SideBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { weather, loading } = useYandexWeather();

  const temp = weather?.fact?.temp ?? "--";
  const conditionRaw = weather?.fact?.condition ?? "";
  const conditionRus = yandexConditionRu[conditionRaw] || "—";
  const iconName = conditionMap[conditionRaw] || "Shower";

  const city =
    weather?.geo_object?.locality?.name ||
    weather?.geo_object?.province?.name ||
    weather?.geo_object?.country?.name ||
    "—";
  
  const date = new Date(weather?.now * 1000 || Date.now());
  const dateString = date.toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex flex-col h-screen min-h-screen bg-darkblue w-full lg:w-1/3 p-7 lg:p-4 xl:p-7 space-y-8 overflow-x-hidden transition-all duration-300" style={{ minWidth: 320, maxWidth: 430 }}>
      {isOpen ? (
        <SearchLocation onClose={() => setIsOpen(false)} />
      ) : (
        <>
          <div className="relative -mx-24 flex justify-center items-center max-h-40 mb-2">
            <img
              src="/images/Cloud-background.png"
              alt="bg"
              className="opacity-10 absolute max-w-52 select-none pointer-events-none"
            />
            <WeatherIcon iconName={iconName} width={200} hight={144} alt={conditionRus} className="max-h-48 relative z-10" />
          </div>
          {/* Показатели */}
          <WeatherFactIndicators
            humidity={weather?.fact?.humidity}
            pressure_mm={weather?.fact?.pressure_mm}
            wind_speed={weather?.fact?.wind_speed}
            wind_dir={weather?.fact?.wind_dir}
          />
         <div className="flex flex-col items-center justify-between flex-grow pt-4 pb-3">
  <h1 className="text-gray-150 font-medium text-[110px] md:text-[144px] leading-none transition-all duration-200">
    {loading ? "--" : temp}
    <span className="text-4xl md:text-5xl text-gray-250 align-top">&deg;C</span>
  </h1>
  {/* ОЩУЩАЕТСЯ КАК */}
  {weather?.fact?.feels_like !== undefined && (
    <div className="text-gray-350 text-2xl mt-[-18px] mb-2 flex items-center gap-2">
      
      <span>Ощущается как</span>
      <span className="font-semibold ml-1">{weather.fact.feels_like}&deg;C</span>
    </div>
  )}
  <h3 className="font-semibold text-2xl text-gray-250 mb-2">
    {loading ? "Загрузка..." : conditionRus}
  </h3>
  <div className="flex flex-col items-center text-center text-gray-350 text-lg space-y-2">
    <p>Сегодня &bull; {dateString}</p>
    <span className="addr">
      <i className="fas fa-map-marker-alt"></i>{" "}
      Б.Покровская д. 80, 1й подьезд, 7й этаж
    </span>
    <span className="addr">
      Почтовый индекс: 606-300
    </span>
  </div>

</div>

        </>
      )}
    </div>
  );
};

export default SideBar;
