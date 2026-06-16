import DOMPurify from 'dompurify';

export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
