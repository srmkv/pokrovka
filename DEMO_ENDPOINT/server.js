const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const os = require("os");
const { execSync } = require("child_process");

const app = express();
const PORT = 3010;
const MAX_EVENT_LOG = 250;
const MAX_NOTIFICATIONS = 80;
const DEVICE_TIMEOUT_MS = 90 * 1000;
const TELEGRAM_API_BASE = "https://api.telegram.org";

const ARDUINO_IP = "192.168.0.115";
const ARDUINO_PORT = 80;

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

const STATE_PATH = path.join(__dirname, "state.json");
const SENSORS_PATH = path.join(__dirname, "sensors.json");
const VALID_LEAK_STATUSES = new Set(["dry", "leak", "unknown"]);
const SENSOR_LABELS = {
  leakSensor: "Ванная",
  washingMachineSensor: "Стиральная машина",
  dishwasherSensor: "Посудомойка",
  kitchenSensor: "Кухня"
};

function readStaticSensors() {
  try {
    const raw = fs.readFileSync(SENSORS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.warn("Не удалось прочитать sensors.json, использую встроенный fallback:", e.message);
  }

  return [
    {
      id: "sensor-bathroom",
      name: "Ванная",
      location: "Ванная",
      type: "leak",
      deviceId: "bathroom-leak-uno",
      icon: "drop",
      resettable: true,
      isBuiltIn: true,
      legacyKey: "leakSensor",
      createdAt: "fallback",
      isActive: true
    },
    {
      id: "sensor-washing-machine",
      name: "Стиральная машина",
      location: "Прачечная / ванная",
      type: "leak",
      deviceId: "washing-machine-leak-uno",
      icon: "washing-machine",
      resettable: true,
      isBuiltIn: true,
      legacyKey: "washingMachineSensor",
      createdAt: "fallback",
      isActive: true
    },
    {
      id: "sensor-dishwasher",
      name: "Посудомойка",
      location: "Кухня",
      type: "leak",
      deviceId: "dishwasher-leak-uno",
      icon: "dishwasher",
      resettable: true,
      isBuiltIn: true,
      legacyKey: "dishwasherSensor",
      createdAt: "fallback",
      isActive: true
    }
  ];
}

function defaultSensorRegistry() {
  return readStaticSensors().map(sensor => ({
    type: "leak",
    icon: "drop",
    resettable: true,
    ip: "",
    mac: "",
    firmwareVersion: "",
    isBuiltIn: true,
    isActive: true,
    ...sensor
  }));
}

const SCENARIOS = [
  {
    id: "morning",
    name: "Утро",
    description: "Свет включён, жалюзи приоткрыты, пол в комфортном режиме",
    apply: async () => {
      state.light.effect = "on";
      state.blinds.kitchen = 60;
      state.blinds.holl = 40;
      state.floor.living = { on: true, temp: 25 };
      state.floor.bath = { on: true, temp: 26 };
      await sendToArduino("on");
    }
  },
  {
    id: "night",
    name: "Ночь",
    description: "Свет выключен, жалюзи закрыты, тёплый пол в экономичном режиме",
    apply: async () => {
      state.light.effect = "off";
      state.blinds.kitchen = 0;
      state.blinds.holl = 0;
      state.blinds.room = 0;
      state.floor.living = { on: true, temp: 23 };
      state.floor.bath = { on: true, temp: 24 };
      await sendToArduino("off");
    }
  },
  {
    id: "away",
    name: "Ушёл из дома",
    description: "Свет выключен, жалюзи закрыты, пол понижен",
    apply: async () => {
      state.light.effect = "off";
      state.blinds.kitchen = 0;
      state.blinds.holl = 0;
      state.blinds.room = 0;
      state.floor.living = { on: false, temp: 20 };
      state.floor.bath = { on: false, temp: 20 };
      await sendToArduino("off");
    }
  },
  {
    id: "vacation",
    name: "Отпуск",
    description: "Экономичный режим для долгого отсутствия",
    apply: async () => {
      state.light.effect = "off";
      state.blinds.kitchen = 0;
      state.blinds.holl = 0;
      state.blinds.room = 0;
      state.floor.living = { on: false, temp: 18 };
      state.floor.bath = { on: false, temp: 18 };
      await sendToArduino("off");
    }
  }
];

function defaultRules() {
  return [
    {
      id: "washing-machine-leak-critical",
      name: "Критическая протечка стиральной машины",
      description: "Создаёт critical-уведомление при появлении протечки у стиральной машины",
      enabled: true,
      priority: "critical"
    },
    {
      id: "washing-machine-leak-resolved",
      name: "Протечка устранена",
      description: "Уведомляет, когда тревога у стиральной машины снята",
      enabled: true,
      priority: "info"
    },
    {
      id: "device-offline-warning",
      name: "Устройство недоступно",
      description: "Создаёт warning-уведомление, если heartbeat устройства пропал",
      enabled: true,
      priority: "warning"
    }
  ];
}

function defaultTelegramSettings() {
  return {
    enabled: false,
    botToken: "",
    chatId: "",
    sendCritical: true,
    sendWarning: false,
    sendInfo: false,
    lastTestAt: null,
    lastError: null
  };
}

function defaultSystemSettings() {
  return {
    name: "NanoPi",
    location: "Дом",
    maintenanceDefaultMinutes: 15
  };
}

function defaultState() {
  return {
    leakSensor: "dry",
    lastLeak: null,

    washingMachineSensor: "dry",
    lastLeakWashing: null,
    washingMachineResetVersion: 0,
    washingMachineLastResetAt: null,
    washingMachineLastSeenAt: null,
    washingMachineLastPayload: null,

    dishwasherSensor: "dry",
    lastLeakDishwasher: null,

    kitchenSensor: "dry",
    lastLeakKitchen: null,

    blinds: { kitchen: 0, room: 0, holl: 0 },
    light: { brightness: 80, effect: "off" },
    floor: {
      living: { on: true, temp: 26 },
      bath: { on: false, temp: 24 }
    },
    relays: {},
    eventLog: [],
    notifications: [],
    devices: {},
    scenarios: {
      activeScenarioId: null,
      lastAppliedAt: null
    },
    rules: defaultRules(),
    sensorRegistry: defaultSensorRegistry(),
    sensorStates: {},
    settings: {
      telegram: defaultTelegramSettings(),
      system: defaultSystemSettings()
    }
  };
}

let state = defaultState();

function nowIso() {
  return new Date().toISOString();
}

function nextId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  state = defaultState();
  if (fs.existsSync(STATE_PATH)) {
    try {
      const data = fs.readFileSync(STATE_PATH, "utf8");
      state = { ...state, ...JSON.parse(data) };
      state.blinds = { ...defaultState().blinds, ...(state.blinds || {}) };
      state.light = { ...defaultState().light, ...(state.light || {}) };
      state.floor = {
        ...defaultState().floor,
        ...(state.floor || {}),
        living: { ...defaultState().floor.living, ...(state.floor?.living || {}) },
        bath: { ...defaultState().floor.bath, ...(state.floor?.bath || {}) }
      };
      state.scenarios = { ...defaultState().scenarios, ...(state.scenarios || {}) };
      state.devices = state.devices || {};
      state.eventLog = Array.isArray(state.eventLog) ? state.eventLog : [];
      state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
      state.rules = mergeRules(state.rules);
      state.sensorRegistry = mergeSensorRegistry(state.sensorRegistry);
      state.sensorStates = state.sensorStates || {};
      state.settings = {
        telegram: { ...defaultTelegramSettings(), ...((state.settings || {}).telegram || {}) },
        system: { ...defaultSystemSettings(), ...((state.settings || {}).system || {}) }
      };
      ensureSensorRegistryState();
      console.log("Состояние загружено из файла.");
    } catch (e) {
      console.warn("Ошибка чтения state.json:", e);
    }
  }
}

