import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getState, subscribe, scheduleDraft } from '../store/db';
import {
  CalendarIcon, 
  ClockIcon, 
  ChartBarIcon, 
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

// Using DocumentTextIcon as a fallback for ChartPieIcon
const ChartPieIcon = DocumentTextIcon;

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
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Schedule Post
            </h3>
            <div className="mt-2">
              <label htmlFor="schedule-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select date and time
              </label>
              <input
                type="datetime-local"
                id="schedule-date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button
              type="button"
              onClick={onSchedule}
              disabled={!scheduleDate || isScheduling}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:col-start-2 sm:text-sm ${
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
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:col-start-1 sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for navigation
const navigate = (path) => {
  window.location.hash = `#${path}`;
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
      bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    },
    instagram: {
      name: 'Instagram',
      color: 'bg-pink-100 text-pink-800',
      icon: 'IG',
      bgColor: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
    },
    twitter: {
      name: 'Twitter',
      color: 'bg-blue-100 text-blue-400',
      icon: 'TW',
      bgColor: 'bg-blue-100 text-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
    },
    linkedin: {
      name: 'LinkedIn',
      color: 'bg-blue-50 text-blue-700',
      icon: 'IN',
      bgColor: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    },
    default: {
      name: 'Other',
      color: 'bg-gray-100 text-gray-800',
      icon: 'OT',
      bgColor: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  };

  return platforms[platform?.toLowerCase()] || platforms.default;
};

// Main Dashboard Component
const Dashboard = () => {
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
    window.location.hash = `#/campaigns/${campaignId}/edit`;
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
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Campaigns</h2>
            <button
              onClick={handleCreateCampaign}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              New Campaign
            </button>
          </div>

          <div className="space-y-4">
            {campaigns.map(campaign => {
              const platform = getPlatformInfo(campaign.platform);
              return (
                <div key={campaign.id} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${platform.bgColor} mr-3`}>
                          {platform.icon} {platform.name}
                        </span>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {campaign.name}
                        </h3>
                      </div>
                      <div className="flex space-x-2">
                        {(!campaign.status || campaign.status === 'draft') && (
                          <button
                            onClick={() => startScheduling(campaign.id)}
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Schedule"
                          >
                            <CalendarIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditCampaign(campaign.id)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            campaign.status === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                          }`}>
                            {campaign.status ? 
                              campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) : 
                              'Draft'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget</p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          ${campaign.budget ? campaign.budget.toLocaleString() : '0'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Spent</p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          ${campaign.spent ? campaign.spent.toLocaleString() : '0'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Posts Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upcoming Posts</h2>
          <div className="space-y-4">
            {scheduled.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming posts scheduled.</p>
            ) : (
              scheduled.map(post => {
                const platform = getPlatformInfo(post.platform);
                const campaign = campaigns.find(c => c.id === post.campaignId);
                
                return (
                  <div key={post.id} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${platform.bgColor} mr-3`}>
                            {platform.icon} {platform.name}
                          </span>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {campaign?.name || 'No Campaign'}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            new Date(post.scheduledAt) < new Date()
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          }`}>
                            {formatTimeLeft(post.scheduledAt)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            {post.caption.length > 100 ? `${post.caption.substring(0, 100)}...` : post.caption}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                          <CalendarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
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
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Scheduled Posts</h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No posts scheduled.</p>
        ) : (
          <div className="space-y-4">
            {scheduled.map(post => {
              const platform = getPlatformInfo(post.platform);
              const campaign = campaigns.find(c => c.id === post.campaignId);
              
              return (
                <div key={post.id} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${platform.bgColor} mr-3`}>
                          {platform.icon} {platform.name}
                        </span>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {campaign?.name || 'No Campaign'}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          new Date(post.scheduledAt) < new Date()
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                        }`}>
                          {formatTimeLeft(post.scheduledAt)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {post.caption}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                      <p>{nice(post.scheduledAt)}</p>
                    </div>
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
  const renderAnalyticsTab = () => (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Analytics</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Campaigns</h3>
            <p className="mt-1 text-3xl font-semibold text-blue-600 dark:text-blue-300">{campaigns.length}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Scheduled Posts</h3>
            <p className="mt-1 text-3xl font-semibold text-green-600 dark:text-green-300">{scheduled.length}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">Drafts</h3>
            <p className="mt-1 text-3xl font-semibold text-purple-600 dark:text-purple-300">
              {drafts.filter(d => d.status === 'draft').length}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Active Campaigns</h3>
            <p className="mt-1 text-3xl font-semibold text-yellow-600 dark:text-yellow-300">
              {campaigns.filter(c => c.status === 'active').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { name: 'Overview', id: 'overview', icon: ChartBarIcon },
                { name: 'Scheduled', id: 'scheduled', icon: CalendarIcon },
                { name: 'Analytics', id: 'analytics', icon: ChartPieIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <tab.icon
                    className={`-ml-0.5 mr-2 h-5 w-5 ${
                      activeTab === tab.id ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      {/* Scheduling Modal */}
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
