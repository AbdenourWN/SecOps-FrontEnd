"use client";

import { useEffect, useState } from "react";

export function FooterBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(new Date().toISOString().slice(0, 19).replace("T", " "));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-5 py-2.5 text-xs text-muted-foreground font-mono">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          GLOBAL ENGINE: ONLINE
        </span>
        <span>LATENCY: 14MS</span>
      </div>
      <div className="flex items-center gap-4">
        <span>SENTINEL-NODE-01: {time} UTC</span>
        <span>SHA-256: 4e91...f2a0</span>
      </div>
    </div>
  );
}
