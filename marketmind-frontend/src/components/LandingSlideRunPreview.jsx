import { Fragment } from 'react';
import { Check, Hash, MapPin, Sparkles, Timer, TrendingUp } from 'lucide-react';

/** @typedef {'blue' | 'violet' | 'amber'} PreviewTheme */

/** @type {Record<PreviewTheme, { outer: string; kicker: string; title: string; muted: string; pill: string; barBg: string; barFill: string; line: string; accent: string; foot: string }>} */
const PALETTE = {
  blue: {
    outer: 'border-blue-200/70 bg-gradient-to-br from-blue-50/95 via-white to-sky-50/50',
    kicker: 'text-blue-700/85',
    title: 'text-blue-950',
    muted: 'text-blue-800/65',
    pill: 'bg-blue-100/90 text-blue-900',
    barBg: 'bg-blue-200/50',
    barFill: 'bg-blue-500',
    line: 'bg-blue-200/70',
    accent: 'text-blue-600',
    foot: 'text-blue-700/60',
  },
  violet: {
    outer: 'border-violet-200/70 bg-gradient-to-br from-violet-50/95 via-white to-fuchsia-50/50',
    kicker: 'text-violet-700/85',
    title: 'text-violet-950',
    muted: 'text-violet-800/65',
    pill: 'bg-violet-100/90 text-violet-900',
    barBg: 'bg-violet-200/50',
    barFill: 'bg-violet-600',
    line: 'bg-violet-200/70',
    accent: 'text-violet-600',
    foot: 'text-violet-700/60',
  },
  amber: {
    outer: 'border-amber-200/70 bg-gradient-to-br from-amber-50/95 via-white to-orange-50/40',
    kicker: 'text-amber-800/85',
    title: 'text-amber-950',
    muted: 'text-amber-900/60',
    pill: 'bg-amber-100/90 text-amber-950',
    barBg: 'bg-amber-200/50',
    barFill: 'bg-amber-600',
    line: 'bg-amber-200/70',
    accent: 'text-amber-700',
    foot: 'text-amber-800/60',
  },
};

function Kicker({ children, p }) {
  return (
    <p className={['text-[10px] font-semibold uppercase tracking-wide', p.kicker].join(' ')}>{children}</p>
  );
}

/**
 * Mini “what each run produces” panel for a platform tab (decorative; Lucide icons stay on carousel slides).
 * @param {{ theme: PreviewTheme, variant: string, className?: string }} props
 */
