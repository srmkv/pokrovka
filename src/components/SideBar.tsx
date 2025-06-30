import { useState } from "react";
import SearchLocation from "./SearchLocation";
import { useYandexWeather } from "../hooks/useYandexWeather";

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
  const conditionRus = weather?.fact?.condition ?? "";
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
  // определяем картинку (оставим Shower если не определено)
  const imgName =
    conditionMap[condition] || "Shower";

  return (
    <div className="flex flex-col min-h-screen bg-darkblue w-full lg:w-1/3 p-7 lg:p-4 xl:p-7 space-y-10 overflow-x-hidden">
      {isOpen ? (
        <SearchLocation onClose={() => setIsOpen(false)} />
      ) : (
        <>
          <div className="relative flex justify-between mb-10">
            <button
              className="static z-10 px-4 py-2 text bg-[#6E707A] hover:bg-[#6E707A]/70 text-gray-150 shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              Search for places
            </button>
            <button className="static z-10 px-4 py-2 text bg-[#6E707A] hover:bg-[#6E707A]/70 text-gray-150 rounded-full shadow-lg">
              <i className="fas fa-map-marker-alt"></i>
            </button>
          </div>

          <div className="relative -mx-36 flex justify-center items-center max-h-40">
            <img
              src="/images/Cloud-background.png"
              alt="bg"
              className="opacity-10 absolute max-w-52"
            />
            <img
              src={`/images/${imgName}.png`}
              alt={conditionRus}
              className="max-h-48"
            />
          </div>
          <div className="flex flex-col items-center text-gray-350 text-lg mt-2 space-y-1">
  <div>💧 Влажность: {weather?.fact?.humidity ?? "--"}%</div>
  <div>🌡 Давление: {weather?.fact?.pressure_mm ?? "--"} мм</div>
  <div>💨 Ветер: {weather?.fact?.wind_speed ?? "--"} м/с, {weather?.fact?.wind_dir ?? ""}</div>
</div>

          <div className="flex flex-col items-center justify-between flex-grow pt-6">
            <h1 className="text-gray-150 text-[144px] font-medium">
              {loading ? "--" : temp}
              <span className="text-5xl text-gray-250">&deg;C</span>
            </h1>
            <h3 className="font-semibold text-4xl text-gray-250">
              {loading ? "Загрузка..." : conditionRus}
            </h3>
            <div className="flex flex-col items-center text-center text-gray-350 text-lg space-y-5">
              <p>Сегодня &bull; {dateString}</p>
              
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default SideBar;
