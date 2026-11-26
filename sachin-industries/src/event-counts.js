// Public categories only. Both ends use the same allowlist. A full URL,
// drawing name or enquiry field can never become a report dimension.
export const pages = new Set([
  '/', '/laser-cutting-pune.html', '/sheet-metal-bending-pune.html',
  '/sheet-metal-shearing-pune.html', '/capabilities.html', '/process-film.html',
  '/sheet-metal-guide.html', '/cad.html', '/cad-guide.html', '/privacy.html'
]);
export const actions = new Set([
  'page_view', 'contact_click', 'enquiry_open', 'enquiry_prepared', 'cad_start',
  'dwg_workspace_open','cad_import', 'cad_export', 'map_open', 'brochure_print', 'video_complete'
]);
export const channels = new Set(['phone', 'whatsapp', 'email', 'directions']);

export function publicCount(action, path, channel) {
  const page = path === '/index.html' ? '/' : path;
  if (!actions.has(action) || !pages.has(page)) return null;
  const count = {action, page};
  if (channels.has(channel) && ['contact_click','enquiry_prepared'].includes(action)) count.channel = channel;
  return count;
}
