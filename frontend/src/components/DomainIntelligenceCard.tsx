import React from 'react';
import { DomainIntelligence } from '../api/ontology';
import { Shield, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface DomainCardProps {
  intelligence: DomainIntelligence;
  onClick?: () => void;
}

const DOMAIN_CONFIG: Record<string, { color: string; icon: string; emoji: string }> = {
  geopolitics: { color: 'blue', icon: '🌍', emoji: '🌍' },
  economics: { color: 'green', icon: '💰', emoji: '💰' },
  defense: { color: 'red', icon: '🛡️', emoji: '🛡️' },
  climate: { color: 'emerald', icon: '🌱', emoji: '🌱' },
  technology: { color: 'purple', icon: '💻', emoji: '💻' },
  society: { color: 'amber', icon: '👥', emoji: '👥' },
};

const URGENCY_CONFIG: Record<string, { color: string; bg: string; text: string }> = {
  low: { color: 'slate', bg: 'bg-slate-100', text: 'text-slate-700' },
  moderate: { color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
  high: { color: 'amber', bg: 'bg-amber-100', text: 'text-amber-700' },
  critical: { color: 'red', bg: 'bg-red-100', text: 'text-red-700' },
};

export const DomainIntelligenceCard: React.FC<DomainCardProps> = ({ intelligence, onClick }) => {
  const config = DOMAIN_CONFIG[intelligence.domain] || DOMAIN_CONFIG.society;
  const urgencyStyle = URGENCY_CONFIG[intelligence.urgency_level];

  const getRiskColor = (score: number) => {
    if (score >= 0.7) return 'text-red-600';
    if (score >= 0.4) return 'text-amber-600';
    return 'text-green-600';
  };

  const getTrendIcon = () => {
    if (!intelligence.sentiment_trend) return <Minus size={16} className="text-slate-400" />;
    if (intelligence.sentiment_trend > 0.1) return <TrendingUp size={16} className="text-green-600" />;
    if (intelligence.sentiment_trend < -0.1) return <TrendingDown size={16} className="text-red-600" />;
    return <Minus size={16} className="text-slate-400" />;
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white p-5 rounded-lg shadow-sm border-2 border-${config.color}-200 ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } transition-all`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.emoji}</span>
          <h3 className={`font-bold text-lg text-${config.color}-900 capitalize`}>
            {intelligence.domain}
          </h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${urgencyStyle.bg} ${urgencyStyle.text} uppercase`}>
          {intelligence.urgency_level}
        </div>
      </div>

      {/* Risk Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600">Risk Score</span>
          <span className={`text-2xl font-bold ${getRiskColor(intelligence.risk_score)}`}>
            {(intelligence.risk_score * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              intelligence.risk_score >= 0.7 ? 'bg-red-500' :
              intelligence.risk_score >= 0.4 ? 'bg-amber-500' :
              'bg-green-500'
            }`}
            style={{ width: `${intelligence.risk_score * 100}%` }}
          />
        </div>
      </div>

      {/* Sentiment Trend */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
        <span className="text-sm text-slate-600">Sentiment Trend</span>
        <div className="flex items-center gap-1">
          {getTrendIcon()}
          <span className="text-sm font-medium text-slate-700">
            {intelligence.sentiment_trend 
              ? `${(intelligence.sentiment_trend * 100).toFixed(0)}%`
              : 'Stable'
            }
          </span>
        </div>
      </div>

      {/* Key Factors */}
      {intelligence.key_factors && intelligence.key_factors.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-slate-600 mb-2">Key Factors</div>
          <div className="space-y-1">
            {intelligence.key_factors.slice(0, 3).map((factor, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full bg-${config.color}-500 mt-1.5`} />
                <span className="text-xs text-slate-700 line-clamp-2">{factor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entity Count */}
      {intelligence.entity_ids && intelligence.entity_ids.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
          <span>Entities Tracked</span>
          <span className="font-semibold text-slate-700">{intelligence.entity_ids.length}</span>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-slate-400 mt-2">
        Updated {new Date(intelligence.computed_at).toLocaleTimeString()}
      </div>
    </div>
  );
};

interface DomainGridProps {
  intelligences: DomainIntelligence[];
  loading?: boolean;
  onDomainClick?: (domain: string) => void;
}

export const DomainIntelligenceGrid: React.FC<DomainGridProps> = ({
  intelligences,
  loading,
  onDomainClick,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!intelligences || intelligences.length === 0) {
    return (
      <div className="bg-white p-12 rounded-lg shadow-sm border border-slate-200 text-center">
        <AlertTriangle className="mx-auto mb-4 text-slate-400" size={48} />
        <p className="text-slate-600 mb-2">No domain intelligence data available</p>
        <p className="text-sm text-slate-500">Start ingesting domain-specific data to generate intelligence scores</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {intelligences.map((intel) => (
        <DomainIntelligenceCard
          key={intel.id}
          intelligence={intel}
          onClick={onDomainClick ? () => onDomainClick(intel.domain) : undefined}
        />
      ))}
    </div>
  );
};
