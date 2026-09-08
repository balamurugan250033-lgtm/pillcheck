import crypto from 'node:crypto';

function json(response, status, body) {
  return response.status(status).json(body);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(response, 400, { error: 'Enter a valid email address.' });
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !process.env.AUTH_SECRET) {
    return json(response, 503, { error: 'Email authentication is not configured yet.' });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const issuedAt = Date.now();
  const payload = `${email}.${code}.${issuedAt}`;
  const signature = crypto.createHmac('sha256', process.env.AUTH_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}.${signature}`).toString('base64url');
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [email],
      subject: 'Your PillCheck verification code',
      text: `Your PillCheck verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your PillCheck verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes.</p>`,
    }),
  });
  if (!resendResponse.ok) {
    const result = await resendResponse.json();
    return json(response, resendResponse.status, { error: result.message || 'Unable to send verification email.' });
  }

  response.setHeader('Set-Cookie', `pillcheck_otp=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
  return json(response, 200, { ok: true, message: 'Verification code sent.' });
}
