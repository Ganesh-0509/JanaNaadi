import { sentimentColor } from '../utils/colors';
import { formatRelative } from '../utils/formatters';

interface Voice {
  id: string;
  text: string;
  sentiment: string;
  sentiment_score: number;
  topic?: string;
  location?: string;
  date?: string;
}

interface Props {
  voices: Voice[];
}

export default function VoiceTable({ voices }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-3 px-3 text-slate-400 font-medium">Voice</th>
            <th className="text-left py-3 px-3 text-slate-400 font-medium w-24">Sentiment</th>
            <th className="text-left py-3 px-3 text-slate-400 font-medium w-32">Location</th>
            <th className="text-left py-3 px-3 text-slate-400 font-medium w-24">Time</th>
          </tr>
        </thead>
        <tbody>
          {voices.map((v) => (
            <tr key={v.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="py-3 px-3">
                <div className="max-w-md truncate">{v.text}</div>
              </td>
              <td className="py-3 px-3">
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: `${sentimentColor(v.sentiment)}20`,
                    color: sentimentColor(v.sentiment),
                  }}
                >
                  {v.sentiment}
                </span>
              </td>
              <td className="py-3 px-3 text-slate-400">{v.location || '—'}</td>
              <td className="py-3 px-3 text-slate-400">{formatRelative(v.date || null)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {voices.length === 0 && (
        <div className="text-center py-8 text-slate-400">No voices found</div>
      )}
    </div>
  );
}
