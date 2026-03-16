export const PERSONAS = {
  classic: {
    id: 'classic',
    label: 'Classic',
    promptStyle: 'seriös, sportlich, ruhig, professionell',
    humorLevel: 0.2,
    energyLevel: 0.4,
    sassLevel: 0.1,
    speechRate: 0.96,
    speechPitch: 0.95,
    useShortPhrases: true
  },
  showman: {
    id: 'showman',
    label: 'Showman',
    promptStyle: 'charismatisch, publikumsnah, dynamisch, lebendig',
    humorLevel: 0.6,
    energyLevel: 0.85,
    sassLevel: 0.35,
    speechRate: 1.03,
    speechPitch: 1.02,
    useShortPhrases: true
  },
  pub: {
    id: 'pub',
    label: 'Pub',
    promptStyle: 'locker, frech, bodenständig, mit Kneipenhumor',
    humorLevel: 0.85,
    energyLevel: 0.7,
    sassLevel: 0.7,
    speechRate: 1.01,
    speechPitch: 1.0,
    useShortPhrases: true
  },
  coach: {
    id: 'coach',
    label: 'Coach',
    promptStyle: 'ruhig, positiv, unterstützend, fokussiert',
    humorLevel: 0.15,
    energyLevel: 0.35,
    sassLevel: 0.05,
    speechRate: 0.94,
    speechPitch: 0.96,
    useShortPhrases: true
  }
};

export function getPersonaProfile(personaId) {
  return PERSONAS[personaId] || PERSONAS.showman;
}
