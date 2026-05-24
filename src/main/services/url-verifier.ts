export async function verifyPublicImageUrl(url: string): Promise<void> {
  const isValidHost = url.includes('pixi.mg') || url.includes('ibb.co') || url.includes('imgbb');
  if (!isValidHost) {
    throw new Error('Invalid temporary image URL');
  }

  console.log(`[url-verifier] Sending HEAD to ${url}`);
  let response = await fetch(url, { method: 'HEAD' });
  console.log(`[url-verifier] HEAD status: ${response.status}`);

  if (!response.ok) {
    console.log(`[url-verifier] HEAD failed, sending GET to ${url}`);
    response = await fetch(url, { method: 'GET' });
    console.log(`[url-verifier] GET status: ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`Image URL is not available: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  console.log(`[url-verifier] Content-Type: ${contentType}`);

  if (!contentType.startsWith('image/')) {
    throw new Error(`URL is not an image: ${contentType}`);
  }
}
