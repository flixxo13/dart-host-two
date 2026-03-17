let speechQueue = [];
let speaking = false;
let currentUtterance = null;
let queueCounter = 0;

const PRIORITY = {
  low: 1,
  normal: 2,
  high: 3,
  critical: 4
};

function getNow() {
  return Date.now();
}

function normalizeText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickGermanVoice(voices, preferredVoiceName) {
  if (!voices || voices.length === 0) return null;

  if (preferredVoiceName) {
    const exact = voices.find(
      (v) => v.name.toLowerCase() === preferredVoiceName.toLowerCase()
    );
    if (exact) return exact;
  }

  const deVoices = voices.filter((v) =>
    String(v.lang || '').toLowerCase().startsWith('de')
  );

  if (deVoices.length > 0) return deVoices[0];
  return voices[0] || null;
}

function removeDuplicateQueueEntries(dedupeKey) {
  if (!dedupeKey) return;
  speechQueue = speechQueue.filter(
    (item) => item.dedupeKey !== dedupeKey
  );
}

function sortQueue() {
  speechQueue.sort((a, b) => {
    const prioDiff = PRIORITY[b.priority] - PRIORITY[a.priority];
    if (prioDiff !== 0) return prioDiff;
    return a.createdAt - b.createdAt;
  });
}

function speakNext() {
  if (speaking) return;
  if (!window.speechSynthesis) return;
  if (speechQueue.length === 0) return;

  sortQueue();

  const nextItem = speechQueue.shift();
  if (!nextItem) return;

  const utterance = new SpeechSynthesisUtterance(nextItem.text);
  const voices = window.speechSynthesis.getVoices();
  const voice = pickGermanVoice(voices, nextItem.voiceName);

  utterance.lang = nextItem.lang || 'de-DE';
  if (voice) utterance.voice = voice;
  utterance.rate = nextItem.rate != null ? nextItem.rate : 1.0;
  utterance.pitch = nextItem.pitch != null ? nextItem.pitch : 1.0;
  utterance.volume = nextItem.volume != null ? nextItem.volume : 1.0;

  speaking = true;
  currentUtterance = utterance;

  utterance.onend = () => {
    speaking = false;
    currentUtterance = null;
    speakNext();
  };

  utterance.onerror = () => {
    speaking = false;
    currentUtterance = null;
    speakNext();
  };

  window.speechSynthesis.speak(utterance);
}

export function warmupVoices() {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
}

export function getSpeechState() {
  return {
    speaking,
    queued: speechQueue.length,
    hasCurrentUtterance: !!currentUtterance
  };
}

export function clearSpeechQueue(options) {
  var cancelCurrent = options && options.cancelCurrent === true;
  speechQueue = [];
  if (cancelCurrent && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    speaking = false;
    currentUtterance = null;
  }
}

export function enqueueSpeech(options) {
  var text = options.text;
  var priority = options.priority || 'normal';
  var interrupt = options.interrupt || false;
  var dedupeKey = options.dedupeKey || '';
  var rate = options.rate != null ? options.rate : 1.0;
  var pitch = options.pitch != null ? options.pitch : 1.0;
  var volume = options.volume != null ? options.volume : 1.0;
  var lang = options.lang || 'de-DE';
  var voiceName = options.voiceName || '';

  var normalized = normalizeText(text);
  if (!normalized) return false;
  if (!window.speechSynthesis) return false;

  if (dedupeKey) {
    removeDuplicateQueueEntries(dedupeKey);
  }

  if (interrupt) {
    speechQueue = speechQueue.filter(
      function(item) {
        return PRIORITY[item.priority] > PRIORITY[priority];
      }
    );
    window.speechSynthesis.cancel();
    speaking = false;
    currentUtterance = null;
  }

  speechQueue.push({
    id: 'speech_' + (++queueCounter),
    text: normalized,
    priority: priority,
    dedupeKey: dedupeKey,
    rate: rate,
    pitch: pitch,
    volume: volume,
    lang: lang,
    voiceName: voiceName,
    createdAt: getNow()
  });

  speakNext();
  return true;
}
