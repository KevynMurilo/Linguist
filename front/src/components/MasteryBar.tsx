import { getMasteryLevel, getMasteryColor, getMasteryLabelKey } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface MasteryBarProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

const heightClasses = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

export function MasteryBar({
  value,
  label,
  showPercentage = true,
  size = 'md',
  className,
  animate = true
}: MasteryBarProps) {
  const { t } = useTranslation();
  const level = getMasteryLevel(value);
  const colorClass = getMasteryColor(level);
  const masteryLabelKey = getMasteryLabelKey(level);
  const masteryLabel = t(masteryLabelKey as any);

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm font-medium truncate mr-2">{label}</span>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              colorClass,
              'text-white'
            )}>
              {masteryLabel}
            </span>
            {showPercentage && (
              <span className="text-sm font-semibold text-muted-foreground">
                {Math.round(value)}%
              </span>
            )}
          </div>
        </div>
      )}
      <div className={cn('mastery-bar', heightClasses[size])}>
        <div
          className={cn(
            'mastery-bar-fill',
            colorClass,
            animate && 'animate-[grow_0.8s_ease-out]'
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

// Simple progress ring component
interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  children
}: ProgressRingProps) {
  const level = getMasteryLevel(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getStrokeColor = () => {
    switch (level) {
      case 'critical': return 'stroke-mastery-critical';
      case 'weak': return 'stroke-mastery-weak';
      case 'progressing': return 'stroke-mastery-progressing';
      case 'good': return 'stroke-mastery-good';
      case 'mastered': return 'stroke-mastery-mastered';
    }
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-700 ease-out', getStrokeColor())}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          <span className="text-2xl font-bold">{Math.round(value)}%</span>
        )}
      </div>
    </div>
  );
}
