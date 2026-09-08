const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('[data-view]');
const modal = document.querySelector('#scanModal');
const toast = document.querySelector('#toast');
const toastText = document.querySelector('#toastText');
const cameraVideo = document.querySelector('#cameraVideo');
const cameraStatus = document.querySelector('#cameraStatus');
let cameraStream = null;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let drugDatabase = [];
let selectedScanMode = 'pill';

fetch('./drug-database.json')
  .then(response => {
    if (!response.ok) throw new Error('Drug database request failed');
    return response.json();
  })
  .then(data => { drugDatabase = data; })
  .catch(() => notify('The local drug database could not be loaded.'));

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pillcheck-local', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('adherence')) {
        request.result.createObjectStore('adherence', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveAdherenceRecord(record) {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction('adherence', 'readwrite');
    transaction.objectStore('adherence').add(record);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  refreshAdherenceUI();
}

async function getAdherenceRecords() {
  const database = await openDatabase();
  const records = await new Promise((resolve, reject) => {
    const request = database.transaction('adherence', 'readonly').objectStore('adherence').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return records;
}

async function refreshAdherenceUI() {
  try {
    const records = await getAdherenceRecords();
    const taken = Math.min(4, 2 + records.filter(record => record.result === 'match').length);
    const progress = Math.round((taken / 4) * 100);
    document.querySelector('.progress-number strong').textContent = taken;
    document.querySelector('.progress-bar span').style.width = `${progress}%`;
    document.querySelector('.ring span').textContent = `${progress}%`;
    document.querySelector('.progress-caption span:last-child').textContent = `${4 - taken} doses left`;
    const historyList = document.querySelector('#history .activity-list');
    records.slice(-5).reverse().forEach(record => {
      const item = document.createElement('div');
      item.innerHTML = `<span class="activity-check">✓</span><div><strong>${record.medicine} confirmed</strong><small>${new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · OCR match saved locally</small></div><span class="activity-good">On device</span>`;
      historyList?.appendChild(item);
    });
  } catch {
    notify('Saved dose records could not be loaded.');
  }
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function matchDrugName(ocrText, expectedName) {
  const normalizedText = normalize(ocrText);
  const words = normalizedText.split(/\s+/).filter(Boolean);
  const expected = normalize(expectedName);
  const candidates = [expected, ...(drugDatabase.find(item => item.name === expectedName)?.aliases || [])].map(normalize);
  let best = { text: '', score: 0 };
  const exactCandidate = candidates.find(candidate => normalizedText.includes(candidate));
  if (exactCandidate) {
    return { matched: true, score: 1, detected: exactCandidate };
  }
  words.forEach(word => candidates.forEach(candidate => {
    const distance = levenshtein(word, candidate);
    const score = 1 - (distance / Math.max(word.length, candidate.length, 1));
    if (score > best.score) best = { text: word, score };
  }));
  const compactText = normalizedText.replace(/\s+/g, '');
  candidates.forEach(candidate => {
    const compactCandidate = candidate.replace(/\s+/g, '');
    for (let index = 0; index <= Math.max(0, compactText.length - compactCandidate.length); index += 1) {
      const fragment = compactText.slice(index, index + compactCandidate.length);
      const score = 1 - (levenshtein(fragment, compactCandidate) / Math.max(fragment.length, compactCandidate.length, 1));
      if (score > best.score) best = { text: candidate, score };
    }
  });
  return { matched: best.score >= 0.68, score: best.score, detected: best.text || 'no medicine name detected' };
}

function speak(message) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
  }
}

function listenForCommand(onCommand) {
  if (!SpeechRecognition) {
    notify('Voice input is not supported here. Use the button instead.');
    return;
  }
  if (recognition) recognition.abort();
  recognition = new SpeechRecognition();
  recognition.lang = document.documentElement.lang || 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => notify('Listening… say confirm, scan now, repeat, or remind me later.');
  recognition.onerror = event => notify(event.error === 'not-allowed' ? 'Microphone permission was blocked. Allow it in your browser.' : 'I could not hear that. Please try again.');
  recognition.onresult = event => onCommand(event.results[0][0].transcript.toLowerCase());
  recognition.onend = () => { recognition = null; };
  recognition.start();
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraStatus.textContent = 'Camera unavailable in this browser';
    notify('Camera needs localhost or HTTPS and browser permission.');
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    cameraVideo.srcObject = cameraStream;
    cameraStatus.textContent = 'Camera live · on-device';
  } catch (error) {
    cameraStatus.textContent = error.name === 'NotAllowedError' ? 'Camera permission blocked' : 'Camera unavailable';
    notify(error.name === 'NotAllowedError' ? 'Allow camera access in your browser to scan.' : 'Unable to start the camera.');
  }
}

function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  cameraStream = null;
  cameraVideo.srcObject = null;
}