function saveState() {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (e) {
    console.warn("Ошибка сохранения state.json:", e);
  }
}

function mergeRules(savedRules) {
  const defaults = defaultRules();
  const savedById = new Map((Array.isArray(savedRules) ? savedRules : []).map(rule => [rule.id, rule]));
  return defaults.map(rule => ({ ...rule, ...(savedById.get(rule.id) || {}) }));
}

function mergeSensorRegistry(savedRegistry) {
  const defaults = defaultSensorRegistry();
  const saved = Array.isArray(savedRegistry) ? savedRegistry : [];
  const savedById = new Map(saved.map(item => [item.id, item]));
  const defaultIds = new Set(defaults.map(item => item.id));
  const mergedDefaults = defaults.map(item => {
    const savedItem = savedById.get(item.id) || {};
    return {
      ...savedItem,
      ...item,
      ip: savedItem.ip ?? item.ip ?? "",
      mac: savedItem.mac ?? item.mac ?? "",
      firmwareVersion: savedItem.firmwareVersion ?? item.firmwareVersion ?? "",
      isBuiltIn: true
    };
  });
  const customItems = saved.filter(item => !defaultIds.has(item.id));
  return [...mergedDefaults, ...customItems];
}

function lastLeakKeyByLegacyKey(legacyKey) {
  return {
    leakSensor: "lastLeak",
    washingMachineSensor: "lastLeakWashing",
    dishwasherSensor: "lastLeakDishwasher",
    kitchenSensor: "lastLeakKitchen"
  }[legacyKey] || null;
}

function ensureSensorRegistryState() {
  if (!Array.isArray(state.sensorRegistry)) state.sensorRegistry = defaultSensorRegistry();
  if (!state.sensorStates || typeof state.sensorStates !== "object") state.sensorStates = {};

  state.sensorRegistry = state.sensorRegistry.map(sensor => ({
    type: "leak",
    icon: "drop",
    resettable: true,
    ip: "",
    mac: "",
    firmwareVersion: "",
    isActive: true,
    ...sensor
  }));

  state.sensorRegistry.forEach(sensor => {
    const legacyLastKey = lastLeakKeyByLegacyKey(sensor.legacyKey);
    const current = state.sensorStates[sensor.id] || {};
    const legacyStatus = sensor.legacyKey ? state[sensor.legacyKey] : undefined;
    const legacyLastTriggerAt = legacyLastKey ? state[legacyLastKey] : null;

    state.sensorStates[sensor.id] = {
      status: current.status || legacyStatus || "unknown",
      lastTriggerAt: current.lastTriggerAt ?? legacyLastTriggerAt ?? null,
      lastSeenAt: current.lastSeenAt || (sensor.legacyKey === "washingMachineSensor" ? state.washingMachineLastSeenAt || null : null),
      lastPayload: current.lastPayload || (sensor.legacyKey === "washingMachineSensor" ? state.washingMachineLastPayload || null : null),
      resetVersion: Number.isFinite(current.resetVersion) ? current.resetVersion : (sensor.legacyKey === "washingMachineSensor" ? state.washingMachineResetVersion || 0 : 0),
      lastResetAt: current.lastResetAt || (sensor.legacyKey === "washingMachineSensor" ? state.washingMachineLastResetAt || null : null),
      maintenanceUntil: current.maintenanceUntil || null,
      maintenanceReason: current.maintenanceReason || ""
    };

    mirrorLegacySensorState(sensor, state.sensorStates[sensor.id]);
  });
}

function findSensorByLegacyKey(legacyKey) {
  ensureSensorRegistryState();
  return (state.sensorRegistry || []).find(sensor => sensor.legacyKey === legacyKey && sensor.isActive !== false);
}

function findSensorByDeviceId(deviceId) {
  ensureSensorRegistryState();
  return (state.sensorRegistry || []).find(sensor => sensor.deviceId === deviceId && sensor.isActive !== false);
}

function mirrorLegacySensorState(sensor, sensorState) {
  if (!sensor?.legacyKey) return;
  const status = sensorState?.status || "unknown";
  const lastKey = lastLeakKeyByLegacyKey(sensor.legacyKey);
  state[sensor.legacyKey] = status;
  if (lastKey) state[lastKey] = status === "leak" ? (sensorState?.lastTriggerAt || nowIso()) : null;

  if (sensor.legacyKey === "washingMachineSensor") {
    state.washingMachineResetVersion = sensorState?.resetVersion || 0;
    state.washingMachineLastResetAt = sensorState?.lastResetAt || null;
    state.washingMachineLastSeenAt = sensorState?.lastSeenAt || null;
    state.washingMachineLastPayload = sensorState?.lastPayload || null;
  }
}

function isRuleEnabled(ruleId) {
  return !!state.rules.find(rule => rule.id === ruleId && rule.enabled);
}

function isSensorInMaintenance(sensorOrState) {
  const sensorState = sensorOrState?.id ? getSensorComputedState(sensorOrState) : sensorOrState;
  if (!sensorState?.maintenanceUntil) return false;
  const until = new Date(sensorState.maintenanceUntil).getTime();
  return Number.isFinite(until) && until > Date.now();
}

