import { useState, useEffect } from "react";

interface CountdownProps {
  targetDate: string;
  onSecondsChange?: (secs: number) => void;
}

export function Countdown({ targetDate, onSecondsChange }: CountdownProps) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    if (!targetDate) return;
    const update = () => {
      const secs = Math.max(
        0,
        Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000)
      );
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setDisplay(
        h > 0
          ? `${h}h ${String(m).padStart(2, "0")}m`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
      onSecondsChange?.(secs);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate, onSecondsChange]);
  return <span>{display}</span>;
}
