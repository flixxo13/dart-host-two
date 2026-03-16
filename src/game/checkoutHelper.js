const checkouts = {
  170: 'T20, T20, Bull',
  167: 'T20, T19, Bull',
  164: 'T20, T18, Bull',
  161: 'T20, T17, Bull',
  160: 'T20, T20, D20',
  158: 'T20, T20, D19',
  157: 'T20, T19, D20',
  156: 'T20, T20, D18',
  155: 'T20, T19, D19',
  154: 'T20, T18, D20',
  152: 'T20, T20, D16',
  151: 'T20, T17, D20',
  150: 'T20, T18, D18',
  132: 'Bull, T14, D20',
  121: 'T20, 11, Bull',
  120: '20, T20, D20',
  116: 'T20, 16, D20',
  110: 'T20, 10, D20',
  108: 'T20, 16, D16',
  100: 'T20, D20',
  96: 'T20, D18',
  90: 'T18, D18',
  86: 'T18, D16',
  81: 'T19, D12',
  80: 'T20, D10',
  72: '16, D18',
  64: '16, D24 oder T16, D8',
  60: '20, D20',
  56: '16, D20',
  50: 'Bull',
  40: 'D20',
  32: 'D16',
  24: 'D12',
  16: 'D8',
  8: 'D4',
  4: 'D2',
  2: 'D1'
};

export function getCheckoutSuggestion(score) {
  if (score > 170 || score < 2) return null;
  return checkouts[score] || null;
}

export function isDoubleOutImpossible(score) {
  return score === 1 || score > 170;
}
