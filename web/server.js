const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const port = 4173;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function handleGemini(request, response) {
  if (!process.env.GEMINI_API_KEY) {
    sendJson(response, 503, { error: 'Gemini is not configured. Set GEMINI_API_KEY before starting the server.' });
    return;
  }
  const body = JSON.parse(await readRequestBody(request));
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    sendJson(response, 400, { error: 'A prompt is required.' });
    return;
  }
  const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `You are PillCheck's medication adherence advisor. Give concise, non-diagnostic guidance. Never invent a dosage or tell a user to change medication. If asked about urgent symptoms, recommend a healthcare professional. User question: ${prompt}` }] }],
    }),
  });
  const result = await geminiResponse.json();
  if (!geminiResponse.ok) {
    sendJson(response, geminiResponse.status, { error: result.error?.message || 'Gemini request failed.' });
    return;
  }
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    sendJson(response, 502, { error: 'Gemini returned no text.' });
    return;
  }
  sendJson(response, 200, { text });
}

async function handleLogin(request, response) {
  const body = JSON.parse(await readRequestBody(request));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    sendJson(response, 400, { error: 'Enter a valid email address.' });
    return;
  }
  if (!password) {
    sendJson(response, 401, { error: 'Incorrect email or password.' });
    return;
  }
  const configuredPassword = process.env.AUTH_PASSWORD;
  if (configuredPassword) {
    const provided = Buffer.from(password);
    const configured = Buffer.from(configuredPassword);
    if (provided.length !== configured.length || !crypto.timingSafeEqual(provided, configured)) {
      sendJson(response, 401, { error: 'Incorrect email or password.' });
      return;
    }
  }
  const issuedAt = Date.now().toString();
  const payload = `${email}.${issuedAt}`;
  const signature = crypto.createHmac('sha256', process.env.AUTH_SECRET || 'local-development-secret').update(payload).digest('hex');
  const token = Buffer.from(`${payload}.${signature}`).toString('base64url');
  response.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Set-Cookie': `pillcheck_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`,
  });
  response.end(JSON.stringify({ ok: true, email }));
}

http.createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/api/auth/login') {
    try {
      await handleLogin(request, response);
    } catch (error) {
      sendJson(response, 500, { error: error.message || 'Unable to sign in.' });
    }
    return;
  }
  if (request.method === 'POST' && request.url === '/api/gemini') {
    try {
      await handleGemini(request, response);
    } catch (error) {
      sendJson(response, 500, { error: error.message || 'Gemini request failed.' });
    }
    return;
  }
  const requestedPath = request.url === '/' ? 'index.html' : request.url.slice(1);
  const filePath = path.resolve(root, requestedPath);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
  });
  response.end(fs.readFileSync(filePath));
}).listen(port, '127.0.0.1', () => {
  console.log(`PillCheck website running at http://127.0.0.1:${port}`);
});
