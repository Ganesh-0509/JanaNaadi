export default function LiveTicker({ entries = 0 }: { entries?: number }) {
  return (
    <div className="bg-slate-800/50 border-y border-slate-700 py-2 overflow-hidden">
      <div className="ticker-animate whitespace-nowrap flex items-center gap-6">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full pulse-dot" />
          <span className="text-sm text-slate-300">
            <strong className="text-white">{entries.toLocaleString()}</strong> citizen voices analyzed today
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
