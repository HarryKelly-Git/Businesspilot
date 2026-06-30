import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { logo: 'w-7 h-7', text: 'text-base' },
    md: { logo: 'w-9 h-9', text: 'text-xl' },
    lg: { logo: 'w-12 h-12', text: 'text-2xl' },
  };

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showText && (
        <span className={cn('font-extrabold tracking-tight', sizes[size].text)}>
          <span className="text-foreground">Business</span>
          <span className="text-[hsl(var(--accent))]">Pilot</span>
        </span>
      )}
    </div>
  );
}

export function LogoMark({ className, size = 'md' }: Pick<LogoProps, 'className' | 'size'>) {
  const sizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={cn(
        'relative rounded-xl flex items-center justify-center shadow-lg',
        sizes[size],
        className
      )}
      style={{
        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(220 30% 18%) 100%)',
      }}
    >
      {/* Navigation compass / direction indicator - evokes reliability, getting there first */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="w-[55%] h-[55%]"
      >
        {/* Compass outer ring */}
        <circle
          cx="16"
          cy="16"
          r="12"
          className="stroke-white/20"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Directional arrow pointing NE - speed, forward motion */}
        <path
          d="M16 6 L16 16 L26 16"
          className="stroke-white stroke-[2.5] fill-none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center point */}
        <circle
          cx="16"
          cy="16"
          r="2"
          className="fill-white"
        />

        {/* Speed accent lines */}
        <path
          d="M8 22 L12 22"
          className="stroke-white/40 stroke-[1.5] fill-none"
          strokeLinecap="round"
        />
        <path
          d="M10 25 L14 25"
          className="stroke-white/30 stroke-[1.5] fill-none"
          strokeLinecap="round"
        />
      </svg>

      {/* Subtle glow effect */}
      <div
        className="absolute inset-0 rounded-xl opacity-50"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)',
        }}
      />
    </div>
  );
}

// Favicon version - simplified for small sizes
export function FaviconMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
      <path
        d="M16 6 L16 16 L26 16"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="16" cy="16" r="2.5" fill="white" />
    </svg>
  );
}
