import { brandLogoSrc } from '../services/api';

/** First display character of the brand name, uppercased (handles basic Unicode). */
export function brandInitialFromName(name) {
  const s = (name || '').trim();
  if (!s) return '?';
  const cp = s.codePointAt(0);
  return String.fromCodePoint(cp).toUpperCase();
}

/**
 * Brand mark: uploaded logo if `logoUrl` resolves, else first letter of `name` in a circle.
 * @param {{ name: string, logoUrl?: string | null, size?: 'sm' | 'md' | 'lg', emphasis?: 'default' | 'selected', className?: string }} props
 */
export default function BrandAvatar({
  name,
  logoUrl,
  size = 'md',
  emphasis = 'default',
  className = '',
}) {
  const src = brandLogoSrc(logoUrl);
  const initial = brandInitialFromName(name);
  const sizeClass =
    size === 'sm'
      ? 'h-9 w-9 min-h-9 min-w-9 text-sm'
      : size === 'lg'
        ? 'h-24 w-24 min-h-24 min-w-24 text-3xl'
        : 'h-10 w-10 min-h-10 min-w-10 text-base';
  const tone =
    emphasis === 'selected'
      ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500/25'
      : 'bg-blue-50 text-blue-700';

  if (src) {
    return (
      <div
        className={`shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200/80 ${sizeClass} ${className}`}
      >
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums ${sizeClass} ${tone} ${className}`}
      aria-hidden
    >
      {initial}
    </div>
  );
}
