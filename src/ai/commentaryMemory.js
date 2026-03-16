export function createCommentaryMemory() {
  return {
    lastSpokenAt: 0,
    lastEventType: null,
    recentMessages: [],
    idleTriggered: false,
  };
}

export function rememberMessage(memory, type, text) {
  memory.lastSpokenAt = Date.now();
  memory.lastEventType = type;
  memory.idleTriggered = false;
  memory.recentMessages.unshift({ type, text, at: memory.lastSpokenAt });
  memory.recentMessages = memory.recentMessages.slice(0, 8);
  return memory;
}
