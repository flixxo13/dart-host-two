export function translateDartThrow(label) {
  if (!label) return '';
  if (label === 'MISS') return 'daneben';
  if (label === 'BULL') return 'Bullseye';
  if (label === '25') return 'äußeres Bull';
  if (label.startsWith('T')) return `Triple ${label.slice(1)}`;
  if (label.startsWith('D')) return `Doppel ${label.slice(1)}`;
  if (label.startsWith('S')) return `Single ${label.slice(1)}`;
  return label;
}

export function translateRound(round) {
  if (!round || round.length === 0) return '';
  return round.map((dart) => translateDartThrow(dart.label)).join(', ');
}
