import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  BarChart3,
  Calendar,
  PieChart,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { getState, subscribe, scheduleDraft } from '../store/db';

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

// Get platform info
const getPlatformInfo = (platform) => {
  const platforms = {
    facebook: {
      name: 'Facebook',
      color: 'bg-blue-100 text-blue-800',
      icon: 'FB',
      bgColor: 'bg-blue-100 text-blue-800'
    },
    instagram: {
      name: 'Instagram',
      color: 'bg-pink-100 text-pink-800',
      icon: 'IG',
      bgColor: 'bg-pink-100 text-pink-800'
    },
    twitter: {
      name: 'Twitter',
      color: 'bg-blue-100 text-blue-400',
      icon: 'TW',
      bgColor: 'bg-blue-100 text-blue-400'
    },
    linkedin: {
      name: 'LinkedIn',
      color: 'bg-blue-50 text-blue-700',
      icon: 'IN',
      bgColor: 'bg-blue-50 text-blue-700'
    },
    default: {
      name: 'Other',
      color: 'bg-gray-100 text-gray-800',
      icon: 'OT',
      bgColor: 'bg-gray-100 text-gray-800'
    }
  };

  return platforms[platform?.toLowerCase()] || platforms.default;
};

// Main Dashboard Component
const Dashboard = () => {
  const navigate = useNavigate();

  // State for campaigns, drafts, and scheduled posts
  const [campaigns, setCampaigns] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [schedulingDraftId, setSchedulingDraftId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Load data from database
  useEffect(() => {
    const loadData = () => {
      try {
        const state = getState();
        setCampaigns(state.campaigns || []);
        setDrafts(state.drafts || []);
        setScheduled(state.drafts?.filter(d => d.status === 'scheduled') || []);
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

  // Handle scheduling a post
  const handleSchedule = async (campaignId) => {
    if (!scheduleDate) {
      alert('Please select a date and time');
      return;
    }
    
    try {
      setIsScheduling(true);
      
      // Get the current state
      const currentState = getState();
      
      // Find the draft associated with this campaign
      const draft = currentState.drafts.find(d => d.campaignId === campaignId && d.status === 'draft');
      
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
      
      alert('Post scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling post:', error);
      alert(`Failed to schedule post: ${error.message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  // Handle creating a new campaign
  const handleCreateCampaign = () => {
    navigate('/campaigns/new');
  };

  // Handle editing a campaign
  const handleEditCampaign = (campaignId) => {
    navigate(`/campaigns/${campaignId}/edit`);
  };

  // Handle deleting a campaign
  const handleDeleteCampaign = (campaignId) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
    }
  };

  // Handle starting the scheduling process
  const startScheduling = (draftId) => {
    console.log('Starting scheduling for draft:', draftId);
    setSchedulingDraftId(draftId);
    setScheduleDate('');
  };

  // Render the overview tab
  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className={`${shellCard} overflow-hidden`}>
        <div className="px-4 py-5 sm:p-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Campaigns</h2>
            <button
              onClick={handleCreateCampaign}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-5 w-5 shrink-0" aria-hidden />
              New Campaign
            </button>
          </div>

          <div className="space-y-4">
            {campaigns.map(campaign => {
              const platform = getPlatformInfo(campaign.platform);
              return (
                <div key={campaign.id} className={innerCard}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${platform.bgColor}`}>
                          {platform.icon} {platform.name}
                        </span>
                        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                          {campaign.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 sm:shrink-0">
                        {(!campaign.status || campaign.status === 'draft') && (
                          <button
                            onClick={() => startScheduling(campaign.id)}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            title="Schedule"
                            type="button"
                          >
                            <Calendar className="h-5 w-5" aria-hidden />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditCampaign(campaign.id)}
                          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          title="Edit"
                          type="button"
                        >
                          <Pencil className="h-5 w-5" aria-hidden />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Delete"
                          type="button"
                        >
                          <Trash2 className="h-5 w-5" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <p className="mt-1 text-sm text-gray-900">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            campaign.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {campaign.status ? 
                              campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) : 
                              'Draft'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Budget</p>
                        <p className="mt-1 text-sm text-gray-900">
                          ${campaign.budget ? campaign.budget.toLocaleString() : '0'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Spent</p>
                        <p className="mt-1 text-sm text-gray-900">
                          ${campaign.spent ? campaign.spent.toLocaleString() : '0'}
                        </p>
                      </div>
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Posts Section */}
      <div className={`${shellCard} overflow-hidden`}>
        <div className="px-4 py-5 sm:p-6 sm:px-8">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-4">Upcoming Posts</h2>
          <div className="space-y-4">
            {scheduled.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming posts scheduled.</p>
            ) : (
              scheduled.map(post => {
                const platform = getPlatformInfo(post.platform);
                const campaign = campaigns.find(c => c.id === post.campaignId);
                
                return (
                  <div key={post.id} className={innerCard}>
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${platform.bgColor} mr-3`}>
                            {platform.icon} {platform.name}
                          </span>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {campaign?.name || 'No Campaign'}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            new Date(post.scheduledAt) < new Date()
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {formatTimeLeft(post.scheduledAt)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {post.caption.length > 100 ? `${post.caption.substring(0, 100)}...` : post.caption}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <Calendar className="mr-1.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden />
                          <p>{nice(post.scheduledAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render the scheduled tab
  const renderScheduledTab = () => (
    <div className={`${shellCard} overflow-hidden`}>
      <div className="px-4 py-5 sm:p-6 sm:px-8">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-4">Scheduled Posts</h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-gray-600">No posts scheduled.</p>
        ) : (
          <div className="space-y-4">
            {scheduled.map(post => {
              const platform = getPlatformInfo(post.platform);
              const campaign = campaigns.find(c => c.id === post.campaignId);
              
              return (
                <div key={post.id} className={innerCard}>
                  <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center">
                        <span className={`inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${platform.bgColor} mr-3`}>
                          {platform.icon} {platform.name}
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
    const draftPostCount = drafts.filter((d) => d.status === 'draft').length;
    const activeCampaignCount = campaigns.filter((c) => c.status === 'active').length;

    const overviewCards = [
      { label: 'Campaigns', value: campaigns.length },
      { label: 'Active campaigns', value: activeCampaignCount },
      { label: 'Scheduled posts', value: scheduled.length },
      { label: 'Draft posts', value: draftPostCount },
    ];

    return (
      <div className={`${shellCard} overflow-hidden`}>
        <div className="border-b border-gray-200 px-4 py-5 sm:px-8 sm:py-6">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            Analytics
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Snapshot of campaigns, drafts, and scheduled content.
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

  return (
    <div className="w-full space-y-6">
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
