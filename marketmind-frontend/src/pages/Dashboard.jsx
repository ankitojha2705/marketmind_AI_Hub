import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  BarChart3,
  Building2,
  Calendar,
  Mail,
  MapPin,
  Megaphone,
  PieChart,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { getState, subscribe, scheduleDraft } from '../store/db';
import { fetchMyBrands, fetchBrandCampaigns } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getDashboardBrandId, setDashboardBrandId } from '../utils/dashboardBrandStorage';
import { PlatformIconRow } from '../components/PlatformIcon';
import {
  campaignStatusBadgeClass,
  formatCampaignStatus,
  campaignCardPreviewClass,
  campaignCardIconWrapClass,
  campaignPlatformLabelClass,
} from '../utils/campaignDisplay';

const shellCard =
  'rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] shadow-sm';
const innerCard =
  'rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm sm:p-5';

// ScheduleModal Component
const ScheduleModal = ({ isOpen, onClose, onSchedule, scheduleDate, setScheduleDate, isScheduling }) => {
  return (
    <div className={`fixed z-50 inset-0 overflow-y-auto ${isOpen ? 'block' : 'hidden'}`}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        ></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-4">
              Schedule Post
            </h3>
            <div className="mt-2">
              <label htmlFor="schedule-date" className="block text-sm font-medium text-gray-700">
                Select date and time
              </label>
              <input
                type="datetime-local"
                id="schedule-date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button
              type="button"
              onClick={onSchedule}
              disabled={!scheduleDate || isScheduling}
              className={`w-full inline-flex justify-center rounded-lg border border-transparent px-4 py-2.5 text-sm font-semibold text-white shadow-sm sm:col-start-2 ${
                scheduleDate && !isScheduling
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-400 cursor-not-allowed'
              }`}
            >
              {isScheduling ? 'Scheduling...' : 'Schedule'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:col-start-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Format date to a nice readable format
const nice = (dateString) => {
  const date = new Date(dateString);
  return format(date, 'MMM d, yyyy h:mm a');
};

// Format time left for scheduled posts
const formatTimeLeft = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = date - now;
  const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60));
  
  // Handle past dates
  if (diffInMs < 0) {
    const absDiffInHours = Math.abs(diffInHours);
    if (absDiffInHours < 1) {
      const diffInMinutes = Math.abs(Math.ceil(diffInMs / (1000 * 60)));
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (absDiffInHours < 24) {
      return `${absDiffInHours} ${absDiffInHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      const diffInDays = Math.ceil(absDiffInHours / 24);
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
  }
  
  // Handle future dates
  if (diffInHours < 1) {
    const diffInMinutes = Math.ceil(diffInMs / (1000 * 60));
    return `in ${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'}`;
  } else if (diffInHours < 24) {
    return `in ${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'}`;
  } else {
    const diffInDays = Math.ceil(diffInHours / 24);
    return `in ${diffInDays} ${diffInDays === 1 ? 'day' : 'days'}`;
  }
};

// Main Dashboard Component
const Dashboard = () => {
  const { user } = useAuth();
  const userEmail = user?.email || '';

  // State for campaigns, drafts, and scheduled posts
  const [apiCampaigns, setApiCampaigns] = useState([]);
  const [apiCampaignsLoading, setApiCampaignsLoading] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [schedulingDraftId, setSchedulingDraftId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [apiBrands, setApiBrands] = useState([]);
  const [apiBrandsLoading, setApiBrandsLoading] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState(() => getDashboardBrandId());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMyBrands();
        if (!cancelled) setApiBrands(data.brands || []);
      } catch (e) {
        if (!cancelled) {
          toast.error(e.response?.data?.error || e.message || 'Could not load brands');
        }
      } finally {
        if (!cancelled) setApiBrandsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (apiBrandsLoading) return;
    const stored = getDashboardBrandId();
    if (stored && !apiBrands.some((b) => String(b.id) === stored)) {
      setDashboardBrandId('');
      setSelectedBrandId('');
      return;
    }
    setSelectedBrandId(stored);
  }, [apiBrands, apiBrandsLoading]);

  const handleBrandCardClick = (brandId) => {
    const sid = String(brandId);
    const next = selectedBrandId === sid ? '' : sid;
    setSelectedBrandId(next);
    setDashboardBrandId(next);
  };

  useEffect(() => {
    if (!selectedBrandId) {
      setApiCampaigns([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setApiCampaignsLoading(true);
      try {
        const list = await fetchBrandCampaigns(selectedBrandId);
        if (!cancelled) setApiCampaigns(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e.response?.data?.detail || e.response?.data?.error || e.message || 'Could not load campaigns'
          );
          setApiCampaigns([]);
        }
      } finally {
        if (!cancelled) setApiCampaignsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedBrandId]);

  // Local drafts / scheduled posts (IndexedDB); campaigns list comes from content API
  useEffect(() => {
    const loadData = () => {
      try {
        const state = getState();
        setDrafts(state.drafts || []);
        setScheduled(state.drafts?.filter((d) => d.status === 'scheduled') || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    const unsubscribe = subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const filteredCampaigns = useMemo(() => {
    if (!selectedBrandId) return [];
    return apiCampaigns;
  }, [apiCampaigns, selectedBrandId]);

  const latestCampaigns = useMemo(() => {
    if (!selectedBrandId) return [];
    return [...filteredCampaigns]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 3);
  }, [filteredCampaigns, selectedBrandId]);

  const brandNameForCampaign = (campaign) =>
    apiBrands.find((b) => String(b.id) === String(campaign.brandId))?.name ?? 'Brand';

  const filteredCampaignIds = useMemo(
    () => new Set(filteredCampaigns.map((c) => c.id)),
    [filteredCampaigns]
  );

  const filteredDrafts = useMemo(
    () => drafts.filter((d) => filteredCampaignIds.has(d.campaignId)),
    [drafts, filteredCampaignIds]
  );

  const filteredScheduled = useMemo(
    () => scheduled.filter((d) => filteredCampaignIds.has(d.campaignId)),
    [scheduled, filteredCampaignIds]
  );

  // Handle scheduling a post
  const handleSchedule = async (campaignId) => {
    if (!scheduleDate) {
      toast.error('Please select a date and time');
      return;
    }

    try {
      setIsScheduling(true);

      // Get the current state
      const currentState = getState();

      // Find the draft associated with this campaign
      const draft = currentState.drafts.find(
        (d) => String(d.campaignId) === String(campaignId) && d.status === 'draft'
      );
      
      if (!draft) {
        throw new Error('No draft found for this campaign. Please create a draft first.');
      }
      
      const success = scheduleDraft(draft.id, scheduleDate);
      
      if (!success) {
        throw new Error('Failed to schedule the post');
      }
      
      // Update local state with fresh data from the store
      const updatedState = getState();
      setDrafts(updatedState.drafts.filter(d => d.status === 'draft'));
      setScheduled(updatedState.drafts.filter(d => d.status === 'scheduled'));
      
      // Reset form
      setSchedulingDraftId(null);
      setScheduleDate('');
      
      toast.success('Post scheduled successfully.');
    } catch (error) {
      console.error('Error scheduling post:', error);
      toast.error(error.message || 'Failed to schedule post');
    } finally {
      setIsScheduling(false);
    }
  };

  // Handle starting the scheduling process
  const startScheduling = (draftId) => {
    console.log('Starting scheduling for draft:', draftId);
    setSchedulingDraftId(draftId);
    setScheduleDate('');
  };

  const hasBrands = apiBrands.length > 0;
  const showNoCampaignsFocus =
    hasBrands &&
    selectedBrandId &&
    !apiCampaignsLoading &&
    filteredCampaigns.length === 0;
  const selectedBrandName =
    apiBrands.find((b) => String(b.id) === String(selectedBrandId))?.name ?? 'This brand';

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className={`${shellCard} overflow-hidden`}>
        <div className="px-4 py-5 sm:p-6 sm:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-gray-900">Campaigns</h2>
              <p className="mt-1 text-sm text-gray-500">Your latest campaigns for this brand at a glance.</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                to="/campaigns"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Manage campaigns
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {showNoCampaignsFocus ? (
              <div className="rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/90 to-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                      <Megaphone className="h-6 w-6" aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                        Create your first campaign
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                        <span className="font-medium text-gray-800">{selectedBrandName}</span> does not have any
                        campaigns yet. Start one to plan channels, schedule, and audience — then you can add drafts
                        and scheduled posts from here.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/campaigns/new"
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:self-center"
                  >
                    <Plus className="h-5 w-5 shrink-0" aria-hidden />
                    New campaign
                  </Link>
                </div>
              </div>
            ) : null}
            {apiCampaignsLoading ? (
              <div className="flex justify-center py-8">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
                  aria-hidden
                />
              </div>
            ) : null}
            {!apiCampaignsLoading && filteredCampaigns.length === 0 && !showNoCampaignsFocus ? (
              <p className="text-sm text-gray-600">
                {!selectedBrandId
                  ? 'Select a workspace brand above to view the latest campaigns for that brand.'
                  : 'No campaigns for this brand yet. Open Manage campaigns to add one.'}
              </p>
            ) : null}
            {!apiCampaignsLoading &&
              latestCampaigns.map((campaign) => {
              const platformIds = Array.isArray(campaign.platforms) && campaign.platforms.length
                ? campaign.platforms
                : campaign.platform
                  ? [campaign.platform]
                  : [];
              const hasDraftForCampaign = filteredDrafts.some(
                (d) =>
                  d.status === 'draft' && String(d.campaignId) === String(campaign.id)
              );
              return (
                <div key={campaign.id} className={campaignCardPreviewClass}>
                  <div className="flex items-start gap-3">
                    <div className={campaignCardIconWrapClass} aria-hidden>
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold leading-snug text-gray-900 sm:text-lg">
                            {campaign.name}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">{brandNameForCampaign(campaign)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${campaignStatusBadgeClass(
                              campaign.status
                            )}`}
                          >
                            {formatCampaignStatus(campaign.status)}
                          </span>
                          {hasDraftForCampaign ? (
                            <button
                              onClick={() => startScheduling(campaign.id)}
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              title="Schedule draft post"
                              type="button"
                            >
                              <Calendar className="h-5 w-5" aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className={campaignPlatformLabelClass}>Platform</p>
                        <div className="mt-1.5">
                          <PlatformIconRow
                            platforms={platformIds}
                            badge
                            iconClassName="h-3.5 w-3.5"
                            gapClassName="gap-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${shellCard} overflow-hidden`}>
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <p className="text-sm text-gray-600">
            {!selectedBrandId
              ? 'Select a workspace brand to see how many posts are scheduled for that brand.'
              : showNoCampaignsFocus
                ? 'Scheduled posts appear after you create a campaign and save drafts. Start with New campaign in the section above.'
                : filteredScheduled.length === 0
                  ? 'No scheduled posts for this brand yet. Schedule a draft from a campaign card above.'
                  : `${filteredScheduled.length} scheduled ${filteredScheduled.length === 1 ? 'post' : 'posts'} for this brand — open the Scheduled tab for the full list.`}
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('scheduled')}
            disabled={!selectedBrandId}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Calendar className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
            View scheduled posts
          </button>
        </div>
      </div>
    </div>
  );

  // Render the scheduled tab
  const renderScheduledTab = () => (
    <div className={`${shellCard} overflow-hidden`}>
      <div className="px-4 py-5 sm:p-6 sm:px-8">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-4">Scheduled Posts</h2>
        {filteredScheduled.length === 0 ? (
          <p className="text-sm text-gray-600">
            {!selectedBrandId ? (
              'Select a workspace brand to see scheduled posts for that brand.'
            ) : showNoCampaignsFocus ? (
              <>
                No campaigns for this brand yet, so there is nothing to schedule.{' '}
                <Link to="/campaigns/new" className="font-semibold text-blue-600 hover:text-blue-800">
                  Create a campaign
                </Link>{' '}
                first.
              </>
            ) : (
              'No posts scheduled.'
            )}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredScheduled.map(post => {
              const campaign = filteredCampaigns.find(c => c.id === post.campaignId);
              
              return (
                <div key={post.id} className={innerCard}>
                  <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center">
                        <span className="mr-3 shrink-0">
                          <PlatformIconRow
                            platforms={post.platform}
                            badge
                            iconClassName="h-3.5 w-3.5"
                          />
                        </span>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {campaign?.name || 'No Campaign'}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          new Date(post.scheduledAt) < new Date()
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {formatTimeLeft(post.scheduledAt)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        {post.caption}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Calendar className="mr-1.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden />
                      <p>{nice(post.scheduledAt)}</p>
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Render the analytics tab
  const renderAnalyticsTab = () => {
    const draftPostCount = filteredDrafts.filter((d) => d.status === 'draft').length;
    const activeCampaignCount = filteredCampaigns.filter((c) => c.status === 'active').length;

    const overviewCards = [
      { label: 'Campaigns', value: filteredCampaigns.length },
      { label: 'Active campaigns', value: activeCampaignCount },
      { label: 'Scheduled posts', value: filteredScheduled.length },
      { label: 'Draft posts', value: draftPostCount },
    ];

    return (
      <div className={`${shellCard} overflow-hidden`}>
        <div className="border-b border-gray-200 px-4 py-5 sm:px-8 sm:py-6">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            Analytics
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {!selectedBrandId
              ? 'Select a workspace brand to see metrics for that brand.'
              : showNoCampaignsFocus
                ? 'Create a campaign to start seeing counts for this brand.'
                : 'Snapshot of campaigns, drafts, and scheduled content for the selected brand.'}
          </p>
        </div>

        <div className="px-4 py-6 sm:px-8 sm:py-8">
          <section aria-labelledby="analytics-overview-heading">
            <h3
              id="analytics-overview-heading"
              className="mb-4 text-sm font-semibold text-gray-900"
            >
              Overview
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {overviewCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <p className="text-xs font-medium text-gray-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'scheduled':
        return renderScheduledTab();
      case 'analytics':
        return renderAnalyticsTab();
      case 'overview':
      default:
        return renderOverviewTab();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" aria-hidden />
      </div>
    );
  }

  if (apiBrandsLoading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" aria-hidden />
      </div>
    );
  }

  if (apiBrands.length === 0) {
    return (
      <div className="w-full space-y-6">
        <div className={`${shellCard} p-8 sm:p-10`}>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Set up your workspace
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 leading-relaxed sm:text-base">
            You are not part of any brand yet. Brands group your campaigns, team, and location. Create one to get
            started, or join an existing team if someone else is the admin.
          </p>
          <div className="mt-8">
            <Link
              to="/brands"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Create a brand
            </Link>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <Mail className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900">Joining an existing team?</h2>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  Ask your brand admin to add you in Marketmind using <span className="font-medium text-gray-800">Invite by email</span> on the brand&apos;s team page. They must use the <span className="font-medium text-gray-800">same email</span> you use to sign in here (the account must exist first).
                </p>
                {userEmail ? (
                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-500">Your sign-in email</p>
                ) : null}
                {userEmail ? (
                  <p className="mt-1 break-all rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900">
                    {userEmail}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">
                    After you sign in, your email appears here so you can copy it for your admin.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className={`${shellCard} p-5 sm:p-6 sm:px-8`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Workspace brand</h2>
            <p className="text-sm text-gray-600">
              Select a brand to load its campaigns and posts on this dashboard. Click again to
              deselect. To edit teams or details, use Manage brands.
            </p>
          </div>
          <Link
            to="/brands"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
          >
            Manage brands
          </Link>
        </div>
        <ul
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Workspace brands"
        >
            {apiBrands.map((b) => {
              const idStr = String(b.id);
              const isSelected = selectedBrandId === idStr;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => handleBrandCardClick(b.id)}
                    aria-pressed={isSelected}
                    className={[
                      'flex w-full items-start gap-3 rounded-xl border p-4 text-left shadow-sm transition-colors',
                      isSelected
                        ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-500/25'
                        : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50/80',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        isSelected ? 'bg-blue-100 text-blue-800' : 'bg-blue-50 text-blue-700',
                      ].join(' ')}
                    >
                      <Building2 className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{b.name}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-600">
                        <span className="font-medium text-gray-700">Type: </span>
                        {b.businessType?.trim() || (
                          <span className="text-amber-800">Required — set in Manage brands</span>
                        )}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">
                          {b.city}, {b.country}
                        </span>
                      </p>
                      <span
                        className={[
                          'mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                          b.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700',
                        ].join(' ')}
                      >
                        {b.role === 'admin' ? 'Admin' : 'Member'}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
        </ul>
      </div>

      <div className={`${shellCard} overflow-hidden`}>
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 px-2 sm:px-4" aria-label="Dashboard sections">
          {[
            { name: 'Overview', id: 'overview', Icon: BarChart3 },
            { name: 'Scheduled', id: 'scheduled', Icon: Calendar },
            { name: 'Analytics', id: 'analytics', Icon: PieChart },
          ].map(({ name, id, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition-colors sm:px-4 ${
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${activeTab === id ? 'text-blue-600' : 'text-gray-400'}`}
                aria-hidden
              />
              {name}
            </button>
          ))}
        </nav>
      </div>

      <div>{renderContent()}</div>

      <ScheduleModal
        isOpen={!!schedulingDraftId}
        onClose={() => setSchedulingDraftId(null)}
        onSchedule={() => handleSchedule(schedulingDraftId)}
        scheduleDate={scheduleDate}
        setScheduleDate={setScheduleDate}
        isScheduling={isScheduling}
      />
    </div>
  );
};

export default Dashboard;
