import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak?: number;
  showRecord?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 28,
};

export function StreakDisplay({
  currentStreak,
  longestStreak,
  showRecord = false,
  size = 'md',
  className
}: StreakDisplayProps) {
  const { t } = useTranslation();
  const isActive = currentStreak > 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <Flame
          size={iconSizes[size]}
          className={cn(
            'transition-all duration-300',
            isActive ? 'text-streak-flame flame-glow' : 'text-muted-foreground/50'
          )}
          fill={isActive ? 'currentColor' : 'none'}
        />
        {isActive && currentStreak >= 7 && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-streak-glow rounded-full animate-pulse-soft" />
        )}
      </div>
      <div className="flex flex-col">
        <span className={cn('font-bold', sizeClasses[size], isActive ? 'text-foreground' : 'text-muted-foreground')}>
          {t(currentStreak === 1 ? 'streak.day' : 'streak.days', { count: currentStreak })}
        </span>
        {showRecord && longestStreak !== undefined && longestStreak > currentStreak && (
          <span className="text-xs text-muted-foreground">
            {t('streak.best', { count: longestStreak })}
          </span>
        )}
      </div>
    </div>
  );
}
