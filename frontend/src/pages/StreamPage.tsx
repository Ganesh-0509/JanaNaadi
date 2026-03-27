import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Wifi, WifiOff, Filter, MapPin, Tag } from 'lucide-react';
import { useState } from 'react';
import { useLiveStream } from '../hooks/useLiveStream';
import { formatRelative } from '../utils/formatters';

const SENTIMENT_BORDER: Record<string, string> = {
  positive: 'border-emerald-500/30',
  negative: 'border-red-500/30',
  neutral: 'border-slate-600',
};
const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-emerald-500/15 text-emerald-700',
  negative: 'bg-red-500/15 text-red-700',
  neutral: 'bg-[#E9E2D7] text-[#6B5E57]',
};
const SENTIMENT_SCORE: Record<string, string> = {
  positive: 'text-emerald-700',
  negative: 'text-red-700',
  neutral: 'text-amber-700',
};

export default function StreamPage() {
  const { entries, status } = useLiveStream(80);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');

  const visible = filter === 'all' ? entries : entries.filter((e) => e.sentiment === filter);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-6 text-[#3E2C23]"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#3E2C23] flex items-center gap-2">
            <Radio size={24} className="text-[#2FA4D7]" />
            Live Voice Stream
          </h1>
          <p className="text-sm text-[#6B5E57] font-semibold">Real-time voices as they are ingested — every entry pushed live</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection badge */}
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
            status === 'connected'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : status === 'connecting'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {status === 'connected' ? <Wifi size={13} /> : <WifiOff size={13} />}
            {status === 'connected' ? 'LIVE' : status === 'connecting' ? 'Connecting…' : 'OFFLINE'}
          </div>

          {/* Entry count */}
          <div className="text-xs font-semibold text-[#FFF7EE] bg-[#3E2C23] border border-[#6B5E57]/30 rounded-full px-3 py-1.5">
            {entries.length} received
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-[#6B5E57]" />
        {(['all', 'positive', 'negative', 'neutral'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors border ${
              filter === f
                ? f === 'positive' ? 'bg-emerald-500 text-white'
                : f === 'negative' ? 'bg-red-500 text-white'
                : f === 'neutral' ? 'bg-yellow-500 text-white'
                : 'bg-[#2FA4D7] text-white'
                : 'bg-white text-[#3E2C23] border-[#3E2C23]/20 hover:bg-[#FAF5ED]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Waiting state */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-[#3E2C23] gap-4">
          <div className="relative">
            <Radio size={48} className="opacity-30" />
            {status === 'connected' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <p className="text-sm">
            {status === 'connected'
              ? 'Waiting for incoming voices…'
              : status === 'connecting'
              ? 'Connecting to live feed…'
              : 'Disconnected — retrying in 5s'}
          </p>
          <p className="text-xs text-[#6B5E57] font-semibold">News, Reddit &amp; citizen voices stream here automatically every 2 hours</p>
        </div>
      )}

      {/* Stream */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {visible.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`bg-[#FAF5ED] rounded-xl p-4 border shadow-sm ${SENTIMENT_BORDER[entry.sentiment] ?? 'border-[#3E2C23]/15'}`}
            >
              <p className="text-sm font-medium text-[#3E2C23] leading-relaxed mb-2 line-clamp-3">"{entry.text}"</p>
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${SENTIMENT_BADGE[entry.sentiment] ?? ''}`}>
                  {entry.sentiment}
                </span>
                <span className={`font-mono ${SENTIMENT_SCORE[entry.sentiment] ?? 'text-[#6B5E57]'}`}>
                  {entry.sentiment_score > 0 ? '+' : ''}{entry.sentiment_score.toFixed(3)}
                </span>
                {entry.source && (
                  <span className="px-2 py-0.5 rounded-full bg-[#2FA4D7]/15 text-[#2FA4D7] capitalize">{entry.source}</span>
                )}
                {entry.state && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-[#C65A1F]">
                    <MapPin size={10} />{entry.state}
                  </span>
                )}
                {entry.topic && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700">
                    <Tag size={10} />{entry.topic}
                  </span>
                )}
                {entry.language && entry.language !== 'en' && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 uppercase">{entry.language}</span>
                )}
                {entry.historical && (
                  <span className="px-2 py-0.5 rounded-full bg-[#E9E2D7] text-[#6B5E57] text-[10px]">history</span>
                )}
                <span className="ml-auto text-[#8E8178]">{formatRelative(new Date(entry.receivedAt).toISOString())}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
