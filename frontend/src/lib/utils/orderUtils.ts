// Generate a unique 8-digit order ID starting with 'O'
export function generateOrderId(): string {
  // Get current timestamp in milliseconds
  const timestamp = Date.now();
  
  // Convert to base 36 (numbers + letters) and take last 7 characters
  const randomPart = timestamp.toString(36).slice(-7).toUpperCase();
  
  // Pad with zeros if needed to ensure 7 digits
  const paddedPart = randomPart.padStart(7, '0');
  
  // Return with 'O' prefix
  return `O${paddedPart}`;
}