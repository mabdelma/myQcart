import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendCampaign } from './marketingService.js';
import { db } from '../db/index.js';
import { sendEmail } from '../lib/mail.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;

const customers = [
  { email: 'vip@x.com', totalSpent: 300, totalVisits: 8, lastVisit: '2026-07-01' },
  { email: 'reg@x.com', totalSpent: 20, totalVisits: 3, lastVisit: '2026-01-01' }, // at-risk
  { email: null, totalSpent: 500, totalVisits: 9, lastVisit: '2026-07-01' },        // no email → skipped
];

describe('marketingService.sendCampaign', () => {
  beforeEach(() => { vi.clearAllMocks(); mockDb.__setQueryQueue([]); });

  it('emails everyone with an address for the "all" segment', async () => {
    mockDb.__setQueryQueue([customers]);
    const r = await sendCampaign('t1', 'Cafe', { segment: 'all', subject: 'Hi', message: 'Come back' });
    expect(r).toEqual({ sent: 2, total: 2 }); // the null-email customer is excluded
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('targets only VIPs for the "vip" segment', async () => {
    mockDb.__setQueryQueue([customers]);
    const r = await sendCampaign('t1', 'Cafe', { segment: 'vip', subject: 'VIP', message: 'Perks' });
    expect(r.total).toBe(1); // only vip@x.com (>=200 spent) has an email
  });

  it('escapes HTML in the message body', async () => {
    mockDb.__setQueryQueue([[{ email: 'a@x.com', totalSpent: 0, totalVisits: 1, lastVisit: null }]]);
    await sendCampaign('t1', 'Cafe', { segment: 'all', subject: 'S', message: '<script>x</script>' });
    const html = vi.mocked(sendEmail).mock.calls[0][0].html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
