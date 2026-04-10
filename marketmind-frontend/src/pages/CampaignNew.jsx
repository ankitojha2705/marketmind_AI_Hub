import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { createCampaign, getState, updateCampaign } from '../store/db';
import { generateCampaign } from '../services/api';
import { getDashboardBrandId } from '../utils/dashboardBrandStorage';

const shellCard =
  'rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] shadow-sm';
const subCard =
  'rounded-xl border border-gray-200/90 bg-white p-5 shadow-sm sm:p-6';
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25';

const allPlatforms = [
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'facebook', name: 'Facebook', icon: '👍' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'twitter', name: 'X (Twitter)', icon: '🐦' },
  { id: 'youtube', name: 'YouTube', icon: '▶️' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌' },
  { id: 'tumblr', name: 'Tumblr', icon: '✏️' },
  { id: 'reddit', name: 'Reddit', icon: '🔴' },
  { id: 'quora', name: 'Quora', icon: '❓' },
  { id: 'medium', name: 'Medium', icon: '✍️' },
  { id: 'whatsapp', name: 'WhatsApp', icon: '💬' }
];

const campaignTypes = [
  { id: 'awareness', name: 'Brand Awareness', description: 'Increase visibility and recognition of your brand' },
  { id: 'engagement', name: 'Engagement', description: 'Boost interactions and engagement with your audience' },
  { id: 'traffic', name: 'Website Traffic', description: 'Drive more visitors to your website' },
  { id: 'leads', name: 'Lead Generation', description: 'Capture potential customer information' },
  { id: 'sales', name: 'Sales', description: 'Drive product or service sales' },
  { id: 'app-installs', name: 'App Installs', description: 'Increase downloads of your mobile app' }
];

