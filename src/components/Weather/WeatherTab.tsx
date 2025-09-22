// src/components/Weather/WeatherTab.tsx
import React, { useMemo } from "react";
import { useOpenMeteo } from "../../hooks/useOpenMeteo";
import LargeCard from "../LargeCard";
import SmallCard from "../SmallCard";
import { iconByWmo } from "./WeatherIconMap";
import SunProgressCard from "./SunCycleCard";

// Нижний Новгород
const LAT = 56.3269;
const LON = 44.0075;

// helpers
const hpaToMm = (hpa?: number | null) =>
  hpa == null ? null : hpa * 0.750061683;

const toCardinalRu = (deg?: number | null) => {
  if (deg == null || isNaN(deg)) return "";
  const dirs = ["С","ССВ","СВ","ВСВ","В","ВЮВ","ЮВ","ЮЮВ","Ю","ЮЮЗ","ЮЗ","ЗЮЗ","З","ЗСЗ","СЗ","ССЗ","С"];
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[idx];
};

const getDayTitle = (isoDate: string, idx: number) => {
  const d = new Date(`${isoDate}T00:00:00`);
  const days = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
  if (idx === 0) return "Сегодня";
  if (idx === 1) return "Завтра";
  return `${days[d.getDay()]}, ${d.getDate()} ${d.toLocaleString("ru", { month: "short" })}`;
};

