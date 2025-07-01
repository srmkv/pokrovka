const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3010;

// Путь к json-файлу состояния
const STATE_PATH = path.join(__dirname, "state.json");

// --- Default in-memory state ---
let state = {
  leakSensor: "dry", lastLeak: null,
  washingMachineSensor: "leak", lastLeakWashing: null,
  dishwasherSensor: "dry", lastLeakDishwasher: null,
  kitchenSensor: "dry", lastLeakKitchen: null,
  blinds: {
    kitchen: "closed", room: "open", holl: "half"
  },
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

// --- Load state at startup ---
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
    saveState(); // --- Сохраняем!
    res.json({ [key]: state[key], [lastKey]: state[lastKey] });
  });
});

// --- Жалюзи ---
state.blinds = {
  kitchen: 0,   // 0 — open, 100 — closed, 50 — half
  room: 0,
  holl: 0
};

// ... endpoint для получения позиции жалюзи
["kitchen", "room", "holl"].forEach(zone => {
  app.get(`/api/blinds/${zone}`, (req, res) => {
    res.json({ position: state.blinds[zone] }); // now number
  });
  app.post(`/api/blinds/${zone}`, (req, res) => {
    // ожидаем { position: number }
    let { position } = req.body;
    if (typeof position !== "number" || position < 0 || position > 100)
      return res.status(400).json({ error: "Bad position" });
    state.blinds[zone] = Math.round(position);
    res.json({ position: state.blinds[zone] });
  });
});

// --- Свет ---
app.get("/api/light/slider", (req, res) => {
  res.json({ brightness: state.light.brightness });
});
app.post("/api/light/slider", (req, res) => {
  const { brightness } = req.body;
  if (typeof brightness !== "number" || brightness < 0 || brightness > 100)
    return res.status(400).json({ error: "Bad brightness" });
  state.light.brightness = brightness;
  saveState();
  res.json({ brightness: state.light.brightness });
});
app.get("/api/light/effects", (req, res) => {
  res.json({ effect: state.light.effect });
});
app.post("/api/light/effects", (req, res) => {
  const { effect } = req.body;
  if (!["off", "rainbow", "fire"].includes(effect))
    return res.status(400).json({ error: "Bad effect" });
  state.light.effect = effect;
  saveState();
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

app.listen(PORT, () => {
  console.log(`API started on http://localhost:${PORT}`);
});
