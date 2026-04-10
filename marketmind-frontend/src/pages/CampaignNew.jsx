import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  FaFacebook,
  FaInstagram,
  FaLinkedinIn,
  FaReddit,
  FaXTwitter,
} from 'react-icons/fa6';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  createContentCampaign,
  fetchContentCampaign,
  fetchMyBrands,
  updateContentCampaign,
} from '../services/api';
import { PlatformIconRow } from '../components/PlatformIcon';
import BrandAvatar from '../components/BrandAvatar';
import { getDashboardBrandId, setDashboardBrandId } from '../utils/dashboardBrandStorage';

const shellCard =
  'rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] shadow-sm';
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25';

const allPlatforms = [
  { id: 'instagram', name: 'Instagram', Icon: FaInstagram, implemented: true },
  { id: 'twitter', name: 'X (Twitter)', Icon: FaXTwitter, implemented: false },
  { id: 'reddit', name: 'Reddit', Icon: FaReddit, implemented: false },
  { id: 'facebook', name: 'Facebook', Icon: FaFacebook, implemented: false },
  { id: 'linkedin', name: 'LinkedIn', Icon: FaLinkedinIn, implemented: false },
];

/** Platforms we persist today (only Instagram has generation wired). */
const IMPLEMENTED_PLATFORM_IDS = new Set(
  allPlatforms.filter((p) => p.implemented).map((p) => p.id)
);

const campaignTypes = [
  { id: 'awareness', name: 'Brand Awareness', description: 'Increase visibility and recognition of your brand' },
  { id: 'engagement', name: 'Engagement', description: 'Boost interactions and engagement with your audience' },
  { id: 'traffic', name: 'Website Traffic', description: 'Drive more visitors to your website' },
  { id: 'leads', name: 'Lead Generation', description: 'Capture potential customer information' },
  { id: 'sales', name: 'Sales', description: 'Drive product or service sales' },
  { id: 'app-installs', name: 'App Installs', description: 'Increase downloads of your mobile app' },
];

