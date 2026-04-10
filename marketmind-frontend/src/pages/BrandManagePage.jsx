import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, UserMinus } from 'lucide-react';
import {
  fetchBrand,
  updateBrand,
  addBrandMember,
  removeBrandMember,
  uploadBrandLogo,
} from '../services/api';
import BrandAvatar from '../components/BrandAvatar';
import { useAuth } from '../context/AuthContext';

const shellCard =
  'rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] shadow-sm';
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25';

export default function BrandManagePage() {
  const { user } = useAuth();
  const { brandId } = useParams();
  const currentUserId = user?._id?.toString?.() || user?.id?.toString?.() || '';
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState(null);
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    city: '',
    country: '',
    businessType: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const load = async () => {
    try {
      const data = await fetchBrand(brandId);
      setBrand(data.brand);
      setMembers(data.members || []);
      setMyRole(data.myRole);
      setEditForm({
        name: data.brand.name,
        city: data.brand.city,
        country: data.brand.country,
        businessType: data.brand.businessType || '',
        description: data.brand.description || '',
      });
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Failed to load brand');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [brandId]);

  const isAdmin = myRole === 'admin';

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateBrand(brandId, {
        name: editForm.name.trim(),
        city: editForm.city.trim(),
        country: editForm.country.trim(),
        businessType: editForm.businessType.trim(),
        description: editForm.description.trim(),
      });
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviting(true);
    try {
      await addBrandMember(brandId, email);
      setInviteEmail('');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to add member');
    } finally {
      setInviting(false);
    }
  };

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be 2MB or smaller');
      return;
    }
    setLogoUploading(true);
    try {
      await uploadBrandLogo(brandId, file);
      toast.success('Logo updated');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member from the brand?')) return;
    setRemovingId(userId);
    try {
      await removeBrandMember(brandId, userId);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
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

  if (!brand) {
    return (
      <div className="space-y-4">
        <Link
          to="/brands"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to brands
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <Link
          to="/brands"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All brands
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          {brand.name}
        </h1>
        <p className="mt-1 text-gray-600">
          {brand.city}, {brand.country}
        </p>
        <p className="mt-2 text-sm text-gray-700">
          <span className="font-medium text-gray-900">Business type </span>
          <span className="text-red-500">*</span>
          {': '}
          {brand.businessType?.trim() ? (
            brand.businessType
          ) : (
            <span className="font-medium text-amber-800">Not set — required. Save brand details below.</span>
          )}
        </p>
        <span
          className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isAdmin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {isAdmin ? 'You are an admin' : 'You are a member'}
        </span>
      </div>

      <div className={`${shellCard} p-6 md:p-8`}>
        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Brand details</h2>
        <div className="mt-4 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-start">
          <BrandAvatar name={brand.name} logoUrl={brand.logo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">Logo</p>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              Shown on brand cards and the dashboard. Files are stored on the server by brand id;{' '}
              <span className="font-medium text-gray-700">logo_url</span> can later point to S3 or a CDN without
              changing the app shape.
            </p>
            {isAdmin ? (
              <div className="mt-3">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  disabled={logoUploading}
                  onChange={handleLogoFile}
                  className="block w-full max-w-sm text-sm text-gray-600 file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-800 hover:file:bg-gray-50"
                />
                {logoUploading ? (
                  <p className="mt-2 text-xs text-gray-500">Uploading…</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-500">Only admins can change the logo.</p>
            )}
          </div>
        </div>
        {isAdmin ? (
          <form onSubmit={handleSaveBrand} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                className={inputClass}
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Business type <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                value={editForm.businessType}
                onChange={(e) => setEditForm((f) => ({ ...f, businessType: e.target.value }))}
                required
                maxLength={120}
                placeholder="e.g. Bubble tea café, SaaS"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                <input
                  className={inputClass}
                  value={editForm.city}
                  onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
                <input
                  className={inputClass}
                  value={editForm.country}
                  onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                className={`${inputClass} min-h-[6rem]`}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium text-gray-900">Business type </span>
              <span className="text-red-500">*</span>
              {': '}
              {brand.businessType?.trim() || (
                <span className="text-amber-800">Not set — ask an admin to complete brand details.</span>
              )}
            </p>
            <p>{brand.description || 'No description.'}</p>
            <p className="text-xs text-gray-500">Only admins can edit brand details.</p>
          </div>
        )}
      </div>

      <div className={`${shellCard} p-6 md:p-8`}>
        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Team</h2>
        <p className="mt-1 text-sm text-gray-600">
          Members can create campaigns and posts. Only admins can change brand settings or manage
          members.
        </p>

        {isAdmin && (
          <form onSubmit={handleInvite} className="mt-6 space-y-2">
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
              Add by email
            </label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <input
                id="invite-email"
                type="email"
                className={`${inputClass} min-w-0 flex-1`}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
              />
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 sm:min-h-[42px]"
              >
                {inviting ? 'Adding…' : 'Add member'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              User must already have an account. No invitation email is sent.
            </p>
          </form>
        )}

        <ul className="mt-6 divide-y divide-gray-200 border-t border-gray-200">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-4"
            >
              <div>
                <p className="font-medium text-gray-900">{m.fullname}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                    m.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {m.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
              {isAdmin && String(m.userId) !== currentUserId && (
                <button
                  type="button"
                  onClick={() => handleRemove(m.userId)}
                  disabled={removingId === m.userId}
                  className="inline-flex items-center gap-1 rounded-lg border border-transparent bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <UserMinus className="h-4 w-4" aria-hidden />
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
