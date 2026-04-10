import {
  FaFacebook,
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
  FaPinterest,
  FaReddit,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';

import { getPlatformInfo, resolveCanonicalPlatformId } from '../utils/campaignDisplay';

const MAP = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  twitter: FaXTwitter,
  reddit: FaReddit,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  pinterest: FaPinterest,
  linkedin: FaLinkedinIn,
  default: FaGlobe,
};

function platformList(platforms) {
  if (Array.isArray(platforms)) return platforms;
  if (platforms != null && platforms !== '') return [platforms];
  return [];
}

/**
 * Brand icon for a platform id (e.g. from campaign.platforms or post.platform).
 * @param {{ platform: string | undefined; className?: string }} props
 */
export default function PlatformIcon({ platform, className = 'h-3.5 w-3.5 shrink-0' }) {
  const key = resolveCanonicalPlatformId(platform);
  const Icon = MAP[key] || MAP.default;
  return <Icon className={className} aria-hidden />;
}

/**
 * Renders one or more platforms as icons only (names on hover via title, sr-only for a11y).
 * @param {{ platforms: unknown; iconClassName?: string; badge?: boolean; gapClassName?: string }} props
 */
export function PlatformIconRow({
  platforms,
  iconClassName = 'h-4 w-4',
  badge = false,
  gapClassName = 'gap-1',
}) {
  const ids = platformList(platforms);
  if (ids.length === 0) {
    return <span className="text-sm text-gray-400">—</span>;
  }
  return (
    <span className={['inline-flex flex-wrap items-center', gapClassName].join(' ')}>
      {ids.map((raw, i) => {
        const meta = getPlatformInfo(raw);
        const label = meta.name;
        const key = `${resolveCanonicalPlatformId(raw)}-${i}`;
        if (badge) {
          return (
            <span
              key={key}
              title={label}
              className={`inline-flex items-center justify-center rounded-full p-1.5 ${meta.bgColor}`}
            >
              <span className="sr-only">{label}</span>
              <PlatformIcon platform={raw} className={iconClassName} />
            </span>
          );
        }
        return (
          <span key={key} title={label} className="inline-flex items-center justify-center">
            <span className="sr-only">{label}</span>
            <PlatformIcon platform={raw} className={iconClassName} />
          </span>
        );
      })}
    </span>
  );
}