function sanitizeTelegramSettings(settings = state.settings?.telegram || {}) {
  const token = String(settings.botToken || "");
  const maskedToken = token ? `${token.slice(0, 6)}...${token.slice(-4)}` : "";
  return {
    enabled: !!settings.enabled,
    botTokenSet: !!token,
    botTokenMasked: maskedToken,
    chatId: String(settings.chatId || ""),
    sendCritical: settings.sendCritical !== false,
    sendWarning: !!settings.sendWarning,
    sendInfo: !!settings.sendInfo,
    lastTestAt: settings.lastTestAt || null,
    lastError: settings.lastError || null
  };
}

function shouldSendTelegramForPriority(priority) {
  const tg = { ...defaultTelegramSettings(), ...((state.settings || {}).telegram || {}) };
  if (!tg.enabled || !tg.botToken || !tg.chatId) return false;
  if (priority === "critical") return tg.sendCritical !== false;
  if (priority === "warning") return !!tg.sendWarning;
  return !!tg.sendInfo;
}

async function sendTelegramMessage(text) {
  const tg = { ...defaultTelegramSettings(), ...((state.settings || {}).telegram || {}) };
  if (!tg.enabled || !tg.botToken || !tg.chatId) return { skipped: true };

  const url = `${TELEGRAM_API_BASE}/bot${tg.botToken}/sendMessage`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: tg.chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    timeout: 5000
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.description || `Telegram HTTP ${resp.status}`);
  return data;
}

function formatNotificationForTelegram(note) {
  const icon = note.priority === "critical" ? "🚨" : note.priority === "warning" ? "⚠️" : "ℹ️";
  const title = String(note.title || "Уведомление").replace(/[<>]/g, "");
  const text = String(note.text || "").replace(/[<>]/g, "");
  return `${icon} <b>${title}</b>\n${text}\n\nПриоритет: ${note.priority}\nИсточник: ${note.source || "system"}\nВремя: ${new Date(note.createdAt || Date.now()).toLocaleString("ru-RU")}`;
}

function notifyTelegramForNotification(note) {
  if (!shouldSendTelegramForPriority(note.priority)) return;
  sendTelegramMessage(formatNotificationForTelegram(note))
    .then(() => {
      if (state.settings?.telegram) {
        state.settings.telegram.lastError = null;
        saveState();
      }
    })
    .catch((e) => {
      console.warn("Ошибка Telegram уведомления:", e.message);
      if (state.settings?.telegram) {
        state.settings.telegram.lastError = e.message;
        saveState();
      }
    });
}

function readCpuTempC() {
  const candidates = ["/sys/class/thermal/thermal_zone0/temp", "/sys/class/hwmon/hwmon0/temp1_input"];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const raw = Number(String(fs.readFileSync(file, "utf8")).trim());
      if (Number.isFinite(raw)) return raw > 1000 ? Math.round(raw / 100) / 10 : raw;
    } catch (_) {}
  }
  return null;
}

function readDiskInfo() {
  try {
    const out = execSync(`df -k ${__dirname}`, { encoding: "utf8", timeout: 1000 }).trim().split(/\n/);
    const row = out[out.length - 1].split(/\s+/);
    const sizeKb = Number(row[1] || 0);
    const usedKb = Number(row[2] || 0);
    const availableKb = Number(row[3] || 0);
    return {
      filesystem: row[0] || "",
      sizeGb: Math.round((sizeKb / 1024 / 1024) * 10) / 10,
      usedGb: Math.round((usedKb / 1024 / 1024) * 10) / 10,
      availableGb: Math.round((availableKb / 1024 / 1024) * 10) / 10,
      usePercent: row[4] || "",
      mount: row[5] || ""
    };
  } catch (e) {
    return { error: e.message };
  }
}

function systemStatus() {
  reconcileDeviceStates();
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = memTotal - memFree;
  return {
    name: state.settings?.system?.name || "NanoPi",
    location: state.settings?.system?.location || "Дом",
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    backend: { online: true, port: PORT, uptimeSeconds: Math.floor(process.uptime()), startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString() },
    nanopi: {
      uptimeSeconds: Math.floor(os.uptime()),
      loadavg: os.loadavg(),
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || "unknown",
      cpuTempC: readCpuTempC(),
      memory: {
        totalMb: Math.round(memTotal / 1024 / 1024),
        usedMb: Math.round(memUsed / 1024 / 1024),
        freeMb: Math.round(memFree / 1024 / 1024),
        usedPercent: Math.round((memUsed / memTotal) * 100)
      },
      disk: readDiskInfo()
    },
    paths: { statePath: STATE_PATH, sensorsPath: SENSORS_PATH },
    summary: summarizeHomeState(),
    now: nowIso()
  };
}

function trimCollections() {
  state.eventLog = state.eventLog.slice(0, MAX_EVENT_LOG);
  state.notifications = state.notifications.slice(0, MAX_NOTIFICATIONS);
}

function logEvent({ type, title, text, priority = "info", source = "system", payload = null }) {
  state.eventLog.unshift({
    id: nextId("evt"),
    type,
    title,
    text,
    priority,
    source,
    payload,
    createdAt: nowIso()
  });
  trimCollections();
}

function createNotification({ title, text, priority = "info", source = "system", sticky = false, payload = null }) {
  const note = {
    id: nextId("note"),
    title,
    text,
    priority,
    source,
    sticky: sticky || priority === "critical",
    payload,
    acknowledgedAt: null,
    createdAt: nowIso()
  };
  state.notifications.unshift(note);
  trimCollections();
  notifyTelegramForNotification(note);
  return note;
}

function updateLeakTimes() {
  if (state.leakSensor === "leak" && !state.lastLeak) state.lastLeak = nowIso();
  if (state.leakSensor !== "leak") state.lastLeak = null;

  if (state.washingMachineSensor === "leak" && !state.lastLeakWashing) state.lastLeakWashing = nowIso();
  if (state.washingMachineSensor !== "leak") state.lastLeakWashing = null;

  if (state.dishwasherSensor === "leak" && !state.lastLeakDishwasher) state.lastLeakDishwasher = nowIso();
  if (state.dishwasherSensor !== "leak") state.lastLeakDishwasher = null;

  if (state.kitchenSensor === "leak" && !state.lastLeakKitchen) state.lastLeakKitchen = nowIso();
  if (state.kitchenSensor !== "leak") state.lastLeakKitchen = null;
}

function effectiveDeviceStatus(device) {
  if (!device?.lastSeenAt) return "unknown";
  return Date.now() - new Date(device.lastSeenAt).getTime() <= DEVICE_TIMEOUT_MS ? "online" : "offline";
}

