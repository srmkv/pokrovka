#include <SPI.h>
#include <Ethernet.h>

/* ---------- Пользовательские настройки сети ---------- */
// Уникальный MAC (можно любой, но не конфликтующий в сети)
byte MAC[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0x12, 0x34 };

// Статический IP (fallback), если DHCP не выдаст адрес
IPAddress STATIC_IP(192, 168, 0, 200);
IPAddress GATEWAY  (192, 168, 0, 1);
IPAddress SUBNET   (255, 255, 255, 0);
IPAddress DNS      (192, 168, 0, 1);

/* ---------- Пины и параметры детекции ---------- */
const uint8_t SENSOR_PIN = 2;     // вход от оптопары (инверсная логика, используем INPUT_PULLUP)

// Для AC-оптопары (H11AA1) делаем окно усреднения:
const unsigned long WINDOW_MS = 300;   // насколько долго «накапливаем» выборки
const uint16_t      MIN_LOW_COUNT = 10; // порог LOW-сэмплов за окно, чтобы считать «лампа ВКЛ»

// Антидребезг финального состояния (защита от фликера):
const unsigned long STABLE_MS = 250;

/* ---------- Веб-сервер ---------- */
EthernetServer server(80);

/* ---------- Внутренние переменные ---------- */
unsigned long windowStartMs = 0;
uint16_t lowCountInWindow = 0;
uint16_t sampleCountInWindow = 0;

bool lampOnComputed = false;       // результат вычисления за окно
bool lampOnStable = false;         // «устойчивое» состояние для вывода
bool lastLampOnStable = false;
unsigned long lastChangeMs = 0;

void printIp(const IPAddress& ip) {
  for (int i = 0; i < 4; i++) {
    Serial.print(ip[i]);
    if (i < 3) Serial.print('.');
  }
}

void startEthernet() {
  Serial.print("Ethernet init (DHCP)...");
  if (Ethernet.begin(MAC) == 0) {
    Serial.println("DHCP failed, using static IP.");
    Ethernet.begin(MAC, STATIC_IP, DNS, GATEWAY, SUBNET);
  } else {
    Serial.println("OK (DHCP).");
  }

  Serial.print("IP: ");
  printIp(Ethernet.localIP());
  Serial.print("  GW: ");
  printIp(Ethernet.gatewayIP());
  Serial.print("  DNS: ");
  printIp(Ethernet.dnsServerIP());
  Serial.print("  MASK: ");
  printIp(Ethernet.subnetMask());
  Serial.println();

  delay(200);
  server.begin();
  Serial.println("HTTP server started on port 80");
}

/* ---------- Формирование ответа ---------- */
void sendHttpHeader(EthernetClient &client, const char* contentType, bool noCache = true) {
  client.println(F("HTTP/1.1 200 OK"));
  client.print  (F("Content-Type: "));
  client.println(contentType);
  if (noCache) {
    client.println(F("Cache-Control: no-store, no-cache, must-revalidate"));
    client.println(F("Pragma: no-cache"));
    client.println(F("Expires: 0"));
  }
  client.println(F("Connection: close"));
  client.println();
}

void sendNotFound(EthernetClient &client) {
  client.println(F("HTTP/1.1 404 Not Found"));
  client.println(F("Content-Type: text/plain; charset=utf-8"));
  client.println(F("Connection: close"));
  client.println();
  client.println(F("404 Not Found"));
}

void handleRoot(EthernetClient &client) {
  sendHttpHeader(client, "text/html; charset=utf-8");

  // лёгкая страница с автообновлением статуса через fetch /api/status
  client.println(F("<!doctype html><html><head><meta charset='utf-8'>"
                   "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                   "<title>Lamp monitor</title>"
                   "<style>"
                   "body{font-family:sans-serif;margin:2rem;background:#f6f6f6;color:#222}"
                   ".card{max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 6px 24px rgba(0,0,0,.08)}"
                   ".state{font-size:2rem;margin:.5rem 0}"
                   ".on{color:#0a7a2f}"
                   ".off{color:#b00020}"
                   ".pill{display:inline-block;border-radius:999px;padding:.2rem .8rem;font-size:.9rem;background:#eee}"
                   ".grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}"
                   "small{color:#666}"
                   "button{padding:.6rem 1rem;border:0;border-radius:8px;cursor:pointer}"
                   "</style>"
                   "</head><body><div class='card'>"
                   "<h2>Состояние лампы (по оптопаре)</h2>"
                   "<div id='state' class='state'>—</div>"
                   "<div class='grid'>"
                   "<div><small>Устойчивое:</small><div id='stable' class='pill'>—</div></div>"
                   "<div><small>Сырые LOW/общее:</small><div id='raw' class='pill'>—</div></div>"
                   "</div>"
                   "<div style='margin-top:16px'>"
                   "<small>Обновление каждые 500 мс. Эндпоинт: <code>/api/status</code></small>"
                   "</div>"
                   "<script>"
                   "async function upd(){"
                     "try{"
                       "const r=await fetch('/api/status',{cache:'no-store'});"
                       "const j=await r.json();"
                       "document.getElementById('state').textContent=j.lamp?'Лампа ВКЛ':'Лампа ВЫКЛ';"
                       "document.getElementById('state').className='state '+(j.lamp?'on':'off');"
                       "document.getElementById('stable').textContent=j.stable?'стабильное':'нестабильное';"
                       "document.getElementById('raw').textContent=j.low_count+'/'+j.samples;"
                     "}catch(e){console.log(e)}"
                   "}"
                   "upd(); setInterval(upd,500);"
                   "</script>"
                   "</div></body></html>"));
}

