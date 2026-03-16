import { classifyEvent, shouldSpeak, buildRuleBasedLine, buildIdleLine } from './commentaryRules';
    import { rememberMessage } from './commentaryMemory';

    export async function createModerationLine({
      engine,
      memory,
      context,
      useAI = true,
    }) {
      const eventType = classifyEvent(context);
      const speakNow = shouldSpeak({
        eventType,
        secondsSinceLastInput: context.secondsSinceLastInput,
        fastGame: context.fastGame,
      });

      if (!speakNow) {
        return { text: '', eventType, skipped: true };
      }

      const fallback = buildRuleBasedLine({ ...context, eventType });

      if (!useAI || !engine || context.fastGame) {
        rememberMessage(memory, eventType, fallback);
        return { text: fallback, eventType, skipped: false, source: 'rules' };
      }

      try {
        const prompt = [
          'Du bist ein charismatischer deutscher Dart-Caller.',
          'Sprich kurz, pointiert, sympathisch und leicht humorvoll.',
          'Keine langen Sätze. Maximal 14 Wörter.',
          'Keine Hashtags, keine Emojis, keine Erklärungen.',
          `Spieler: ${context.playerName}`,
          `Wurf gesamt: ${context.total}`,
          `Rest: ${context.rest}`,
          `Ereignis: ${eventType}`,
          `Runde: ${context.turnNumber}`,
          `Aktiver Spieler: ${context.playerName}`,
          context.checkout ? `Checkout-Vorschlag: ${context.checkout}` : '',
          context.bust ? 'Bust ist eingetreten.' : '',
          context.wonLeg ? 'Der Spieler hat das Leg gewonnen.' : '',
          'Antworte nur mit einem einzigen Satz auf Deutsch.'
        ].filter(Boolean).join('
');

        const reply = await engine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
        });

        const text = reply?.choices?.[0]?.message?.content?.trim() || fallback;
        rememberMessage(memory, eventType, text);
        return { text, eventType, skipped: false, source: 'ai' };
      } catch (error) {
        rememberMessage(memory, eventType, fallback);
        return { text: fallback, eventType, skipped: false, source: 'rules', error: String(error) };
      }
    }

    export function createIdleModeration({ memory, currentPlayerName, secondsSinceLastInput }) {
      if (secondsSinceLastInput < 20 || memory.idleTriggered) return '';
      memory.idleTriggered = true;
      const text = buildIdleLine(currentPlayerName);
      rememberMessage(memory, 'idle', text);
      return text;
    }