function touchDevice(deviceId, patch = {}) {
  const current = state.devices[deviceId] || {
    id: deviceId,
    name: patch.name || deviceId,
    source: patch.source || "sensor",
    createdAt: nowIso(),
    status: "online"
  };

  const updated = {
    ...current,
    ...patch,
    id: deviceId,
    lastSeenAt: nowIso(),
    status: "online"
  };

  state.devices[deviceId] = updated;
  return updated;
}

function reconcileDeviceStates() {
  let changed = false;
  Object.values(state.devices).forEach(device => {
    const nextStatus = effectiveDeviceStatus(device);
    if (device.status !== nextStatus) {
      device.status = nextStatus;
      changed = true;
      logEvent({
        type: "device",
        title: nextStatus === "offline" ? "Устройство недоступно" : "Устройство снова в сети",
        text: `${device.name || device.id}: ${nextStatus === "offline" ? "heartbeat пропал" : "связь восстановлена"}`,
        priority: nextStatus === "offline" ? "warning" : "info",
        source: device.id,
        payload: { deviceId: device.id, status: nextStatus }
      });

      if (isRuleEnabled("device-offline-warning")) {
        createNotification({
          title: nextStatus === "offline" ? "Устройство недоступно" : "Устройство снова в сети",
          text: `${device.name || device.id}: ${nextStatus === "offline" ? "heartbeat не поступает" : "heartbeat восстановлен"}`,
          priority: nextStatus === "offline" ? "warning" : "info",
          source: device.id,
          sticky: nextStatus === "offline",
          payload: { deviceId: device.id, status: nextStatus }
        });
      }
    }
  });

  if (changed) saveState();
}

function compactWashingPayload(body) {
  return {
    device: typeof body.device === "string" ? body.device : undefined,
    seq: typeof body.seq === "number" ? body.seq : undefined,
    reason: typeof body.reason === "string" ? body.reason : undefined,
    alarm: typeof body.alarm === "boolean" ? body.alarm : undefined,
    rain: typeof body.rain === "boolean" ? body.rain : undefined,
    ao: typeof body.ao === "number" ? body.ao : undefined,
    reset_closed: typeof body.reset_closed === "boolean" ? body.reset_closed : undefined
  };
}

function resolveWashingStatus(body) {
  if (typeof body?.status === "string" && VALID_LEAK_STATUSES.has(body.status)) {
    return body.status;
  }
  if (typeof body?.alarm === "boolean") {
    return body.alarm ? "leak" : "dry";
  }
  if (typeof body?.rain === "boolean") {
    return body.rain ? "leak" : "dry";
  }
  return null;
}

function getSensorComputedState(sensor) {
  const saved = state.sensorStates?.[sensor.id] || {};
  const legacyLastKey = lastLeakKeyByLegacyKey(sensor.legacyKey);
  const legacyStatus = sensor.legacyKey ? state[sensor.legacyKey] : undefined;
  const legacyLastTriggerAt = legacyLastKey ? state[legacyLastKey] : null;

  return {
    sensorId: sensor.id,
    status: saved.status || legacyStatus || "unknown",
    lastTriggerAt: saved.lastTriggerAt ?? legacyLastTriggerAt ?? null,
    lastSeenAt: saved.lastSeenAt || (sensor.legacyKey === "washingMachineSensor" ? state.washingMachineLastSeenAt || null : null),
    lastPayload: saved.lastPayload || (sensor.legacyKey === "washingMachineSensor" ? state.washingMachineLastPayload || null : null),
    resetVersion: Number.isFinite(saved.resetVersion) ? saved.resetVersion : (sensor.legacyKey === "washingMachineSensor" ? state.washingMachineResetVersion || 0 : 0),
    lastResetAt: saved.lastResetAt || (sensor.legacyKey === "washingMachineSensor" ? state.washingMachineLastResetAt || null : null),
    maintenanceUntil: saved.maintenanceUntil || null,
    maintenanceReason: saved.maintenanceReason || "",
    maintenanceActive: isSensorInMaintenance(saved),
    deviceStatus: sensor.deviceId && state.devices[sensor.deviceId] ? effectiveDeviceStatus(state.devices[sensor.deviceId]) : "unknown"
  };
}

function applySensorState(sensor, status, payload = {}) {
  const previous = getSensorComputedState(sensor);
  const current = state.sensorStates[sensor.id] || {};
  const nextState = {
    status,
    lastTriggerAt: status === "leak" ? (current.lastTriggerAt || nowIso()) : null,
    lastSeenAt: nowIso(),
    lastPayload: payload,
    resetVersion: current.resetVersion || 0,
    lastResetAt: current.lastResetAt || null,
    maintenanceUntil: current.maintenanceUntil || null,
    maintenanceReason: current.maintenanceReason || ""
  };

  state.sensorStates[sensor.id] = nextState;
  mirrorLegacySensorState(sensor, nextState);
  updateLeakTimes();

  if (sensor.deviceId) {
    touchDevice(sensor.deviceId, {
      name: sensor.name,
      source: "arduino",
      meta: payload
    });
  }

  const maintenanceActive = isSensorInMaintenance(nextState);

  logEvent({
    type: "sensor",
    title: `Датчик: ${sensor.name}`,
    text: maintenanceActive && status === "leak" ? `Статус: ${status} (режим обслуживания)` : `Статус: ${status}`,
    priority: status === "leak" ? (maintenanceActive ? "info" : "warning") : "info",
    source: sensor.deviceId || sensor.id,
    payload: { sensorId: sensor.id, status, maintenanceActive, payload }
  });

  if (previous.status !== "leak" && status === "leak") {
    if (maintenanceActive) {
      createNotification({
        title: `Протечка в обслуживании: ${sensor.name}`,
        text: `${sensor.location || sensor.name}: вода обнаружена, но датчик временно в режиме обслуживания`,
        priority: "info",
        source: sensor.deviceId || sensor.id,
        sticky: false,
        payload: { sensorId: sensor.id, maintenanceActive: true }
      });
    } else {
      createNotification({
        title: `Протечка: ${sensor.name}`,
        text: `${sensor.location || sensor.name}: обнаружена вода`,
        priority: sensor.resettable ? "critical" : "warning",
        source: sensor.deviceId || sensor.id,
        sticky: true,
        payload: { sensorId: sensor.id }
      });
    }
  }

  if (previous.status === "leak" && status === "dry") {
    createNotification({
      title: `Тревога снята: ${sensor.name}`,
      text: `${sensor.location || sensor.name}: состояние вернулось в норму`,
      priority: "info",
      source: sensor.deviceId || sensor.id,
      payload: { sensorId: sensor.id }
    });
  }

  saveState();
  return getSensorComputedState(sensor);
}

