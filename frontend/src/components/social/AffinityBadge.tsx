import React from 'react';
import type { AffinityResult } from '../../types/comparison';
import { Sparkles, Compass, Flame, Orbit } from 'lucide-react';

interface AffinityBadgeProps {
  affinity: AffinityResult;
}

export const AffinityBadge: React.FC<AffinityBadgeProps> = ({ affinity }) => {
  const { percentage, label, totalShared, totalOverlapRated } = affinity;

  const getTheme = () => {
    switch (label) {
      case 'Almas Cósmicas':
        return {
          icon: Sparkles,
          color: 'text-amber-300',
          glow: 'from-amber-500/20 via-yellow-500/10 to-transparent',
          border: 'border-amber-400/40',
          badgeBg: 'bg-amber-400/10 text-amber-200 border-amber-400/30',
        };
      case 'Frequência Harmônica':
        return {
          icon: Compass,
          color: 'text-emerald-300',
          glow: 'from-emerald-500/20 via-teal-500/10 to-transparent',
          border: 'border-emerald-400/40',
          badgeBg: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/30',
        };
      case 'Mundos Paralelos':
        return {
          icon: Orbit,
          color: 'text-orange-300',
          glow: 'from-orange-500/20 via-amber-500/10 to-transparent',
          border: 'border-orange-400/40',
          badgeBg: 'bg-orange-400/10 text-orange-200 border-orange-400/30',
        };
      case 'Caos Gravitacional':
      default:
        return {
          icon: Flame,
          color: 'text-rose-300',
          glow: 'from-rose-500/20 via-purple-500/10 to-transparent',
          border: 'border-rose-400/40',
          badgeBg: 'bg-rose-400/10 text-rose-200 border-rose-400/30',
        };
    }
  };

  const theme = getTheme();
  const IconComponent = theme.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.glow} p-6 backdrop-blur-md transition-all duration-300 shadow-xl`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Lado Esquerdo: Gauge e Porcentagem */}
        <div className="flex items-center gap-5">
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-white/10 bg-black/30 shadow-inner">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-white/10"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className={`${theme.color} transition-all duration-1000 ease-out`}
                strokeWidth="8"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="flex flex-col items-center justify-center z-10">
              <span className={`text-2xl font-bold font-['Cinzel'] ${theme.color}`}>
                {percentage}%
              </span>
              <span className="text-[10px] uppercase tracking-widest text-stone-300/80">Match</span>
            </div>
          </div>

          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${theme.badgeBg}`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                {label}
              </span>
            </div>
            <h3 className="text-xl font-bold text-stone-100 font-['Cinzel']">
              Sincronia Cósmica
            </h3>
            <p className="text-sm text-stone-300/80 max-w-sm">
              Ressonância calculada a partir de sobreposição de acervos e afinidade cirúrgica de avaliações.
            </p>
          </div>
        </div>

        {/* Lado Direito: Estatísticas de Cruzamento */}
        <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-around sm:justify-end">
          <div className="text-center sm:text-right">
            <p className="text-2xl font-bold text-stone-100 font-['Cinzel']">{totalShared}</p>
            <p className="text-xs text-stone-400">Obras em Comum</p>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div className="text-center sm:text-right">
            <p className="text-2xl font-bold text-amber-300 font-['Cinzel']">
              {totalOverlapRated}
            </p>
            <p className="text-xs text-stone-400">Avaliações Cruzadas</p>
          </div>
        </div>
      </div>
    </div>
  );
};
