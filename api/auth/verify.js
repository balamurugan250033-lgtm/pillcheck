import crypto from 'node:crypto';

function json(response, status, body) {
  return response.status(status).json(body);
}

function getCookie(request, name) {
  const cookies = request.headers.cookie || '';
  const match = cookies.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

export default function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
  if (!process.env.AUTH_SECRET) return json(response, 503, { error: 'Email authentication is not configured yet.' });
  const code = typeof request.body?.code === 'string' ? request.body.code.trim() : '';
  const token = getCookie(request, 'pillcheck_otp');
  let decoded = '';
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return json(response, 401, { error: 'Invalid or expired verification code.' });
  }
  const parts = decoded.split('.');
  if (parts.length !== 4 || !/^\d{6}$/.test(code)) return json(response, 401, { error: 'Invalid or expired verification code.' });
  const [email, expectedCode, issuedAt, signature] = parts;
  const payload = `${email}.${expectedCode}.${issuedAt}`;
  const expectedSignature = crypto.createHmac('sha256', process.env.AUTH_SECRET).update(payload).digest('hex');
  const providedSignature = Buffer.from(signature);
  const calculatedSignature = Buffer.from(expectedSignature);
  const validSignature = providedSignature.length === calculatedSignature.length
    && crypto.timingSafeEqual(providedSignature, calculatedSignature);
  const fresh = Date.now() - Number(issuedAt) < 10 * 60 * 1000;
  if (!validSignature || !fresh || code !== expectedCode) return json(response, 401, { error: 'Invalid or expired verification code.' });
  response.setHeader('Set-Cookie', 'pillcheck_otp=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  return json(response, 200, { ok: true, email });
}