function resetRegisteredSensor(sensor) {
  const current = state.sensorStates[sensor.id] || {};
  const nextState = {
    ...current,
    status: "dry",
    lastTriggerAt: null,
    lastResetAt: nowIso(),
    lastSeenAt: current.lastSeenAt || nowIso(),
    resetVersion: (current.resetVersion || 0) + 1,
    maintenanceUntil: current.maintenanceUntil || null,
    maintenanceReason: current.maintenanceReason || ""
  };

  state.sensorStates[sensor.id] = nextState;
  mirrorLegacySensorState(sensor, nextState);
  updateLeakTimes();

  logEvent({
    type: "sensor",
    title: `Сброс тревоги: ${sensor.name}`,
    text: "Сервер запросил удалённый сброс тревоги",
    priority: "info",
    source: "ui",
    payload: { sensorId: sensor.id }
  });
  saveState();
  return getSensorComputedState(sensor);
}

function summarizeHomeState() {
  ensureSensorRegistryState();
  const devices = Object.values(state.devices || {});
  const onlineDevices = devices.filter(d => effectiveDeviceStatus(d) === "online").length;
  const offlineDevices = devices.filter(d => effectiveDeviceStatus(d) === "offline").length;
  const sensorItems = (state.sensorRegistry || []).filter(sensor => sensor.isActive !== false);
  const activeLeakItems = sensorItems
    .map(sensor => ({ sensor, state: getSensorComputedState(sensor) }))
    .filter(item => item.state.status === "leak");
  const unreadCritical = state.notifications.filter(note => !note.acknowledgedAt && note.priority === "critical").length;
  const unreadWarning = state.notifications.filter(note => !note.acknowledgedAt && note.priority === "warning").length;
  const overallStatus = activeLeakItems.length > 0 || unreadCritical > 0
    ? "critical"
    : (offlineDevices > 0 || unreadWarning > 0 ? "warning" : "normal");

  return {
    overallStatus,
    activeScenarioId: state.scenarios?.activeScenarioId || null,
    onlineDevices,
    offlineDevices,
    totalDevices: devices.length,
    sensorsTotal: sensorItems.length,
    sensorsOk: sensorItems.filter(sensor => getSensorComputedState(sensor).status === "dry").length,
    sensorsUnknown: sensorItems.filter(sensor => getSensorComputedState(sensor).status === "unknown").length,
    activeLeaks: activeLeakItems.length,
    activeLeakSensors: activeLeakItems.map(item => ({
      id: item.sensor.id,
      name: item.sensor.name,
      location: item.sensor.location,
      deviceId: item.sensor.deviceId,
      lastTriggerAt: item.state.lastTriggerAt
    })),
    unreadNotifications: state.notifications.filter(note => !note.acknowledgedAt).length,
    unreadCritical,
    unreadWarning,
    eventsCount: state.eventLog.length,
    lastEvent: state.eventLog[0] || null
  };
}

function washingMachineResponse() {
  ensureSensorRegistryState();
  const sensor = findSensorByLegacyKey("washingMachineSensor");
  const computed = sensor ? getSensorComputedState(sensor) : {};
  updateLeakTimes();
  return {
    washingMachineSensor: computed.status || state.washingMachineSensor,
    lastLeakWashing: computed.lastTriggerAt || state.lastLeakWashing,
    washingMachineResetVersion: computed.resetVersion || 0,
    washingMachineLastResetAt: computed.lastResetAt || null,
    washingMachineLastSeenAt: computed.lastSeenAt || null,
    washingMachineLastPayload: computed.lastPayload || null
  };
}

function runRules({ previous }) {
  if (!previous) return;

  if (previous.washingMachineSensor !== "leak" && state.washingMachineSensor === "leak") {
    logEvent({
      type: "rule",
      title: "Сработало правило: протечка стиральной машины",
      text: "Датчик протечки стиральной машины перешёл в аварийный режим",
      priority: "critical",
      source: "rule:washing-machine-leak-critical"
    });

    if (isRuleEnabled("washing-machine-leak-critical")) {
      createNotification({
        title: "Критическая протечка",
        text: "Стиральная машина: обнаружена вода под датчиком",
        priority: "critical",
        source: "rule:washing-machine-leak-critical",
        sticky: true,
        payload: { sensor: "washing-machine" }
      });
    }
  }

  if (previous.washingMachineSensor === "leak" && state.washingMachineSensor === "dry") {
    logEvent({
      type: "rule",
      title: "Сработало правило: тревога снята",
      text: "Протечка у стиральной машины снята",
      priority: "info",
      source: "rule:washing-machine-leak-resolved"
    });

    if (isRuleEnabled("washing-machine-leak-resolved")) {
      createNotification({
        title: "Тревога снята",
        text: "Стиральная машина: аварийное состояние сброшено",
        priority: "info",
        source: "rule:washing-machine-leak-resolved"
      });
    }
  }
}

async function applyScenario(scenarioId, source = "ui") {
  const scenario = SCENARIOS.find(item => item.id === scenarioId);
  if (!scenario) return null;

  await scenario.apply();
  state.scenarios.activeScenarioId = scenario.id;
  state.scenarios.lastAppliedAt = nowIso();

  logEvent({
    type: "scenario",
    title: `Сценарий: ${scenario.name}`,
    text: scenario.description,
    priority: "info",
    source,
    payload: { scenarioId: scenario.id }
  });

  createNotification({
    title: `Активирован сценарий «${scenario.name}»`,
    text: scenario.description,
    priority: "info",
    source,
    payload: { scenarioId: scenario.id }
  });

  saveState();
  return scenario;
}

app.use(cors());
app.use(express.json());
loadState();
ensureSensorRegistryState();
saveState();
reconcileDeviceStates();
setInterval(reconcileDeviceStates, 10000);

app.get("/api/home", (req, res) => {
  updateLeakTimes();
  res.json(state);
});

app.get("/api/system/summary", (req, res) => {
  reconcileDeviceStates();
  res.json(summarizeHomeState());
});

app.get("/api/system/status", (req, res) => {
  res.json(systemStatus());
});

app.get("/api/settings/telegram", (req, res) => {
  state.settings = state.settings || {};
  state.settings.telegram = { ...defaultTelegramSettings(), ...(state.settings.telegram || {}) };
  res.json(sanitizeTelegramSettings(state.settings.telegram));
});

