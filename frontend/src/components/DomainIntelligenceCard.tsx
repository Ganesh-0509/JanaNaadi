import React from 'react';
import { DomainIntelligence } from '../api/ontology';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface DomainCardProps {
  intelligence: DomainIntelligence;
  onClick?: () => void;
}

const DOMAIN_CONFIG: Record<string, { emoji: string; titleClass: string; dotClass: string }> = {
  geopolitics: { emoji: '🌍', titleClass: 'text-sky-400', dotClass: 'bg-sky-400' },
  economics: { emoji: '💰', titleClass: 'text-emerald-400', dotClass: 'bg-emerald-400' },
  defense: { emoji: '🛡️', titleClass: 'text-rose-400', dotClass: 'bg-rose-400' },
  climate: { emoji: '🌱', titleClass: 'text-lime-400', dotClass: 'bg-lime-400' },
  technology: { emoji: '💻', titleClass: 'text-indigo-400', dotClass: 'bg-indigo-400' },
  society: { emoji: '👥', titleClass: 'text-amber-400', dotClass: 'bg-amber-400' },
};

const URGENCY_CONFIG: Record<string, { color: string; bg: string; text: string }> = {
  low: { color: 'slate', bg: 'bg-slate-500/15', text: 'text-slate-300' },
  moderate: { color: 'teal', bg: 'bg-[#2FA4D7]/20', text: 'text-[#7ACCF9]' },
  high: { color: 'amber', bg: 'bg-amber-500/20', text: 'text-amber-300' },
  critical: { color: 'red', bg: 'bg-red-500/20', text: 'text-red-300' },
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
    if (!intelligence.sentiment_trend) return <Minus size={16} className="text-[#6B5E57]" />;
    if (intelligence.sentiment_trend > 0.1) return <TrendingUp size={16} className="text-green-600" />;
    if (intelligence.sentiment_trend < -0.1) return <TrendingDown size={16} className="text-red-600" />;
    return <Minus size={16} className="text-[#6B5E57]" />;
  };

  return (
    <div
      onClick={onClick}
      className={`bg-surface-base p-5 rounded-2xl shadow-sm border border-white/10 ${
        onClick ? 'cursor-pointer hover:shadow-xl hover:border-white/20' : ''
      } transition-all`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.emoji}</span>
          <h3 className={`font-bold text-lg capitalize ${config.titleClass}`}>
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
          <span className="text-sm text-[#6B5E57]">Risk Score</span>
          <span className={`text-2xl font-bold ${getRiskColor(intelligence.risk_score)}`}>
            {(intelligence.risk_score * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-surface-300/60 rounded-full h-2">
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
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
        <span className="text-sm text-content-secondary">Sentiment Trend</span>
        <div className="flex items-center gap-1">
          {getTrendIcon()}
          <span className="text-sm font-medium text-content-primary">
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
          <div className="text-xs font-semibold text-content-secondary mb-2">Key Factors</div>
          <div className="space-y-1">
            {intelligence.key_factors.slice(0, 3).map((factor, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${config.dotClass}`} />
                <span className="text-xs text-content-primary line-clamp-2">{factor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entity Count */}
      {intelligence.entity_ids && intelligence.entity_ids.length > 0 && (
        <div className="flex items-center justify-between text-xs text-content-secondary mt-3 pt-3 border-t border-white/10">
          <span>Entities Tracked</span>
          <span className="font-semibold text-content-primary">{intelligence.entity_ids.length}</span>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-content-secondary mt-2">
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
          <div key={i} className="bg-surface-base p-5 rounded-2xl shadow-sm border border-white/10 animate-pulse">
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
      <div className="bg-surface-base p-12 rounded-2xl shadow-sm border border-white/10 text-center">
        <AlertTriangle className="mx-auto mb-4 text-content-secondary" size={48} />
        <p className="text-content-secondary mb-2">No domain intelligence data available</p>
        <p className="text-sm text-content-secondary">Start ingesting domain-specific data to generate intelligence scores</p>
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
