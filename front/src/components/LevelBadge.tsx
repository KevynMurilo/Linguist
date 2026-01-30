import { LanguageLevel, getLevelColor } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: LanguageLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-bold rounded-full text-white level-badge',
        getLevelColor(level),
        sizeClasses[size],
        className
      )}
    >
      {level}
    </span>
  );
}
