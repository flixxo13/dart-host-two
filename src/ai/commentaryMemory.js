export function createCommentaryMemory() {
  return {
    lastSpokenAt: 0,
    lastEventType: null,
    recentMessages: [],
    idleTriggered: false,
    lastPlayerName: null,
    lastPersonaId: null,
    lastDecisionSource: null
  };
}

export function rememberMessage(memory, type, text, extra = {}) {
  const timestamp = Date.now();

  memory.lastSpokenAt = timestamp;
  memory.lastEventType = type;
  memory.idleTriggered = false;
  memory.lastPlayerName = extra.playerName || memory.lastPlayerName || null;
  memory.lastPersonaId = extra.personaId || memory.lastPersonaId || null;
  memory.lastDecisionSource = extra.source || memory.lastDecisionSource || null;

  memory.recentMessages.unshift({
    type,
    text,
    at: timestamp,
    ...extra
  });

  memory.recentMessages = memory.recentMessages.slice(0, 12);
  return memory;
}
