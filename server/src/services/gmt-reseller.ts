/**
 * GMT reseller link — accept GMT reseller codes at QCart subscription checkout
 * and report sales so the reseller earns commission. Best-effort; never throws;
 * no-ops when GMT_PRODUCT_KEY is unset.
 */
const GMT_BASE = process.env.GMT_API_BASE || 'https://grandmindstechnology.com';
const GMT_KEY = process.env.GMT_PRODUCT_KEY || '';

export type GmtValidate =
  | { valid: false }
  | { valid: true; code: string; resellerId: string; discountPercent: number; commissionPercent: number };

const headers = () => ({ authorization: `Bearer ${GMT_KEY}`, 'content-type': 'application/json' });

export async function gmtValidate(code: string): Promise<GmtValidate> {
  if (!GMT_KEY || !code) return { valid: false };
  try {
    const res = await fetch(`${GMT_BASE}/api/v1/reseller/validate?code=${encodeURIComponent(code)}`, { headers: headers() });
    const j = (await res.json()) as GmtValidate & { valid?: boolean };
    return j?.valid ? j : { valid: false };
  } catch {
    return { valid: false };
  }
}

export async function gmtReportSale(input: {
  code: string;
  amountCents: number;
  currency?: string;
  externalId: string;
  customerRef?: string;
}): Promise<boolean> {
  if (!GMT_KEY) return false;
  try {
    const res = await fetch(`${GMT_BASE}/api/v1/reseller/sales`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ currency: 'USD', ...input }),
    });
    const j = (await res.json()) as { ok?: boolean };
    return !!j?.ok;
  } catch {
    return false;
  }
}
