import {publicCount} from '../src/event-counts.js';

export default function activity(request, response) {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Robots-Tag', 'noindex');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).end();
  }
  if (request.headers.origin !== 'https://' + request.headers.host ||
      !/(?:^|;\s*)si_analytics=granted(?:;|$)/.test(request.headers.cookie || '')) {
    return response.status(403).end();
  }
  if (!request.headers['content-type']?.startsWith('application/json')) return response.status(415).end();
  const {action,page,channel} = request.body || {};
  const event = publicCount(action,page,channel);
  if (!event) return response.status(400).end();
  console.info(JSON.stringify({source:'sachin_activity', ...event}));
  return response.status(204).end();
}