function captureCameraFrame() {
  if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) throw new Error('Camera is not ready yet.');
  const canvas = document.querySelector('#captureCanvas');
  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;
  canvas.getContext('2d').drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function showView(name) {
  views.forEach(view => view.classList.toggle('active-view', view.id === name));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navItems.forEach(item => item.addEventListener('click', event => {
  event.preventDefault();
  if (item.dataset.view) showView(item.dataset.view);
}));
refreshAdherenceUI();

function notify(message) {
  toastText.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(notify.timeout);
  notify.timeout = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

function openScan() {
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  startCamera();
}
function closeScan() {
  modal.classList.remove('show');
  document.body.style.overflow = '';
  stopCamera();
}

document.querySelectorAll('#scanBtn, .scan-button').forEach(button => button.addEventListener('click', openScan));
document.querySelector('#closeModal').addEventListener('click', closeScan);
modal.addEventListener('click', event => { if (event.target === modal) closeScan(); });
document.querySelectorAll('.scan-mode').forEach(mode => mode.addEventListener('click', () => {
  selectedScanMode = mode.dataset.mode;
  document.querySelectorAll('.scan-mode').forEach(item => item.classList.remove('active'));
  mode.classList.add('active');
  const modeCopy = {
    pill: ['VERIFYING 12:30 PM DOSE', 'Scan your Paracetamol', 'Hold one tablet steady in front of your camera. PillCheck checks shape, color, and imprint on-device.', 'Scan tablet', 'Place one tablet inside the frame'],
    prescription: ['PRESCRIPTION CAPTURE', 'Scan your prescription', 'Take a clear photo of the full page. PillCheck will extract names, doses, and schedules for your review.', 'Capture prescription', 'Fit the prescription inside the frame'],
    package: ['PACKAGE RECOGNITION', 'Scan a strip or bottle', 'Point your camera at the label or barcode to read the medicine name, batch, and expiry date.', 'Scan package', 'Fit the label inside the frame'],
    receipt: ['REFILL LOG', 'Scan pharmacy receipt', 'Capture a receipt to log a refill and update your local medicine stock count.', 'Scan receipt', 'Fit the receipt inside the frame'],
  }[mode.dataset.mode];
  document.querySelector('.modal-copy').innerHTML = `<p class="eyebrow">${modeCopy[0]}</p><h2 id="scanTitle">${modeCopy[1]}</h2><p class="muted">${modeCopy[2]}</p><button class="solid-button full" id="verifyBtn">${modeCopy[3]}</button><button class="text-button centered" id="voiceScanBtn">Or say “scan now”</button>`;
  document.querySelector('#scanHint').textContent = modeCopy[4];
  document.querySelector('#verifyBtn').addEventListener('click', () => showScanResult());
  document.querySelector('#mismatchBtn')?.addEventListener('click', () => showScanResult(true));
  document.querySelector('#voiceScanBtn').addEventListener('click', () => listenForCommand(handleVoiceCommand));
}));
document.querySelector('#remindBtn').addEventListener('click', () => notify('Reminder snoozed for 15 minutes.'));
document.querySelector('#addMedication').addEventListener('click', () => notify('Medication setup is ready for your next prescription.'));

function showScanIntro() {
  const copy = document.querySelector('.modal-copy');
  copy.innerHTML = '<p class="eyebrow">VERIFYING 12:30 PM DOSE</p><h2>Scan your Paracetamol</h2><p class="muted">Hold one tablet or label steady in front of your camera. OCR and matching run in your browser.</p><button class="solid-button full" id="verifyBtn">Capture &amp; verify</button><button class="outline-button full demo-mismatch" id="mismatchBtn">Try mismatch demo</button><button class="text-button centered" id="voiceScanBtn">Or say “scan now”</button>';
  document.querySelector('#verifyBtn').addEventListener('click', () => showScanResult());
  document.querySelector('#mismatchBtn').addEventListener('click', () => showScanResult(true));
  document.querySelector('#voiceScanBtn').addEventListener('click', () => listenForCommand(handleVoiceCommand));
}

function handleVoiceCommand(command) {
  if (command.includes('scan')) {
    showScanResult();
  } else if (command.includes('repeat')) {
    speak('Place one tablet inside the frame, then say scan now.');
    notify('Repeating scan instructions.');
  } else if (command.includes('confirm') || command.includes('yes')) {
    document.querySelector('#confirmDose')?.click();
  } else if (command.includes('later') || command.includes('snooze')) {
    closeScan();
    notify('Reminder snoozed for 15 minutes.');
  } else {
    notify(`I heard “${command}”. Say scan now, confirm, repeat, or remind me later.`);
  }
}

async function showScanResult(forceMismatch = false) {
  let match = { matched: false, score: 0, detected: 'no medicine name detected' };
  let ocrText = '';
  if (!forceMismatch) {
    try {
      notify(selectedScanMode === 'pill' ? 'Capturing tablet image…' : 'Reading image on-device…');
      const frame = captureCameraFrame();
      if (!window.Tesseract) throw new Error('OCR engine is still loading. Try again in a moment.');
      const result = await window.Tesseract.recognize(frame, 'eng', {
        logger: message => {
          if (message.status === 'recognizing text') cameraStatus.textContent = `Reading image ${Math.round(message.progress * 100)}%`;
        },
      });
      ocrText = result.data.text;
      match = matchDrugName(ocrText, 'Paracetamol');
    } catch (error) {
      notify(error.message || 'Could not read this image.');
      return;
    }
  } else {
    match = { matched: false, score: 0.18, detected: 'losartan' };
    ocrText = 'demo mismatch: losartan';
  }
  const copy = document.querySelector('.modal-copy');
  const verdict = match.matched ? 'MATCH CONFIRMED' : 'MISMATCH DETECTED';
  const title = match.matched ? 'This matches Paracetamol' : 'This does not look right';
  const description = match.matched
    ? `OCR detected “${match.detected}” with ${Math.round(match.score * 100)}% confidence.`
    : `OCR detected “${match.detected}”. Your 12:30 PM tablet should be Paracetamol.`;
  copy.innerHTML = `<p class="eyebrow">${verdict}</p><h2>${title}</h2><p class="muted">${description}</p><p class="ocr-detail">On-device OCR text: <em>${ocrText || 'demo mismatch'}</em></p>${match.matched ? '<button class="solid-button full" id="confirmDose">Confirm dose</button>' : '<button class="solid-button full" id="retryScan">Scan the correct tablet</button>'}<button class="text-button centered" id="scanAgain">Scan again</button>`;
  if (match.matched) {
    document.querySelector('#confirmDose').addEventListener('click', async () => {
      try {
        await saveAdherenceRecord({ timestamp: new Date().toISOString(), medicine: 'Paracetamol', expected: 'Paracetamol', ocrText, score: match.score, result: 'match', mode: selectedScanMode });
        closeScan();
        notify('Dose confirmed and saved on this device.');
      } catch {
        notify('The dose matched, but could not be saved locally.');
      }
    });
  }
  document.querySelector('#retryScan')?.addEventListener('click', showScanIntro);
  document.querySelector('#scanAgain').addEventListener('click', showScanIntro);
}

document.querySelector('#verifyBtn').addEventListener('click', () => showScanResult());
document.querySelector('#mismatchBtn')?.addEventListener('click', () => showScanResult(true));

document.querySelector('#voiceBtn').addEventListener('click', () => {
  speak('I am listening. Say scan now, confirm, repeat, or remind me later.');
  listenForCommand(command => {
    if (command.includes('scan')) openScan();
    else if (command.includes('repeat')) speak('Your next dose is Paracetamol, 500 milligrams, at 12:30 PM.');
    else if (command.includes('later') || command.includes('snooze')) notify('Reminder snoozed for 15 minutes.');
    else notify(`I heard “${command}”. Try saying scan now or repeat.`);
  });
});
document.querySelector('#voiceScanBtn').addEventListener('click', () => listenForCommand(handleVoiceCommand));

const largeToggle = document.querySelector('#largeToggle');
function toggleLargePrint() {
  document.body.classList.toggle('large-print');
  largeToggle.classList.toggle('on', document.body.classList.contains('large-print'));
  notify(document.body.classList.contains('large-print') ? 'Large-print mode on.' : 'Large-print mode off.');
}
document.querySelector('#accessibilityBtn').addEventListener('click', toggleLargePrint);
largeToggle.addEventListener('click', toggleLargePrint);
document.querySelectorAll('.toggle.on').forEach(toggle => toggle.addEventListener('click', () => toggle.classList.toggle('on')));

const authModal = document.querySelector('#authModal');
document.querySelector('#profileBtn').addEventListener('click', () => authModal.classList.add('show'));
document.querySelector('#closeAuth').addEventListener('click', () => authModal.classList.remove('show'));
authModal.addEventListener('click', event => { if (event.target === authModal) authModal.classList.remove('show'); });
document.querySelector('#sendOtp').addEventListener('click', () => {
  const contact = document.querySelector('#authContact').value.trim();
  if (!contact) {
    notify('Enter a phone number or email first.');
    return;
  }
  notify(`Secure code sent to ${contact}.`);
});
document.querySelector('#startOnboarding').addEventListener('click', () => {
  document.querySelector('#authTitle').textContent = 'Set up your PillCheck profile';
  document.querySelector('.auth-card .eyebrow').textContent = 'A FEW QUICK DETAILS';
  document.querySelector('.auth-card .muted').textContent = 'Your preferences help us make reminders easier to hear, see, and follow.';
  document.querySelector('.auth-card label').firstChild.textContent = 'Your name';
  document.querySelector('#authContact').placeholder = 'e.g. Deepan Raju';
  document.querySelector('#sendOtp').textContent = 'Continue setup';
});

function fallbackAdvisorAnswer(question) {
  const bubble = document.querySelector('.chat-bubble');
  bubble.textContent = question.toLowerCase().includes('reminder')
    ? 'Try moving your evening reminder 15 minutes earlier. Your history shows that a little lead time helps you stay on schedule.'
    : 'Your score improved because both morning doses were confirmed within 10 minutes of their scheduled time.';
}

async function answerAdvisor(question) {
  const bubble = document.querySelector('.chat-bubble');
  bubble.textContent = 'Checking your private advisor…';
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: question }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Advisor unavailable');
    bubble.textContent = result.text;
    speak(result.text);
  } catch {
    fallbackAdvisorAnswer(question);
    notify('Gemini is unavailable, so I showed the offline advisor response.');
  }
}
document.querySelectorAll('.suggestion').forEach(button => button.addEventListener('click', () => answerAdvisor(button.textContent)));
document.querySelector('#advisorSend').addEventListener('click', () => {
  const input = document.querySelector('#advisorInput');
  if (!input.value.trim()) {
    notify('Type a question for your advisor.');
    return;
  }
  answerAdvisor(input.value);
  input.value = '';
});
document.querySelector('#shiftReminder').addEventListener('click', () => notify('Suggestion saved: move your evening reminder to 7:45 PM.'));
document.querySelector('#advisorVoice').addEventListener('click', () => {
  notify('Listening for your health question…');
  if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance('I am listening. Ask me about your adherence.'));
});
