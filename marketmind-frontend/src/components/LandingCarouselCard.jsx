import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** @typedef {'blue' | 'violet' | 'emerald' | 'amber'} CarouselTheme */

const THEMES = {
  blue: {
    glow: 'from-blue-400/25 to-sky-400/20',
    tile: 'from-blue-100 to-sky-100',
    ring: 'ring-blue-200/70',
    icon: 'text-blue-600',
    dot: 'bg-blue-600',
    shell: 'border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-[hsl(0,0%,99%)]',
    navHover: 'hover:bg-blue-100',
  },
  violet: {
    glow: 'from-violet-400/30 to-fuchsia-400/22',
    tile: 'from-violet-100 to-fuchsia-100',
    ring: 'ring-violet-200/70',
    icon: 'text-violet-600',
    dot: 'bg-violet-600',
    shell: 'border-violet-200/80 bg-gradient-to-br from-violet-50/55 to-[hsl(0,0%,99%)]',
    navHover: 'hover:bg-violet-100',
  },
  emerald: {
    glow: 'from-emerald-400/25 to-teal-400/20',
    tile: 'from-emerald-100 to-teal-100',
    ring: 'ring-emerald-200/70',
    icon: 'text-emerald-600',
    dot: 'bg-emerald-600',
    shell: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-[hsl(0,0%,99%)]',
    navHover: 'hover:bg-emerald-100',
  },
  amber: {
    glow: 'from-amber-400/25 to-orange-400/20',
    tile: 'from-amber-100 to-orange-100',
    ring: 'ring-amber-200/70',
    icon: 'text-amber-700',
    dot: 'bg-amber-600',
    shell: 'border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-[hsl(0,0%,99%)]',
    navHover: 'hover:bg-amber-100',
  },
};

/**
 * @param {{ icon: import('lucide-react').LucideIcon, title: string, description: string }[]} slides
 * @param {CarouselTheme} [theme]
 */
export default function LandingCarouselCard({
  slides,
  intervalMs = 5000,
  className = 'w-full pt-6',
  theme = 'blue',
}) {
  const [index, setIndex] = useState(0);
  const [rotationSeed, setRotationSeed] = useState(0);

  const t = THEMES[theme] ?? THEMES.blue;
  const len = slides?.length ?? 0;

  const go = useCallback(
    (delta) => {
      setIndex((i) => (i + delta + len) % len);
      setRotationSeed((s) => s + 1);
    },
    [len]
  );

  const goTo = useCallback((i) => {
    setIndex(i);
    setRotationSeed((s) => s + 1);
  }, []);

  useEffect(() => {
    if (len <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % len);
    }, intervalMs);
    return () => clearInterval(id);
  }, [len, intervalMs, rotationSeed]);

  if (!len) return null;

  const slide = slides[index];
  const Icon = slide.icon;

  return (
    <div
      className={[
        className,
        'rounded-xl border shadow-sm',
        t.shell,
        'p-4 md:p-6',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center gap-3 md:gap-5">
        {len > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className={[
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors md:h-12 md:w-12',
              t.navHover,
            ].join(' ')}
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-4 px-1 md:gap-6 md:px-2">
          <div className="relative shrink-0 self-center">
            <div
              className={[
                'absolute -inset-2 rounded-2xl bg-gradient-to-br blur-lg',
                t.glow,
              ].join(' ')}
              aria-hidden
            />
            <div
              className={[
                'relative flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ring-1 md:h-20 md:w-20',
                t.tile,
                t.ring,
              ].join(' ')}
            >
              {Icon ? (
                <Icon className={['h-8 w-8 md:h-9 md:w-9', t.icon].join(' ')} aria-hidden />
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2" aria-live="polite">
            <h3 className="text-lg font-semibold text-gray-900 md:text-xl">{slide.title}</h3>
            <p className="text-sm leading-relaxed text-gray-600 md:text-base">{slide.description}</p>
          </div>
        </div>

        {len > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next slide"
            className={[
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors md:h-12 md:w-12',
              t.navHover,
            ].join(' ')}
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        )}
      </div>

      {len > 1 && (
        <div className="flex justify-center gap-2 pt-5">
          {slides.map((s, i) => (
            <button
              key={s.title ?? i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={[
                'h-2 rounded-full transition-all duration-300',
                i === index ? ['w-8', t.dot].join(' ') : 'w-2 bg-gray-300 hover:bg-gray-400',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
