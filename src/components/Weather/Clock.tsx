// src/components/Clock.tsx
import { useNow } from "../../hooks/useNow";

const Clock: React.FC<{ fontSize?: number }> = ({ fontSize = 30 }) => {
  const now = useNow(1000); // обновление каждую секунду
  return (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      alignmentBaseline="middle"
      fontSize={fontSize}
      fontWeight={700}
      fill="#fff"
      dominantBaseline="middle"
    >
      {now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
    </text>
  );
};

export default Clock;
