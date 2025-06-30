import { useState } from "react";
import SearchLocation from "./SearchLocation";
import { useYandexWeather } from "../hooks/useYandexWeather";

const yandexConditionRu: Record<string, string> = {
  "clear": "Ясно",
  "partly-cloudy": "Малооблачно",
  "cloudy": "Облачно",
  "overcast": "Пасмурно",
  "light-rain": "Небольшой дождь",
  "rain": "Дождь",
  "moderate-rain": "Умеренный дождь",
  "heavy-rain": "Сильный дождь",
  "continuous-heavy-rain": "Длительный сильный дождь",
  "showers": "Ливень",
  "wet-snow": "Дождь со снегом",
  "light-snow": "Небольшой снег",
  "snow": "Снег",
  "snow-showers": "Снегопад",
  "hail": "Град",
  "thunderstorm": "Гроза",
  "thunderstorm-with-rain": "Гроза с дождём",
  "thunderstorm-with-hail": "Гроза с градом",
};

const conditionMap: Record<string, string> = {
  clear: "Clear",
  partly_cloudy: "LightCloud",
  cloudy: "HeavyCloud",
  overcast: "HeavyCloud",
  drizzle: "LightRain",
  light_rain: "LightRain",
  rain: "Shower",
  moderate_rain: "Shower",
  heavy_rain: "HeavyRain",
  continuous_heavy_rain: "HeavyRain",
  showers: "Shower",
  wet_snow: "Sleet",
  light_snow: "Snow",
  snow: "Snow",
  snow_showers: "Snow",
  hail: "Hail",
  thunderstorm: "Thunderstorm",
  thunderstorm_with_rain: "Thunderstorm",
  thunderstorm_with_hail: "Thunderstorm",
};

const SideBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { weather, loading } = useYandexWeather();

  const temp = weather?.fact?.temp ?? "--";
  const condition = weather?.fact?.condition ?? "";
const conditionRaw = weather?.fact?.condition ?? "";
const conditionRus = yandexConditionRu[conditionRaw] || "—";


  const city =
    weather?.geo_object?.locality?.name ||
    weather?.geo_object?.province?.name ||
    weather?.geo_object?.country?.name ||
    "—";
  const street =
    weather?.geo_object?.street?.name ?? "";
  const date = new Date(weather?.now * 1000 || Date.now());
  const dateString = date.toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  // определяем картинку (оставим Shower если не определено)
  const imgName = conditionMap[condition] || "Shower";

  return (
    <div
      className="
        flex flex-col
        h-screen min-h-screen
        bg-darkblue
        w-full lg:w-1/3
        p-7 lg:p-4 xl:p-7
        space-y-8
        overflow-x-hidden
        transition-all
        duration-300
      "
      style={{
        minWidth: 320,
        maxWidth: 430,
      }}
    >
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
            <img
              src={`/images/${imgName}.png`}
              alt={conditionRus}
              className="max-h-48"
            />
          </div>

          {/* Показатели */}
          <div className="flex flex-col items-center text-gray-350 text-lg mt-2 space-y-1">
            <div>💧 Влажность: {weather?.fact?.humidity ?? "--"}%</div>
            <div>🌡 Давление: {weather?.fact?.pressure_mm ?? "--"} мм</div>
            <div>
              💨 Ветер: {weather?.fact?.wind_speed ?? "--"} м/с,{" "}
              {weather?.fact?.wind_dir ?? ""}
            </div>
          </div>

          <div className="flex flex-col items-center justify-between flex-grow pt-4 pb-3">
            <h1 className="text-gray-150 font-medium text-[110px] md:text-[144px] leading-none transition-all duration-200">
              {loading ? "--" : temp}
              <span className="text-4xl md:text-5xl text-gray-250 align-top">&deg;C</span>
            </h1>
            <h3 className="font-semibold text-4xl text-gray-250 mb-2">
              {loading ? "Загрузка..." : conditionRus}
            </h3>
            <div className="flex flex-col items-center text-center text-gray-350 text-lg space-y-2">
              <p>Сегодня &bull; {dateString}</p>
              <p>
                <i className="fas fa-map-marker-alt"></i>{" "}
                {street ? `${street}, ` : ""}
                {city}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SideBar;