app.put("/api/settings/telegram", (req, res) => {
  const current = { ...defaultTelegramSettings(), ...((state.settings || {}).telegram || {}) };
  const body = req.body || {};
  const next = {
    ...current,
    enabled: typeof body.enabled === "boolean" ? body.enabled : current.enabled,
    chatId: typeof body.chatId === "string" ? body.chatId.trim() : current.chatId,
    sendCritical: typeof body.sendCritical === "boolean" ? body.sendCritical : current.sendCritical,
    sendWarning: typeof body.sendWarning === "boolean" ? body.sendWarning : current.sendWarning,
    sendInfo: typeof body.sendInfo === "boolean" ? body.sendInfo : current.sendInfo
  };
  if (typeof body.botToken === "string") {
    const token = body.botToken.trim();
    if (token) next.botToken = token;
    if (body.clearBotToken === true) next.botToken = "";
  }
  state.settings = state.settings || {};
  state.settings.telegram = next;
  saveState();
  logEvent({ type: "settings", title: "Настройки Telegram обновлены", text: next.enabled ? "Telegram-уведомления включены или изменены" : "Telegram-уведомления выключены", priority: "info", source: "ui" });
  res.json(sanitizeTelegramSettings(next));
});

app.post("/api/settings/telegram/test", async (req, res) => {
  try {
    await sendTelegramMessage("✅ Тестовое сообщение от умного дома NanoPi");
    state.settings.telegram.lastTestAt = nowIso();
    state.settings.telegram.lastError = null;
    saveState();
    res.json({ ok: true, settings: sanitizeTelegramSettings(state.settings.telegram) });
  } catch (e) {
    state.settings.telegram.lastError = e.message;
    saveState();
    res.status(502).json({ error: e.message, settings: sanitizeTelegramSettings(state.settings.telegram) });
  }
});

app.get("/api/events", (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  res.json(state.eventLog.slice(0, limit));
});

app.get("/api/notifications", (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  res.json(state.notifications.slice(0, limit));
});

app.post("/api/notifications/:id/ack", (req, res) => {
  const note = state.notifications.find(item => item.id === req.params.id);
  if (!note) return res.status(404).json({ error: "Not found" });
  note.acknowledgedAt = nowIso();
  saveState();
  res.json({ ok: true, id: note.id, acknowledgedAt: note.acknowledgedAt });
});

app.get("/api/devices", (req, res) => {
  reconcileDeviceStates();
  const devices = Object.values(state.devices || {})
    .map(device => ({ ...device, effectiveStatus: effectiveDeviceStatus(device) }))
    .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id), "ru"));
  res.json(devices);
});

app.post("/api/device/heartbeat", (req, res) => {
  const { deviceId, name, source, meta } = req.body || {};
  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ error: "deviceId is required" });
  }
  const device = touchDevice(deviceId, { name: name || deviceId, source: source || "sensor", meta: meta || null });
  saveState();
  res.json({ ok: true, device });
});

app.get("/api/scenarios", (req, res) => {
  res.json({
    activeScenarioId: state.scenarios.activeScenarioId || null,
    items: SCENARIOS.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      active: state.scenarios.activeScenarioId === item.id
    }))
  });
});

app.post("/api/scenarios/apply", async (req, res) => {
  const { scenarioId } = req.body || {};
  const scenario = await applyScenario(scenarioId, "ui");
  if (!scenario) return res.status(400).json({ error: "Unknown scenario" });
  res.json({ ok: true, activeScenarioId: state.scenarios.activeScenarioId, scenarioId: scenario.id });
});

app.get("/api/rules", (req, res) => {
  res.json(state.rules);
});

app.post("/api/rules/:id/toggle", (req, res) => {
  const rule = state.rules.find(item => item.id === req.params.id);
  if (!rule) return res.status(404).json({ error: "Rule not found" });
  if (typeof req.body?.enabled !== "boolean") {
    return res.status(400).json({ error: "enabled must be boolean" });
  }
  rule.enabled = req.body.enabled;
  saveState();
  logEvent({
    type: "rule",
    title: `Правило ${rule.enabled ? "включено" : "выключено"}`,
    text: rule.name,
    priority: "info",
    source: "ui",
    payload: { ruleId: rule.id, enabled: rule.enabled }
  });
  res.json(rule);
});

[
  { sensor: "bathroom", key: "leakSensor", lastKey: "lastLeak" },
  { sensor: "dishwasher", key: "dishwasherSensor", lastKey: "lastLeakDishwasher" },
  { sensor: "kitchen", key: "kitchenSensor", lastKey: "lastLeakKitchen" }
].forEach(({ sensor, key, lastKey }) => {
  app.get(`/api/${sensor}`, (req, res) => {
    updateLeakTimes();
    const registrySensor = findSensorByLegacyKey(key);
    const computed = registrySensor ? getSensorComputedState(registrySensor) : null;
    res.json({
      [key]: computed?.status || state[key],
      [lastKey]: computed?.lastTriggerAt || state[lastKey]
    });
  });

  app.post(`/api/${sensor}`, (req, res) => {
    const { status } = req.body || {};
    if (!VALID_LEAK_STATUSES.has(status)) {
      return res.status(400).json({ error: "Bad status" });
    }

    const previous = { ...state };
    const registrySensor = findSensorByLegacyKey(key);
    if (registrySensor) {
      const computed = applySensorState(registrySensor, status, { source: `legacy:/api/${sensor}`, ...req.body });
      runRules({ previous });
      return res.json({ [key]: computed.status, [lastKey]: computed.lastTriggerAt });
    }

    state[key] = status;
    updateLeakTimes();
    logEvent({
      type: "sensor",
      title: `Состояние датчика: ${SENSOR_LABELS[key]}`,
      text: `Статус изменён на ${status}`,
      priority: status === "leak" ? "warning" : "info",
      source: sensor,
      payload: { sensor, status }
    });
    saveState();
    runRules({ previous });
    res.json({ [key]: state[key], [lastKey]: state[lastKey] });
  });
});

app.get("/api/washing-machine", (req, res) => {
  res.json(washingMachineResponse());
});

app.post("/api/washing-machine", (req, res) => {
  const status = resolveWashingStatus(req.body || {});
  if (!status) {
    return res.status(400).json({ error: "Bad payload" });
  }

  const previous = { ...state };
  const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId : (typeof req.body?.device === "string" ? req.body.device : "washing-machine-leak-uno");
  const sensor = findSensorByDeviceId(deviceId) || findSensorByLegacyKey("washingMachineSensor");
  if (!sensor) return res.status(404).json({ error: "Washing machine sensor binding not found" });

  sensor.ip = String(req.body?.ip || sensor.ip || "").trim();
  sensor.mac = String(req.body?.mac || sensor.mac || "").trim();
  sensor.firmwareVersion = String(req.body?.firmwareVersion || sensor.firmwareVersion || "").trim();

  const result = applySensorState(sensor, status, compactWashingPayload(req.body || {}));
  saveState();
  runRules({ previous });
  saveState();
  res.json({ ...washingMachineResponse(), state: result });
});

