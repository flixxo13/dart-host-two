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
  secondsSinceLastInput,
  fastGame,
  speechState,
  cooldowns
}) {
  if (eventType === 'finish' || eventType === 'perfect') return true;
  if (eventType === 'checkout') return true;
  if (eventType === 'bust' && !speechState.speaking) return true;

  if (speechState.speaking && eventType !== 'finish' && eventType !== 'perfect') {
    return false;
  }

  if (fastGame) {
    return eventType === 'highscore' || eventType === 'checkout';
  }

  if (secondsSinceLastInput >= 12) return true;
  if (cooldowns.blockNormal && eventType === 'normal') return false;

  return eventType !== 'normal';
}

function randomFrom(list = []) {
  if (!list.length) return '';
  return list[Math.floor(Math.random() * list.length)];
}

function buildPersonaRuleText({ persona, eventType, playerName, total, rest, checkout }) {
  const personaId = persona.id;

  const variants = {
    classic: {
      finish: [
        `${playerName} checkt das Leg. Sehr sauber gespielt.`,
        `${playerName} macht das Leg zu. Starkes Finish.`
      ],
      bust: [
        `${playerName} überwirft sich. Bust.`,
        `Bust von ${playerName}. Die Aufnahme zählt nicht.`
      ],
      perfect: [
        `${playerName} mit 180. Exzellente Aufnahme.`,
        `180 von ${playerName}. Höchste Qualität am Board.`
      ],
      highscore: [
        `${playerName} erzielt starke ${total} Punkte.`,
        `${total} Punkte von ${playerName}. Sehr gute Aufnahme.`
      ],
      checkout: [
        `${playerName} steht auf ${rest}. Checkout über ${checkout}.`,
        `${rest} Rest für ${playerName}. Der Checkout ist gestellt: ${checkout}.`
      ],
      strong: [
        `${playerName} bringt ${total} Punkte ans Board.`,
        `${total} Punkte von ${playerName}. Solide Arbeit.`
      ],
      miss: [
        `${playerName} bleibt in dieser Aufnahme ohne Wirkung.`,
        `Keine zählbaren Treffer von ${playerName} in dieser Runde.`
      ],
      normal: [
        `${playerName} wirft ${total}. Rest ${rest}.`,
        `${total} Punkte für ${playerName}. Rest ${rest}.`
      ],
      idle: [
        `${playerName} ist wieder am Oche. Ruhe bewahren, sauber werfen.`,
        `${playerName} macht sich bereit. Die nächste Aufnahme folgt.`
      ]
    },

    showman: {
      finish: [
        `${playerName} macht den Laden zu. Was für ein Finish.`,
        `${playerName} checkt das Leg. Genau im richtigen Moment.`
      ],
      bust: [
        `${playerName} geht drüber. Bust, und das tut weh.`,
        `Bust von ${playerName}. Da war etwas zu viel Mut dabei.`
      ],
      perfect: [
        `${playerName} zündet die 180. Ganz großes Kino.`,
        `180 von ${playerName}. Das Board hat gerade gebrannt.`
      ],
      highscore: [
        `${total} Punkte von ${playerName}. Da ist richtig Zug drauf.`,
        `${playerName} räumt groß ab mit ${total} Punkten.`
      ],
      checkout: [
        `${playerName} steht auf ${rest}. Der Checkout-Weg ist ${checkout}.`,
        `${rest} Rest für ${playerName}. Das riecht nach Finish: ${checkout}.`
      ],
      strong: [
        `${playerName} bringt starke ${total} ans Board.`,
        `${total} Punkte von ${playerName}. Das war wichtig.`
      ],
      miss: [
        `${playerName} erwischt diesmal keinen brauchbaren Rhythmus.`,
        `Eine stille Aufnahme von ${playerName}.`
      ],
      normal: [
        `${playerName} nimmt ${total} mit. Rest ${rest}.`,
        `${total} Punkte für ${playerName}. Das Match bleibt in Bewegung.`
      ],
      idle: [
        `${playerName} ist wieder dran. Vielleicht kommt jetzt der Besuch im Triple.`,
        `Kurze Ruhe, gleich geht es weiter mit ${playerName}.`
      ]
    },

    pub: {
      finish: [
        `${playerName} macht den Sack zu. Feierabend am Board.`,
        `${playerName} checkt das Leg. Kurz, trocken, erledigt.`
      ],
      bust: [
        `${playerName} geht drüber. Klassischer Bust.`,
        `Bust von ${playerName}. Da wollte der Dart etwas zu viel.`
      ],
      perfect: [
        `${playerName} mit 180. Da klatscht sogar das Bierglas.`,
        `180 von ${playerName}. Brett heiß, Hand locker.`
      ],
      highscore: [
        `${playerName} haut ${total} rein. Das kann man so machen.`,
        `${total} Punkte von ${playerName}. Da nickt selbst der Gegner.`
      ],
      checkout: [
        `${playerName} steht auf ${rest}. Weg zumachen über ${checkout}.`,
        `${rest} Rest für ${playerName}. Jetzt wird es interessant: ${checkout}.`
      ],
      strong: [
        `${playerName} nimmt ${total} mit. Passt schon ordentlich.`,
        `${total} Punkte von ${playerName}. Stabiler Besuch am Board.`
      ],
      miss: [
        `${playerName} lässt diese Aufnahme lieber unverzinst liegen.`,
        `Diesmal wenig Zählbares von ${playerName}.`
      ],
      normal: [
        `${playerName} wirft ${total}. Rest ${rest}.`,
        `${total} Punkte für ${playerName}. Läuft weiter.`
      ],
      idle: [
        `${playerName} ist wieder dran. Ärmel hoch und sauber durchziehen.`,
        `Kurze Denkpause, dann darf ${playerName} wieder arbeiten.`
      ]
    },

    coach: {
      finish: [
        `${playerName} checkt das Leg. Sehr konzentriert gelöst.`,
        `${playerName} macht das Leg zu. Ruhig und kontrolliert.`
      ],
      bust: [
        `${playerName} überwirft sich. Neu sammeln, weiter geht's.`,
        `Bust von ${playerName}. Fokus halten für die nächste Aufnahme.`
      ],
      perfect: [
        `${playerName} mit 180. Exzellente Kontrolle.`,
        `180 von ${playerName}. Sehr stark umgesetzt.`
      ],
      highscore: [
        `${total} Punkte von ${playerName}. Das war eine starke Aufnahme.`,
        `${playerName} setzt ${total}. Sehr guter Rhythmus.`
      ],
      checkout: [
        `${playerName} steht auf ${rest}. Der Checkout lautet ${checkout}.`,
        `${rest} Rest für ${playerName}. Gute Chance über ${checkout}.`
      ],
      strong: [
        `${playerName} nimmt ${total} Punkte mit. Das hilft.`,
        `${total} Punkte von ${playerName}. Sauber gearbeitet.`
      ],
      miss: [
        `${playerName} bleibt diesmal ohne zählbaren Ertrag.`,
        `Keine Wirkung in dieser Aufnahme. Nächste Chance für ${playerName}.`
      ],
      normal: [
        `${playerName} erzielt ${total}. Rest ${rest}.`,
        `${total} Punkte für ${playerName}. Konzentration bleibt wichtig.`
      ],
      idle: [
        `${playerName} bereitet die nächste Aufnahme vor. Ruhig bleiben.`,
        `${playerName} ist wieder dran. Fokus auf den ersten Dart.`
      ]
    }
  };

  const personaSet = variants[personaId] || variants.showman;
  const pool = personaSet[eventType] || personaSet.normal;
  return randomFrom(pool);
}

