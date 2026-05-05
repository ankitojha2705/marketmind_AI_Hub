import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  FaFacebook,
  FaInstagram,
  FaLinkedinIn,
  FaReddit,
  FaTrash,
  FaXTwitter,
} from 'react-icons/fa6';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  createCampaignPost,
  createContentCampaign,
  fetchCampaignPosts,
  fetchContentCampaign,
  fetchMyBrands,
  runCampaignAnalysis,
  runCampaignGeneration,
  updateCampaignPost,
  updateContentCampaign,
  chatWithAssistant,
  validateContent,
} from '../services/api';
import BrandAvatar from '../components/BrandAvatar';
import { getDashboardBrandId, setDashboardBrandId } from '../utils/dashboardBrandStorage';
import { SparklesIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const shellCard = 'rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] shadow-sm';
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25';
const labelClass = 'mb-1 block text-base font-semibold text-gray-900';
const POST_COUNT_MIN = 1;
const POST_COUNT_MAX = 5;
const allPlatforms = [
  { id: 'instagram', name: 'Instagram', Icon: FaInstagram, implemented: true },
  { id: 'twitter', name: 'X (Twitter)', Icon: FaXTwitter, implemented: false },
  { id: 'reddit', name: 'Reddit', Icon: FaReddit, implemented: false },
  { id: 'facebook', name: 'Facebook', Icon: FaFacebook, implemented: false },
  { id: 'linkedin', name: 'LinkedIn', Icon: FaLinkedinIn, implemented: false },
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

function isoToDateTimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function localToIso(local) {
  if (!local) return '';
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

function toSnakeAnalysis(analysis) {
  return {
    objective: analysis.objective || '',
    target_audience: analysis.targetAudience || '',
    content_tone: analysis.contentTone || '',
    platform_insights: analysis.platformInsights || {},
    schedule_plan: (analysis.schedulePlan || []).map((item, idx) => ({
      seq: Number(item.seq) || idx + 1,
      scheduled_at: item.scheduledAt,
      focus: item.focus || '',
      platforms: item.platforms?.length ? item.platforms : ['instagram'],
    })),
  };
}

function fromSnakeAnalysis(analysis) {
  return {
    objective: analysis.objective || '',
    targetAudience: analysis.target_audience || '',
    contentTone: analysis.content_tone || '',
    platformInsights: analysis.platform_insights || {},
    schedulePlan: (analysis.schedule_plan || []).map((item, idx) => ({
      seq: Number(item.seq) || idx + 1,
      scheduledAt: item.scheduled_at || '',
      focus: item.focus || '',
      platforms: item.platforms?.length ? item.platforms : ['instagram'],
    })),
  };
}

const platformIconMap = {
  instagram: FaInstagram,
  twitter: FaXTwitter,
  reddit: FaReddit,
  facebook: FaFacebook,
  linkedin: FaLinkedinIn,
};

function formatInsightKey(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export default function CampaignNew() {
  const navigate = useNavigate();
  const { campaignId: routeCampaignId } = useParams();
  const isEdit = Boolean(routeCampaignId);

  const [step, setStep] = useState(1);
  const [readOnlyTab, setReadOnlyTab] = useState('posts');
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsError, setBrandsError] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [campaignId, setCampaignId] = useState(routeCampaignId || '');
  const [loadingCampaign, setLoadingCampaign] = useState(isEdit);
  const [campaignStatus, setCampaignStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // RAG Assistant State
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [validationResults, setValidationResults] = useState(null);

  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() =>
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [postCount, setPostCount] = useState(1);
  const [platforms, setPlatforms] = useState([]);

  const [analysis, setAnalysis] = useState({
    objective: '',
    targetAudience: '',
    contentTone: '',
    platformInsights: {},
    schedulePlan: [],
  });
  const [posts, setPosts] = useState([]);
  const [editingStep2, setEditingStep2] = useState(false);
  const stepMeta = [
    { n: 1, title: 'Campaign setup' },
    { n: 2, title: 'Analysis review' },
    { n: 3, title: 'Posts review' },
  ];

  const togglePlatform = (platformId) => {
    const option = allPlatforms.find((p) => p.id === platformId);
    if (!option?.implemented) return;
    setPlatforms((prev) => {
      if (prev.includes(platformId)) {
        return prev.filter((x) => x !== platformId);
      }
      return [...prev, platformId];
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBrandsLoading(true);
      setBrandsError('');
      try {
        const data = await fetchMyBrands();
        if (cancelled) return;
        const list = data.brands || [];
        setBrands(list);
        setSelectedBrandId((prev) => {
          if (prev && list.some((b) => String(b.id) === String(prev))) return prev;
          const dash = getDashboardBrandId();
          if (dash && list.some((b) => String(b.id) === dash)) return dash;
          return list[0] ? String(list[0].id) : '';
        });
      } catch (e) {
        if (!cancelled) setBrandsError(e.response?.data?.error || e.message || 'Failed to load brands');
      } finally {
        if (!cancelled) setBrandsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCampaign = useCallback(async () => {
    if (!campaignId || !selectedBrandId) return;
    setLoadingCampaign(true);
    try {
      const c = await fetchContentCampaign(selectedBrandId, campaignId);
      let normalizedStatus = (c.status || 'draft').toLowerCase();
      if (normalizedStatus === 'scheduled' && c.startDate) {
        try {
          const campaignStartLocal = format(new Date(c.startDate), 'yyyy-MM-dd');
          const todayLocal = format(new Date(), 'yyyy-MM-dd');
          if (campaignStartLocal <= todayLocal) {
            await updateContentCampaign(selectedBrandId, campaignId, { status: 'active' });
            normalizedStatus = 'active';
          }
        } catch {
          // If date parsing/update fails, keep original status and continue.
        }
      }
      setCampaignStatus(normalizedStatus);
      if (normalizedStatus === 'cancelled') {
        toast.error('Cancelled campaigns cannot be opened');
        navigate('/campaigns', { replace: true });
        return;
      }
      setName(c.name || '');
      setBrief(c.brief || '');
      setStartDate(isoToDateInput(c.startDate));
      setEndDate(isoToDateInput(c.endDate));
      setPostCount(typeof c.postCount === 'number' ? c.postCount : 1);
      setPlatforms(Array.isArray(c.platforms) ? c.platforms : []);
      setAnalysis({
        objective: c.objective || '',
        targetAudience: c.targetAudience || '',
        contentTone: c.contentTone || '',
        platformInsights: c.platformInsights || {},
        schedulePlan: Array.isArray(c.schedulePlan) ? c.schedulePlan : [],
      });
      const list = await fetchCampaignPosts(selectedBrandId, campaignId);
      setPosts(Array.isArray(list) ? list : []);
      const hasStep2Fields =
        Boolean(c.objective?.trim()) ||
        Boolean(c.targetAudience?.trim()) ||
        Boolean(c.contentTone?.trim()) ||
        (Array.isArray(c.schedulePlan) && c.schedulePlan.length > 0) ||
        (c.platformInsights && Object.keys(c.platformInsights).length > 0);
      const hasStep3Fields = Array.isArray(list) && list.length > 0;
      if (hasStep3Fields) setStep(3);
      else if (hasStep2Fields) setStep(2);
      else setStep(1);
    } catch (e) {
      toast.error(e.response?.data?.detail || e.response?.data?.error || e.message || 'Failed to load campaign');
    } finally {
      setLoadingCampaign(false);
    }
  }, [campaignId, navigate, selectedBrandId]);

  useEffect(() => {
    if (campaignId && selectedBrandId) loadCampaign();
  }, [campaignId, selectedBrandId, loadCampaign]);

  const selectedBrand = brands.find((b) => String(b.id) === String(selectedBrandId));
  const isCancelled = campaignStatus === 'cancelled';
  const isReadOnlyView = campaignStatus === 'active' || campaignStatus === 'completed';

  const step1Valid =
    Boolean(selectedBrandId) &&
    name.trim() &&
    brief.trim() &&
    startDate &&
    endDate &&
    new Date(endDate) >= new Date(startDate) &&
    platforms.length > 0 &&
    Number.isInteger(postCount) &&
    postCount >= POST_COUNT_MIN &&
    postCount <= POST_COUNT_MAX;
  const hasStep2Data =
    Boolean(analysis.objective?.trim()) ||
    Boolean(analysis.targetAudience?.trim()) ||
    Boolean(analysis.contentTone?.trim()) ||
    (Array.isArray(analysis.schedulePlan) && analysis.schedulePlan.length > 0) ||
    (analysis.platformInsights && Object.keys(analysis.platformInsights).length > 0);
  const hasStep3Data = Array.isArray(posts) && posts.length > 0;

  const saveStep1 = async () => {
    const payload = {
      name: name.trim(),
      brief: brief.trim(),
      platforms,
      startDate: dateInputToIso(startDate),
      endDate: dateInputToIso(endDate),
      postCount,
      objective: analysis.objective || '',
      targetAudience: analysis.targetAudience || '',
      contentTone: analysis.contentTone || '',
      platformInsights: analysis.platformInsights || {},
      schedulePlan: analysis.schedulePlan || [],
    };
    if (campaignId) {
      const updated = await updateContentCampaign(selectedBrandId, campaignId, payload);
      return updated.id;
    }
    const created = await createContentCampaign(selectedBrandId, payload);
    setCampaignId(created.id);
    return created.id;
  };

  const runStep2 = async () => {
    if (!step1Valid) {
      toast.error('Complete all required fields before continuing');
      return;
    }
    setSaving(true);
    setProcessingMessage('Our AI agents are at work on Step 2. Generating campaign analysis...');
    try {
      const cid = await saveStep1();
      const analysisResp = await runCampaignAnalysis({
        brand: {
          name: selectedBrand?.name || '',
          businessType: selectedBrand?.businessType || '',
          location: `${selectedBrand?.city || ''}, ${selectedBrand?.country || ''}`.trim(),
        },
        campaign: {
          id: cid,
          name: name.trim(),
          brief: brief.trim(),
          startDate: dateInputToIso(startDate),
          endDate: dateInputToIso(endDate),
          postCount,
          platforms,
        },
      });
      const mapped = fromSnakeAnalysis(analysisResp.analysis || {});
      setAnalysis(mapped);
      await updateContentCampaign(selectedBrandId, cid, {
        objective: mapped.objective,
        targetAudience: mapped.targetAudience,
        contentTone: mapped.contentTone,
        platformInsights: mapped.platformInsights,
        schedulePlan: mapped.schedulePlan,
      });
      setStep(2);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Analysis failed');
    } finally {
      setSaving(false);
      setProcessingMessage('');
    }
  };

  const runStep3 = async () => {
    if (!campaignId) {
      toast.error('Save campaign first');
      return;
    }
    setGenerating(true);
    setProcessingMessage('Our AI agents are at work on Step 3. Generating posts and SEO...');
    try {
      await updateContentCampaign(selectedBrandId, campaignId, {
        objective: analysis.objective,
        targetAudience: analysis.targetAudience,
        contentTone: analysis.contentTone,
        platformInsights: analysis.platformInsights,
        schedulePlan: analysis.schedulePlan,
      });
      const res = await runCampaignGeneration({
        brand: {
          name: selectedBrand?.name || '',
          businessType: selectedBrand?.businessType || '',
          location: `${selectedBrand?.city || ''}, ${selectedBrand?.country || ''}`.trim(),
        },
        campaign: {
          id: campaignId,
        name: name.trim(),
        brief: brief.trim(),
          startDate: dateInputToIso(startDate),
          endDate: dateInputToIso(endDate),
          postCount,
          platforms,
        },
        analysis: toSnakeAnalysis(analysis),
      });
      const contentPosts = res?.data?.content?.posts || [];
      const seoPosts = res?.data?.seo?.posts || [];
      const existing = await fetchCampaignPosts(selectedBrandId, campaignId);
      const existingMap = new Map(existing.map((p) => [`${p.scheduleSeq}:${p.platform}`, p]));

      const merged = contentPosts.map((p, idx) => {
        const seo = seoPosts.find(
          (s) =>
            Number(s.schedule_seq) === Number(p.schedule_seq) &&
            String(s.platform) === String(p.platform)
        );
        return {
          scheduleSeq: Number(p.schedule_seq || idx + 1),
          platform: p.platform || 'instagram',
          scheduledAt:
            p.scheduled_at || analysis.schedulePlan[idx]?.scheduledAt || dateInputToIso(startDate),
          focus: p.focus || analysis.schedulePlan[idx]?.focus || '',
          caption: p.caption || '',
          hashtags: p.hashtags || [],
          selectedHashtags: (p.hashtags || []).slice(0, 5),
          postType: p.post_type || 'Photo',
          callToAction: p.call_to_action || '',
          seo: seo?.optimized || {},
          media: {
            imagePrompt: p.image_prompt || null,
            imageUrl: p.image_url || null,
            mediaPrompts: p.media_prompts || [],
            notes: p.notes || '',
          },
        };
      });

      const saved = [];
      for (const item of merged) {
        const key = `${item.scheduleSeq}:${item.platform}`;
        const ex = existingMap.get(key);
        if (ex) {
          const updated = await updateCampaignPost(selectedBrandId, campaignId, ex.id, item);
          saved.push(updated);
        } else {
          const created = await createCampaignPost(selectedBrandId, campaignId, item);
          saved.push(created);
        }
      }
      setPosts(saved);
      setStep(3);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Post generation failed');
    } finally {
      setGenerating(false);
      setProcessingMessage('');
    }
  };

  // RAG Assistant Functions
  const handleAskAssistant = async () => {
    if (!assistantMessage.trim() || !selectedBrandId) return;
    
    setAssistantLoading(true);
    try {
      const response = await chatWithAssistant(selectedBrandId, assistantMessage);
      setAssistantResponse(response.response);
    } catch (error) {
      toast.error('Failed to get assistant response');
      console.error('Assistant error:', error);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleValidateContent = async (content) => {
    if (!selectedBrandId) return;
    
    try {
      const validation = await validateContent(selectedBrandId, content);
      setValidationResults(validation);
    } catch (error) {
      toast.error('Failed to validate content');
      console.error('Validation error:', error);
    }
  };

  const savePostEdits = async () => {
    if (!campaignId) return;
    setSaving(true);
    try {
      for (const p of posts) {
        await updateCampaignPost(selectedBrandId, campaignId, p.id, {
          caption: p.caption,
          selectedHashtags: p.selectedHashtags || [],
        });
      }
      await updateContentCampaign(selectedBrandId, campaignId, { status: 'scheduled' });
      setCampaignStatus('scheduled');
      toast.success('Posts updated and campaign scheduled');
      navigate('/campaigns', { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Failed to save post edits');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectedHashtag = (postId, tag) => {
    setPosts((curr) =>
      curr.map((p) => {
        if (p.id !== postId) return p;
        const selected = new Set(p.selectedHashtags || []);
        if (selected.has(tag)) {
          selected.delete(tag);
        } else if (selected.size < 5) {
          selected.add(tag);
        }
        return { ...p, selectedHashtags: [...selected] };
      })
    );
  };

  const updateInsightValue = (key, value) => {
    setAnalysis((curr) => ({
      ...curr,
      platformInsights: {
        ...(curr.platformInsights || {}),
        [key]: value,
      },
    }));
  };

  const deleteInsightKey = (key) => {
    setAnalysis((curr) => {
      const next = { ...(curr.platformInsights || {}) };
      delete next[key];
      return { ...curr, platformInsights: next };
    });
  };

  if (brandsLoading || loadingCampaign) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
              </div>
    );
  }
  if (brandsError) return <div className={`${shellCard} p-6`}><p className="text-red-700">{brandsError}</p></div>;
  if (!brands.length) return <div className={`${shellCard} p-6`}><p>No brands found.</p></div>;
  if (isCancelled) {
    return (
      <div className={`${shellCard} p-6`}>
        <h1 className="text-xl font-semibold text-gray-900">Campaign unavailable</h1>
        <p className="mt-2 text-sm text-gray-600">Cancelled campaigns cannot be opened.</p>
        <Link to="/campaigns" className="mt-4 inline-block text-sm font-semibold text-blue-600">
          Back to campaigns
        </Link>
      </div>
    );
  }

  if (isReadOnlyView) {
    return (
      <div className="w-full space-y-8">
        <div className={`${shellCard} p-6 md:p-8 space-y-6`}>
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{name || 'Campaign details'}</h1>
          </div>
          <div className="flex items-center justify-between border-b border-gray-200">
            <nav className="flex gap-1" aria-label="Campaign read-only sections">
              {[
                { name: 'Posts', id: 'posts' },
                { name: 'Details', id: 'details' },
              ].map(({ name: tabName, id }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setReadOnlyTab(id)}
                  className={`flex shrink-0 items-center border-b-2 px-3 py-3.5 text-sm font-semibold transition-colors sm:px-4 ${
                    readOnlyTab === id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  {tabName}
                </button>
              ))}
            </nav>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                campaignStatus === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {campaignStatus === 'active' ? 'Active' : 'Completed'}
            </span>
          </div>

          {readOnlyTab === 'posts' ? (
            <div className="space-y-4">
              {(posts || []).length === 0 ? (
                <p className="text-sm text-gray-600">No posts available for this campaign yet.</p>
              ) : (
                (posts || []).map((p) => (
                  <div key={p.id} className="space-y-3 rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        Post {p.scheduleSeq} ·{' '}
                        {(() => {
                          const pid = String(p.platform || '').toLowerCase();
                          const Icon = platformIconMap[pid];
                          return Icon ? (
                            <Icon className="inline h-4 w-4 align-text-bottom text-gray-700" aria-hidden />
                          ) : (
                            pid || '—'
                          );
                        })()}{' '}
                        · {p.scheduledAt ? format(new Date(p.scheduledAt), 'MMM d, yyyy h:mm a') : '—'}
                      </p>
                      {campaignStatus === 'active' ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            String(p.status || 'scheduled').toLowerCase() === 'success'
                              ? 'bg-emerald-100 text-emerald-800'
                              : String(p.status || 'scheduled').toLowerCase() === 'processing'
                                ? 'bg-amber-100 text-amber-800'
                                : String(p.status || 'scheduled').toLowerCase() === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {String(p.status || 'scheduled').toLowerCase() === 'success'
                            ? 'Published'
                            : String(p.status || 'scheduled').toLowerCase() === 'processing'
                              ? 'Publishing'
                              : String(p.status || 'scheduled').toLowerCase() === 'failed'
                                ? 'Failed'
                                : 'Scheduled'}
                        </span>
                      ) : null}
                    </div>
                    {campaignStatus === 'active' &&
                    String(p.status || 'scheduled').toLowerCase() === 'success' &&
                    p.publishedAt ? (
                      <p className="text-xs font-medium text-emerald-700">
                        Published at {format(new Date(p.publishedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    ) : null}
                    {(() => {
                      const imageUrl = p.media?.imageUrl || p.media?.image_url || null;
                      const imagePrompt = p.media?.imagePrompt || p.media?.image_prompt || '';
                      if (!imageUrl) return null;
                      return (
                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                          <img
                            src={imageUrl}
                            alt={imagePrompt || 'Generated campaign media'}
                            className="h-auto w-full object-cover"
                          />
                        </div>
                      );
                    })()}
                    <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">
                      {p.caption || '—'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(p.selectedHashtags?.length ? p.selectedHashtags : p.hashtags || []).map((tag) => (
                        <span key={tag} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <BrandAvatar name={selectedBrand?.name || ''} logoUrl={selectedBrand?.logo_url} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedBrand?.name || 'Brand'}</p>
                    <p className="text-xs text-gray-500">{name || 'Campaign'}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Campaign brief</label>
                  <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">
                    {brief || '—'}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Timeline</label>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">
                    {startDate || '—'} to {endDate || '—'}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Number of posts</label>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">{postCount}</div>
                </div>
                <div>
                  <label className={labelClass}>Platforms</label>
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="flex items-center gap-2">
                      {(platforms || []).map((pidRaw, idx) => {
                        const pid = String(pidRaw || '').toLowerCase();
                        const Icon = platformIconMap[pid];
                        if (!Icon) return null;
                        return <Icon key={`${pid}-${idx}`} className="h-4 w-4 text-gray-700" aria-hidden />;
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Objective</label>
                <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">
                  {analysis.objective || '—'}
                </div>
              </div>
              <div>
                <label className={labelClass}>Target Audience</label>
                <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">
                  {analysis.targetAudience || '—'}
                </div>
              </div>
              <div>
                <label className={labelClass}>Content Tone</label>
                <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">
                  {analysis.contentTone || '—'}
                </div>
              </div>
              <div>
                <label className={labelClass}>Platform Insights</label>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  {Object.keys(analysis.platformInsights || {}).length === 0 ? (
                    <p className="text-sm text-gray-500">No insights available.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(analysis.platformInsights || {}).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{formatInsightKey(key)}</p>
                          <p className="whitespace-pre-wrap text-sm text-gray-800">{String(value ?? '')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>Schedule Plan</label>
                <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
                  {(analysis.schedulePlan || []).length === 0 ? (
                    <p className="text-sm text-gray-500">No schedule entries generated yet.</p>
                  ) : (
                    (analysis.schedulePlan || []).map((s, idx) => (
                      <div key={`${s.seq}-${idx}`} className="rounded-lg border border-gray-200 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900">Post {s.seq}</p>
                          <div className="flex items-center gap-1">
                            {(s.platforms || []).map((pidRaw, iconIdx) => {
                              const pid = String(pidRaw || '').toLowerCase();
                              const Icon = platformIconMap[pid];
                              if (!Icon) return null;
                              return <Icon key={`${pid}-${iconIdx}`} className="h-4 w-4 text-gray-700" aria-hidden />;
                            })}
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-700">
                          <p>
                            <span className="font-medium text-gray-800">When: </span>
                            {s.scheduledAt ? format(new Date(s.scheduledAt), 'MMM d, yyyy h:mm a') : '—'}
                          </p>
                          <p>
                            <span className="font-medium text-gray-800">Focus: </span>
                            {s.focus || '—'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          <div>
            <Link to="/campaigns" className="inline-block text-sm font-semibold text-blue-600">
              Back to campaigns
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const goToStep = (targetStep) => {
    if (step === 2 && editingStep2 && targetStep !== 2) return;
    if (targetStep === 1) {
      setStep(1);
      return;
    }
    if (targetStep === 2 && !(hasStep2Data || hasStep3Data)) return;
    if (targetStep === 3 && !hasStep3Data) return;
    setStep(targetStep);
  };

  const handleStep1Next = async () => {
    if (!step1Valid) {
      toast.error('Complete all required fields before continuing');
      return;
    }
    if (hasStep3Data) {
      setStep(3);
      return;
    }
    if (hasStep2Data) {
      setStep(2);
      return;
    }
    await runStep2();
  };

  const handleStep2Next = async () => {
    if (hasStep3Data) {
      setStep(3);
      return;
    }
    await runStep3();
  };

  return (
    <div className="w-full space-y-8">
      <div className={`${shellCard} p-6 md:p-8 space-y-6`}>
        <div className="flex items-center justify-center">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {isEdit ? 'Edit campaign' : 'New campaign'}
          </h1>
        </div>
        <div className="mx-auto flex w-full max-w-3xl items-start justify-center gap-2">
          {stepMeta.map((s, idx) => {
            const isActive = step === s.n;
            const isCompleted = step > s.n;
            const isEnabled =
              s.n === 1 ? true : s.n === 2 ? hasStep2Data || hasStep3Data : hasStep3Data;
            return (
              <div key={s.n} className="flex items-start">
                        <button
                          type="button"
                  onClick={() => goToStep(s.n)}
                  disabled={!isEnabled || (step === 2 && editingStep2 && s.n !== 2)}
                  className="flex w-28 flex-col items-center text-center disabled:cursor-not-allowed"
                >
                          <span 
                    className={[
                      'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white ring-2 ring-blue-500/25'
                        : isCompleted
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : isEnabled
                            ? 'border-gray-300 bg-white text-gray-700'
                            : 'border-gray-200 bg-gray-100 text-gray-400',
                    ].join(' ')}
                  >
                    {s.n}
                          </span>
                  <span
                    className={[
                      'mt-2 text-xs font-medium',
                      isActive
                        ? 'text-gray-900'
                        : isCompleted
                          ? 'text-gray-700'
                          : isEnabled
                            ? 'text-gray-600'
                            : 'text-gray-400',
                    ].join(' ')}
                  >
                    {s.title}
                  </span>
                          </button>
                {idx < stepMeta.length - 1 ? (
                  <div
                    className={`mt-5 h-px w-24 ${
                      step > s.n ? 'bg-emerald-300' : 'bg-gray-200'
                    }`}
                    aria-hidden
                  />
                ) : null}
                        </div>
            );
          })}
                      </div>
        {processingMessage ? (
          <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            <span>{processingMessage}</span>
                    </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Brand</label>
              <div className="flex items-center gap-3">
                <BrandAvatar name={selectedBrand?.name || ''} logoUrl={selectedBrand?.logo_url} size="md" />
                <select
                  value={selectedBrandId}
                  onChange={(e) => {
                    setSelectedBrandId(e.target.value);
                    setDashboardBrandId(e.target.value);
                  }}
                  className={inputClass}
                >
                  {brands.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
                          </div>
                        </div>
                          <div>
              <label className={labelClass}>Campaign name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
                          </div>
                          <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>Campaign brief</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAssistant(!showAssistant)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    Ask Assistant
                  </button>
                  {brief && (
                    <button
                      type="button"
                      onClick={() => handleValidateContent(brief)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Validate
                    </button>
                  )}
                </div>
              </div>
              <textarea rows={4} className={inputClass} value={brief} onChange={(e) => setBrief(e.target.value)} />
              {validationResults && (
                <div className="mt-2 p-3 rounded-lg border bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">
                        {validationResults.is_valid ? 'Content looks good!' : 'Content needs attention'}
                      </p>
                      {validationResults.issues.length > 0 && (
                        <ul className="mt-1 text-xs text-amber-700 list-disc list-inside">
                          {validationResults.issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      )}
                      {validationResults.suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-amber-800">Suggestions:</p>
                          <ul className="mt-1 text-xs text-amber-700 list-disc list-inside">
                            {validationResults.suggestions.map((suggestion, idx) => (
                              <li key={idx}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                <label className={labelClass}>Start date</label>
                <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                          </div>
                          <div>
                <label className={labelClass}>End date</label>
                <input type="date" className={inputClass} value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
                          </div>
                      </div>
            <div>
              <label className={labelClass}>Number of posts</label>
              <input
                type="number"
                min={1}
                max={5}
                className={inputClass}
                value={postCount}
                onChange={(e) => setPostCount(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
              />
                    </div>
            <div>
              <label className={labelClass}>Platforms</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {allPlatforms.map((platform) => {
                  const Icon = platform.Icon;
                  const selected = platforms.includes(platform.id);
                  return (
                <button
                      key={platform.id}
                  type="button"
                      disabled={!platform.implemented}
                      onClick={() => togglePlatform(platform.id)}
                      title={platform.implemented ? platform.name : `${platform.name} — coming soon`}
                      className={[
                        'relative flex flex-col items-center justify-center rounded-xl border p-3 shadow-sm transition-colors',
                        !platform.implemented
                          ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-45'
                          : selected
                            ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-500/20'
                            : 'border-gray-200 bg-white hover:border-blue-200',
                      ].join(' ')}
                    >
                      <Icon className={`h-6 w-6 ${platform.implemented ? 'text-gray-800' : 'text-gray-400'}`} aria-hidden />
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        {platform.implemented ? platform.name.replace(' (Twitter)', '') : 'Soon'}
                      </span>
                </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div />
              <button
                type="button"
                disabled={saving || !step1Valid}
                onClick={handleStep1Next}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Processing…' : 'Next'}
              </button>
          </div>
        </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="flex justify-end">
          <button
            type="button"
                onClick={() => setEditingStep2((v) => !v)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
                {editingStep2 ? 'Done' : 'Edit details'}
          </button>
        </div>
            <div>
              <label className={labelClass}>Objective</label>
              {editingStep2 ? (
                <input
                  className={inputClass}
                  value={analysis.objective}
                  onChange={(e) => setAnalysis((a) => ({ ...a, objective: e.target.value }))}
                />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
                  {analysis.objective || '—'}
      </div>
              )}
    </div>
      <div>
              <label className={labelClass}>Target Audience</label>
              {editingStep2 ? (
                <textarea
                  rows={3}
                  className={inputClass}
                  value={analysis.targetAudience}
                  onChange={(e) => setAnalysis((a) => ({ ...a, targetAudience: e.target.value }))}
                />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 whitespace-pre-wrap">
                  {analysis.targetAudience || '—'}
      </div>
              )}
      </div>
            <div>
              <label className={labelClass}>Content Tone</label>
              {editingStep2 ? (
                <input
                  className={inputClass}
                  value={analysis.contentTone}
                  onChange={(e) => setAnalysis((a) => ({ ...a, contentTone: e.target.value }))}
                />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
                  {analysis.contentTone || '—'}
        </div>
              )}
      </div>
      <div>
              <label className={labelClass}>Platform Insights</label>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                {Object.keys(analysis.platformInsights || {}).length === 0 ? (
                  <p className="text-sm text-gray-500">No platform insights generated yet.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(analysis.platformInsights || {}).map(([key, value]) => (
                      <div key={key} className="grid gap-2 sm:grid-cols-3">
                        <p className="text-sm font-medium text-gray-700 sm:col-span-1">
                          {formatInsightKey(key)}
                        </p>
                        {editingStep2 ? (
                          <div className="sm:col-span-2 flex items-start gap-2">
                            <textarea
                              rows={2}
                              className={`${inputClass} flex-1`}
                              value={String(value ?? '')}
                              onChange={(e) => updateInsightValue(key, e.target.value)}
                            />
        <button
          type="button"
                              onClick={() => deleteInsightKey(key)}
                              className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                              title="Delete insight"
        >
                              <FaTrash className="h-4 w-4" aria-hidden />
        </button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 sm:col-span-2 whitespace-pre-wrap">
                            {String(value ?? '')}
                          </p>
                        )}
      </div>
                    ))}
              </div>
                )}
                  </div>
                </div>
            <div className="space-y-2">
              <label className={labelClass}>Schedule Plan</label>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                {(analysis.schedulePlan || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No schedule entries generated yet.</p>
                ) : (
                  <div className="space-y-3">
                    {(analysis.schedulePlan || []).map((s, idx) => (
                      <div key={`${s.seq}-${idx}`} className="rounded-lg border border-gray-200 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900">Post {s.seq}</p>
                          <div className="flex items-center gap-1">
                            {(s.platforms || []).map((pidRaw, iconIdx) => {
                              const pid = String(pidRaw || '').toLowerCase();
                              const Icon = platformIconMap[pid];
                              if (!Icon) return null;
                              return <Icon key={`${pid}-${iconIdx}`} className="h-4 w-4 text-gray-700" aria-hidden />;
                            })}
              </div>
            </div>
                        {editingStep2 ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                  <input
                              type="datetime-local"
                              className={inputClass}
                              value={isoToDateTimeLocal(s.scheduledAt)}
                              onChange={(e) =>
                                setAnalysis((a) => ({
                                  ...a,
                                  schedulePlan: a.schedulePlan.map((x, i) =>
                                    i === idx ? { ...x, scheduledAt: localToIso(e.target.value) } : x
                                  ),
                                }))
                              }
                            />
                    <input
                              className={inputClass}
                              value={s.focus || ''}
                              onChange={(e) =>
                                setAnalysis((a) => ({
                                  ...a,
                                  schedulePlan: a.schedulePlan.map((x, i) =>
                                    i === idx ? { ...x, focus: e.target.value } : x
                                  ),
                                }))
                              }
                    />
                  </div>
                        ) : (
                          <div className="space-y-1 text-sm text-gray-700">
                            <p>
                              <span className="font-medium text-gray-800">When: </span>
                              {s.scheduledAt
                                ? (() => {
                                    try {
                                      return format(new Date(s.scheduledAt), 'MMM d, yyyy h:mm a');
                                    } catch {
                                      return s.scheduledAt;
                                    }
                                  })()
                                : '—'}
                            </p>
                            <p>
                              <span className="font-medium text-gray-800">Focus: </span>
                              {s.focus || '—'}
                            </p>
                  </div>
                        )}
                </div>
                    ))}
                </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
          <button
            type="button"
                onClick={() => setStep(1)}
                disabled={editingStep2}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>
            <button
              type="button"
                onClick={handleStep2Next}
                disabled={generating || editingStep2}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {generating ? 'Processing…' : 'Next'}
            </button>
          </div>
        </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            {(posts || []).map((p) => (
              <div key={p.id} className="space-y-3 rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-900">
                  Post {p.scheduleSeq} ·{' '}
                  {(() => {
                    const pid = String(p.platform || '').toLowerCase();
                    const Icon = platformIconMap[pid];
                    return Icon ? <Icon className="inline h-4 w-4 align-text-bottom text-gray-700" aria-hidden /> : pid || '—';
                  })()}{' '}
                  ·{' '}
                  {p.scheduledAt ? format(new Date(p.scheduledAt), 'MMM d, yyyy h:mm a') : '—'}
                </p>
                {(() => {
                  const imageUrl = p.media?.imageUrl || p.media?.image_url || null;
                  const imagePrompt = p.media?.imagePrompt || p.media?.image_prompt || '';
                  if (!imageUrl) return null;
  return (
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                      <img src={imageUrl} alt={imagePrompt || 'Generated campaign media'} className="h-auto w-full object-cover" />
      </div>
                  );
                })()}
                <textarea
                  rows={4}
                  className={inputClass}
                  value={p.caption || ''}
                  onChange={(e) =>
                    setPosts((curr) => curr.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)))
                  }
                />
                <div className="flex flex-wrap gap-2">
                  {(p.hashtags || []).map((tag) => {
                    const selected = (p.selectedHashtags || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleSelectedHashtag(p.id, tag)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          selected ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
              </div>
                <p className="text-xs text-gray-500">Selected {(p.selectedHashtags || []).length}/5 hashtags</p>
            </div>
          ))}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={savePostEdits}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save and finish'}
              </button>
        </div>
          </div>
        ) : null}
      </div>

      {/* RAG Assistant Modal */}
      {showAssistant && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowAssistant(false)} />
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Brand Assistant</h3>
                <button
                  onClick={() => setShowAssistant(false)}
                  className="rounded-lg p-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ask about your brand guidelines, campaign ideas, or content suggestions:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={assistantMessage}
                        onChange={(e) => setAssistantMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAskAssistant();
                          }
                        }}
                        placeholder="What tone should we use for our Valentine's promo?"
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                      />
                      <button
                        onClick={handleAskAssistant}
                        disabled={assistantLoading || !assistantMessage.trim()}
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {assistantLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          'Ask'
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {assistantResponse && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Assistant Response:</h4>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{assistantResponse}</div>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowAssistant(false)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