function dateInputToIso(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T12:00:00.000Z`).toISOString();
}

function isoToDateInput(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

const AGE_FLOOR = 13;
const AGE_CEIL = 100;
const POST_COUNT_MIN = 1;
const POST_COUNT_MAX = 5;

export default function CampaignNew() {
  const navigate = useNavigate();
  const { campaignId: editCampaignId } = useParams();
  const isEdit = Boolean(editCampaignId);

  const [step, setStep] = useState(1);
  const [loadError, setLoadError] = useState('');
  const [loadingCampaign, setLoadingCampaign] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [campaignStatus, setCampaignStatus] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [objective, setObjective] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() =>
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [postCount, setPostCount] = useState(1);

  const [platforms, setPlatforms] = useState(['instagram']);

  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsError, setBrandsError] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  /** After a successful edit fetch, brand cannot be changed (campaign is scoped to one brand). */
  const [editBrandLocked, setEditBrandLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBrandsLoading(true);
      setBrandsError('');
      try {
        const data = await fetchMyBrands();
        if (!cancelled) {
          const list = data.brands || [];
          setBrands(list);
          setSelectedBrandId((prev) => {
            if (prev && list.some((b) => String(b.id) === String(prev))) return prev;
            const dash = getDashboardBrandId();
            if (dash && list.some((b) => String(b.id) === dash)) return dash;
            if (isEdit) return '';
            return list[0] ? String(list[0].id) : '';
          });
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e.response?.data?.error || e.message || 'Failed to load brands';
          setBrandsError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
      } finally {
        if (!cancelled) setBrandsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only fetch; isEdit is fixed per route mount
  }, []);

  const loadCampaign = useCallback(async () => {
    if (!editCampaignId || !selectedBrandId) return;
    setLoadingCampaign(true);
    setLoadError('');
    setEditBrandLocked(false);
    try {
      const c = await fetchContentCampaign(selectedBrandId, editCampaignId);
      setCampaignStatus((c.status || 'draft').toLowerCase());
      setName(c.name || '');
      setBrief(c.brief || '');
      setObjective(c.objective || 'awareness');
      setStartDate(isoToDateInput(c.startDate));
      setEndDate(isoToDateInput(c.endDate));
      const aud = c.audience || {};
      setAgeMin(typeof aud.ageMin === 'number' ? aud.ageMin : 18);
      setAgeMax(typeof aud.ageMax === 'number' ? aud.ageMax : 65);
      setPostCount(
        typeof c.postCount === 'number' && c.postCount >= POST_COUNT_MIN
          ? Math.min(POST_COUNT_MAX, c.postCount)
          : POST_COUNT_MIN
      );
      setPlatforms(
        [...(c.platforms || [])].filter((id) => IMPLEMENTED_PLATFORM_IDS.has(String(id)))
      );
      setSelectedBrandId(String(c.brandId));
      setEditBrandLocked(true);
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.error || e.message || 'Failed to load campaign';
      setLoadError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      toast.error('Could not load campaign');
    } finally {
      setLoadingCampaign(false);
    }
  }, [editCampaignId, selectedBrandId]);

  useEffect(() => {
    if (!isEdit || !editCampaignId || !selectedBrandId) return;
    loadCampaign();
  }, [isEdit, editCampaignId, selectedBrandId, loadCampaign]);

  useEffect(() => {
    if (step !== 2) return;
    setPlatforms((p) => {
      const impl = p.filter((id) => IMPLEMENTED_PLATFORM_IDS.has(String(id)));
      return impl.length ? impl : ['instagram'];
    });
  }, [step]);

  const togglePlatform = (platformId) => {
    if (!IMPLEMENTED_PLATFORM_IDS.has(platformId)) return;
    setPlatforms((prev) => {
      if (prev.includes(platformId)) {
        const next = prev.filter((id) => id !== platformId);
        return next.length ? next : ['instagram'];
      }
      return [...prev, platformId];
    });
  };

  const buildPayload = () => {
    const implementedOnly = platforms.filter((id) => IMPLEMENTED_PLATFORM_IDS.has(String(id)));
    return {
      name: name.trim(),
      brief: brief.trim(),
      platforms: implementedOnly.length ? implementedOnly : ['instagram'],
      objective: objective.trim(),
      startDate: dateInputToIso(startDate),
      endDate: dateInputToIso(endDate),
      audience: {
        ageMin: Math.min(ageMin, ageMax),
        ageMax: Math.max(ageMin, ageMax),
      },
      postCount: Math.min(POST_COUNT_MAX, Math.max(POST_COUNT_MIN, postCount)),
    };
  };

  const handleBrandChange = (id) => {
    const s = String(id);
    setSelectedBrandId(s);
    setDashboardBrandId(s);
    if (isEdit) {
      setLoadError('');
      setEditBrandLocked(false);
      setLoadingCampaign(true);
    }
  };

  const handleGenerate = async () => {
    if (!selectedBrandId || !brands.some((b) => String(b.id) === String(selectedBrandId))) {
      toast.error('Select a brand for this campaign');
      return;
    }
    if (!name.trim() || !brief.trim() || !objective) {
      toast.error('Name, brief, and objective are required');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Start and end dates are required');
      return;
    }
    if (!platforms.some((id) => IMPLEMENTED_PLATFORM_IDS.has(String(id)))) {
      toast.error('Select Instagram — it is the only channel available for generation right now');
      return;
    }
    const payload = buildPayload();
    setSaving(true);
    try {
      if (isEdit) {
        await updateContentCampaign(selectedBrandId, editCampaignId, payload);
      } else {
        await createContentCampaign(selectedBrandId, payload);
      }
      toast.success(
        'Campaign saved. AI content generation is not available yet — it will run from this flow in a future update.'
      );
      navigate('/campaigns', { replace: true });
    } catch (e) {
      const d = e.response?.data?.detail;
      const msg =
        typeof d === 'string'
          ? d
          : Array.isArray(d)
            ? d.map((x) => x.msg || x).join(', ')
            : e.response?.data?.error || e.message || 'Failed to save';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const selectedBrand = brands.find((b) => String(b.id) === String(selectedBrandId));
  const selectedBrandName = selectedBrand?.name ?? '—';

  if (brandsLoading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
          aria-hidden
        />
      </div>
    );
  }

  if (brandsError) {
    return (
      <div className={`${shellCard} p-6 md:p-8`}>
        <h1 className="text-xl font-semibold text-gray-900">Could not load brands</h1>
        <p className="mt-2 text-sm text-red-700">{brandsError}</p>
        <Link to="/brands" className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800">
          Manage brands
        </Link>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className={`${shellCard} p-6 md:p-8`}>
        <h1 className="text-xl font-semibold text-gray-900">Create a brand first</h1>
        <p className="mt-2 text-sm text-gray-600">
          Campaigns are created under a brand. Add a brand to your workspace, then return here.
        </p>
        <Link
          to="/brands"
          className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          Go to brands
        </Link>
      </div>
    );
  }

  if (isEdit && !selectedBrandId) {
    return (
      <div className={`${shellCard} p-6 md:p-8`}>
        <h1 className="text-xl font-semibold text-gray-900">Which brand is this campaign under?</h1>
        <p className="mt-2 text-sm text-gray-600">
          Choose the brand that owns this campaign so we can load it. This matches the brand column on the
          campaigns list.
        </p>
        <label htmlFor="campaign-brand-load" className="mt-6 mb-1 block text-sm font-medium text-gray-700">
          Brand
        </label>
        <div className="mt-1 flex items-center gap-3">
          <BrandAvatar
            name={selectedBrand?.name ?? ''}
            logoUrl={selectedBrand?.logo_url}
            size="md"
          />
          <select
          id="campaign-brand-load"
          value={selectedBrandId}
          onChange={(e) => handleBrandChange(e.target.value)}
          className={`${inputClass} min-w-0 flex-1`}
        >
          <option value="">Select a brand…</option>
          {brands.map((b) => (
            <option key={b.id} value={String(b.id)}>
              {b.name}
            </option>
          ))}
        </select>
        </div>
        <Link to="/campaigns" className="mt-6 inline-block text-sm font-semibold text-blue-600">
          Back to campaigns
        </Link>
      </div>
    );
  }

  if (isEdit && loadingCampaign) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
          aria-hidden
        />
      </div>
    );
  }

  if (isEdit && loadError) {
    return (
      <div className={`${shellCard} p-6 md:p-8`}>
        <h1 className="text-lg font-semibold text-gray-900">Could not load campaign</h1>
        <p className="mt-2 text-sm text-red-700">{loadError}</p>
        <p className="mt-4 text-sm text-gray-600">
          If this campaign belongs to another brand, select it below — the page will reload the campaign.
        </p>
        <label htmlFor="campaign-brand-retry" className="mt-4 mb-1 block text-sm font-medium text-gray-700">
          Brand
        </label>
        <div className="mt-1 flex max-w-md items-center gap-3">
          <BrandAvatar
            name={selectedBrand?.name ?? ''}
            logoUrl={selectedBrand?.logo_url}
            size="md"
          />
          <select
          id="campaign-brand-retry"
          value={selectedBrandId}
          onChange={(e) => handleBrandChange(e.target.value)}
          className={`${inputClass} min-w-0 flex-1`}
        >
          {brands.map((b) => (
            <option key={b.id} value={String(b.id)}>
              {b.name}
            </option>
          ))}
        </select>
        </div>
        <Link to="/campaigns" className="mt-6 mr-6 inline-block text-sm font-semibold text-blue-600">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const objectiveLabel =
    campaignTypes.find((t) => t.id === objective)?.name || objective || '—';

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try {
      return format(new Date(iso), 'MMM d, yyyy');
    } catch {
      return '—';
    }
  };

  const handleArchive = async () => {
    if (!selectedBrandId || !editCampaignId) return;
    if (!window.confirm('Archive this campaign? It will be hidden from lists.')) return;
    setArchiving(true);
    try {
      await updateContentCampaign(selectedBrandId, editCampaignId, { status: 'archived' });
      toast.success('Campaign archived');
      navigate('/campaigns', { replace: true });
    } catch (e) {
      const d = e.response?.data?.detail;
      const msg =
        typeof d === 'string'
          ? d
          : Array.isArray(d)
            ? d.map((x) => x.msg || x).join(', ')
          : e.response?.data?.error || e.message || 'Failed to archive';
      toast.error(msg);
    } finally {
      setArchiving(false);
    }
  };

  const readOnlyFields = (
    <div className="mt-6 space-y-4 text-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Brand</p>
        <div className="mt-1 flex items-center gap-2">
          <BrandAvatar
            name={selectedBrand?.name ?? selectedBrandName}
            logoUrl={selectedBrand?.logo_url}
            size="md"
          />
          <p className="font-semibold text-gray-900">{selectedBrandName}</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Campaign</p>
        <p className="mt-1 font-semibold text-gray-900">{name || '—'}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Brief</p>
        <p className="mt-1 whitespace-pre-wrap text-gray-700">{brief || '—'}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Objective</p>
        <p className="mt-1 text-gray-700">{objectiveLabel}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Start</p>
          <p className="mt-1 tabular-nums text-gray-700">{fmtDate(dateInputToIso(startDate))}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">End</p>
          <p className="mt-1 tabular-nums text-gray-700">{fmtDate(dateInputToIso(endDate))}</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Channel</p>
        <div className="mt-1">
          <PlatformIconRow platforms={platforms} iconClassName="h-5 w-5" gapClassName="gap-1.5" />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Audience</p>
        <p className="mt-1 text-gray-700">
          Ages {ageMin}–{ageMax}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Posts</p>
        <p className="mt-1 text-gray-700">{postCount}</p>
      </div>
    </div>
  );

  if (isEdit && !loadingCampaign && campaignStatus === 'active') {
    return (
      <div className="w-full space-y-8">
        <div className={`${shellCard} p-6 md:p-8`}>
          <h1 className="text-xl font-semibold text-gray-900">Active campaign</h1>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            This campaign is live. Content cannot be edited while status is Active.
          </p>
          {readOnlyFields}
          <Link
            to="/campaigns"
            className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Back to campaigns
          </Link>
        </div>
      </div>
    );
  }

  if (
    isEdit &&
    !loadingCampaign &&
    (campaignStatus === 'completed' || campaignStatus === 'cancelled')
  ) {
    return (
      <div className="w-full space-y-8">
        <div className={`${shellCard} p-6 md:p-8`}>
          <h1 className="text-xl font-semibold text-gray-900">
            {campaignStatus === 'completed' ? 'Completed' : 'Cancelled'} campaign
          </h1>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            This campaign is closed. You can archive it to remove it from your main list.
          </p>
          {readOnlyFields}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleArchive}
              disabled={archiving}
              className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-900 disabled:opacity-50"
            >
              {archiving ? 'Archiving…' : 'Archive campaign'}
            </button>
            <Link
              to="/campaigns"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
            >
              Back to campaigns
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const step1Valid =
    Boolean(selectedBrandId && brands.some((b) => String(b.id) === String(selectedBrandId))) &&
    name.trim() &&
    brief.trim() &&
    objective &&
    startDate &&
    endDate &&
    new Date(endDate) >= new Date(startDate) &&
    ageMin >= AGE_FLOOR &&
    ageMax <= AGE_CEIL &&
    ageMax >= ageMin &&
    Number.isInteger(postCount) &&
    postCount >= POST_COUNT_MIN &&
    postCount <= POST_COUNT_MAX;

  const goToStep = (target) => {
    if (target === 1) {
      setStep(1);
      return;
    }
    if (target === 2 && !step1Valid) {
      toast.error('Complete all required fields in Plan before continuing.');
      return;
    }
    setStep(2);
  };

  const nextStep = () => {
    if (!step1Valid) {
      toast.error('Complete all required fields in Plan before continuing.');
      return;
    }
    setStep(2);
  };

  const prevStep = () => setStep(1);

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          {isEdit ? 'Edit campaign' : 'New campaign'}
        </h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          Step 1 of 2 — Plan the campaign (objective, schedule, and audience age range). Pick which brand this
          campaign belongs to; location follows that brand. No AI generation yet — everything is saved when you
          finish.
        </p>
      </div>

      <div>
        <label htmlFor="campaign-brand" className="mb-1 block text-sm font-medium text-gray-700">
          Brand <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 flex items-center gap-3">
          <BrandAvatar
            name={selectedBrand?.name ?? ''}
            logoUrl={selectedBrand?.logo_url}
            size="md"
          />
          <select
          id="campaign-brand"
          value={selectedBrandId}
          onChange={(e) => handleBrandChange(e.target.value)}
          disabled={brandsLoading || (isEdit && (editBrandLocked || loadingCampaign))}
          className={`${inputClass} min-w-0 flex-1`}
        >
          {brands.map((b) => (
            <option key={b.id} value={String(b.id)}>
              {b.name}
            </option>
          ))}
        </select>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {isEdit && editBrandLocked
            ? 'Campaigns cannot be moved between brands.'
            : 'Also updates your dashboard workspace brand when you change this.'}
        </p>
      </div>

      <div>
        <label htmlFor="campaign-name" className="mb-1 block text-sm font-medium text-gray-700">
          Campaign name <span className="text-red-500">*</span>
        </label>
        <input
          id="campaign-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="e.g., Summer launch 2025"
        />
      </div>

      <div>
        <label htmlFor="campaign-brief" className="mb-1 block text-sm font-medium text-gray-700">
          Campaign brief <span className="text-red-500">*</span>
        </label>
        <textarea
          id="campaign-brief"
          rows={4}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          className={inputClass}
          placeholder="Goals, key messages, and what success looks like…"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">
          Objective <span className="text-red-500">*</span>
        </p>
        <div className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {campaignTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setObjective(type.id)}
              className={`flex h-full w-full flex-col items-start gap-2 rounded-xl border border-gray-200 bg-white px-4 py-4 text-left shadow-sm transition-colors ${
                objective === type.id
                  ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-500/20'
                  : 'hover:border-blue-200'
              }`}
            >
              <h3 className="w-full text-left text-base font-semibold leading-snug text-gray-900">
                {type.name}
              </h3>
              <p className="w-full text-left text-sm leading-relaxed text-gray-600">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="start-date" className="mb-1 block text-sm font-medium text-gray-700">
            Start date <span className="text-red-500">*</span>
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="end-date" className="mb-1 block text-sm font-medium text-gray-700">
            End date <span className="text-red-500">*</span>
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900">Audience age range</h3>
          <span className="text-sm font-semibold tabular-nums text-gray-900">
            {ageMin} – {ageMax}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {AGE_FLOOR}–{AGE_CEIL}. Target geography comes from the brand.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="age-min" className="mb-1 block text-sm font-medium text-gray-700">
              Minimum age
            </label>
            <input
              id="age-min"
              type="number"
              min={AGE_FLOOR}
              max={ageMax}
              value={ageMin}
              onChange={(e) => setAgeMin(parseInt(e.target.value, 10) || AGE_FLOOR)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="age-max" className="mb-1 block text-sm font-medium text-gray-700">
              Maximum age
            </label>
            <input
              id="age-max"
              type="number"
              min={ageMin}
              max={AGE_CEIL}
              value={ageMax}
              onChange={(e) => setAgeMax(parseInt(e.target.value, 10) || AGE_CEIL)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="post-count" className="mb-1 block text-sm font-medium text-gray-700">
          Number of posts <span className="text-red-500">*</span>
        </label>
        <input
          id="post-count"
          type="number"
          min={POST_COUNT_MIN}
          max={POST_COUNT_MAX}
          step={1}
          value={postCount}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setPostCount(Number.isFinite(v) ? v : POST_COUNT_MIN);
          }}
          onBlur={() => {
            setPostCount((p) =>
              Math.min(POST_COUNT_MAX, Math.max(POST_COUNT_MIN, Number.isInteger(p) ? p : POST_COUNT_MIN))
            );
          }}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">
          Planned post volume for this campaign ({POST_COUNT_MIN}–{POST_COUNT_MAX}).
        </p>
      </div>

      <button
        type="button"
        onClick={nextStep}
        disabled={!step1Valid}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next: Channel
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <button
        type="button"
        onClick={prevStep}
        className="mb-2 flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800"
      >
        ← Back to plan
      </button>
      <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Channel</h2>
      <p className="text-sm text-gray-600">
        Only <span className="font-medium text-gray-800">Instagram</span> is available for generation
        today. Other networks are shown for reference and will be enabled later.
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {allPlatforms.map((platform) => {
          const Icon = platform.Icon;
          const implemented = platform.implemented;
          const selected = platforms.includes(platform.id);
          return (
            <button
              key={platform.id}
              type="button"
              disabled={!implemented}
              aria-label={implemented ? platform.name : `${platform.name} (coming soon)`}
              title={
                implemented
                  ? platform.name
                  : `${platform.name} — coming soon`
              }
              aria-pressed={implemented ? selected : undefined}
              onClick={() => implemented && togglePlatform(platform.id)}
              className={[
                'relative flex flex-col items-center justify-center rounded-xl border p-3 shadow-sm transition-colors',
                !implemented
                  ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-45'
                  : selected
                    ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white hover:border-blue-200',
              ].join(' ')}
            >
              <Icon className={`h-8 w-8 ${implemented ? 'text-gray-800' : 'text-gray-400'}`} aria-hidden />
              {!implemented ? (
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Soon
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={prevStep}
          className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={
            saving ||
            !platforms.some((id) => IMPLEMENTED_PLATFORM_IDS.has(String(id)))
          }
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Generate'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-8">
      <div className={`${shellCard} p-6 md:p-8`}>
        <div className="mb-8">
          <div className="flex items-center justify-between gap-2">
            {[1, 2].map((stepNum) => (
              <button
                key={stepNum}
                type="button"
                onClick={() => goToStep(stepNum)}
                disabled={stepNum === 2 && !step1Valid}
                title={
                  stepNum === 2 && !step1Valid
                    ? 'Complete all required fields in Plan first'
                    : undefined
                }
                className="flex flex-1 flex-col items-center rounded-lg p-1 text-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold shadow-sm ${
                    step === stepNum
                      ? 'bg-blue-600 text-white ring-2 ring-blue-500/25'
                      : step > stepNum
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  {stepNum}
                </div>
                <span className="mt-2 text-center text-sm font-semibold text-gray-700">
                  {stepNum === 1 ? 'Plan' : 'Channel'}
                </span>
              </button>
            ))}
          </div>
        </div>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </div>
    </div>
  );
}
