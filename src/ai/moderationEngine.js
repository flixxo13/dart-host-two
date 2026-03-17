import { getPersonaProfile } from './personaProfiles';

const EVENT_PRIORITY = {
  idle: 'low',
  normal: 'normal',
  miss: 'normal',
  strong: 'normal',
  checkout: 'high',
  highscore: 'high',
  perfect: 'critical',
  bust: 'high',
  finish: 'critical'
};

export function classifyEvent(context) {
  if (context.wonLeg) return 'finish';
  if (context.bust) return 'bust';
  if (context.highscore === '180') return 'perfect';
  if (context.highscore === '140+') return 'highscore';
  if (context.checkout) return 'checkout';
  if (context.total === 0) return 'miss';
  if (context.total >= 100) return 'strong';
  return 'normal';
}

export function shouldSpeak({
  eventType,
  speechState,
  cooldowns
}) {
  // Kritische Events IMMER sprechen
  if (eventType === 'finish') return true;
  if (eventType === 'perfect') return true;
  if (eventType === 'bust') return true;
  if (eventType === 'checkout') return true;
  if (eventType === 'highscore') return true;

  // TTS spricht gerade — nicht unterbrechen
  if (speechState && speechState.speaking) return false;

  // Cooldown für normale Events
  if (cooldowns && cooldowns.blockNormal && eventType === 'normal') return false;

  return true;
}

function randomFrom(list) {
  if (!list || list.length === 0) return '';
  return list[Math.floor(Math.random() * list.length)];
}

function buildPersonaRuleText(persona, eventType, playerName, total, rest, checkout) {
  var personaId = persona.id;

  var variants = {
    classic: {
      finish: [
        playerName + ' checkt das Leg. Sehr sauber gespielt.',
        playerName + ' macht das Leg zu. Starkes Finish.'
      ],
      bust: [
        playerName + ' überwirft sich. Bust.',
        'Bust von ' + playerName + '. Die Aufnahme zählt nicht.'
      ],
      perfect: [
        playerName + ' mit 180. Exzellente Aufnahme.',
        '180 von ' + playerName + '. Höchste Qualität am Board.'
      ],
      highscore: [
        playerName + ' erzielt starke ' + total + ' Punkte.',
        total + ' Punkte von ' + playerName + '. Sehr gute Aufnahme.'
      ],
      checkout: [
        playerName + ' steht auf ' + rest + '. Checkout über ' + checkout + '.',
        rest + ' Rest für ' + playerName + '. Der Checkout: ' + checkout + '.'
      ],
      strong: [
        playerName + ' bringt ' + total + ' Punkte ans Board.',
        total + ' Punkte von ' + playerName + '. Solide Arbeit.'
      ],
      miss: [
        playerName + ' bleibt in dieser Aufnahme ohne Wirkung.',
        'Keine zählbaren Treffer von ' + playerName + '.'
      ],
      normal: [
        playerName + ' wirft ' + total + '. Rest ' + rest + '.',
        total + ' Punkte für ' + playerName + '. Rest ' + rest + '.'
      ],
      idle: [
        playerName + ' ist wieder am Oche. Ruhe bewahren, sauber werfen.',
        playerName + ' macht sich bereit. Die nächste Aufnahme folgt.'
      ]
    },
    showman: {
      finish: [
        playerName + ' macht den Laden zu. Was für ein Finish.',
        playerName + ' checkt das Leg. Genau im richtigen Moment.'
      ],
      bust: [
        playerName + ' geht drüber. Bust, und das tut weh.',
        'Bust von ' + playerName + '. Da war etwas zu viel Mut dabei.'
      ],
      perfect: [
        playerName + ' zündet die 180. Ganz großes Kino.',
        '180 von ' + playerName + '. Das Board hat gerade gebrannt.'
      ],
      highscore: [
        total + ' Punkte von ' + playerName + '. Da ist richtig Zug drauf.',
        playerName + ' räumt groß ab mit ' + total + ' Punkten.'
      ],
      checkout: [
        playerName + ' steht auf ' + rest + '. Das riecht nach Finish: ' + checkout + '.',
        rest + ' Rest für ' + playerName + '. Checkout-Weg: ' + checkout + '.'
      ],
      strong: [
        playerName + ' bringt starke ' + total + ' ans Board.',
        total + ' Punkte von ' + playerName + '. Das war wichtig.'
      ],
      miss: [
        playerName + ' erwischt diesmal keinen brauchbaren Rhythmus.',
        'Eine stille Aufnahme von ' + playerName + '.'
      ],
      normal: [
        playerName + ' nimmt ' + total + ' mit. Rest ' + rest + '.',
        total + ' Punkte für ' + playerName + '. Das Match bleibt in Bewegung.'
      ],
      idle: [
        playerName + ' ist wieder dran. Vielleicht kommt jetzt der Besuch im Triple.',
        'Kurze Ruhe, gleich geht es weiter mit ' + playerName + '.'
      ]
    },
    pub: {
      finish: [
        playerName + ' macht den Sack zu. Feierabend am Board.',
        playerName + ' checkt das Leg. Kurz, trocken, erledigt.'
      ],
      bust: [
        playerName + ' geht drüber. Klassischer Bust.',
        'Bust von ' + playerName + '. Da wollte der Dart etwas zu viel.'
      ],
      perfect: [
        playerName + ' mit 180. Da klatscht sogar das Bierglas.',
        '180 von ' + playerName + '. Brett heiß, Hand locker.'
      ],
      highscore: [
        playerName + ' haut ' + total + ' rein. Das kann man so machen.',
        total + ' Punkte von ' + playerName + '. Da nickt selbst der Gegner.'
      ],
      checkout: [
        playerName + ' steht auf ' + rest + '. Weg zumachen über ' + checkout + '.',
        rest + ' Rest für ' + playerName + '. Jetzt wird es interessant: ' + checkout + '.'
      ],
      strong: [
        playerName + ' nimmt ' + total + ' mit. Passt schon ordentlich.',
        total + ' Punkte von ' + playerName + '. Stabiler Besuch am Board.'
      ],
      miss: [
        playerName + ' lässt diese Aufnahme lieber unverzinst liegen.',
        'Diesmal wenig Zählbares von ' + playerName + '.'
      ],
      normal: [
        playerName + ' wirft ' + total + '. Rest ' + rest + '.',
        total + ' Punkte für ' + playerName + '. Läuft weiter.'
      ],
      idle: [
        playerName + ' ist wieder dran. Ärmel hoch und sauber durchziehen.',
        'Kurze Denkpause, dann darf ' + playerName + ' wieder arbeiten.'
      ]
    },
    coach: {
      finish: [
        playerName + ' checkt das Leg. Sehr konzentriert gelöst.',
        playerName + ' macht das Leg zu. Ruhig und kontrolliert.'
      ],
      bust: [
        playerName + ' überwirft sich. Neu sammeln, weiter geht es.',
        'Bust von ' + playerName + '. Fokus halten für die nächste Aufnahme.'
      ],
      perfect: [
        playerName + ' mit 180. Exzellente Kontrolle.',
        '180 von ' + playerName + '. Sehr stark umgesetzt.'
      ],
      highscore: [
        total + ' Punkte von ' + playerName + '. Das war eine starke Aufnahme.',
        playerName + ' setzt ' + total + '. Sehr guter Rhythmus.'
      ],
      checkout: [
        playerName + ' steht auf ' + rest + '. Der Checkout lautet ' + checkout + '.',
        rest + ' Rest für ' + playerName + '. Gute Chance über ' + checkout + '.'
      ],
      strong: [
        playerName + ' nimmt ' + total + ' Punkte mit. Das hilft.',
        total + ' Punkte von ' + playerName + '. Sauber gearbeitet.'
      ],
      miss: [
        playerName + ' bleibt diesmal ohne zählbaren Ertrag.',
        'Keine Wirkung in dieser Aufnahme. Nächste Chance für ' + playerName + '.'
      ],
      normal: [
        playerName + ' erzielt ' + total + '. Rest ' + rest + '.',
        total + ' Punkte für ' + playerName + '. Konzentration bleibt wichtig.'
      ],
      idle: [
        playerName + ' bereitet die nächste Aufnahme vor. Ruhig bleiben.',
        playerName + ' ist wieder dran. Fokus auf den ersten Dart.'
      ]
    }
  };

  var personaSet = variants[personaId] || variants.showman;
  var pool = personaSet[eventType] || personaSet.normal;
  return randomFrom(pool);
}