function sanitizeAiText(text, fallback) {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return fallback;
  if (cleaned.length > 180) return fallback;
  return cleaned;
}

function buildAiPrompt({ persona, context, eventType }) {
  return `
Du bist ein deutscher Dart-Moderator.
Dein Stil ist: ${persona.promptStyle}.
Humor-Level: ${persona.humorLevel}
Energie-Level: ${persona.energyLevel}
Frechheit-Level: ${persona.sassLevel}
Satzlänge: ${persona.verbosity}

Regeln:
- Antworte auf Deutsch.
- Nur genau ein Satz.
- Maximal 16 Wörter.
- Kein Markdown.
- Keine Emojis.
- Keine Aufzählungen.
- Kein Rollenspiel-Hinweis.
- Keine Erklärung deiner Entscheidung.

Kontext:
Spieler: ${context.playerName}
Wurf gesamt: ${context.total}
Rest: ${context.rest}
Ereignis: ${eventType}
Rundennummer: ${context.turnNumber}
Bust: ${context.bust ? 'ja' : 'nein'}
Leg gewonnen: ${context.wonLeg ? 'ja' : 'nein'}
Checkout-Vorschlag: ${context.checkout || 'keiner'}

Formuliere jetzt genau einen passenden Moderationssatz.
  `.trim();
}

