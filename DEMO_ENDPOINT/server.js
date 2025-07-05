const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch"); // npm install node-fetch@2
const app = express();
const PORT = 3010;

// --- Настройки Arduino ---
const ARDUINO_IP = "192.168.0.115"; // IP твоей Arduino
const ARDUINO_PORT = 80;

// --- Вспомогательная функция для отправки команд на Arduino ---
async function sendToArduino(cmd) {
  try {
    const url = `http://${ARDUINO_IP}:${ARDUINO_PORT}/${cmd}`;
    const resp = await fetch(url, { timeout: 1000 });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    return await resp.text();
  } catch (e) {
    console.error("Ошибка связи с Arduino:", e.message);
    return null;
  }
}

// --- Путь к json-файлу состояния ---
const STATE_PATH = path.join(__dirname, "state.json");

// --- Стартовое состояние ---
let state = {
  leakSensor: "dry", lastLeak: null,
  washingMachineSensor: "leak", lastLeakWashing: null,
  dishwasherSensor: "dry", lastLeakDishwasher: null,
  kitchenSensor: "dry", lastLeakKitchen: null,
  blinds: { kitchen: 0, room: 0, holl: 0 },
  light: { brightness: 80, effect: "off" },
  floor: {
    living: { on: true, temp: 26 },
    bath: { on: false, temp: 24 }
  }
};

// --- Загрузка состояния из файла при запуске ---
function loadState() {
  if (fs.existsSync(STATE_PATH)) {
    try {
      const data = fs.readFileSync(STATE_PATH, "utf8");
      state = { ...state, ...JSON.parse(data) };
      console.log("Состояние загружено из файла.");
    } catch (e) {
      console.warn("Ошибка чтения state.json:", e);
    }
  }
}

// --- Сохранение состояния в файл ---
function saveState() {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (e) {
    console.warn("Ошибка сохранения state.json:", e);
  }
}

// --- Leak sensors time logic ---
function updateLeakTimes() {
  if (state.leakSensor === "leak" && !state.lastLeak) state.lastLeak = new Date().toISOString();
  if (state.leakSensor !== "leak") state.lastLeak = null;

  if (state.washingMachineSensor === "leak" && !state.lastLeakWashing) state.lastLeakWashing = new Date().toISOString();
  if (state.washingMachineSensor !== "leak") state.lastLeakWashing = null;

  if (state.dishwasherSensor === "leak" && !state.lastLeakDishwasher) state.lastLeakDishwasher = new Date().toISOString();
  if (state.dishwasherSensor !== "leak") state.lastLeakDishwasher = null;

  if (state.kitchenSensor === "leak" && !state.lastLeakKitchen) state.lastLeakKitchen = new Date().toISOString();
  if (state.kitchenSensor !== "leak") state.lastLeakKitchen = null;
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Загрузка состояния при запуске ---
loadState();

// --- Главный endpoint: всё разом ---
app.get("/api/home", (req, res) => {
  updateLeakTimes();
  res.json(state);
});

// --- Leak sensors по отдельности ---
[
  { sensor: "bathroom", key: "leakSensor", lastKey: "lastLeak" },
  { sensor: "washing-machine", key: "washingMachineSensor", lastKey: "lastLeakWashing" },
  { sensor: "dishwasher", key: "dishwasherSensor", lastKey: "lastLeakDishwasher" },
  { sensor: "kitchen", key: "kitchenSensor", lastKey: "lastLeakKitchen" }
].forEach(({ sensor, key, lastKey }) => {
  app.get(`/api/${sensor}`, (req, res) => {
    updateLeakTimes();
    res.json({ [key]: state[key], [lastKey]: state[lastKey] });
  });
  app.post(`/api/${sensor}`, (req, res) => {
    const { status } = req.body;
    if (!["dry", "leak", "unknown"].includes(status)) return res.status(400).json({ error: "Bad status" });
    state[key] = status;
    updateLeakTimes();
    saveState();
    res.json({ [key]: state[key], [lastKey]: state[lastKey] });
  });
});

// --- Жалюзи ---
["kitchen", "room", "holl"].forEach(zone => {
  app.get(`/api/blinds/${zone}`, (req, res) => {
    res.json({ position: state.blinds[zone] });
  });
  app.post(`/api/blinds/${zone}`, (req, res) => {
    let { position } = req.body;
    if (typeof position !== "number" || position < 0 || position > 100)
      return res.status(400).json({ error: "Bad position" });
    state.blinds[zone] = Math.round(position);
    res.json({ position: state.blinds[zone] });
  });
});


// --- Свет (яркость) ---
app.get("/api/light/slider", (req, res) => {
  res.json({ brightness: state.light.brightness });
});

app.post("/api/light/slider", async (req, res) => {
  const { brightness } = req.body;
  if (typeof brightness !== "number" || brightness < 0 || brightness > 100)
    return res.status(400).json({ error: "Bad brightness" });
  state.light.brightness = brightness;
  saveState();
  const arduinoResp = await sendToArduino(`brightness?val=${brightness}`);
  if (arduinoResp === null) {
    return res.status(502).json({ error: "Не удалось связаться с Arduino" });
  }
  res.json({ brightness: state.light.brightness });
});

// --- Свет (цвет) ---
app.post("/api/light/color", async (req, res) => {
  const { r, g, b } = req.body;
  if (
    typeof r !== "number" || r < 0 || r > 255 ||
    typeof g !== "number" || g < 0 || g > 255 ||
    typeof b !== "number" || b < 0 || b > 255
  ) {
    return res.status(400).json({ error: "Bad color" });
  }
  // Можно добавить: state.light.color = {r,g,b}; saveState();
  const arduinoResp = await sendToArduino(`color?r=${r}&g=${g}&b=${b}`);
  if (arduinoResp === null) {
    return res.status(502).json({ error: "Не удалось связаться с Arduino" });
  }
  res.json({ r, g, b });
});
// --- Свет (эффекты, интеграция с Arduino) ---
const EFFECT_MAP = {
  off: "off",             // Выключить
  on: "on",               // Включить
  fire: "fire",           // Огонь
  firebounce: "firebounce", // Туда-обратно
  default: "default",     // Эффект по умолчанию
  fade: "fade",           // Затухание
  relay: "relay"          // Реле
};

app.get("/api/light/effects", (req, res) => {
  res.json({ effect: state.light.effect });
});

app.post("/api/light/effects", async (req, res) => {
  const { effect } = req.body;
  if (!(effect in EFFECT_MAP))
    return res.status(400).json({ error: "Bad effect" });

  state.light.effect = effect;
  saveState();

  // Отправляем команду на Arduino
  const arduinoResp = await sendToArduino(EFFECT_MAP[effect]);
  if (arduinoResp === null) {
    return res.status(502).json({ error: "Не удалось связаться с Arduino" });
  }

  res.json({ effect: state.light.effect });
});

// --- Тёплый пол ---
["living", "bath"].forEach(room => {
  app.get(`/api/floor/${room}`, (req, res) => {
    res.json(state.floor[room]);
  });
  app.post(`/api/floor/${room}`, (req, res) => {
    const { on, temp } = req.body;
    if (typeof on !== "boolean" || typeof temp !== "number")
      return res.status(400).json({ error: "Bad payload" });
    state.floor[room] = { on, temp };
    saveState();
    res.json(state.floor[room]);
  });
});

// --- Старт сервера ---
app.listen(PORT, () => {
  console.log(`API started on http://localhost:${PORT}`);
});
