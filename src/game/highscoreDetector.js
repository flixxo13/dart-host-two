export function detectHighscore(round) {
  if (!round || round.length === 0) return null;
  const sum = round.reduce((acc, dart) => acc + dart.value, 0);
  if (sum === 180) return '180';
  if (sum >= 140) return '140+';
  if (sum >= 100) return '100+';
  return null;
}