export default function CampaignNew() {
  const navigate = useNavigate();
  const { campaignId: editCampaignId } = useParams();
  const isEdit = Boolean(editCampaignId);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [objective, setObjective] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [audience, setAudience] = useState({
    location: '',
    ageRange: [18, 65],
    interests: [],
    languages: ['English']
  });
  const [budget, setBudget] = useState(1000);
  const [schedule, setSchedule] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    timezone: 'UTC+0:00'
  });
  
  // AI Generation states
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    if (!editCampaignId) return;
    const camp = getState().campaigns.find((c) => c.id === editCampaignId);
    if (!camp) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setName(camp.name || '');
    setBrief(camp.brief || '');
    setPlatforms([...(camp.platforms || [])]);
    setObjective('awareness');
  }, [editCampaignId, navigate]);

  const togglePlatform = (platformId) => {
    setPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt describing your campaign');
      return;
    }

    setIsGenerating(true);
    setAiResult(null);

    try {
      const response = await generateCampaign(aiPrompt);
      if (response.success) {
        setAiResult(response.data);
        // Auto-fill form fields from AI result if available
        if (response.data.caption) {
          setBrief(response.data.caption.substring(0, 200)); // Use first part of caption as brief
        }
      } else {
        toast.error(response.error || 'Failed to generate campaign');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'Failed to generate campaign. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim() || !brief.trim() || platforms.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (isEdit) {
        updateCampaign(editCampaignId, {
          name: name.trim(),
          brief: brief.trim(),
          platforms,
        });
        navigate('/dashboard', { replace: true });
        return;
      }

      const workspaceBrand = getDashboardBrandId();
      createCampaign({
        name: name.trim(),
        brief: brief.trim(),
        platforms,
        brandId: workspaceBrand || null,
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(error.message || 'Failed to save campaign');
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          {isEdit ? 'Edit campaign' : 'Create New Campaign'}
        </h2>
        <p className="mt-2 text-gray-600 leading-relaxed">
          {isEdit
            ? 'Update your campaign details below. Changes apply when you save.'
            : 'Set up your campaign by filling in the details below. You can always edit these later.'}
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="campaign-name" className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            id="campaign-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="e.g., Summer Sale 2023"
            required
          />
        </div>

        <div>
          <label htmlFor="campaign-brief" className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Brief <span className="text-red-500">*</span>
          </label>
          <textarea
            id="campaign-brief"
            rows={4}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            className={inputClass}
            placeholder="Describe the purpose and key messages of your campaign..."
            required
          />
        </div>

        {/* AI Generation Section */}
        <div className="rounded-xl border border-gray-200/80 bg-white/60 p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">
              AI-powered campaign generation
            </h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Describe your business and campaign goals, and our AI will generate a complete Instagram-ready post with caption, hashtags, and strategy insights.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., I have a coffee shop in LA, I want to share a post for instagram for christmas, telling my customers about our holiday special..."
                className={`${inputClass} min-h-[5.5rem] flex-1 resize-y sm:min-h-0`}
                rows={3}
                disabled={isGenerating}
              />
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={isGenerating || !aiPrompt.trim()}
                className="shrink-0 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-start"
              >
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
          </div>

          {/* AI Results Display */}
          {isGenerating && (
            <div className="mt-4 rounded-xl border border-blue-200/70 bg-blue-50/90 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" aria-hidden />
                <p className="text-sm font-medium text-blue-900">
                  AI is analyzing your campaign and generating content… This may take 30–60 seconds.
                </p>
              </div>
            </div>
          )}

          {aiResult && !isGenerating && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] shadow-sm">
              {/* Header with Metrics */}
              <div className="border-b border-blue-200/60 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-5 sm:px-6 sm:py-6">
                <h4 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
                  AI-generated campaign content
                </h4>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  {aiResult.seo_score && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3 py-1.5 font-medium text-blue-900 shadow-sm">
                      <span className="text-gray-600">SEO score</span>
                      <span className="font-semibold">{aiResult.seo_score}/100</span>
                    </div>
                  )}
                  {aiResult.hashtags && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3 py-1.5 font-medium text-blue-900 shadow-sm">
                      <span className="text-gray-600">Hashtags</span>
                      <span className="font-semibold">{aiResult.hashtags.length} optimized</span>
                    </div>
                  )}
                  {aiResult.post_type && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3 py-1.5 font-medium text-gray-900 shadow-sm">
                      <span className="text-gray-600">Type</span>
                      <span>{aiResult.post_type}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-3">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Caption Card */}
                  {aiResult.caption && (
                    <div className={subCard}>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                          Caption
                        </h5>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(aiResult.caption);
                            toast.success('Caption copied to clipboard');
                          }}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {aiResult.caption}
                      </p>
                    </div>
                  )}

                  {/* Hashtags Card */}
                  {aiResult.hashtags && aiResult.hashtags.length > 0 && (
                    <div className={subCard}>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                          Hashtags
                        </h5>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(aiResult.hashtags.join(' '));
                            toast.success('Hashtags copied to clipboard');
                          }}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                          Copy all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {aiResult.hashtags.map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="cursor-pointer rounded-full border border-blue-200/80 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-900 transition-colors hover:bg-blue-100"
                            onClick={() => {
                              navigator.clipboard.writeText(tag);
                            }}
                            title="Click to copy"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generated Image Card */}
                  {aiResult.image_url && (
                    <div className={subCard}>
                      <h5 className="mb-4 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                        Generated image
                      </h5>
                      <div className="relative group">
                        <img 
                          src={aiResult.image_url} 
                          alt={aiResult.alt_text || "AI generated campaign image"}
                          className="w-full rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              window.open(aiResult.image_url, '_blank');
                            }}
                            className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-white rounded-lg shadow-lg text-sm font-medium transition-opacity"
                          >
                            Open Full Size
                          </button>
                        </div>
                      </div>
                      {aiResult.alt_text && (
                        <p className="mt-3 text-xs text-gray-500 italic">
                          Alt Text: {aiResult.alt_text}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column - Details & Insights */}
                <div className="space-y-6">
                  {/* Post Details Card */}
                  <div className={subCard}>
                    <h5 className="mb-4 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                      Post details
                    </h5>
                    <div className="space-y-3">
                      {aiResult.post_type && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-600">Type</span>
                          <span className="text-sm font-medium text-gray-900">{aiResult.post_type}</span>
                        </div>
                      )}
                      {aiResult.suggested_post_time && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-600">Optimal Time</span>
                          <span className="text-sm font-medium text-gray-900">{aiResult.suggested_post_time}</span>
                        </div>
                      )}
                      {aiResult.call_to_action && (
                        <div className="pt-2">
                          <span className="text-sm text-gray-600 block mb-1">Call to Action</span>
                          <p className="text-sm text-gray-900">{aiResult.call_to_action}</p>
                        </div>
                      )}
                      {aiResult.engagement_times && aiResult.engagement_times.length > 0 && (
                        <div className="pt-2">
                          <span className="text-sm text-gray-600 block mb-2">Best Posting Times</span>
                          <div className="flex flex-wrap gap-1">
                            {aiResult.engagement_times.map((time, idx) => (
                              <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                {time}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Strategic Insights Card */}
                  {(aiResult.business_strength || aiResult.target_audience || aiResult.competitor_takeaway || aiResult.content_tone) && (
                    <div className="rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50/90 to-indigo-50/80 p-5 shadow-sm sm:p-6">
                      <h5 className="text-lg font-semibold tracking-tight text-gray-900 mb-4">
                        Strategic insights
                      </h5>
                      <div className="space-y-4">
                        {aiResult.business_strength && (
                          <div>
                            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">
                              Business Strength
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {aiResult.business_strength}
                            </p>
                          </div>
                        )}
                        {aiResult.target_audience && (
                          <div>
                            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">
                              Target Audience
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {aiResult.target_audience}
                            </p>
                          </div>
                        )}
                        {aiResult.content_tone && (
                          <div>
                            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">
                              Content Tone
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {aiResult.content_tone}
                            </p>
                          </div>
                        )}
                        {aiResult.competitor_takeaway && (
                          <div>
                            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">
                              Competitive Advantage
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {aiResult.competitor_takeaway}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Keywords Card */}
                  {aiResult.keywords && aiResult.keywords.length > 0 && (
                    <div className={subCard}>
                      <h5 className="mb-3 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                        Primary keywords
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {aiResult.keywords.map((keyword, idx) => (
                          <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 border-t border-gray-200 bg-white/50 px-5 py-4 sm:flex-row sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    const textToCopy = `${aiResult.caption || ''}\n\n${(aiResult.hashtags || []).join(' ')}`;
                    navigator.clipboard.writeText(textToCopy);
                    toast.success('Caption and hashtags copied to clipboard');
                  }}
                  className="flex flex-1 items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Copy caption & hashtags
                </button>
                {aiResult.image_url && (
                  <button
                    type="button"
                    onClick={() => {
                      window.open(aiResult.image_url, '_blank');
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                  >
                    View image
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Objective <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaignTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setObjective(type.id)}
                className={`rounded-xl border p-4 text-left shadow-sm transition-colors ${
                  objective === type.id
                    ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              >
                <h3 className="font-semibold text-gray-900">{type.name}</h3>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={nextStep}
            disabled={!name.trim() || !brief.trim() || !objective}
            className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            Next: Select Platforms
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={prevStep}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Campaign Details
        </button>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Select Platforms</h2>
        <p className="mt-2 text-gray-600 leading-relaxed mb-6">
          Choose the platforms where you want to run your campaign.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {allPlatforms.map((platform) => (
          <button
            key={platform.id}
            type="button"
            onClick={() => togglePlatform(platform.id)}
            className={`flex flex-col items-center justify-center rounded-xl border p-4 shadow-sm transition-colors ${
              platforms.includes(platform.id)
                ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-500/20'
                : 'border-gray-200 bg-white hover:border-blue-200'
            }`}
          >
            <span className="text-2xl mb-2">{platform.icon}</span>
            <span className="text-sm font-semibold text-gray-900">{platform.name}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between pt-4 space-y-3 sm:space-y-0">
        <button
          type="button"
          onClick={prevStep}
          className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
        >
          Back
        </button>
        <div className="space-x-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={platforms.length === 0}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEdit ? 'Save changes' : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={nextStep}
            disabled={platforms.length === 0}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next: Audience & Budget
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={prevStep}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Platform Selection
        </button>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Audience & Budget</h2>
        <p className="mt-2 text-gray-600 leading-relaxed mb-6">
          Define your target audience and set your campaign budget.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-4">Audience</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={audience.location}
                  onChange={(e) => setAudience({...audience, location: e.target.value})}
                  className={inputClass}
                  placeholder="e.g., United States, Worldwide"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age Range: {audience.ageRange[0]} - {audience.ageRange[1]} years
                </label>
                <div className="px-2">
                  <input
                    type="range"
                    min="13"
                    max="65"
                    value={audience.ageRange[1]}
                    onChange={(e) => setAudience({
                      ...audience,
                      ageRange: [audience.ageRange[0], parseInt(e.target.value)]
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>13</span>
                    <span>65+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-4">Budget</h3>
            <div className="rounded-xl border border-gray-200/90 bg-[hsl(0,0%,99.5%)] p-4 shadow-sm sm:p-5">
              <div className="mb-4">
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                  Total Budget (USD)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="budget"
                    value={budget}
                    onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
                    className="block w-full rounded-lg border border-gray-300 py-2 pl-7 pr-12 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">USD</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Schedule</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="start-date" className="block text-xs text-gray-500 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="start-date"
                      value={schedule.startDate}
                      onChange={(e) => setSchedule({...schedule, startDate: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                    />
                  </div>
                  <div>
                    <label htmlFor="end-date" className="block text-xs text-gray-500 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="end-date"
                      value={schedule.endDate}
                      min={schedule.startDate}
                      onChange={(e) => setSchedule({...schedule, endDate: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="timezone" className="block text-xs text-gray-500 mb-1">
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    value={schedule.timezone}
                    onChange={(e) => setSchedule({...schedule, timezone: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                  >
                    <option value="UTC+0:00">UTC+0:00 (London)</option>
                    <option value="UTC-5:00">UTC-5:00 (New York)</option>
                    <option value="UTC-8:00">UTC-8:00 (Los Angeles)</option>
                    <option value="UTC+1:00">UTC+1:00 (Berlin)</option>
                    <option value="UTC+5:30">UTC+5:30 (Mumbai)</option>
                    <option value="UTC+8:00">UTC+8:00 (Singapore)</option>
                    <option value="UTC+9:00">UTC+9:00 (Tokyo)</option>
                    <option value="UTC+10:00">UTC+10:00 (Sydney)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between pt-4 space-y-3 sm:space-y-0">
          <button
            type="button"
            onClick={prevStep}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
          >
            Back
          </button>
          <div className="space-x-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {isEdit ? 'Save changes' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              {isEdit ? 'Save & return' : 'Launch Campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-8">
      <div className={`${shellCard} p-6 md:p-8`}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      <div className={`${shellCard} px-4 py-6 sm:px-8`}>
        <div className="flex items-center justify-between gap-2">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex flex-1 flex-col items-center">
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
              <span className="mt-2 text-center text-xs font-medium text-gray-600">
                {stepNum === 1 ? 'Details' : stepNum === 2 ? 'Platforms' : 'Audience'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}