void handleApiStatus(EthernetClient &client) {
  sendHttpHeader(client, "application/json; charset=utf-8");
  client.print(F("{\"lamp\":"));
  client.print(lampOnStable ? F("true") : F("false"));
  client.print(F(",\"stable\":"));
  client.print((millis() - lastChangeMs) >= STABLE_MS ? F("true") : F("false"));
  client.print(F(",\"low_count\":"));
  client.print(lowCountInWindow);
  client.print(F(",\"samples\":"));
  client.print(sampleCountInWindow);
  client.print(F(",\"window_ms\":"));
  client.print(WINDOW_MS);
  client.println(F("}"));
}

void handleClient() {
  EthernetClient client = server.available();
  if (!client) return;

  // читаем первую строку запроса (метод + путь)
  char reqLine[128];
  size_t idx = 0;
  unsigned long t0 = millis();
  bool gotLine = false;

  while (client.connected() && (millis() - t0 < 1000)) {
    if (client.available()) {
      char c = client.read();
      if (c == '\r') continue;
      if (c == '\n') { gotLine = true; break; }
      if (idx < sizeof(reqLine) - 1) reqLine[idx++] = c;
    }
  }
  reqLine[idx] = 0;

  // дочитываем и отбрасываем заголовки
  while (client.connected() && (millis() - t0 < 1200)) {
    if (client.available()) {
      char c = client.read();
      if (c == '\n') {
        // пустая строка — конец заголовков
        if (client.peek() == '\n') break;
      }
    } else {
      break;
    }
  }

  if (!gotLine) {
    sendNotFound(client);
    client.stop();
    return;
  }

  // очень простой роутинг
  // ожидаем строку вида: "GET /path HTTP/1.1"
  if (strncmp(reqLine, "GET ", 4) == 0) {
    const char* path = reqLine + 4;
    const char* sp = strchr(path, ' ');
    size_t pathLen = sp ? (size_t)(sp - path) : strlen(path);

    // сравниваем пути
    if (pathLen == 1 && path[0] == '/') {
      handleRoot(client);
    } else if (pathLen == 11 && strncmp(path, "/api/status", 11) == 0) {
      handleApiStatus(client);
    } else {
      sendNotFound(client);
    }
  } else {
    sendNotFound(client);
  }

  delay(1);
  client.stop();
}

/* ---------- Логика детекции ---------- */
void updateWindowedDetection() {
  // накапливаем сэмплы в окне
  bool level = digitalRead(SENSOR_PIN); // HIGH/LOW (инверсная логика)
  sampleCountInWindow++;
  if (level == LOW) lowCountInWindow++;

  unsigned long now = millis();
  if (now - windowStartMs >= WINDOW_MS) {
    // вычисляем «лампа ON» по порогу LOW-сэмплов
    bool lamp = (lowCountInWindow >= MIN_LOW_COUNT);

    // антифликер: меняем state только если держится >= STABLE_MS
    if (lamp != lampOnStable) {
      if (now - lastChangeMs >= STABLE_MS) {
        lampOnStable = lamp;
        lastChangeMs = now;
      }
    } else {
      // состояние не изменилось — просто фиксируем время
      lastChangeMs = now;
    }

    lampOnComputed = lamp;

    // сбрасываем окно
    windowStartMs = now;
    lowCountInWindow = 0;
    sampleCountInWindow = 0;

    // для отладки в Serial при изменении
    if (lampOnStable != lastLampOnStable) {
      lastLampOnStable = lampOnStable;
      Serial.println(lampOnStable ? F("Lamp ON (stable)") : F("Lamp OFF (stable)"));
    }
  }
}

void setup() {
  Serial.begin(9600);
  while (!Serial) { ; }

  pinMode(SENSOR_PIN, INPUT_PULLUP); // инверсная логика: LOW = активный

  // Ethernet
  startEthernet();

  // окно усреднения
  windowStartMs = millis();
  lastChangeMs = millis();
}

void loop() {
  // основная логика детекции
  updateWindowedDetection();

  // обслуживание HTTP клиентов
  handleClient();
}