function sanitizeAiText(text, fallback) {
  var cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  if (cleaned.length > 200) return fallback;
  // Entferne typische LLM-Artefakte
  cleaned = cleaned.replace(/^(Sure|Of course|Certainly|Here is|Here's)[^:]*:/i, '').trim();
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  if (!cleaned) return fallback;
  return cleaned;
}

function buildAiPrompt(persona, context, eventType) {
  var toneMap = {
    finish: 'FEIERE diesen Moment maximal. Leg gewonnen!',
    bust: 'Bust passiert. Reagiere kurz und trocken.',
    perfect: '180er! Maximale Begeisterung.',
    highscore: 'Starke Aufnahme. Anerkennend kommentieren.',
    checkout: 'Checkout-Chance. Weise kurz auf den Weg hin.',
    strong: 'Solide Aufnahme. Sehr kurzer Kommentar.',
    miss: 'Kein Treffer. Nüchterne kurze Reaktion.',
    normal: 'Normale Aufnahme. Ein Satz reicht.',
    idle: 'Kurze Pause im Spiel. Leichter Kommentar.'
  };

  var tone = toneMap[eventType] || toneMap.normal;

  var lines = [
    'AUFGABE: Genau einen deutschen Dart-Moderationssatz sprechen.',
    '',
    'DEIN STIL: ' + persona.promptStyle,
    'TONFALL: ' + tone,
    '',
    'REGELN:',
    '- Genau EIN Satz auf Deutsch.',
    '- Maximal 12 Wörter.',
    '- Kein Markdown, keine Emojis, keine Sonderzeichen.',
    '- Starte sofort mit dem Satz. Keine Einleitung.',
    '- Kein "Ich sage" oder "Als Moderator".',
    '',
    'SPIELSITUATION:',
    'Spieler: ' + context.playerName,
    'Punkte: ' + context.total,
    'Rest: ' + context.rest,
    'Ereignis: ' + eventType
  ];

  if (context.bust) lines.push('BUST - zu viele Punkte!');
  if (context.wonLeg) lines.push('LEG GEWONNEN!');
  if (context.checkout) lines.push('Checkout-Weg: ' + context.checkout);

  lines.push('');
  lines.push('SATZ:');

  return lines.join('\n');
}

export async function createModerationLine(options) {
  var engine = options.engine;
  var memory = options.memory;
  var context = options.context;
  var useAI = options.useAI !== false;
  var personaId = options.personaId || 'showman';
  var speechState = options.speechState || { speaking: false, queued: 0 };
  var cooldowns = options.cooldowns || { blockNormal: false };

  var persona = getPersonaProfile(personaId);
  var eventType = classifyEvent(context);
  var priority = EVENT_PRIORITY[eventType] || 'normal';

  var speakNow = shouldSpeak({
    eventType: eventType,
    speechState: speechState,
    cooldowns: cooldowns
  });

  if (!speakNow) {
    return {
      text: '',
      eventType: eventType,
      skipped: true,
      source: 'none',
      priority: priority,
      persona: persona
    };
  }

  var fallback = buildPersonaRuleText(
    persona, eventType,
    context.playerName, context.total,
    context.rest, context.checkout
  );

  function saveToMemory(text, source) {
    memory.lastSpokenAt = Date.now();
    memory.lastEventType = eventType;
    memory.recentMessages.unshift({
      type: eventType,
      text: text,
      at: memory.lastSpokenAt,
      source: source
    });
    memory.recentMessages = memory.recentMessages.slice(0, 10);
  }

  // KI nicht verfügbar
  if (!useAI || !engine) {
    saveToMemory(fallback, 'rules');
    return {
      text: fallback,
      eventType: eventType,
      skipped: false,
      source: 'rules',
      priority: priority,
      persona: persona
    };
  }

  // TTS spricht gerade + kein kritisches Event → Regeltext
  if (speechState.speaking &&
      eventType !== 'finish' &&
      eventType !== 'perfect' &&
      eventType !== 'bust') {
    saveToMemory(fallback, 'rules');
    return {
      text: fallback,
      eventType: eventType,
      skipped: false,
      source: 'rules',
      priority: priority,
      persona: persona
    };
  }

  // fastGame + kein Highlight → Regeltext
  if (context.fastGame &&
      eventType !== 'finish' &&
      eventType !== 'perfect' &&
      eventType !== 'bust' &&
      eventType !== 'highscore' &&
      eventType !== 'checkout') {
    saveToMemory(fallback, 'rules');
    return {
      text: fallback,
      eventType: eventType,
      skipped: false,
      source: 'rules',
      priority: priority,
      persona: persona
    };
  }

  // KI aufrufen
  try {
    var prompt = buildAiPrompt(persona, context, eventType);

    var temperature = Math.min(0.95, 0.5 + persona.humorLevel * 0.45);

    var reply = await engine.chat.completions.create({
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: temperature,
      max_tokens: 60
    });

    var rawText = '';
    if (reply && reply.choices && reply.choices[0] &&
        reply.choices[0].message && reply.choices[0].message.content) {
      rawText = reply.choices[0].message.content;
    }

    var text = sanitizeAiText(rawText, fallback);

    saveToMemory(text, 'ai');

    return {
      text: text,
      eventType: eventType,
      skipped: false,
      source: 'ai',
      priority: priority,
      persona: persona
    };

  } catch (error) {
    var errMsg = String(error && error.message ? error.message : error);
    console.warn('AI generation failed:', errMsg);

    saveToMemory(fallback, 'rules');

    return {
      text: fallback,
      eventType: eventType,
      skipped: false,
      source: 'rules',
      priority: priority,
      persona: persona,
      error: errMsg
    };
  }
}

export function createIdleModeration(options) {
  var memory = options.memory;
  var currentPlayerName = options.currentPlayerName;
  var secondsSinceLastInput = options.secondsSinceLastInput;
  var speechState = options.speechState || { speaking: false, queued: 0 };
  var personaId = options.personaId || 'showman';

  if (secondsSinceLastInput < 18) return '';
  if (memory.idleTriggered) return '';
  if (speechState.speaking || speechState.queued > 0) return '';

  var persona = getPersonaProfile(personaId);

  memory.idleTriggered = true;
  memory.lastSpokenAt = Date.now();
  memory.lastEventType = 'idle';

  var text = buildPersonaRuleText(
    persona, 'idle',
    currentPlayerName, 0, 0, ''
  );

  memory.recentMessages.unshift({
    type: 'idle',
    text: text,
    at: memory.lastSpokenAt,
    source: 'rules'
  });
  memory.recentMessages = memory.recentMessages.slice(0, 10);

  return text;
}
