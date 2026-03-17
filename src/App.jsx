import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as webllm from '@mlc-ai/web-llm';
import { translateRound } from './utils/dartTranslator';
import { simpleCommentary } from './ai/simpleCommentator';
import { detectHighscore } from './game/highscoreDetector';
import { getCheckoutSuggestion } from './game/checkoutHelper';
import { createCommentaryMemory } from './ai/commentaryMemory';
import { createModerationLine, createIdleModeration } from './ai/moderationEngine';
import {
  enqueueSpeech,
  getSpeechState,
  warmupVoices,
  clearSpeechQueue
} from './utils/ttsEngine';
import { getPersonaProfile, getPersonaOptions } from './ai/personaProfiles';
import DebugPanel from './debug/DebugPanel';

/* ─────────────── DESIGN SYSTEM ─────────────── */
const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  primary: '#30D158',
  text: '#FFFFFF',
  textMuted: '#94A3B8',
  danger: '#EF4444',
  accent: '#3B82F6',
  warning: '#F59E0B'
};

const SELECTED_MODEL = 'Gemma-2b-it-q4f16_1-MLC';

export default function App() {

  /* ─────────────── KI STATE ─────────────── */
  const [engine, setEngine] = useState(null);
  const [loadingAI, setLoadingAI] = useState(true);
  const [loadProgress, setLoadProgress] = useState('System-Check...');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiStatus, setAiStatus] = useState('loading');
  const [webGpuAvailable, setWebGpuAvailable] = useState(false);

  /* ─────────────── SETUP STATE ─────────────── */
  const [phase, setPhase] = useState('setup');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState([]);
  const [gameMode, setGameMode] = useState(501);

  /* ─────────────── GAME STATE ─────────────── */
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentRound, setCurrentRound] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [comment, setComment] = useState('Willkommen beim Match!');
  const [showTV, setShowTV] = useState(false);
  const [lastStats, setLastStats] = useState({ total: 0, rest: 0, name: '' });
  const [lastInputAt, setLastInputAt] = useState(Date.now());

  /* ─────────────── MODERATION STATE ─────────────── */
  const [moderationMode, setModerationMode] = useState('auto');
  const [personaId, setPersonaId] = useState('showman');

  /* ─────────────── DEBUG STATE ─────────────── */
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    source: '-',
    eventType: '-',
    priority: '-',
    persona: '-',
    skipped: false,
    error: null
  });
  const [commentaryLog, setCommentaryLog] = useState([]);
  const [liveSpeechState, setLiveSpeechState] = useState({
    speaking: false,
    queued: 0
  });

  /* ─────────────── REFS ─────────────── */
  const memoryRef = useRef(createCommentaryMemory());

  /* ─────────────── VOICES WARMUP ─────────────── */
  useEffect(() => {
    warmupVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => warmupVoices();
    }
  }, []);

  /* ─────────────── SPEECH STATE POLLING ─────────────── */
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSpeechState(getSpeechState());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  /* ─────────────── KI INITIALISIERUNG ─────────────── */
  useEffect(() => {
    async function initAI() {
      const gpuAvailable = !!navigator.gpu;
      setWebGpuAvailable(gpuAvailable);

      try {
        if (!gpuAvailable) throw new Error('WebGPU nicht verfügbar');

        const worker = new Worker(
          new URL('./ai-worker.js', import.meta.url),
          { type: 'module' }
        );

        const engineInstance = await webllm.CreateWebWorkerMLCEngine(
          worker,
          SELECTED_MODEL,
          {
            initProgressCallback: (p) =>
              setLoadProgress(
                `Gehirn wird geladen: ${Math.round(p.progress * 100)}%`
              )
          }
        );

        setEngine(engineInstance);
        setLoadingAI(false);
        setAiStatus('active');
      } catch (error) {
        console.error('AI init failed:', error);
        setLoadingAI(false);
        setAiEnabled(false);
        setAiStatus(navigator.gpu ? 'error' : 'fallback');
        setComment('Offline-Regeln aktiv. KI konnte nicht geladen werden.');
      }
    }

    initAI();
  }, []);

  /* ─────────────── IDLE MODERATION ─────────────── */
  useEffect(() => {
    if (phase !== 'playing' || players.length === 0) return;

    const interval = setInterval(() => {
      const secondsSinceLastInput = Math.floor(
        (Date.now() - lastInputAt) / 1000
      );
      const speechState = getSpeechState();

      const line = createIdleModeration({
        memory: memoryRef.current,
        currentPlayerName: players[currentPlayerIdx]?.name || 'Der Spieler',
        secondsSinceLastInput,
        speechState,
        personaId
      });

      if (line) {
        const persona = getPersonaProfile(personaId);

        setComment(line);
        setDebugInfo({
          source: 'rules',
          eventType: 'idle',
          priority: 'low',
          persona: persona.label,
          skipped: false,
          error: null
        });

        setCommentaryLog((prev) => {
          const entry = {
            type: 'idle',
            text: line,
            at: Date.now(),
            source: 'rules',
            priority: 'low',
            persona: persona.label,
            skipped: false
          };
          return [entry, ...prev].slice(0, 20);
        });

        enqueueSpeech({
          text: line,
          priority: 'low',
          interrupt: false,
          dedupeKey: 'idle_' + (players[currentPlayerIdx]?.name || 'player'),
          rate: persona.tts.rate,
          pitch: persona.tts.pitch,
          volume: persona.tts.volume,
          voiceName: persona.tts.voiceName
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [phase, players, currentPlayerIdx, lastInputAt, personaId]);

  /* ─────────────── COMPUTED ─────────────── */
  const currentPlayer = players[currentPlayerIdx];

  const currentTotal = useMemo(() => {
    return currentRound.reduce((sum, dart) => sum + dart.value, 0);
  }, [currentRound]);

  /* ─────────────── SPIELER HINZUFÜGEN ─────────────── */
  const addPlayer = () => {
    if (!playerName.trim() || players.length >= 4) return;

    setPlayers((prev) => [
      ...prev,
      {
        name: playerName.trim(),
        score: gameMode,
        avg: '0.0',
        dartsThrown: 0,
        turnsPlayed: 0
      }
    ]);
    setPlayerName('');
  };

  /* ─────────────── DART EINGABE ─────────────── */
  const addDart = (val) => {
    if (currentRound.length >= 3) return;

    const effectiveMultiplier = val === 25 ? 1 : multiplier;
    const score = val * effectiveMultiplier;

    const label =
      val === 0
        ? 'MISS'
        : val === 25
          ? 'BULL'
          : effectiveMultiplier === 3
            ? 'T' + val
            : effectiveMultiplier === 2
              ? 'D' + val
              : 'S' + val;

    setCurrentRound((prev) => [...prev, { value: score, label: label }]);
    setMultiplier(1);
    setLastInputAt(Date.now());
    memoryRef.current.idleTriggered = false;

    if (navigator.vibrate) navigator.vibrate(15);
  };

  /* ─────────────── UNDO ─────────────── */
  const undoLastDart = () => {
    setCurrentRound((prev) => prev.slice(0, -1));
    setLastInputAt(Date.now());
    memoryRef.current.idleTriggered = false;
  };

  /* ─────────────── RUNDE ABSCHLIESSEN ─────────────── */
  const finishRound = async () => {
    if (currentRound.length === 0 || !currentPlayer) return;

    const total = currentRound.reduce((sum, dart) => sum + dart.value, 0);
    const before = currentPlayer.score;
    const bust = before - total < 0 || before - total === 1;
    const rest = bust ? before : Math.max(0, before - total);
    const wonLeg = rest === 0;
    const highscore = detectHighscore(currentRound);
    const checkout = getCheckoutSuggestion(rest);
    const secondsSinceLastInput = Math.floor(
      (Date.now() - lastInputAt) / 1000
    );

    const fastGame =
      secondsSinceLastInput <= 4 || moderationMode === 'minimal';

    /* ── Spieler updaten ── */
    const updatedPlayers = [...players];
    const playerCopy = { ...updatedPlayers[currentPlayerIdx] };

    if (!bust) {
      playerCopy.score = rest;
    }

    playerCopy.dartsThrown += currentRound.length;
    playerCopy.turnsPlayed += 1;
    playerCopy.avg = (
      (gameMode - playerCopy.score) /
      Math.max(1, playerCopy.dartsThrown / 3)
    ).toFixed(1);

    updatedPlayers[currentPlayerIdx] = playerCopy;
    setPlayers(updatedPlayers);

    /* ── Kontext für KI ── */
    const context = {
      playerName: playerCopy.name,
      total,
      rest: playerCopy.score,
      bust,
      wonLeg,
      highscore,
      checkout,
      turnNumber: playerCopy.turnsPlayed,
      secondsSinceLastInput,
      fastGame
    };

    /* ── Einfache Textzeile ── */
    const simpleLine =
      playerCopy.name +
      ': ' +
      translateRound(currentRound) +
      '. ' +
      simpleCommentary(currentRound, before, playerCopy.score);

    /* ── Moderationsentscheidung ── */
    const speechState = getSpeechState();
    const cooldowns = {
      blockNormal:
        Date.now() - (memoryRef.current.lastSpokenAt || 0) < 2500
    };

    const moderation = await createModerationLine({
      engine,
      memory: memoryRef.current,
      context,
      useAI: aiEnabled,
      personaId,
      speechState,
      cooldowns
    });

    /* ── Finaler Kommentar ── */
    const finalComment = moderation.skipped
      ? simpleLine
      : (simpleLine + ' ' + moderation.text).trim();

    /* ── UI updaten ── */
    setComment(finalComment);

    const newDebugInfo = {
      source: moderation.source || 'none',
      eventType: moderation.eventType || '-',
      priority: moderation.priority || 'normal',
      persona: moderation.persona?.label || personaId,
      skipped: moderation.skipped || false,
      error: moderation.error || null
    };

    setDebugInfo(newDebugInfo);

    /* ── Commentary Log ── */
    setCommentaryLog((prev) => {
      const entry = {
        type: moderation.eventType || '-',
        text: moderation.skipped
          ? '(übersprungen — ' + simpleLine + ')'
          : moderation.text || finalComment,
        at: Date.now(),
        source: moderation.source || 'none',
        priority: moderation.priority || 'normal',
        persona: moderation.persona?.label || personaId,
        skipped: moderation.skipped || false,
        error: moderation.error || null
      };
      return [entry, ...prev].slice(0, 20);
    });

    /* ── Sprechen ── */
    const persona = getPersonaProfile(personaId);

    enqueueSpeech({
      text: finalComment,
      priority: moderation.priority || 'normal',
      interrupt: moderation.priority === 'critical',
      dedupeKey:
        (moderation.eventType || 'turn') +
        '_' +
        playerCopy.name +
        '_' +
        playerCopy.turnsPlayed,
      rate: persona.tts.rate,
      pitch: persona.tts.pitch,
      volume: persona.tts.volume,
      voiceName: persona.tts.voiceName
    });

    /* ── TV-Overlay ── */
    setLastStats({
      total,
      rest: playerCopy.score,
      name: playerCopy.name
    });

    setShowTV(true);
    setLastInputAt(Date.now());
    memoryRef.current.idleTriggered = false;

    setTimeout(() => {
      setShowTV(false);
      setCurrentRound([]);

      if (wonLeg) {
        clearSpeechQueue();

        const finishText =
          'Game Shot and the Leg für ' + playerCopy.name + '.';

        enqueueSpeech({
          text: finishText,
          priority: 'critical',
          interrupt: true,
          dedupeKey: 'gameshot_' + playerCopy.name,
          rate: persona.tts.rate,
          pitch: persona.tts.pitch,
          volume: persona.tts.volume,
          voiceName: persona.tts.voiceName
        });

        setComment(finishText);
        setPhase('setup');
        setPlayers([]);
        setCurrentPlayerIdx(0);
        return;
      }

      setCurrentPlayerIdx((prev) => (prev + 1) % updatedPlayers.length);
    }, 2200);
  };

  /* ─────────────── LOADING SCREEN ─────────────── */
  if (loadingAI) {
    const progressWidth = loadProgress.includes('%')
      ? loadProgress.split(':')[1].trim()
      : '8%';

    return (
      <div style={styles.screenCenter}>
        <div style={styles.logoBoxLarge}>DH</div>
        <h2
          style={{
            color: COLORS.primary,
            letterSpacing: 4,
            marginTop: 20,
            fontFamily: 'sans-serif'
          }}
        >
          DART HOST
        </h2>
        <p
          style={{
            fontSize: 11,
            color: COLORS.textMuted,
            letterSpacing: 2,
            fontFamily: 'sans-serif'
          }}
        >
          OFFLINE AI MODERATOR
        </p>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: progressWidth
            }}
          />
        </div>
        <p
          style={{
            fontSize: 13,
            color: COLORS.textMuted,
            fontFamily: 'monospace'
          }}
        >
          {loadProgress}
        </p>
        <p
          style={{
            fontSize: 11,
            color: '#334155',
            fontFamily: 'sans-serif',
            marginTop: 8
          }}
        >
          {navigator.gpu ? '✓ WebGPU erkannt' : '⚠ WebGPU nicht verfügbar'}
        </p>
      </div>
    );
  }

  /* ─────────────── SETUP SCREEN ─────────────── */
  if (phase === 'setup') {
    return (
      <div style={styles.screen}>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <h1 style={styles.setupTitle}>DART HOST</h1>
          <p style={styles.setupSubtitle}>OFFLINE AI MODERATOR</p>
        </div>

        <div style={styles.setupCard}>

          {/* Spielmodus */}
          <label style={styles.label}>SPIELMODUS</label>
          <div style={styles.row}>
            {[301, 501, 701].map((m) => (
              <button
                key={m}
                onClick={() => setGameMode(m)}
                style={{
                  ...styles.modeBtn,
                  backgroundColor:
                    gameMode === m ? COLORS.primary : COLORS.bg,
                  color: gameMode === m ? '#000' : '#fff'
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Moderation */}
          <label style={styles.label}>MODERATION</label>
          <div style={styles.row}>
            {[
              ['auto', 'AUTO'],
              ['minimal', 'MINIMAL'],
              ['showtime', 'SHOWTIME']
            ].map(function(pair) {
              var value = pair[0];
              var label = pair[1];
              return (
                <button
                  key={value}
                  onClick={() => setModerationMode(value)}
                  style={{
                    ...styles.modeBtn,
                    backgroundColor:
                      moderationMode === value ? COLORS.accent : COLORS.bg
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Persona */}
          <label style={styles.label}>PERSONA</label>
          <div style={styles.rowWrap}>
            {getPersonaOptions().map((option) => (
              <button
                key={option.value}
                onClick={() => setPersonaId(option.value)}
                style={{
                  ...styles.modeBtn,
                  flex: 'none',
                  minWidth: 110,
                  backgroundColor:
                    personaId === option.value
                      ? COLORS.warning
                      : COLORS.bg,
                  color: personaId === option.value ? '#000' : '#fff'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Spieler */}
          <label style={styles.label}>
            SPIELER ({players.length}/4)
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              style={{ ...styles.input, flex: 1 }}
              placeholder="Name eingeben..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            />
            <button onClick={addPlayer} style={styles.addPlayerBtn}>
              +
            </button>
          </div>

          <div style={styles.playerList}>
            {players.map((p, i) => (
              <div key={i} style={styles.playerTag}>
                <span>
                  0{i + 1} {p.name}
                </span>
                <button
                  onClick={() =>
                    setPlayers(players.filter((_, idx) => idx !== i))
                  }
                  style={styles.delBtn}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* KI Toggle */}
          <label
            style={{
              ...styles.label,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={() => setAiEnabled((v) => !v)}
            />
            KI-Kommentare aktivieren
            <span
              style={{
                marginLeft: 4,
                fontSize: 10,
                color:
                  aiStatus === 'active'
                    ? COLORS.primary
                    : aiStatus === 'loading'
                      ? COLORS.warning
                      : COLORS.textMuted
              }}
            >
              {aiStatus === 'active'
                ? '● WebGPU aktiv'
                : aiStatus === 'loading'
                  ? '● Lädt...'
                  : aiStatus === 'error'
                    ? '● Fehler'
                    : '● Regelbasiert'}
            </span>
          </label>

          {/* Start */}
          <button
            onClick={() => players.length > 0 && setPhase('playing')}
            style={{
              ...styles.startBtn,
              opacity: players.length > 0 ? 1 : 0.45
            }}
            disabled={players.length === 0}
          >
            {players.length > 0
              ? 'SPIEL STARTEN ▶'
              : 'SPIELER HINZUFÜGEN'}
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────── SPIEL SCREEN ─────────────── */
  return (
    <div style={styles.screen}>

      {/* TV Overlay */}
      {showTV && (
        <div style={styles.tvOverlay}>
          <div
            style={{
              color: COLORS.primary,
              fontSize: 22,
              fontWeight: 700,
              fontFamily: 'sans-serif'
            }}
          >
            {lastStats.name}
          </div>
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              fontFamily: 'sans-serif',
              lineHeight: 1
            }}
          >
            {lastStats.total}
          </div>
          <div
            style={{
              fontSize: 28,
              color: COLORS.textMuted,
              fontFamily: 'sans-serif'
            }}
          >
            REST: {lastStats.rest}
          </div>
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoBoxSmall}>DH</div>
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              fontFamily: 'sans-serif'
            }}
          >
            DART HOST
          </div>
          <div
            style={{
              fontSize: 10,
              color: COLORS.primary,
              letterSpacing: 1,
              fontFamily: 'sans-serif'
            }}
          >
            LIVE MATCH
          </div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: 12,
            alignItems: 'center'
          }}
        >
          {/* Debug Button */}
          <button
            style={{
              ...styles.iconBtn,
              color: showDebug ? COLORS.primary : COLORS.textMuted,
              fontSize: 18,
              border: showDebug
                ? '1px solid ' + COLORS.primary
                : '1px solid transparent',
              borderRadius: 8,
              padding: '4px 8px'
            }}
            onClick={() => setShowDebug((v) => !v)}
          >
            🔍
          </button>

          {/* Reset Runde */}
          <button
            style={styles.iconBtn}
            onClick={() => {
              setCurrentRound([]);
              memoryRef.current.idleTriggered = false;
            }}
          >
            ↺
          </button>

          {/* Spiel beenden */}
          <button
            style={styles.iconBtn}
            onClick={() => {
              clearSpeechQueue({ cancelCurrent: true });
              setPhase('setup');
              setPlayers([]);
              setCurrentRound([]);
              setCurrentPlayerIdx(0);
            }}
          >
            ✕
          </button>
        </div>
      </header>

      {/* Kommentar Box */}
      <div style={styles.commentBox}>
        <div style={styles.commentMetaRow}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: COLORS.primary,
              fontFamily: 'sans-serif'
            }}
          >
            HOST KOMMENTAR
          </div>
          <div style={styles.debugPill}>
            {debugInfo.persona} · {debugInfo.eventType} · {debugInfo.source} · {debugInfo.priority}
          </div>
        </div>
        <div
          style={{
            fontStyle: 'italic',
            fontSize: 15,
            fontFamily: 'sans-serif',
            lineHeight: 1.5
          }}
        >
          "{comment}"
        </div>
      </div>

      {/* Scoreboard */}
      <div style={styles.scoreboard}>
        {players.map((p, i) => (
          <div
            key={i}
            style={{
              ...styles.playerCard,
              borderLeft:
                i === currentPlayerIdx
                  ? '4px solid ' + COLORS.primary
                  : '4px solid transparent',
              opacity: i === currentPlayerIdx ? 1 : 0.5
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: COLORS.textMuted,
                fontFamily: 'sans-serif'
              }}
            >
              SPIELER {i + 1}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color:
                  i === currentPlayerIdx ? COLORS.primary : '#fff',
                fontFamily: 'sans-serif'
              }}
            >
              {p.name}
            </div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 900,
                margin: '4px 0',
                fontFamily: 'sans-serif',
                lineHeight: 1
              }}
            >
              {p.score}
            </div>
            <div style={styles.statRow}>
              <span>AVG: {p.avg}</span>
              <span>DARTS: {p.dartsThrown}</span>
              <span>RUNDEN: {p.turnsPlayed}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Aktuelle Runde */}
      <div style={styles.roundCard}>
        <div style={styles.dartRow}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={styles.dartSlot}>
              {currentRound[i]?.label || '—'}
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 60,
            fontWeight: 900,
            color: COLORS.primary,
            fontFamily: 'sans-serif',
            lineHeight: 1,
            margin: '8px 0'
          }}
        >
          {currentTotal}
        </div>

        <button onClick={finishRound} style={styles.finishBtn}>
          RUNDE ABSCHLIESSEN
        </button>

        <div style={styles.actionRow}>
          <button style={styles.subBtn} onClick={undoLastDart}>
            ← LÖSCHEN
          </button>
          <button style={styles.subBtn} onClick={() => addDart(0)}>
            FEHLWURF
          </button>
        </div>
      </div>

      {/* Keypad */}
      <div style={styles.keypad}>

        {/* Multiplier */}
        <div style={styles.row}>
          {[
            [1, 'SINGLE'],
            [2, 'DOUBLE'],
            [3, 'TRIPLE']
          ].map(function(pair) {
            var val = pair[0];
            var label = pair[1];
            return (
              <button
                key={val}
                onClick={() => setMultiplier(val)}
                style={{
                  ...styles.multBtn,
                  backgroundColor:
                    multiplier === val ? '#fff' : COLORS.bg,
                  color: multiplier === val ? '#000' : '#fff'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Zahlen Grid */}
        <div style={styles.grid}>
          {[...Array(20)].map((_, i) => (
            <button
              key={i}
              onClick={() => addDart(i + 1)}
              style={styles.gridBtn}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => addDart(25)}
            style={{
              ...styles.gridBtn,
              backgroundColor: COLORS.danger,
              fontWeight: 900
            }}
          >
            BULL
          </button>
          <button
            onClick={() => addDart(0)}
            style={{
              ...styles.gridBtn,
              color: COLORS.textMuted
            }}
          >
            MISS
          </button>
        </div>
      </div>

      {/* Debug Panel */}
      <DebugPanel
        visible={showDebug}
        onClose={() => setShowDebug(false)}
        aiStatus={aiStatus}
        webGpuAvailable={webGpuAvailable}
        personaId={personaId}
        personaLabel={getPersonaProfile(personaId)?.label}
        moderationMode={moderationMode}
        speechState={liveSpeechState}
        debugInfo={debugInfo}
        commentaryLog={commentaryLog}
      />

    </div>
  );
}

/* ─────────────── STYLES ─────────────── */
const styles = {
  screen: {
    backgroundColor: COLORS.bg,
    minHeight: '100vh',
    color: '#fff',
    padding: '16px',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  screenCenter: {
    backgroundColor: COLORS.bg,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    fontFamily: 'sans-serif'
  },
  logoBoxLarge: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 30,
    fontWeight: 900,
    color: '#000'
  },
  logoBoxSmall: {
    width: 42,
    height: 42,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 900,
    color: '#000'
  },
  setupTitle: {
    fontSize: 52,
    fontWeight: 900,
    color: COLORS.primary,
    margin: 0,
    letterSpacing: 2
  },
  setupSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 3,
    marginBottom: 28
  },
  setupCard: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: COLORS.textMuted,
    fontSize: 22,
    cursor: 'pointer',
    padding: 4
  },
  commentBox: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 20,
    borderLeft: '4px solid ' + COLORS.primary
  },
  commentMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    flexWrap: 'wrap'
  },
  debugPill: {
    fontSize: 10,
    color: COLORS.textMuted,
    backgroundColor: '#0b1220',
    border: '1px solid #1e3a52',
    borderRadius: 999,
    padding: '3px 10px',
    fontFamily: 'monospace'
  },
  scoreboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  playerCard: {
    backgroundColor: COLORS.card,
    padding: '14px 16px',
    borderRadius: 22
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4
  },
  roundCard: {
    backgroundColor: COLORS.card,
    padding: '18px 16px',
    borderRadius: 28,
    textAlign: 'center'
  },
  dartRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8
  },
  dartSlot: {
    width: 58,
    height: 58,
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 800,
    border: '1px solid #334155'
  },
  finishBtn: {
    backgroundColor: COLORS.primary,
    color: '#000',
    width: '100%',
    padding: 18,
    borderRadius: 16,
    fontWeight: 900,
    border: 'none',
    fontSize: 16,
    cursor: 'pointer'
  },
  actionRow: {
    display: 'flex',
    gap: 10,
    marginTop: 12
  },
  subBtn: {
    flex: 1,
    backgroundColor: '#334155',
    color: '#fff',
    padding: 13,
    borderRadius: 12,
    border: 'none',
    fontWeight: 700,
    cursor: 'pointer'
  },
  keypad: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 24
  },
  multBtn: {
    flex: 1,
    padding: 13,
    borderRadius: 10,
    border: 'none',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: 13
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 8,
    marginTop: 14
  },
  gridBtn: {
    backgroundColor: COLORS.bg,
    border: 'none',
    color: '#fff',
    padding: '17px 0',
    borderRadius: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 15
  },
  modeBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    border: 'none',
    fontWeight: 800,
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13
  },
  row: {
    display: 'flex',
    gap: 10
  },
  rowWrap: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap'
  },
  input: {
    backgroundColor: COLORS.bg,
    border: '1px solid #334155',
    padding: 16,
    borderRadius: 14,
    color: '#fff',
    fontSize: 15,
    outline: 'none'
  },
  addPlayerBtn: {
    backgroundColor: COLORS.primary,
    border: 'none',
    borderRadius: 14,
    width: 56,
    fontSize: 26,
    fontWeight: 900,
    color: '#000',
    cursor: 'pointer'
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  playerTag: {
    backgroundColor: COLORS.bg,
    padding: '12px 16px',
    borderRadius: 14,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  startBtn: {
    backgroundColor: COLORS.primary,
    color: '#000',
    padding: 20,
    borderRadius: 18,
    fontWeight: 900,
    border: 'none',
    fontSize: 18,
    cursor: 'pointer'
  },
  tvOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(15,23,42,0.97)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.card,
    borderRadius: 4,
    overflow: 'hidden',
    margin: '20px 0'
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    transition: 'width 0.5s ease',
    borderRadius: 4
  },
  label: {
    fontSize: 11,
    fontWeight: 800,
    color: COLORS.textMuted,
    letterSpacing: 1
  },
  delBtn: {
    background: 'none',
    border: 'none',
    color: COLORS.danger,
    fontSize: 18,
    cursor: 'pointer'
  }
};
