function pickGermanVoice(voices = []) {
  return voices.find((v) => v.lang?.toLowerCase().startsWith('de')) || null;
}

export function speakText(text, options = {}) {
  if (!text || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const voice = pickGermanVoice(voices);

  utterance.lang = 'de-DE';
  if (voice) utterance.voice = voice;
  utterance.rate = options.rate ?? 1.02;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.volume = options.volume ?? 1.0;

  if (options.interrupt !== false) {
    window.speechSynthesis.cancel();
  }

  window.speechSynthesis.speak(utterance);
}
