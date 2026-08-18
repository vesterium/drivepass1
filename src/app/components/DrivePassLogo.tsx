/**
 * DrivePassLogo — логотип DrivePass+
 */

import logoImg from 'figma:asset/d2a1e1755e3da144f861793ea86b3d5e07fd81b8.png';

interface DrivePassLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  textColor?: string;
  variant?: 'default' | 'white' | 'mono';
}

export function DrivePassLogo({
  size = 80,
  showText = false,
  className = '',
  textColor = '#111827',
  variant = 'default',
}: DrivePassLogoProps) {
  const resolvedTextColor =
    variant === 'white' ? '#ffffff' : variant === 'mono' ? '#111827' : textColor;
  const displaySize = Math.round(size * 1.7);

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '50%',
          width: displaySize,
          height: displaySize,
          flexShrink: 0,
        }}
      >
        <img
          src={logoImg}
          alt="DrivePass+"
          width={displaySize}
          height={displaySize}
          style={{ display: 'block', width: displaySize, height: displaySize, objectFit: 'contain' }}
          draggable={false}
        />
      </div>
      {showText && (
        <span
          style={{
            color: resolvedTextColor,
            fontWeight: 800,
            fontSize: displaySize * 0.22,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          DrivePass<span style={{ color: '#2563EB' }}>+</span>
        </span>
      )}
    </div>
  );
}
