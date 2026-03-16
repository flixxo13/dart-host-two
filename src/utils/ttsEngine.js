let speechQueue = [];
let isSpeaking = false;
let activeUtterance = null;
let lastSpokenAt = 0;
let lastSpokenKey = null;

function pickGermanVoice(voices = []) {
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith('de-de')) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith('de')) ||
    null
  );
}

function now() {
  return Date.now();
}

function normalizeText(text) {
  return String(text || '').trim();
}

function shouldDedupe(item) {
  if (!item?.dedupeKey) return false;
  if (lastSpokenKey !== item.dedupeKey) return false;
  return now() - lastSpokenAt < 4000;
}

function sortQueue() {
  const priorityOrder = {
    critical: 4,
    high: 3,
    normal: 2,
    low: 1
  };

  speechQueue.sort((a, b) => {
    const pa = priorityOrder[a.priority] || 0;
    const pb = priorityOrder[b.priority] || 0;
    return pb - pa;
  });
}

function speakNext() {
  if (isSpeaking) return;
  if (speechQueue.length === 0) return;
  if (!window.speechSynthesis) return;

  const item = speechQueue.shift();
  if (!item || !item.text) {
    speakNext();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(item.text);
  const voices = window.speechSynthesis.getVoices();
  const voice = pickGermanVoice(voices);

  utterance.lang = 'de-DE';
  if (voice) utterance.voice = voice;
  utterance.rate = item.rate ?? 1.0;
  utterance.pitch = item.pitch ?? 1.0;
  utterance.volume = item.volume ?? 1.0;

  isSpeaking = true;
  activeUtterance = utterance;

  utterance.onend = () => {
    isSpeaking = false;
    activeUtterance = null;
    lastSpokenAt = now();
    lastSpokenKey = item.dedupeKey || null;
    speakNext();
  };

  utterance.onerror = () => {
    isSpeaking = false;
    activeUtterance = null;
    speakNext();
  };

  window.speechSynthesis.speak(utterance);
}

export function enqueueSpeech({
  text,
  priority = 'normal',
  interrupt = false,
  dedupeKey = '',
  rate = 1.0,
  pitch = 1.0,
  volume = 1.0
}) {
  const cleanText = normalizeText(text);
  if (!cleanText) return false;
  if (!window.speechSynthesis) return false;

  const item = {
    text: cleanText,
    priority,
    interrupt,
    dedupeKey,
    rate,
    pitch,
    volume
  };

  if (shouldDedupe(item)) {
    return false;
  }

  if (interrupt) {
    speechQueue = [];
    isSpeaking = false;
    activeUtterance = null;
    window.speechSynthesis.cancel();
  }

  if (isSpeaking) {
    if (priority === 'low') {
      return false;
    }
  }

  speechQueue.push(item);
  sortQueue();
  speakNext();
  return true;
}

export function stopSpeech() {
  speechQueue = [];
  isSpeaking = false;
  activeUtterance = null;
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeechBusy() {
  return isSpeaking || speechQueue.length > 0;
}

export function getSpeechDebugState() {
  return {
    isSpeaking,
    queuedItems: speechQueue.length,
    lastSpokenAt,
    lastSpokenKey
  };
}
