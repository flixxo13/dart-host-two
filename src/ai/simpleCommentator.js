export function simpleCommentary(round, scoreBefore, scoreAfter) {
  if (!round || round.length === 0) return '';

  const sum = round.reduce((acc, dart) => acc + dart.value, 0);

  if (sum === 180) return 'Drei perfekte Darts. Einhundertachtzig Punkte.';
  if (scoreAfter === 0) return 'Der Spieler gewinnt dieses Leg.';
  if (sum >= 140) return `Sehr starke Runde mit ${sum} Punkten.`;
  if (sum >= 100) return `Starke Aufnahme mit ${sum} Punkten.`;
  if (sum === 0) return 'Leider kein zählbarer Treffer in dieser Runde.';
  if (scoreBefore - sum < 0 || scoreBefore - sum === 1) return 'Das war ein Bust.';

  return `Der Spieler erzielt ${sum} Punkte.`;
}
