/** Shared helpers for campaign cards (Dashboard, Campaigns page). */

/** Base shell: white card on gray shell (matches Brands page cards). */
export const campaignCardShellClass =
  'rounded-xl border border-gray-200 bg-white p-5 shadow-sm';

/** Full list / management page: hover affordance + pointer. */
export const campaignCardInteractiveClass = [
  campaignCardShellClass,
  'cursor-pointer transition-shadow hover:border-blue-200 hover:shadow-md',
].join(' ');

/** Dashboard preview: read-only snapshot, no navigation hover. */
export const campaignCardPreviewClass = campaignCardShellClass;

export const campaignCardIconWrapClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700';

export const campaignPlatformLabelClass =
  'text-xs font-medium uppercase tracking-wide text-gray-500';

/**
 * Coerce API/platform list entries to a lowercase id string (handles string or { id } shapes).
 */
export function normalizePlatformId(platform) {
  if (platform == null || platform === '') return '';
  if (typeof platform === 'string') return platform.trim().toLowerCase();
  if (typeof platform === 'object') {
    const raw =
      platform.id ??
      platform.platformId ??
      platform.slug ??
      platform.platform ??
      platform.value ??
      platform.type ??
      platform.key ??
      platform.code ??
      platform.name;
    if (raw != null && raw !== '') return String(raw).trim().toLowerCase();
  }
  return String(platform).trim().toLowerCase();
}

/** Map API / legacy ids to canonical keys used in `platforms` below. */
const PLATFORM_ALIASES = {
  x: 'twitter',
  'x-twitter': 'twitter',
  twitter_x: 'twitter',
  ig: 'instagram',
  fb: 'facebook',
};

export function resolveCanonicalPlatformId(platform) {
  let key = normalizePlatformId(platform);
  return PLATFORM_ALIASES[key] || key;
}

export function getPlatformInfo(platform) {
  const platforms = {
    facebook: {
      name: 'Facebook',
      bgColor: 'bg-blue-100 text-blue-800',
    },
    instagram: {
      name: 'Instagram',
      bgColor: 'bg-pink-100 text-pink-800',
    },
    twitter: {
      name: 'X (Twitter)',
      bgColor: 'bg-blue-100 text-blue-400',
    },
    reddit: {
      name: 'Reddit',
      bgColor: 'bg-orange-100 text-orange-800',
    },
    tiktok: {
      name: 'TikTok',
      bgColor: 'bg-slate-100 text-slate-800',
    },
    youtube: {
      name: 'YouTube',
      bgColor: 'bg-red-100 text-red-800',
    },
    pinterest: {
      name: 'Pinterest',
      bgColor: 'bg-rose-100 text-rose-800',
    },
    linkedin: {
      name: 'LinkedIn',
      bgColor: 'bg-blue-50 text-blue-700',
    },
    default: {
      name: 'Other',
      bgColor: 'bg-gray-100 text-gray-800',
    },
  };

  const key = resolveCanonicalPlatformId(platform);
  return platforms[key] || platforms.default;
}

export function campaignStatusBadgeClass(status) {
  const s = (status || 'draft').toLowerCase();
  switch (s) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-gray-100 text-gray-700';
    case 'cancelled':
      return 'bg-rose-100 text-rose-800';
    case 'archived':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
}

export function formatCampaignStatus(status) {
  const s = (status || 'draft').toLowerCase();
  const labels = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    archived: 'Archived',
  };
  return labels[s] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft');
}
