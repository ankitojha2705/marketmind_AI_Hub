import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPin, Plus, X } from 'lucide-react';
import { fetchMyBrands, createBrand, uploadBrandLogo } from '../services/api';
import BrandAvatar from '../components/BrandAvatar';

const shellCard =
  'rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] shadow-sm';
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25';

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    city: '',
    country: '',
    businessType: '',
    description: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoObjectUrl, setLogoObjectUrl] = useState(null);

  useEffect(() => {
    if (!logoFile) {
      setLogoObjectUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const load = async () => {
    try {
      const data = await fetchMyBrands();
      setBrands(data.brands || []);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    const fileToUpload = logoFile;
    try {
      const data = await createBrand({
        name: form.name.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        businessType: form.businessType.trim(),
        description: form.description.trim(),
      });
      const newId = data?.brand?.id != null ? String(data.brand.id) : null;
      setForm({ name: '', city: '', country: '', businessType: '', description: '' });
      setLogoFile(null);
      setShowForm(false);
      if (fileToUpload && newId) {
        try {
          await uploadBrandLogo(newId, fileToUpload);
        } catch (uploadErr) {
          toast.warning(
            uploadErr.response?.data?.error ||
              uploadErr.message ||
              'Brand created, but logo upload failed. You can add a logo from Manage brand.'
          );
        }
      }
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create brand');
    } finally {
      setCreating(false);
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

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Brands</h1>
        <p className="mt-2 text-gray-600 leading-relaxed">
          Create a brand or open one to manage details and team members.
        </p>
      </div>

      <div className={`${shellCard} p-6 md:p-8`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Your brands</h2>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className={[
              'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm',
              showForm
                ? 'border border-red-200 bg-white text-red-700 hover:bg-red-50'
                : 'bg-blue-600 text-white hover:bg-blue-700',
            ].join(' ')}
          >
            {showForm ? (
              <X className="h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <Plus className="h-5 w-5 shrink-0" aria-hidden />
            )}
            {showForm ? 'Cancel' : 'Create Brand'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mt-6 space-y-4 border-t border-gray-200 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Brand name</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="e.g. Bean & Bloom"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  required
                  placeholder="San Jose"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
                <input
                  className={inputClass}
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  required
                  placeholder="United States"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Business type <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputClass}
                  value={form.businessType}
                  onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
                  required
                  maxLength={120}
                  placeholder="e.g. Bubble tea café, SaaS, Retail apparel"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className={`${inputClass} min-h-[5rem]`}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="What does this brand do?"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Logo (optional)</label>
                <div className="flex flex-wrap items-center gap-4">
                  <BrandAvatar name={form.name} logoUrl={logoObjectUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                      onChange={(ev) => {
                        const f = ev.target.files?.[0];
                        ev.target.value = '';
                        if (!f) return;
                        if (f.size > 2 * 1024 * 1024) {
                          toast.error('Logo must be 2MB or smaller');
                          return;
                        }
                        setLogoFile(f);
                      }}
                    />
                    {logoFile ? (
                      <button
                        type="button"
                        onClick={() => setLogoFile(null)}
                        className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Remove file
                      </button>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        PNG, JPEG, WebP, or GIF. Uploaded after the brand is created.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Brand'}
            </button>
          </form>
        )}

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.length === 0 && !showForm && (
            <li className="col-span-full text-sm text-gray-600">
              You are not part of any brand yet. Create one to get started.
            </li>
          )}
          {brands.map((b) => (
            <li key={b.id}>
              <Link
                to={`/brands/${b.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <BrandAvatar name={b.name} logoUrl={b.logo_url} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{b.name}</p>
                    <p className="mt-0.5 text-xs text-gray-600 truncate">
                      <span className="font-medium text-gray-700">Business type: </span>
                      {b.businessType?.trim()
                        ? b.businessType
                        : 'Not set — open brand and save details (admin)'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">
                        {b.city}, {b.country}
                      </span>
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        b.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {b.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
