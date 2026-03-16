export function classifyEvent({ total, bust, wonLeg, highscore, checkout }) {
  if (wonLeg) return 'finish';
  if (bust) return 'bust';
  if (highscore === '180') return 'perfect';
  if (highscore === '140+') return 'highscore';
  if (checkout) return 'checkout';
  if (total === 0) return 'miss';
  if (total >= 100) return 'strong';
  return 'normal';
}

export function shouldSpeak({ eventType, secondsSinceLastInput, fastGame }) {
  if (['finish', 'bust', 'perfect', 'checkout'].includes(eventType)) return true;
  if (fastGame) return ['highscore', 'strong'].includes(eventType);
  if (secondsSinceLastInput >= 18) return true;
  return eventType !== 'normal' || secondsSinceLastInput >= 8;
}

export function buildRuleBasedLine(ctx) {
  const { playerName, total, rest, eventType, checkout } = ctx;

  const lines = {
    finish: [
      `${playerName} macht das Leg zu. Starkes Finish.`,
      `${playerName} checkt aus. Das ist das Leg.`,
    ],
    bust: [
      `${playerName} überwirft sich. Bust.`,
      `Bust von ${playerName}. Das war zu viel Risiko.`,
    ],
    perfect: [
      `${playerName} mit 180. Ganz großes Kino am Board.`,
      `180 von ${playerName}. Das Publikum steht innerlich schon auf.`,
    ],
    highscore: [
      `${playerName} räumt groß ab mit ${total} Punkten.`,
      `${total} Punkte von ${playerName}. Richtig starke Aufnahme.`,
    ],
    checkout: [
      `${playerName} steht auf ${rest}. Checkout-Chance: ${checkout}.`,
      `${playerName} hat ${rest} Rest. Der Weg ist klar: ${checkout}.`,
    ],
    strong: [
      `${playerName} bringt ${total} Punkte ans Board.`,
      `${total} Punkte von ${playerName}. Solide und wichtig.`,
    ],
    miss: [
      `${playerName} bleibt diesmal ohne Wirkung.`,
      `Eine ruhige Aufnahme von ${playerName}. Weiter geht's.`,
    ],
    normal: [
      `${playerName} wirft ${total}. Rest ${rest}.`,
      `${total} Punkte für ${playerName}. Rest ${rest}.`,
    ],
  };

  const pool = lines[eventType] || lines.normal;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function buildIdleLine(currentPlayerName) {
  const pool = [
    `${currentPlayerName} ist wieder dran. Konzentration hoch, Schultern locker.`,
    `Kurze Ruhephase am Oche. ${currentPlayerName} darf jetzt nachlegen.`,
    `${currentPlayerName} steht bereit. Vielleicht kommt jetzt der schöne Besuch im Triplefeld.`,
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}
