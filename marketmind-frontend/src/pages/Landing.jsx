import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  FileText,
  Hash,
  Layers,
  Rocket,
  SearchCheck,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RevealSection from '../components/RevealSection';
import LandingCarouselCard from '../components/LandingCarouselCard';
import LandingSlideRunPreview from '../components/LandingSlideRunPreview';

const features = [
  {
    icon: Sparkles,
    title: 'AI Campaign Generation',
    description:
      'Turn a simple business goal into platform-ready campaign content with captions, hashtags, and clear posting guidance.',
  },
  {
    icon: SearchCheck,
    title: 'Local Competitor Intelligence',
    description:
      'Use location-aware competitor insights to position your offers better and stand out in your market.',
  },
  {
    icon: Workflow,
    title: 'End-to-End Marketing Workflow',
    description:
      'Manage planning, drafting, review, and publishing prep in one flow designed for lean teams.',
  },
];

const capabilityCards = [
  {
    icon: Target,
    title: 'Strategy + Planning',
    description: 'Convert business goals into campaign strategy with audience targeting and posting windows.',
  },
  {
    icon: FileText,
    title: 'Content + SEO',
    description: 'Generate captions, hashtags, and optimized messaging ready for social channels.',
  },
  {
    icon: Users,
    title: 'Competitor Context',
    description: 'Use local competitor intelligence to improve positioning before you publish.',
  },
  {
    icon: Rocket,
    title: 'Execution Ready Outputs',
    description: 'Deliver copy-ready campaign assets your team can review and launch quickly.',
  },
];

/** Curated value story: SME fit + differentiation + outcomes (not every prior card). */
const whyUsSlides = [
  {
    icon: Layers,
    title: 'One stack for lean teams',
    description:
      'SMEs rarely have a full marketing org. MarketMind replaces scattered docs, one-off AI prompts, and handoffs with a single flow from goal to publish-ready assets.',
  },
  {
    icon: SearchCheck,
    title: 'Grounded in your market',
    description:
      'Campaign output reflects local and competitor context—not generic copy—so positioning and messaging match how you actually compete.',
  },
  {
    icon: Zap,
    title: 'Less overhead, faster shipping',
    description:
      'Spend less time planning and drafting each week; get structured captions, hashtags, SEO cues, and timing guidance you can review and launch with confidence.',
  },
];

/** One hub: tabs swap headline, copy, and carousel. */
const platformSections = [
  {
    id: 'capabilities',
    shortLabel: 'Capabilities',
    title: 'Marketing capabilities in one platform',
    description:
      'Similar to modern platform-led product pages, this section highlights core modules your team uses from planning through launch.',
    slides: capabilityCards,
    theme: 'blue',
    HeaderIcon: BarChart3,
    /** One sample-output graphic for the whole tab (not per carousel slide). */
    runPreviewVariant: 'cap-content',
  },
  {
    id: 'workflow',
    shortLabel: 'Workflow',
    title: 'Featured workflow',
    description:
      'Navigate key workflows used most by SMEs. Use arrows or dots to explore—slides advance every few seconds.',
    slides: features,
    theme: 'violet',
    HeaderIcon: Workflow,
    runPreviewVariant: 'wf-pipeline',
  },
  {
    id: 'why-us',
    shortLabel: 'Why us?',
    title: 'Why us?',
    description:
      'What you gain when you consolidate planning, AI-assisted content, and market context in one place—built for growing businesses, not enterprise bloat.',
    slides: whyUsSlides,
    theme: 'amber',
    HeaderIcon: Zap,
    runPreviewVariant: 'why-stack',
  },
];

const tabActiveClass = {
  blue: 'bg-blue-100 text-blue-900 ring-1 ring-blue-200/90 shadow-sm',
  violet: 'bg-violet-100 text-violet-900 ring-1 ring-violet-200/90 shadow-sm',
  amber: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/90 shadow-sm',
};

