export async function generateQRCode(data: string): Promise<string> {
  const baseUrl = window.location.origin;
  const fullUrl = `${baseUrl}/${data}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullUrl)}`;
}