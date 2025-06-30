import React, { useEffect, useState, useRef } from "react";

const WS_URL = "ws://localhost:8080";

interface Notification {
  id: string | number;
  text: string;
  from: string;
  date: string | number | Date;
}

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new window.WebSocket(WS_URL);

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setNotifications((prev) => [
          { ...data, id: data.id || Date.now() },
          ...prev.slice(0, 19),
        ]);
      } catch (err) {}
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [notifications]);

  const closeNotification = (id: string | number) => {
    setNotifications((prev) => prev.filter((note) => note.id !== id));
  };

  return (
    <div
      className="
        fixed right-5 bottom-5 z-50 w-96 max-w-[90vw] flex flex-col items-end
      "
    >
      <div
        ref={scrollRef}
        className="
          max-h-[300px] min-w-[280px]
          flex flex-col-reverse gap-3 overflow-y-auto
          bg-transparent
          scrollbar-thin scrollbar-thumb-[#232445] scrollbar-track-[#181825]
          rounded-xl"
        style={{
          boxShadow: "0 8px 24px #100e1d66"
        }}
      >
        {notifications.map((note, idx) => {
          const isLatest = idx === 0;
          return (
            <div
              key={note.id}
              className={`
                bg-[#22243c] rounded-lg p-4 shadow-lg text-gray-150 relative flex flex-col
                ${isLatest ? "border-2 border-blue-400 animate-pulse" : ""}
              `}
              style={isLatest ? { boxShadow: "0 0 14px 0 #3fa6f633" } : {}}
            >
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-100 p-1 rounded-full transition"
                onClick={() => closeNotification(note.id)}
                aria-label="Закрыть"
              >
                <svg width={18} height={18} viewBox="0 0 18 18">
                  <line x1="4" y1="4" x2="14" y2="14" stroke="currentColor" strokeWidth="2" />
                  <line x1="14" y1="4" x2="4" y2="14" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
              <div className="font-semibold mb-1 flex items-center gap-2">
                {isLatest && (
                  <span className="inline-block text-blue-400 animate-bounce text-lg" title="Новое">
                    ✨
                  </span>
                )}
                {note.from}
              </div>
              <div className="text-base">{note.text}</div>
              <div className="text-xs text-gray-400 mt-2">
                {String(new Date(note.date).toLocaleString("ru-RU"))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationCenter;
