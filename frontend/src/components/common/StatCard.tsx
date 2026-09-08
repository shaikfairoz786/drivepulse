import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'brand' | 'emerald' | 'amber' | 'rose' | 'purple';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'brand',
  onClick,
}) => {
  const variantStyles = {
    brand: 'from-brand-500/10 to-brand-500/0 border-brand-500/20 text-brand-400',
    emerald: 'from-emerald-500/10 to-emerald-500/0 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 to-amber-500/0 border-amber-500/20 text-amber-400',
    rose: 'from-rose-500/10 to-rose-500/0 border-rose-500/20 text-rose-400',
    purple: 'from-purple-500/10 to-purple-500/0 border-purple-500/20 text-purple-400',
  };

  const iconBgStyles = {
    brand: 'bg-brand-500/20 text-brand-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    rose: 'bg-rose-500/20 text-rose-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg backdrop-blur-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-700 hover:scale-[1.01] hover:shadow-xl' : ''
      }`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${variantStyles[variant]} rounded-full blur-2xl pointer-events-none -mr-10 -mt-10`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            {title}
          </p>
          <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            {value}
          </h4>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              {subtitle}
            </p>
          )}
          {trend && (
            <span
              className={`inline-flex items-center text-xs font-semibold mt-2 px-1.5 py-0.5 rounded ${
                trend.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgStyles[variant]} shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