app.get("/api/washing-machine/command", (req, res) => {
  const sensor = findSensorByLegacyKey("washingMachineSensor");
  const computed = sensor ? getSensorComputedState(sensor) : {};
  res.json({
    resetVersion: computed.resetVersion || 0,
    lastResetAt: computed.lastResetAt || null,
    washingMachineSensor: computed.status || state.washingMachineSensor
  });
});

app.post("/api/washing-machine/reset", (req, res) => {
  const previous = { ...state };
  const sensor = findSensorByLegacyKey("washingMachineSensor");
  if (!sensor) return res.status(404).json({ error: "Washing machine sensor not found" });
  const computed = resetRegisteredSensor(sensor);
  runRules({ previous });
  saveState();

  res.json({
    ok: true,
    washingMachineSensor: computed.status,
    lastLeakWashing: computed.lastTriggerAt,
    washingMachineResetVersion: computed.resetVersion,
    washingMachineLastResetAt: computed.lastResetAt
  });
});

["kitchen", "room", "holl"].forEach(zone => {
  app.get(`/api/blinds/${zone}`, (req, res) => {
    res.json({ position: state.blinds[zone] });
  });

  app.post(`/api/blinds/${zone}`, (req, res) => {
    let { position } = req.body;
    if (typeof position !== "number" || position < 0 || position > 100) {
      return res.status(400).json({ error: "Bad position" });
    }
    state.blinds[zone] = Math.round(position);
    saveState();
    res.json({ position: state.blinds[zone] });
  });
});

app.get("/api/light/slider", (req, res) => {
  res.json({ brightness: state.light.brightness });
});

app.post("/api/light/slider", async (req, res) => {
  const { brightness } = req.body;
  if (typeof brightness !== "number" || brightness < 0 || brightness > 100) {
    return res.status(400).json({ error: "Bad brightness" });
  }
  state.light.brightness = brightness;
  saveState();
  const arduinoResp = await sendToArduino(`brightness?val=${brightness}`);
  if (arduinoResp === null) {
    return res.status(502).json({ error: "Не удалось связаться с Arduino" });
  }
  res.json({ brightness: state.light.brightness });
});

app.post("/api/light/color", async (req, res) => {
  const { r, g, b } = req.body;
  if (
    typeof r !== "number" || r < 0 || r > 255 ||
    typeof g !== "number" || g < 0 || g > 255 ||
    typeof b !== "number" || b < 0 || b > 255
  ) {
    return res.status(400).json({ error: "Bad color" });
  }
  const arduinoResp = await sendToArduino(`color?r=${r}&g=${g}&b=${b}`);
  if (arduinoResp === null) {
    return res.status(502).json({ error: "Не удалось связаться с Arduino" });
  }
  res.json({ r, g, b });
});

const EFFECT_MAP = {
  off: "off",
  on: "on",
  fire: "fire",
  firebounce: "firebounce",
  default: "default",
  fade: "fade",
  relay: "relay"
};

app.get("/api/light/effects", (req, res) => {
  res.json({ effect: state.light.effect });
});

app.post("/api/light/effects", async (req, res) => {
  const { effect } = req.body;
  if (!(effect in EFFECT_MAP)) {
    return res.status(400).json({ error: "Bad effect" });
  }

  state.light.effect = effect;
  saveState();
  const arduinoResp = await sendToArduino(EFFECT_MAP[effect]);
  if (arduinoResp === null) {
    return res.status(502).json({ error: "Не удалось связаться с Arduino" });
  }
  res.json({ effect: state.light.effect });
});

["living", "bath"].forEach(room => {
  app.get(`/api/floor/${room}`, (req, res) => {
    res.json(state.floor[room]);
  });

  app.post(`/api/floor/${room}`, (req, res) => {
    const { on, temp } = req.body;
    if (typeof on !== "boolean" || typeof temp !== "number") {
      return res.status(400).json({ error: "Bad payload" });
    }
    state.floor[room] = { on, temp };
    saveState();
    res.json(state.floor[room]);
  });
});

