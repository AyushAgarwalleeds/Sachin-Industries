import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {publicCount} from '../src/event-counts.js';

// Accept newline-delimited Vercel runtime logs from a file or stdin.
const input = process.argv[2] ? createReadStream(process.argv[2]) : process.stdin;
const totals = new Map();
for await (const line of createInterface({input, crlfDelay: Infinity})) {
  try {
    const record = JSON.parse(line);
    const event = typeof record.message === 'string' ? JSON.parse(record.message) : record;
    if (event.source !== 'sachin_activity') continue;
    const count = publicCount(event.action, event.page, event.channel);
    if (!count) continue;
    const key = [count.action, count.page, count.channel || ''].join(',');
    totals.set(key, (totals.get(key) || 0) + 1);
  } catch { /* Vercel CLI progress messages and unrelated logs have no counts. */ }
}
console.log('event,page,channel,count');
for (const [key, count] of [...totals].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))) {
  console.log(key + ',' + count);
}
