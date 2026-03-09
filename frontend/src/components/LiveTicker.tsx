import { useState, useEffect, useRef } from 'react';

export default function LiveTicker({ entries = 0 }: { entries?: number }) {
  const [displayed, setDisplayed] = useState(entries);
  const prevRef = useRef(entries);

  // Animate the counter when entries prop changes
  useEffect(() => {
    const start = prevRef.current;
    const end = entries;
    if (start === end) return;
    prevRef.current = end;
    const diff = end - start;
    const steps = 30;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayed(end);
        clearInterval(timer);
      } else {
        setDisplayed(Math.round(start + (diff * step) / steps));
      }
    }, 33);
    return () => clearInterval(timer);
  }, [entries]);

  return (
    <div className="bg-slate-800/50 border-y border-slate-700 py-2 overflow-hidden">
      <div className="ticker-animate whitespace-nowrap flex items-center gap-6">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full pulse-dot" />
          <span className="text-sm text-slate-300">
            <strong className="text-white">{displayed.toLocaleString()}</strong> citizen voices analyzed today
          </span>
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-sm text-slate-300">Real-time multilingual sentiment analysis across 22+ Indian languages</span>
        <span className="text-slate-500">|</span>
        <span className="text-sm text-slate-300">Powered by <strong className="text-blue-400">JanaNaadi AI</strong></span>
        <span className="text-slate-500">|</span>
        <span className="text-sm text-slate-300">Booth → Ward → Constituency → District → State</span>
      </div>
    </div>
  );
}
