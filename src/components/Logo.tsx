import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const SIZE_CLASSES = {
  sm: { logo: 'w-7 h-7', text: 'text-base' },
  md: { logo: 'w-9 h-9', text: 'text-xl' },
  lg: { logo: 'w-12 h-12', text: 'text-2xl' },
};

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showText && (
        <span className={cn('font-extrabold tracking-tight', SIZE_CLASSES[size].text)}>
          <span className="text-foreground">Business</span>
          <span className="text-[hsl(var(--accent))]">Pilot</span>
        </span>
      )}
    </div>
  );
}

/**
 * BusinessPilot mark — a speedometer/dial with an orange needle forming a
 * stylised "B", on the brand slate rounded-square. Inline SVG so it stays
 * razor-sharp at every size (favicon → hero) with no image request, and the
 * exact same artwork as public/favicon.svg + the generated icon PNGs.
 */
export function LogoMark({ className, size = 'md' }: Pick<LogoProps, 'className' | 'size'>) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn(SIZE_CLASSES[size].logo, className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BusinessPilot"
    >
      <defs>
        <linearGradient id="bp-logo-grad" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#f9a01f" />
          <stop offset="1" stopColor="#ef7b12" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="115" fill="#2d3748" />
      {/* orange "B" — upper bowl + lower tail */}
      <path
        d="M 250 148 C 366 150 382 250 312 292 C 384 312 380 430 246 430"
        fill="none"
        stroke="url(#bp-logo-grad)"
        strokeWidth="50"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* speedometer dial */}
      <path
        d="M 147.6 373.5 A 150 150 0 1 1 348.4 373.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <g stroke="#ffffff" strokeWidth="7" strokeLinecap="round" opacity="0.9">
        <line x1="153.7" y1="366.8" x2="167.7" y2="351.2" />
        <line x1="113.4" y1="304.0" x2="133.4" y2="297.8" />
        <line x1="110.8" y1="229.5" x2="131.2" y2="234.3" />
        <line x1="146.6" y1="164.1" x2="161.7" y2="178.6" />
        <line x1="210.7" y1="126.0" x2="216.3" y2="146.3" />
        <line x1="285.3" y1="126.0" x2="279.7" y2="146.3" />
        <line x1="349.4" y1="164.1" x2="334.3" y2="178.6" />
        <line x1="385.2" y1="229.5" x2="364.8" y2="234.3" />
        <line x1="382.6" y1="304.0" x2="362.6" y2="297.8" />
        <line x1="342.3" y1="366.8" x2="328.3" y2="351.2" />
      </g>
      {/* needle */}
      <polygon points="355.9,157.8 259.8,274.2 236.2,249.8" fill="url(#bp-logo-grad)" />
      <circle cx="248" cy="262" r="25" fill="url(#bp-logo-grad)" />
      <circle cx="248" cy="262" r="8.5" fill="#2d3748" />
    </svg>
  );
}
