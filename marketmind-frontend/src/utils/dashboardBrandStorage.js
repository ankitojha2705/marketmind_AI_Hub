const KEY = 'mm_dashboard_selected_brand_id';

/** @returns {string} Mongo brand id, or '' if none selected */
export function getDashboardBrandId() {
  const v = localStorage.getItem(KEY);
  if (!v || v === 'all') return '';
  return v;
}

/** @param {string} id — empty string clears selection */
export function setDashboardBrandId(id) {
  const s = id && String(id).trim();
  if (!s || s === 'all') {
    localStorage.removeItem(KEY);
  } else {
    localStorage.setItem(KEY, s);
  }
}