export default function LandingSlideRunPreview({ theme, variant, className = '' }) {
  const p = PALETTE[theme] ?? PALETTE.blue;

  const wrap = ['rounded-xl border p-3 shadow-sm', p.outer, className].filter(Boolean).join(' ');

  switch (variant) {
    case 'cap-strategy':
      return (
        <div className={wrap} aria-hidden>
          <div className="flex items-center gap-1.5">
            <TargetMini className={p.accent} />
            <Kicker p={p}>Strategy sketch</Kicker>
          </div>
          <p className={['mt-2 text-xs font-semibold', p.title].join(' ')}>Audience + windows</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {['Local 25mi', '25–54', '6–9pm'].map((t) => (
              <span key={t} className={['rounded-md px-1.5 py-0.5 text-[10px] font-medium', p.pill].join(' ')}>
                {t}
              </span>
            ))}
          </div>
          <p className={['mt-2 text-[10px]', p.muted].join(' ')}>Posting heat (next 7 days)</p>
          <div className={['mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full', p.barBg].join(' ')}>
            <div className={['h-full w-[28%] rounded-l-full', p.barFill].join(' ')} />
            <div className={['h-full w-[18%] opacity-80', p.barFill].join(' ')} />
            <div className={['h-full w-[35%] rounded-r-full opacity-50', p.barFill].join(' ')} />
          </div>
          <p className={['mt-2 text-[10px] leading-snug', p.foot].join(' ')}>+ objective, tone, channel mix</p>
        </div>
      );

    case 'cap-content':
      return (
        <div className={wrap} aria-hidden>
          <div className="flex items-center gap-1.5">
            <TrendingUp className={['h-3.5 w-3.5 shrink-0', p.accent].join(' ')} />
            <Kicker p={p}>Content pack</Kicker>
          </div>
          <p className={['mt-2 text-xs font-semibold', p.title].join(' ')}>SEO + caption draft</p>
          <div className="mt-2 space-y-1.5">
            <div className={['h-1.5 w-full rounded', p.line].join(' ')} />
            <div className={['h-1.5 w-[92%] rounded', p.line].join(' ')} />
            <div className={['h-1.5 w-[70%] rounded', p.line].join(' ')} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className={['rounded-lg px-2 py-1.5 text-center', p.pill].join(' ')}>
              <Hash className="mx-auto mb-0.5 h-3 w-3 opacity-80" />
              <p className="text-sm font-bold tabular-nums leading-none">14</p>
              <p className={['mt-0.5 text-[9px] font-medium uppercase', p.muted].join(' ')}>Tags</p>
            </div>
            <div className={['rounded-lg px-2 py-1.5', p.pill].join(' ')}>
              <p className={['text-[9px] font-medium', p.muted].join(' ')}>SEO score</p>
              <p className={['text-lg font-bold tabular-nums', p.title].join(' ')}>84</p>
              <div className={['mt-1 h-1 overflow-hidden rounded-full', p.barBg].join(' ')}>
                <div className={['h-full w-[84%]', p.barFill].join(' ')} />
              </div>
            </div>
          </div>
        </div>
      );

    case 'cap-competitor':
      return (
        <div className={wrap} aria-hidden>
          <div className="flex items-center gap-1.5">
            <MapPin className={['h-3.5 w-3.5 shrink-0', p.accent].join(' ')} />
            <Kicker p={p}>Local scan</Kicker>
          </div>
          <p className={['mt-2 text-xs font-semibold', p.title].join(' ')}>Competitor snapshot</p>
          <div className="mt-2 space-y-1.5">
            {['Rival A · similar offer', 'Rival B · lower price pt.', 'Rival C · strong reviews'].map((row, i) => (
              <div key={row} className="flex items-center gap-2 text-[10px]">
                <span className={['h-1.5 w-1.5 shrink-0 rounded-full', p.barFill].join(' ')} style={{ opacity: 1 - i * 0.2 }} />
                <span className={p.muted}>{row}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-center">
            <div className={['rounded-lg py-2', p.pill].join(' ')}>
              <p className="text-base font-bold tabular-nums leading-none">5</p>
              <p className={['mt-0.5 text-[9px] font-medium uppercase', p.muted].join(' ')}>Mapped</p>
            </div>
            <div className={['rounded-lg py-2', p.pill].join(' ')}>
              <p className="text-base font-bold tabular-nums leading-none">12</p>
              <p className={['mt-0.5 text-[9px] font-medium uppercase', p.muted].join(' ')}>Signals</p>
            </div>
          </div>
        </div>
      );

    case 'cap-execution':
      return (
        <div className={wrap} aria-hidden>
          <Kicker p={p}>Ready to ship</Kicker>
          <p className={['mt-1 text-xs font-semibold', p.title].join(' ')}>Execution bundle</p>
          <ul className="mt-2 space-y-1.5">
            {['Caption + CTA', 'Hashtag set', 'Best-time slots'].map((label) => (
              <li key={label} className="flex items-center gap-2 text-[10px] font-medium">
                <span className={['flex h-4 w-4 items-center justify-center rounded-full', p.pill].join(' ')}>
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                <span className={p.muted}>{label}</span>
              </li>
            ))}
          </ul>
          <p className={['mt-2 text-[10px] leading-snug', p.foot].join(' ')}>Optional: alt text, media prompt, image URL</p>
        </div>
      );

    case 'wf-ai':
      return (
        <div className={wrap} aria-hidden>
          <div className="flex items-center gap-1.5">
            <Sparkles className={['h-3.5 w-3.5 shrink-0', p.accent].join(' ')} />
            <Kicker p={p}>AI campaign run</Kicker>
          </div>
          <p className={['mt-2 text-xs font-semibold', p.title].join(' ')}>Draft v3 · brand-safe</p>
          <div className="mt-2 rounded-lg border border-current/10 bg-white/60 p-2">
            <p className={['text-[10px] leading-relaxed', p.muted].join(' ')}>
              “Summer patio nights are back—book Thu–Sun and get a free appetizer for tables of 4+…”
            </p>
          </div>
          <div className="mt-2 flex justify-between text-[10px]">
            <span className={p.muted}>Post types</span>
            <span className={['font-semibold', p.title].join(' ')}>Feed · Story</span>
          </div>
          <div className="mt-1 flex gap-1">
            <span className={['rounded px-1.5 py-0.5 text-[9px] font-medium', p.pill].join(' ')}>CTA</span>
            <span className={['rounded px-1.5 py-0.5 text-[9px] font-medium', p.pill].join(' ')}>11 tags</span>
          </div>
        </div>
      );

    case 'wf-local':
      return (
        <div className={wrap} aria-hidden>
          <div className="flex items-center gap-1.5">
            <MapPin className={['h-3.5 w-3.5 shrink-0', p.accent].join(' ')} />
            <Kicker p={p}>Location-aware</Kicker>
          </div>
          <p className={['mt-2 text-xs font-semibold', p.title].join(' ')}>Competitor radar</p>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={[
                  'aspect-square rounded-sm',
                  i === 1 || i === 5 ? [p.barFill, 'opacity-90'].join(' ') : p.barBg,
                ].join(' ')}
              />
            ))}
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className={['text-[10px]', p.muted].join(' ')}>Radius</p>
              <p className={['text-sm font-bold tabular-nums', p.title].join(' ')}>2.1 mi</p>
            </div>
            <div className="text-right">
              <p className={['text-[10px]', p.muted].join(' ')}>Tracked</p>
              <p className={['text-sm font-bold tabular-nums', p.title].join(' ')}>5</p>
            </div>
          </div>
        </div>
      );

    case 'wf-pipeline': {
      const steps = ['Goal', 'Draft', 'Review', 'Queue'];
      return (
        <div className={wrap} aria-hidden>
          <Kicker p={p}>Workflow status</Kicker>
          <p className={['mt-1 text-xs font-semibold', p.title].join(' ')}>End-to-end trace</p>
          <div className="mt-3 flex items-center">
            {steps.map((step, i) => (
              <Fragment key={step}>
                <div className="flex w-11 shrink-0 flex-col items-center gap-1">
                  <div
                    className={[
                      'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                      i < 3 ? ['text-white', p.barFill].join(' ') : ['bg-white ring-1 ring-black/10', p.title].join(' '),
                    ].join(' ')}
                  >
                    {i + 1}
                  </div>
                  <span className={['text-center text-[9px] font-medium leading-tight', p.muted].join(' ')}>{step}</span>
                </div>
                {i < steps.length - 1 ? (
                  <div className={['mx-0.5 h-0.5 min-w-[6px] flex-1 rounded', p.line].join(' ')} />
                ) : null}
              </Fragment>
            ))}
          </div>
          <p className={['mt-3 text-[10px] leading-snug', p.foot].join(' ')}>Handoffs logged · one owner per stage</p>
        </div>
      );
    }

    case 'why-stack':
      return (
        <div className={wrap} aria-hidden>
          <Kicker p={p}>Before → after</Kicker>
          <p className={['mt-1 text-xs font-semibold', p.title].join(' ')}>Single operating layer</p>
          <div className="mt-2 space-y-1.5">
            {[
              { label: 'Scattered docs', w: 'w-full' },
              { label: 'One-off ChatGPT', w: 'w-[88%]' },
              { label: 'MarketMind flow', w: 'w-full', strong: true },
            ].map((row) => (
              <div
                key={row.label}
                className={[
                  'flex items-center justify-between rounded-lg px-2 py-1.5 text-[10px] font-medium',
                  row.strong ? p.pill : 'bg-white/70 text-gray-600 ring-1 ring-black/5',
                ].join(' ')}
              >
                <span>{row.label}</span>
                {row.strong ? <span className={p.accent}>✓</span> : null}
              </div>
            ))}
          </div>
          <p className={['mt-2 text-[10px]', p.foot].join(' ')}>Fewer tools, fewer context drops</p>
        </div>
      );

    case 'why-market':
      return (
        <div className={wrap} aria-hidden>
          <div className="flex items-center gap-1.5">
            <SearchMini className={p.accent} />
            <Kicker p={p}>Context layer</Kicker>
          </div>
          <p className={['mt-2 text-xs font-semibold', p.title].join(' ')}>Not generic output</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className={p.muted}>Your zip + category</span>
              <span className={['font-semibold', p.title].join(' ')}>locked in</span>
            </div>
            <div className={['h-1.5 overflow-hidden rounded-full', p.barBg].join(' ')}>
              <div className={['h-full w-[92%]', p.barFill].join(' ')} />
            </div>
          </div>
          <div className="mt-2 rounded-md bg-white/70 p-2 ring-1 ring-black/5">
            <p className={['text-[10px] leading-snug', p.muted].join(' ')}>
              Positioning line references 2 local rivals + your differentiator—not a template.
            </p>
          </div>
        </div>
      );

    case 'why-speed':
      return (
        <div className={wrap} aria-hidden>
          <div className="flex items-center gap-1.5">
            <Timer className={['h-3.5 w-3.5 shrink-0', p.accent].join(' ')} />
            <Kicker p={p}>Team time back</Kicker>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={['text-3xl font-bold tabular-nums tracking-tight', p.title].join(' ')}>~6h</span>
            <span className={['text-xs font-semibold', p.muted].join(' ')}>/ week</span>
          </div>
          <p className={['mt-1 text-[10px]', p.muted].join(' ')}>Est. planning + drafting reclaimed</p>
          <div className="mt-3 flex gap-1">
            <div className={['h-8 flex-1 rounded-md', p.barFill].join(' ')} style={{ opacity: 0.35 }} />
            <div className={['h-8 flex-1 rounded-md', p.barFill].join(' ')} style={{ opacity: 0.55 }} />
            <div className={['h-8 flex-1 rounded-md', p.barFill].join(' ')} style={{ opacity: 0.9 }} />
          </div>
          <p className={['mt-2 text-[10px] leading-snug', p.foot].join(' ')}>Structured outputs = faster review cycles</p>
        </div>
      );

    default:
      return null;
  }
}

function TargetMini({ className }) {
  return (
    <svg className={['h-3.5 w-3.5 shrink-0', className].join(' ')} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function SearchMini({ className }) {
  return (
    <svg className={['h-3.5 w-3.5 shrink-0', className].join(' ')} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
