const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3010;

app.use(cors());

function randomState() {
  const r = Math.random();
  if (r < 0.1) return "unknown"; // 10% нет связи
  if (r < 0.2) return "leak";    // 10% протечка
  return "dry";                  // 80% всё нормально
}

// "Память" времени последней протечки для каждого датчика
let lastLeak = null;
let lastLeakWashing = null;
let lastLeakKitchen = null;
let lastLeakDishwasher = null;

// Главный эндпоинт — сразу все датчики
app.get("/api/home", (req, res) => {
  const leakSensor = randomState();
  const washingMachineSensor = randomState();
  const kitchenSensor = randomState();
  const dishwasherSensor = randomState();

  // Фиксация времени протечки для каждого датчика
  if (leakSensor === "leak" && !lastLeak) lastLeak = new Date().toISOString();
  if (leakSensor !== "leak") lastLeak = null;

  if (washingMachineSensor === "leak" && !lastLeakWashing) lastLeakWashing = new Date().toISOString();
  if (washingMachineSensor !== "leak") lastLeakWashing = null;

  if (kitchenSensor === "leak" && !lastLeakKitchen) lastLeakKitchen = new Date().toISOString();
  if (kitchenSensor !== "leak") lastLeakKitchen = null;

  if (dishwasherSensor === "leak" && !lastLeakDishwasher) lastLeakDishwasher = new Date().toISOString();
  if (dishwasherSensor !== "leak") lastLeakDishwasher = null;

  res.json({
    leakSensor,
    lastLeak,

    washingMachineSensor,
    lastLeakWashing,

    kitchenSensor,
    lastLeakKitchen,

    dishwasherSensor,
    lastLeakDishwasher,
  });
});

// Эндпоинт только для кухни
app.get("/api/kitchen", (req, res) => {
  const kitchenSensor = randomState();
  if (kitchenSensor === "leak" && !lastLeakKitchen) lastLeakKitchen = new Date().toISOString();
  if (kitchenSensor !== "leak") lastLeakKitchen = null;
  res.json({
    kitchenSensor,
    lastLeakKitchen
  });
});

// Новый эндпоинт только для посудомойки
app.get("/api/dishwasher", (req, res) => {
  const dishwasherSensor = randomState();
  if (dishwasherSensor === "leak" && !lastLeakDishwasher) lastLeakDishwasher = new Date().toISOString();
  if (dishwasherSensor !== "leak") lastLeakDishwasher = null;
  res.json({
    dishwasherSensor,
    lastLeakDishwasher
  });
});

app.listen(PORT, () => {
  console.log(`API started on http://localhost:${PORT}`);
});
