import { useEffect, useMemo, useState } from 'react';
import ReactCalendar from 'react-calendar';
import { format } from 'date-fns';
import { toast } from 'sonner';
import BrandAvatar from '../components/BrandAvatar';
import { fetchBrandCampaigns, fetchBrandPosts, fetchMyBrands } from '../services/api';
import 'react-calendar/dist/Calendar.css';

const shellCard = 'rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] shadow-sm';

function parseApiDate(value) {
  if (!value) return new Date('');
  const raw = String(value).trim();
  const withZone = /([zZ]|[+\-]\d{2}:\d{2})$/.test(raw) ? raw : `${raw}Z`;
  return new Date(withZone);
}

function dateKey(d) {
  return format(d, 'yyyy-MM-dd');
}

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [dayMap, setDayMap] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { brands } = await fetchMyBrands();
        const brandList = Array.isArray(brands) ? brands : [];
        const dayBuckets = new Map();

        for (const b of brandList) {
          const brandId = String(b.id);
          const [posts, campaigns] = await Promise.all([
            fetchBrandPosts(brandId),
            fetchBrandCampaigns(brandId, { includeArchived: false }),
          ]);
          const campaignNameMap = new Map((campaigns || []).map((c) => [String(c.id), c.name || 'Campaign']));

          for (const p of posts || []) {
            const scheduled = parseApiDate(p.scheduledAt);
            if (Number.isNaN(scheduled.getTime())) continue;
            const dayStart = new Date(scheduled);
            dayStart.setHours(0, 0, 0, 0);
            const key = dateKey(dayStart);
            const campaignName = campaignNameMap.get(String(p.campaignId)) || 'Campaign';

            if (!dayBuckets.has(key)) {
              dayBuckets.set(key, {
                dayStart,
                posts: [],
                brandsById: new Map(),
              });
            }
            const bucket = dayBuckets.get(key);
            bucket.posts.push({
              ...p,
              brandName: b.name,
              brandLogoUrl: b.logo_url || '',
              campaignName,
            });
            if (!bucket.brandsById.has(brandId)) {
              bucket.brandsById.set(brandId, {
                id: brandId,
                name: b.name,
                logoUrl: b.logo_url || '',
              });
            }
          }
        }

        const normalized = {};
        for (const [key, bucket] of dayBuckets.entries()) {
          normalized[key] = {
            date: bucket.dayStart,
            posts: bucket.posts,
            brands: Array.from(bucket.brandsById.values()),
          };
        }
        if (!cancelled) setDayMap(normalized);
      } catch (e) {
        if (!cancelled) {
          toast.error(e.response?.data?.detail || e.response?.data?.error || e.message || 'Failed to load calendar');
          setDayMap({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedKey = useMemo(() => dateKey(selectedDate), [selectedDate]);
  const selectedDay = dayMap[selectedKey] || null;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Calendar</h1>
        <p className="mt-2 text-sm text-gray-600">Month-level calendar of posts across your brands.</p>
      </div>

      <div className={`${shellCard} p-4 sm:p-6`}>
        {loading ? (
          <div className="flex min-h-[16rem] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <ReactCalendar
              value={selectedDate}
              onChange={(value) => setSelectedDate(Array.isArray(value) ? value[0] : value)}
              view="month"
              minDetail="month"
              maxDetail="month"
              tileClassName={({ date, view }) => {
                if (view !== 'month') return null;
                return dayMap[dateKey(date)] ? 'has-posts-day' : null;
              }}
            />
          </div>
        )}
      </div>

      {selectedDay ? (
        <div className={`${shellCard} p-4 sm:p-5`}>
          <h3 className="text-base font-semibold text-gray-900">
            {format(selectedDay.date, 'MMM d, yyyy')} · {selectedDay.posts.length} posts
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {selectedDay.brands.length} brand
            {selectedDay.brands.length === 1 ? '' : 's'} scheduled on this day
          </p>
          <div className="mt-4 space-y-3">
            {[...selectedDay.posts]
              .sort((a, b) => parseApiDate(a.scheduledAt) - parseApiDate(b.scheduledAt))
              .map((p) => (
                <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <BrandAvatar
                        name={p.brandName || 'Brand'}
                        logoUrl={p.brandLogoUrl || ''}
                        size="sm"
                        className="h-8 w-8 min-h-8 min-w-8 text-xs"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{p.campaignName || 'Campaign'}</p>
                        <p className="text-xs text-gray-500">{p.brandName || 'Brand'}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-xs font-medium text-gray-600">
                      {format(parseApiDate(p.scheduledAt), 'h:mm a')}
                    </p>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-700">{p.caption || 'No caption'}</p>
                </div>
              ))}
          </div>
        </div>
      ) : null}
      <style>{`
        .react-calendar__tile.has-posts-day abbr {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 9999px;
          border: 2px solid #2563eb;
        }
        .react-calendar__tile--active.has-posts-day abbr {
          border-color: #ffffff;
        }
      `}</style>
    </div>
  );
}