app.post("/api/relay/send-multiple", async (req, res) => {
  const { codes } = req.body;
  if (!Array.isArray(codes) || !codes.every(c => typeof c === "object" && /^\d{6,26}$/.test(String(c.code)))) {
    return res.status(400).json({ error: "Invalid codes array" });
  }

  let results = [];
  for (const { code, tag, state: on } of codes) {
    const resp = await sendToArduino(`relay?code=${code}`);
    results.push({ code, tag, state: on, success: resp !== null });

    if (typeof tag === "string" && typeof on === "boolean") {
      state.relays = state.relays || {};
      state.relays[tag] = on;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  saveState();
  res.json({ sent: results });
});

app.get("/api/sensors", (req, res) => {
  ensureSensorRegistryState();
  const sensors = (state.sensorRegistry || [])
    .filter(sensor => sensor.isActive !== false)
    .map(sensor => ({
      ...sensor,
      state: getSensorComputedState(sensor),
      eventEndpoint: "/api/sensors/event",
      commandEndpoint: sensor.deviceId ? `/api/sensors/by-device/${encodeURIComponent(sensor.deviceId)}/command` : null,
      resetEndpoint: sensor.resettable ? `/api/sensors/${sensor.id}/reset` : null
    }));
  res.json(sensors);
});

app.post("/api/sensors", (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const deviceId = String(body.deviceId || "").trim();
  if (!name || !deviceId) {
    return res.status(400).json({ error: "name and deviceId are required" });
  }
  if ((state.sensorRegistry || []).some(sensor => sensor.deviceId === deviceId && sensor.isActive !== false)) {
    return res.status(400).json({ error: "deviceId already exists" });
  }

  const sensor = {
    id: nextId("sensor"),
    name,
    location: String(body.location || "").trim() || name,
    type: String(body.type || "leak"),
    icon: String(body.icon || "drop"),
    deviceId,
    ip: String(body.ip || "").trim(),
    mac: String(body.mac || "").trim(),
    firmwareVersion: String(body.firmwareVersion || "").trim(),
    resettable: body.resettable !== false,
    isBuiltIn: false,
    legacyKey: null,
    createdAt: nowIso(),
    isActive: true
  };

  state.sensorRegistry.push(sensor);
  ensureSensorRegistryState();
  logEvent({
    type: "sensor-admin",
    title: "Добавлен новый датчик",
    text: `${sensor.name} (${sensor.deviceId})`,
    priority: "info",
    source: "ui",
    payload: { sensorId: sensor.id }
  });
  saveState();
  res.status(201).json({ ...sensor, state: getSensorComputedState(sensor) });
});

app.put("/api/sensors/:id", (req, res) => {
  const sensor = (state.sensorRegistry || []).find(item => item.id === req.params.id);
  if (!sensor) return res.status(404).json({ error: "Sensor not found" });

  const nextDeviceId = String(req.body?.deviceId || sensor.deviceId || "").trim();
  if ((state.sensorRegistry || []).some(item => item.id !== sensor.id && item.deviceId === nextDeviceId && item.isActive !== false)) {
    return res.status(400).json({ error: "deviceId already exists" });
  }

  sensor.name = String(req.body?.name || sensor.name).trim() || sensor.name;
  sensor.location = String(req.body?.location || sensor.location || sensor.name).trim() || sensor.location || sensor.name;
  sensor.deviceId = nextDeviceId || sensor.deviceId;
  sensor.icon = String(req.body?.icon || sensor.icon || "drop");
  sensor.ip = String(req.body?.ip ?? sensor.ip ?? "").trim();
  sensor.mac = String(req.body?.mac ?? sensor.mac ?? "").trim();
  sensor.firmwareVersion = String(req.body?.firmwareVersion ?? sensor.firmwareVersion ?? "").trim();
  sensor.resettable = typeof req.body?.resettable === "boolean" ? req.body.resettable : sensor.resettable;
  sensor.isActive = typeof req.body?.isActive === "boolean" ? req.body.isActive : sensor.isActive;
  saveState();
  res.json({ ...sensor, state: getSensorComputedState(sensor) });
});

app.delete("/api/sensors/:id", (req, res) => {
  const sensor = (state.sensorRegistry || []).find(item => item.id === req.params.id);
  if (!sensor) return res.status(404).json({ error: "Sensor not found" });
  if (sensor.isBuiltIn) {
    return res.status(400).json({ error: "Built-in sensor cannot be removed" });
  }
  sensor.isActive = false;
  saveState();
  res.json({ ok: true, id: sensor.id });
});

app.post("/api/sensors/event", (req, res) => {
  const deviceId = String(req.body?.deviceId || req.body?.device || "").trim();
  if (!deviceId) return res.status(400).json({ error: "deviceId is required" });

  const sensor = (state.sensorRegistry || []).find(item => item.deviceId === deviceId && item.isActive !== false);
  if (!sensor) return res.status(404).json({ error: "Sensor binding not found" });

  const status = typeof req.body?.status === "string"
    ? req.body.status
    : (typeof req.body?.alarm === "boolean" ? (req.body.alarm ? "leak" : "dry") : (typeof req.body?.rain === "boolean" ? (req.body.rain ? "leak" : "dry") : null));

  if (!VALID_LEAK_STATUSES.has(status)) {
    return res.status(400).json({ error: "Bad status" });
  }

  sensor.ip = String(req.body?.ip || sensor.ip || "").trim();
  sensor.mac = String(req.body?.mac || sensor.mac || "").trim();
  sensor.firmwareVersion = String(req.body?.firmwareVersion || sensor.firmwareVersion || "").trim();

  const result = applySensorState(sensor, status, req.body || {});
  res.json({ ok: true, sensorId: sensor.id, state: result, sensor });
});

app.get("/api/sensors/by-device/:deviceId/command", (req, res) => {
  const sensor = (state.sensorRegistry || []).find(item => item.deviceId === req.params.deviceId && item.isActive !== false);
  if (!sensor) return res.status(404).json({ error: "Sensor binding not found" });
  const computed = getSensorComputedState(sensor);
  res.json({
    sensorId: sensor.id,
    resetVersion: computed.resetVersion || 0,
    lastResetAt: computed.lastResetAt || null,
    status: computed.status || "unknown"
  });
});

app.post("/api/sensors/:id/maintenance", (req, res) => {
  const sensor = (state.sensorRegistry || []).find(item => item.id === req.params.id && item.isActive !== false);
  if (!sensor) return res.status(404).json({ error: "Sensor not found" });
  const minutes = Number(req.body?.minutes || 0);
  const current = state.sensorStates[sensor.id] || {};
  if (!Number.isFinite(minutes) || minutes <= 0) {
    current.maintenanceUntil = null;
    current.maintenanceReason = "";
  } else {
    const safeMinutes = Math.min(Math.max(Math.round(minutes), 1), 24 * 60);
    current.maintenanceUntil = new Date(Date.now() + safeMinutes * 60 * 1000).toISOString();
    current.maintenanceReason = String(req.body?.reason || "Ручное обслуживание").trim();
  }
  state.sensorStates[sensor.id] = {
    status: current.status || getSensorComputedState(sensor).status || "unknown",
    lastTriggerAt: current.lastTriggerAt || null,
    lastSeenAt: current.lastSeenAt || null,
    lastPayload: current.lastPayload || null,
    resetVersion: current.resetVersion || 0,
    lastResetAt: current.lastResetAt || null,
    maintenanceUntil: current.maintenanceUntil || null,
    maintenanceReason: current.maintenanceReason || ""
  };
  logEvent({
    type: "sensor-maintenance",
    title: current.maintenanceUntil ? `Обслуживание: ${sensor.name}` : `Обслуживание выключено: ${sensor.name}`,
    text: current.maintenanceUntil ? `Тревоги приглушены до ${new Date(current.maintenanceUntil).toLocaleString("ru-RU")}` : "Датчик снова работает в штатном режиме",
    priority: "info",
    source: "ui",
    payload: { sensorId: sensor.id, maintenanceUntil: current.maintenanceUntil }
  });
  saveState();
  res.json({ ok: true, sensorId: sensor.id, state: getSensorComputedState(sensor) });
});

app.post("/api/sensors/:id/reset", (req, res) => {
  const sensor = (state.sensorRegistry || []).find(item => item.id === req.params.id && item.isActive !== false);
  if (!sensor) return res.status(404).json({ error: "Sensor not found" });
  if (!sensor.resettable) return res.status(400).json({ error: "Sensor is not resettable" });
  const result = resetRegisteredSensor(sensor);
  res.json({ ok: true, sensorId: sensor.id, state: result });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API started on http://localhost:${PORT}`);
});
