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
  positive: 'bg-emerald-500/20 text-emerald-400',
  negative: 'bg-red-500/20 text-red-400',
  neutral: 'bg-slate-600/40 text-slate-400',
};
const SENTIMENT_SCORE: Record<string, string> = {
  positive: 'text-emerald-400',
  negative: 'text-red-400',
  neutral: 'text-yellow-400',
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
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio size={24} className="text-blue-400" />
            Live Voice Stream
          </h1>
          <p className="text-sm text-slate-400">Real-time voices as they are ingested — every entry pushed live</p>
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
          <div className="text-xs text-slate-500 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5">
            {entries.length} received
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-slate-500" />
        {(['all', 'positive', 'negative', 'neutral'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === f
                ? f === 'positive' ? 'bg-emerald-500 text-white'
                : f === 'negative' ? 'bg-red-500 text-white'
                : f === 'neutral' ? 'bg-yellow-500 text-white'
                : 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Waiting state */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
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
          <p className="text-xs text-slate-600">News, Reddit &amp; citizen voices stream here automatically every 2 hours</p>
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
              className={`bg-slate-800 rounded-xl p-4 border ${SENTIMENT_BORDER[entry.sentiment] ?? 'border-slate-700'}`}
            >
              <p className="text-sm text-slate-200 leading-relaxed mb-2 line-clamp-3">"{entry.text}"</p>
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${SENTIMENT_BADGE[entry.sentiment] ?? ''}`}>
                  {entry.sentiment}
                </span>
                <span className={`font-mono ${SENTIMENT_SCORE[entry.sentiment] ?? 'text-slate-400'}`}>
                  {entry.sentiment_score > 0 ? '+' : ''}{entry.sentiment_score.toFixed(3)}
                </span>
                {entry.source && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 capitalize">{entry.source}</span>
                )}
                {entry.state && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300">
                    <MapPin size={10} />{entry.state}
                  </span>
                )}
                {entry.topic && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300">
                    <Tag size={10} />{entry.topic}
                  </span>
                )}
                {entry.language && entry.language !== 'en' && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 uppercase">{entry.language}</span>
                )}
                {entry.historical && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-500 text-[10px]">history</span>
                )}
                <span className="ml-auto text-slate-600">{formatRelative(new Date(entry.receivedAt).toISOString())}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
