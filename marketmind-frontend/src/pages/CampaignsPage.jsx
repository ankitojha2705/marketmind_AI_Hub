import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Archive, Ban, Lock, Pencil, Plus } from 'lucide-react';
import { fetchMyBrands, fetchBrandCampaigns, updateContentCampaign } from '../services/api';
import { setDashboardBrandId } from '../utils/dashboardBrandStorage';
import { PlatformIconRow } from '../components/PlatformIcon';
import BrandAvatar from '../components/BrandAvatar';
import { campaignStatusBadgeClass, formatCampaignStatus } from '../utils/campaignDisplay';

const shellCard =
  'rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] shadow-sm';

const tableWrap = 'mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm';
const thClass =
  'border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600';
const tdClass = 'border-b border-gray-100 px-4 py-3 text-sm text-gray-900';

const actionIconBtn =
  'rounded-lg p-2 disabled:opacity-50 disabled:cursor-not-allowed';

function normStatus(s) {
  return (s || 'draft').toLowerCase();
}

function canEdit(status) {
  const x = normStatus(status);
  // paused: legacy rows only — editable so status can move to active or completed
  return x === 'draft' || x === 'scheduled' || x === 'paused';
}

function canCancel(status) {
  const x = normStatus(status);
  return x === 'draft' || x === 'scheduled';
}

function canArchive(status) {
  const x = normStatus(status);
  return x === 'completed' || x === 'cancelled';
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [hasBrands, setHasBrands] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { brands: brandList } = await fetchMyBrands();
      const list = brandList || [];
      setHasBrands(list.length > 0);
      const merged = [];
      for (const b of list) {
        try {
          const list = await fetchBrandCampaigns(String(b.id), { includeArchived: false });
          for (const c of list || []) {
            merged.push({
              ...c,
              brandName: b.name,
              brandId: String(b.id),
              brandLogoUrl: b.logo_url || '',
            });
          }
        } catch (e) {
          toast.error(e.response?.data?.detail || e.message || `Could not load campaigns for ${b.name}`);
        }
      }
      merged.sort((a, b) => {
        const ta = new Date(a.startDate || 0).getTime();
        const tb = new Date(b.startDate || 0).getTime();
        return tb - ta;
      });
      setCampaigns(merged);
    } catch (e) {
      setHasBrands(false);
      toast.error(e.response?.data?.error || e.message || 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runAction = async (campaign, patch, successMsg) => {
    setBusyId(campaign.id);
    try {
      await updateContentCampaign(campaign.brandId, campaign.id, patch);
      toast.success(successMsg);
      await load();
    } catch (err) {
      const msg =
        err.response?.data?.detail || err.response?.data?.error || err.message || 'Request failed';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = (campaign) => {
    if (!window.confirm(`Cancel campaign "${campaign.name}"? It will be marked as cancelled.`)) return;
    runAction(campaign, { status: 'cancelled' }, 'Campaign cancelled');
  };

  const handleArchive = (campaign) => {
    if (!window.confirm(`Archive campaign "${campaign.name}"?`)) return;
    runAction(campaign, { status: 'archived' }, 'Campaign archived');
  };

  const goToEdit = (campaign) => {
    setDashboardBrandId(campaign.brandId);
    navigate(`/campaigns/${campaign.id}/edit`);
  };

  const goToNew = () => {
    if (!hasBrands) return;
    navigate('/campaigns/new');
  };

  if (loading) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Campaigns</h1>
        <p className="mt-2 text-gray-600 leading-relaxed">
          Non-archived campaigns across your brands, sorted by start date (newest first).
          {hasBrands ? (
            <>
              {' '}
              Use <span className="font-medium">New campaign</span> to create one under a brand you select in
              the form.
            </>
          ) : (
            <>
              {' '}
              <span className="font-medium">Create a brand</span> on the Brands page before you can add
              campaigns.
            </>
          )}
        </p>
      </div>

      <div className={`${shellCard} p-6 md:p-8`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Your campaigns</h2>
          <button
            type="button"
            onClick={goToNew}
            disabled={!hasBrands}
            title={
              hasBrands ? undefined : 'Create at least one brand before you can start a new campaign'
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-5 w-5 shrink-0" aria-hidden />
            New campaign
          </button>
        </div>

        <div className={tableWrap}>
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead>
              <tr>
                <th className={thClass}>Brand</th>
                <th className={thClass}>Campaign</th>
                <th className={thClass}>Platforms</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Start</th>
                <th className={thClass}>End</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className={`${tdClass} text-gray-600`}>
                    {!hasBrands ? (
                      <>
                        You do not have any brands yet. Campaigns are created under a brand —{' '}
                        <Link to="/brands" className="font-semibold text-blue-600 hover:text-blue-800">
                          create a brand first
                        </Link>
                        .
                      </>
                    ) : (
                      <>
                        No campaigns yet. Use <span className="font-medium">New campaign</span> above to add
                        one.
                      </>
                    )}
                  </td>
                </tr>
              )}
              {campaigns.map((c) => {
                const busy = busyId === c.id;
                const showEdit = canEdit(c.status);
                const showCancel = canCancel(c.status);
                const showArchive = canArchive(c.status);
                const showReadOnlyLive = normStatus(c.status) === 'active';

                return (
                  <tr key={`${c.brandId}-${c.id}`} className="hover:bg-gray-50/80">
                    <td className={`${tdClass} text-gray-800`}>
                      <div className="flex items-center gap-2">
                        <BrandAvatar name={c.brandName} logoUrl={c.brandLogoUrl} size="sm" />
                        <span className="whitespace-nowrap font-medium">{c.brandName}</span>
                      </div>
                    </td>
                    <td className={`${tdClass} font-medium text-gray-900`}>{c.name}</td>
                    <td className={tdClass}>
                      <PlatformIconRow platforms={c.platforms} iconClassName="h-4 w-4" gapClassName="gap-1" />
                    </td>
                    <td className={tdClass}>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${campaignStatusBadgeClass(
                          c.status
                        )}`}
                      >
                        {formatCampaignStatus(c.status)}
                      </span>
                    </td>
                    <td className={`${tdClass} whitespace-nowrap tabular-nums text-gray-700`}>
                      {fmtDate(c.startDate)}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap tabular-nums text-gray-700`}>
                      {fmtDate(c.endDate)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex flex-wrap items-center justify-end gap-0.5">
                        {showEdit ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => goToEdit(c)}
                            className={`${actionIconBtn} text-gray-600 hover:bg-gray-100`}
                            title="Edit campaign"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Edit campaign</span>
                          </button>
                        ) : showReadOnlyLive ? (
                          <span
                            className={`${actionIconBtn} inline-flex cursor-default text-gray-400`}
                            title="Live campaign — read-only"
                          >
                            <Lock className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Live campaign, read-only</span>
                          </span>
                        ) : showArchive ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleArchive(c)}
                            className={`${actionIconBtn} text-slate-700 hover:bg-slate-100`}
                            title="Archive campaign"
                          >
                            <Archive className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Archive campaign</span>
                          </button>
                        ) : (
                          <span
                            className={`${actionIconBtn} inline-flex cursor-default text-gray-400`}
                            title="No actions available"
                          >
                            <Lock className="h-4 w-4" aria-hidden />
                            <span className="sr-only">No actions available</span>
                          </span>
                        )}
                        {showCancel ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleCancel(c)}
                            className={`${actionIconBtn} text-amber-700 hover:bg-amber-50`}
                            title="Cancel campaign"
                          >
                            <Ban className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Cancel campaign</span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