const headerIconClass = {
  blue: { wrap: 'bg-blue-100', icon: 'text-blue-700' },
  violet: { wrap: 'bg-violet-100', icon: 'text-violet-700' },
  amber: { wrap: 'bg-amber-100', icon: 'text-amber-700' },
};

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const [activePlatform, setActivePlatform] = useState(0);
  const section = platformSections[activePlatform];
  const HeaderIcon = section.HeaderIcon;
  const hi = headerIconClass[section.theme];
  const tabPreviewTheme = section.theme === 'emerald' ? 'blue' : section.theme;

  return (
    <div className="flex w-full flex-col gap-12">
      <RevealSection className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl md:p-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-flex items-center rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide md:px-5 md:py-2 md:text-base">
              MarketMind AI Hub
            </p>
            <h1 className="pt-5 text-3xl font-extrabold leading-tight md:text-5xl">
              One marketing workspace for growing businesses.
            </h1>
            <p className="max-w-xl pt-4 text-base text-blue-100 md:text-lg">
              Plan, generate, and launch campaigns end-to-end with AI support built for small and medium teams.
              Keep execution fast without sacrificing brand consistency.
            </p>

            <div className="flex flex-wrap gap-3 pt-8">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-5 md:p-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-lg bg-white/20 p-1.5">
                <BarChart3 className="h-4 w-4 text-white" aria-hidden />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                What each run produces
              </p>
            </div>
            <p className="pt-1 text-sm text-blue-50/90">
              Representative metrics from the AI pipeline (caption, hashtags, SEO, timing, optional image).
            </p>

            <div className="rounded-xl bg-white/15 p-4 pt-5">
              <div className="flex items-end justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="inline-flex rounded-lg bg-white/20 p-1.5">
                    <TrendingUp className="h-4 w-4 text-white" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-blue-100">SEO score</p>
                    <p className="pt-0.5 text-3xl font-bold tabular-nums">88</p>
                  </div>
                </div>
                <span className="self-end pb-1 text-sm text-blue-100/90">/ 100</span>
              </div>
              <div className="pt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-[88%] rounded-full bg-white/90" aria-hidden />
                </div>
              </div>
              <p className="pt-2 text-xs text-blue-100/80">
                Keyword mix, improvements list, and discoverability checks
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 text-center">
              <div className="flex flex-col items-center gap-1.5 rounded-lg bg-white/15 px-2 py-3">
                <Hash className="h-4 w-4 text-blue-100/90" aria-hidden />
                <p className="text-lg font-bold tabular-nums leading-none">17</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-blue-100/90">
                  Hashtags
                </p>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-lg bg-white/15 px-2 py-3">
                <Users className="h-4 w-4 text-blue-100/90" aria-hidden />
                <p className="text-lg font-bold tabular-nums leading-none">5</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-blue-100/90">
                  Competitors
                </p>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-lg bg-white/15 px-2 py-3">
                <Timer className="h-4 w-4 text-blue-100/90" aria-hidden />
                <p className="text-lg font-bold tabular-nums leading-none">~12s</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-blue-100/90">
                  Pipeline
                </p>
              </div>
            </div>

            <p className="pt-4 text-xs leading-relaxed text-blue-100/75">
              Plus: caption, CTA, post type, best times, media prompts, alt text, and optional DALL·E image URL.
            </p>
          </div>
        </div>
      </RevealSection>

      <RevealSection>
        <div className="rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] p-6 shadow-sm md:p-8">
          <p className="text-base font-semibold uppercase tracking-wide text-gray-500 md:text-lg lg:text-xl">
            Explore the platform
          </p>
          <div
            className="flex gap-2 overflow-x-auto pb-1 pt-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap"
            role="tablist"
            aria-label="Platform focus areas"
          >
            {platformSections.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === activePlatform}
                id={`platform-tab-${s.id}`}
                aria-controls={`platform-panel-${s.id}`}
                onClick={() => setActivePlatform(i)}
                className={[
                  'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors md:px-5 md:py-2.5 md:text-base',
                  i === activePlatform
                    ? tabActiveClass[s.theme]
                    : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200/80 hover:bg-gray-100',
                ].join(' ')}
              >
                {s.shortLabel}
              </button>
            ))}
          </div>

          <div
            id={`platform-panel-${section.id}`}
            role="tabpanel"
            aria-labelledby={`platform-tab-${section.id}`}
            className="flex flex-col gap-6 pt-6 lg:flex-row lg:items-start lg:gap-8"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={['inline-flex rounded-lg p-2', hi.wrap].join(' ')}>
                  <HeaderIcon className={['h-6 w-6', hi.icon].join(' ')} aria-hidden />
                </span>
                <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">{section.title}</h2>
              </div>
              <p className="max-w-3xl pt-3 text-gray-600">{section.description}</p>
              <LandingCarouselCard key={section.id} slides={section.slides} theme={section.theme} />
            </div>
            <LandingSlideRunPreview
              theme={tabPreviewTheme}
              variant={section.runPreviewVariant}
              className="w-full shrink-0 lg:sticky lg:top-24 lg:w-[min(100%,260px)] xl:w-[280px]"
            />
          </div>
        </div>
      </RevealSection>

      <RevealSection className="rounded-2xl border border-blue-200/60 bg-gradient-to-r from-blue-50 to-indigo-50 p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex rounded-xl bg-white/80 p-2 shadow-sm">
              <Rocket className="h-7 w-7 text-blue-600" aria-hidden />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Run your marketing end-to-end with one lean stack</h2>
              <p className="max-w-3xl pt-3 text-gray-700">
                Replace fragmented planning docs, generic AI prompts, and inconsistent execution with a single operating
                layer for strategy, content, and publishing readiness.
              </p>
            </div>
          </div>
        </div>
        <div className="pt-6">
          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            {isAuthenticated ? 'Open Workspace' : 'Start Building Campaigns'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </RevealSection>
    </div>
  );
};

export default Landing;