export async function createModerationLine({
  engine,
  memory,
  context,
  useAI = true,
  personaId = 'showman',
  speechState = { speaking: false, queued: 0 },
  cooldowns = { blockNormal: false }
}) {
  const persona = getPersonaProfile(personaId);
  const eventType = classifyEvent(context);

  const speakNow = shouldSpeak({
    eventType,
    secondsSinceLastInput: context.secondsSinceLastInput,
    fastGame: context.fastGame,
    speechState,
    cooldowns
  });

  if (!speakNow) {
    return {
      text: '',
      eventType,
      skipped: true,
      source: 'none',
      priority: EVENT_PRIORITY[eventType] || 'normal',
      persona
    };
  }

  const fallback = buildPersonaRuleText({
    persona,
    eventType,
    playerName: context.playerName,
    total: context.total,
    rest: context.rest,
    checkout: context.checkout
  });

  const priority = EVENT_PRIORITY[eventType] || 'normal';

  if (!useAI || !engine || context.fastGame || speechState.speaking) {
    memory.lastSpokenAt = Date.now();
    memory.lastEventType = eventType;
    memory.recentMessages.unshift({
      type: eventType,
      text: fallback,
      at: memory.lastSpokenAt,
      source: 'rules'
    });
    memory.recentMessages = memory.recentMessages.slice(0, 10);

    return {
      text: fallback,
      eventType,
      skipped: false,
      source: 'rules',
      priority,
      persona
    };
  }

  try {
    const prompt = buildAiPrompt({
      persona,
      context,
      eventType
    });

    const reply = await engine.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: Math.min(0.95, 0.45 + persona.humorLevel * 0.4)
    });

    const rawText = reply?.choices?.[0]?.message?.content ?? '';
    const text = sanitizeAiText(rawText, fallback);

    memory.lastSpokenAt = Date.now();
    memory.lastEventType = eventType;
    memory.recentMessages.unshift({
      type: eventType,
      text,
      at: memory.lastSpokenAt,
      source: 'ai'
    });
    memory.recentMessages = memory.recentMessages.slice(0, 10);

    return {
      text,
      eventType,
      skipped: false,
      source: 'ai',
      priority,
      persona
    };
  } catch (error) {
    memory.lastSpokenAt = Date.now();
    memory.lastEventType = eventType;
    memory.recentMessages.unshift({
      type: eventType,
      text: fallback,
      at: memory.lastSpokenAt,
      source: 'rules',
      error: String(error)
    });
    memory.recentMessages = memory.recentMessages.slice(0, 10);

    return {
      text: fallback,
      eventType,
      skipped: false,
      source: 'rules',
      priority,
      persona,
      error: String(error)
    };
  }
}

export function createIdleModeration({
  memory,
  currentPlayerName,
  secondsSinceLastInput,
  speechState,
  personaId = 'showman'
}) {
  if (secondsSinceLastInput < 18) return '';
  if (memory.idleTriggered) return '';
  if (speechState.speaking || speechState.queued > 0) return '';

  const persona = getPersonaProfile(personaId);

  memory.idleTriggered = true;
  memory.lastSpokenAt = Date.now();
  memory.lastEventType = 'idle';

  const text = buildPersonaRuleText({
    persona,
    eventType: 'idle',
    playerName: currentPlayerName,
    total: 0,
    rest: 0,
    checkout: ''
  });

  memory.recentMessages.unshift({
    type: 'idle',
    text,
    at: memory.lastSpokenAt,
    source: 'rules'
  });
  memory.recentMessages = memory.recentMessages.slice(0, 10);

  return text;
}
