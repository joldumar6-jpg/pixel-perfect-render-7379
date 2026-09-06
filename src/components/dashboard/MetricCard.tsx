
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'amber' | 'emerald' | 'blue' | 'red' | 'slate';
  trend?: 'up' | 'down' | 'neutral';
}

const colorClasses = {
  amber: {
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    text: 'text-amber-400',
    icon: 'text-amber-400',
  },
  emerald: {
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
  },
  blue: {
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    text: 'text-blue-400',
    icon: 'text-blue-400',
  },
  red: {
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
    text: 'text-red-400',
    icon: 'text-red-400',
  },
  slate: {
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/20',
    text: 'text-slate-400',
    icon: 'text-slate-400',
  },
};

export function MetricCard({ title, value, subtitle, icon: Icon, color = 'slate', trend }: MetricCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={cn('p-4 rounded-xl border bg-[#0f172a]', colors.border)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-3xl font-bold', colors.text)}>
              {value}
            </span>
            {trend && (
              <span className={cn(
                'text-xs',
                trend === 'up' && 'text-emerald-400',
                trend === 'down' && 'text-red-400',
                trend === 'neutral' && 'text-slate-500'
              )}>
                {trend === 'up' && '+'}
                {trend === 'down' && '-'}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
      </div>
    </div>
  );
}