const WeatherTab: React.FC = () => {
  const { hourly, daily, loading, error } = useOpenMeteo(LAT, LON, 48, 7);

  // === Фактические показатели «сейчас» ===
  const now = useMemo(() => {
    // A) hourly — массив точек
    if (Array.isArray(hourly) && hourly.length) {
      type Pt = {
        time?: string; iso?: string; datetime?: string;
        tC?: number | null; apparentTC?: number | null;
        windMs?: number | null; windDirDeg?: number | null;
        rh?: number | null; pressureHpa?: number | null;
        pressureMslHpa?: number | null; visibilityM?: number | null;
      };
      const getMs = (p: Pt) => {
        const s = p.time || p.iso || p.datetime;
        const d = s ? new Date(s) : null;
        return d && isFinite(d.getTime()) ? d.getTime() : Number.POSITIVE_INFINITY;
      };
      const idx = hourly.reduce<{ i: number; diff: number }>(
        (acc, p: any, i: number) => {
          const diff = Math.abs(getMs(p) - Date.now());
          return diff < acc.diff ? { i, diff } : acc;
        },
        { i: 0, diff: Number.POSITIVE_INFINITY }
      ).i;

      const p = hourly[idx] as Pt;

      const windMs = p.windMs == null ? 0 : +Number(p.windMs).toFixed(1);
      const windDirDeg = p.windDirDeg == null ? null : Number(p.windDirDeg);
      const humidity = p.rh == null ? 0 : Math.round(Number(p.rh));
      const pressureHpa = p.pressureHpa ?? p.pressureMslHpa ?? null;
      const pressureMm = pressureHpa == null ? 0 : Math.round(hpaToMm(Number(pressureHpa))!);
      const visibility = p.visibilityM == null ? 0 : Math.round(Number(p.visibilityM));
      const tempC = p.tC == null ? 0 : Math.round(Number(p.tC));
      const feelsC = p.apparentTC == null ? null : Math.round(Number(p.apparentTC));

      return { windMs, windDirDeg, humidity, pressureMm, visibility, tempC, feelsC };
    }

    // B) hourly — объект с массивами
    const H: any = hourly || {};
    const pick = (arr?: (number | null)[]) => {
      if (!H.time?.length || !arr?.length) return null;
      const iso = H.nowIso ?? H.time[0];
      const i = H.time.indexOf(iso);
      if (i < 0) return arr[0] ?? null;
      return arr[i] ?? null;
    };

    const windMs = pick(H.windMs);
    const windDirDeg = pick(H.windDirDeg);
    const humidity = pick(H.rh);
    const pressureHpa = pick(H.pressureHpa) ?? pick(H.pressureMslHpa);
    const visibility = pick(H.visibilityM);
    const tempC = pick(H.tC);
    const feelsC = pick(H.apparentTC);

    return {
      windMs: windMs == null ? 0 : +Number(windMs).toFixed(1),
      windDirDeg: windDirDeg == null ? null : Number(windDirDeg),
      humidity: humidity == null ? 0 : Math.round(Number(humidity)),
      pressureMm: pressureHpa == null ? 0 : Math.round(hpaToMm(Number(pressureHpa))!),
      visibility: visibility == null ? 0 : Math.round(Number(visibility)),
      tempC: tempC == null ? 0 : Math.round(Number(tempC)),
      feelsC: feelsC == null ? null : Math.round(Number(feelsC)),
    };
  }, [hourly]);

  // Восход/Закат (если useOpenMeteo добавляет их в daily)
  const rise = daily?.[0]?.sunrise ?? null;
  const set  = daily?.[0]?.sunset  ?? null;

  // Видимость: км с 1 знаком после запятой, если >= 5000 м
  const visibilityNum =
    now.visibility >= 5000 ? +(now.visibility / 1000).toFixed(1) : now.visibility;
  const visibilityUnit = now.visibility >= 5000 ? " км" : " м";

  return (
    <div className="w-full">
      {/* Прогноз на неделю */}
      <div className="w-full mt-2 mb-10 overflow-x-auto">
        <div className="flex gap-6 min-w-max px-2">
          {loading && (
            <div className="flex justify-center items-center w-full h-32">
              Загрузка прогноза…
            </div>
          )}
          {error && !loading && (
            <div className="flex justify-center items-center w-full h-32 text-red-400">
              Не удалось получить данные погоды
            </div>
          )}
          {!loading &&
            !error &&
            (daily ?? []).slice(0, 7).map((d: any, idx: number) => {
              const icon = `/images/${iconByWmo(d.wcode)}`;
              const tMax = d.tMaxC == null ? 0 : Math.round(d.tMaxC);
              const tMin = d.tMinC == null ? 0 : Math.round(d.tMinC);
              return (
                <div key={d.date} className="flex-shrink-0" style={{ minWidth: 140 }}>
                  <SmallCard
                    dayTitle={getDayTitle(d.date, idx)}
                    img={icon}
                    max={tMax}
                    min={tMin}
                    temp="C"
                  />
                </div>
              );
            })}
        </div>
      </div>

      {/* Погодные показатели */}
      <div className="my-10">
        <h3 className="text-2xl font-bold mb-5">Погодные показатели</h3>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Левая половина — карточки: Ощущается как + Восход/Закат */}
          <div className="flex-1 grid grid-cols-1 gap-5 auto-rows-[1fr]">
            <LargeCard className="h-full" title="Ощущается как" num={(now.feelsC ?? now.tempC ?? 0)} desc="°C" />
            <div className="h-full">
              {rise || set ? (
                <SunProgressCard sunrise={rise} sunset={set} />
              ) : (
                <div className="bg-[#22243c] rounded-xl p-5 text-gray-350 h-full flex items-center justify-center">
                  Данные о восходе/закате недоступны
                </div>
              )}
            </div>
          </div>

          {/* Правая половина — метрики (равная высота строк) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 auto-rows-[1fr]">
            <LargeCard className="h-full" title="Ветер" num={now.windMs ?? 0} desc="м/с">
              <div className="flex justify-between space-x-5 items-center">
                <div className="bg-gray-500 rounded-full w-[30px] h-[30px] flex justify-center items-center">
                  <i className="fas fa-location-arrow" />
                </div>
                <p className="text-gray-150 text-sm">{toCardinalRu(now.windDirDeg) || ""}</p>
              </div>
            </LargeCard>

            <LargeCard className="h-full" title="Влажность" num={now.humidity ?? 0} desc="%">
              <div className="self-stretch text-gray-250 text-xs space-y-1">
                <div className="flex justify-between space-x-5 items-center px-1">
                  <p>0</p><p>50</p><p>100</p>
                </div>
                <div className="w-full h-2 bg-gray-150 rounded-full overflow-hidden">
                  <div className="bg-[#FFEC65] h-2" style={{ width: `${now.humidity ?? 0}%` }} />
                </div>
                <p className="text-right">%</p>
              </div>
            </LargeCard>

            <LargeCard className="h-full" title="Видимость" num={visibilityNum ?? 0} desc={visibilityUnit} />

            <LargeCard className="h-full" title="Давление" num={now.pressureMm ?? 0} desc=" мм" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherTab;
