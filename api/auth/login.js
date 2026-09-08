import crypto from 'node:crypto';

function json(response, status, body) {
  return response.status(status).json(body);
}

function sameSecret(provided, configured) {
  const providedBuffer = Buffer.from(provided);
  const configuredBuffer = Buffer.from(configured);
  return providedBuffer.length === configuredBuffer.length
    && crypto.timingSafeEqual(providedBuffer, configuredBuffer);
}

export default function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
  if (!process.env.AUTH_SECRET || !process.env.AUTH_PASSWORD) {
    return json(response, 503, { error: 'Password authentication is not configured yet.' });
  }

  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(response, 400, { error: 'Enter a valid email address.' });
  }
  if (!password || !sameSecret(password, process.env.AUTH_PASSWORD)) {
    return json(response, 401, { error: 'Incorrect email or password.' });
  }

  const issuedAt = Date.now().toString();
  const payload = `${email}.${issuedAt}`;
  const signature = crypto.createHmac('sha256', process.env.AUTH_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}.${signature}`).toString('base64url');
  response.setHeader('Set-Cookie', `pillcheck_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`);
  return json(response, 200, { ok: true, email });
}
