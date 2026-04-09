// /src/store/db.js
const KEY = 'mm_state_v02'


function uid() {
return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}


const initial = {
  campaigns: [], // {id, name, brief, platforms, createdAt}
  drafts: [] // {id, campaignId, platform, caption, hashtags, status, scheduledAt}
};

// Initialize with sample data if empty
function initializeData() {
  const currentState = load();
  if (currentState.campaigns === undefined || currentState.drafts === undefined) {
    save(initial);
    return initial;
  }
  return currentState;
}


function load() {
try { return JSON.parse(localStorage.getItem(KEY)) || initial } catch { return initial }
}


function save(state) { localStorage.setItem(KEY, JSON.stringify(state)) }


let state = initializeData()
const listeners = new Set()


export function getState() { return state }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }
function notify() { listeners.forEach((fn) => fn(state)) }


export function resetAll() { state = structuredClone(initial); save(state); notify() }


export function createCampaign({ name, brief, platforms }) {
  try {
    const id = uid();
    const campaign = { 
      id, 
      name, 
      brief, 
      platforms, 
      createdAt: new Date().toISOString() 
    };

    const newDrafts = platforms.map((p) => ({
      id: uid(),
      campaignId: id,
      platform: p,
      caption: `${name}: ${brief} — (${p})`,
      hashtags: ['#sale', '#trending'],
      status: 'draft',
      scheduledAt: null,
      createdAt: new Date().toISOString()
    }));

    // Update state immutably
    state = {
      ...state,
      campaigns: [...(state.campaigns || []), campaign],
      drafts: [...(state.drafts || []), ...newDrafts]
    };

    save(state);
    notify();
    return { campaign, drafts: newDrafts };
  } catch (error) {
    console.error('Error in createCampaign:', error);
    throw error;
  }
}


export function listCampaigns() { return state.campaigns }
export function listDrafts() { return state.drafts.filter(d => d.status === 'draft') }
export function listScheduled() { return state.drafts.filter(d => d.status === 'scheduled') }

/** Update campaign core fields and keep drafts in sync (add/remove platforms, refresh draft captions). */
export function updateCampaign(campaignId, { name, brief, platforms }) {
  const existing = state.campaigns.find((c) => c.id === campaignId);
  if (!existing) {
    throw new Error('Campaign not found');
  }

  const updatedCampaign = {
    ...existing,
    name,
    brief,
    platforms,
  };

  let drafts = [...state.drafts];

  drafts = drafts.filter((d) => {
    if (d.campaignId !== campaignId) return true;
    if (d.status === 'scheduled') return true;
    return platforms.includes(d.platform);
  });

  drafts = drafts.map((d) => {
    if (d.campaignId !== campaignId || d.status !== 'draft') return d;
    return {
      ...d,
      caption: `${name}: ${brief} — (${d.platform})`,
    };
  });

  const platformsWithDraft = new Set(
    drafts.filter((d) => d.campaignId === campaignId).map((d) => d.platform)
  );

  for (const p of platforms) {
    if (!platformsWithDraft.has(p)) {
      drafts.push({
        id: uid(),
        campaignId,
        platform: p,
        caption: `${name}: ${brief} — (${p})`,
        hashtags: ['#sale', '#trending'],
        status: 'draft',
        scheduledAt: null,
        createdAt: new Date().toISOString(),
      });
      platformsWithDraft.add(p);
    }
  }

  state = {
    ...state,
    campaigns: state.campaigns.map((c) => (c.id === campaignId ? updatedCampaign : c)),
    drafts,
  };
  save(state);
  notify();
  return updatedCampaign;
}


export function scheduleDraft(id, isoString) {
const d = state.drafts.find(x => x.id === id)
if (!d) return false
d.status = 'scheduled'
d.scheduledAt = isoString
save(state); notify()
return true
}


export function unscheduleDraft(id) {
const d = state.drafts.find(x => x.id === id)
if (!d) return false
d.status = 'draft'
d.scheduledAt = null
save(state); notify()
return true
}