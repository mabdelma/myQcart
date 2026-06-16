export interface DeepLinkResult {
  slug: string;
  tableId?: string;
}

/**
 * Parse a deep-link / QR-code URL and return restaurant context.
 *
 * Supported patterns:
 *   https://qcart.gmtmall.com/table/:tableId
 *   https://qcart.gmtmall.com/r/:slug/table/:tableId
 *   https://qcart.gmtmall.com/r/:slug
 *   qcart://table/:tableId
 *   qcart://r/:slug/table/:tableId
 */
export function handleDeepLink(url: string): DeepLinkResult | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.replace(/\/$/, '').split('/').filter(Boolean);

    // qcart://r/:slug/table/:tableId  or  https://.../r/:slug/table/:tableId
    if (pathParts[0] === 'r' && pathParts[1] && pathParts[2] === 'table' && pathParts[3]) {
      return { slug: pathParts[1], tableId: pathParts[3] };
    }

    // qcart://table/:tableId  or  https://.../table/:tableId
    if (pathParts[0] === 'table' && pathParts[1]) {
      return { slug: 'demo-cafe', tableId: pathParts[1] };
    }

    // qcart://r/:slug  or  https://.../r/:slug
    if (pathParts[0] === 'r' && pathParts[1]) {
      return { slug: pathParts[1] };
    }
  } catch {
    // Not a valid URL — ignore
  }

  return null;
}
