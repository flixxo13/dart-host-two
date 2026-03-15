import React, { useState, useEffect, useRef } from "react";
import * as webllm from "@mlc-ai/web-llm";

/* ─────────────── THEME & KONFIGURATION ─────────────── */
const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  primary: "#30D158", // Das Neon-Grün aus deinen Bildern
  text: "#FFFFFF",
  textMuted: "#94A3B8",
  danger: "#EF4444",
  accent: "#58A6FF"
};

const SELECTED_MODEL = "Gemma-2b-it-q4f16_1-MLC";

/* ─────────────── HAUPT-KOMPONENTE ─────────────── */
export default function App() {
  // AI & System State
  const [engine, setEngine] = useState(null);
  const [loadingAI, setLoadingAI] = useState(true);
  const [loadProgress, setLoadProgress] = useState("System-Check...");
  const [errorDetail, setErrorDetail] = useState("");
  const [isIsolated, setIsIsolated] = useState(false);

  // Game State
  const [phase, setPhase] = useState("setup"); // setup | playing
  const [players, setPlayers] = useState([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [gameMode, setGameMode] = useState(501);
  const [currentRound, setCurrentRound] = useState([]); // Max 3 Darts
  const [multiplier, setMultiplier] = useState(1);
  const [comment, setComment] = useState("Bereit für das erste Leg?");
  const [showTV, setShowTV] = useState(false);
  const [lastStats, setLastStats] = useState({ total: 0, rest: 0, name: "" });

  /* 1. INITIALISIERUNG: OFFLINE KI & WEBGPU */
  useEffect(() => {
    async function init() {
      // Check für SharedArrayBuffer (Isolation)
      const isolated = window.crossOriginIsolated;
      setIsIsolated(isolated);

      if (!navigator.gpu) {
        setLoadProgress("WebGPU nicht unterstützt.");
        setErrorDetail("Prüfe Chrome Beta Flags (#enable-unsafe-webgpu).");
        setTimeout(() => setLoadingAI(false), 4000);
        return;
      }

      try {
        setLoadProgress("GPU erkannt. Lade Gehirn...");
        
        // Pfad für Vite/Vercel optimiert
        const worker = new Worker(new URL("/ai-worker.js", import.meta.url), {
          type: "module",
        });

        const engineInstance = await webllm.CreateWebWorkerMLCEngine(
          worker,
          SELECTED_MODEL,
          { 
            initProgressCallback: (p) => {
              const perc = Math.round(p.progress * 100);
              setLoadProgress(`Lade Modell: ${perc}%`);
            } 
          }
        );
        
        setEngine(engineInstance);
        setLoadingAI(false);
      } catch (e) {
        console.error("KI-Fehler:", e);
        setLoadProgress("KI konnte nicht starten.");
        setErrorDetail(!isolated ? "Sicherheits-Blockade (Isolation fehlt)" : e.message);
        // Fallback: Nach Zeitüberschreitung ohne KI starten
        setTimeout(() => setLoadingAI(false), 5000);
      }
    }
    init();
  }, []);

  /* 2. AUDIO AUSGABE */
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  };

  /* 3. KI GENERIERUNG */
  const fetchAIComment = async (total, rest, name, bust) => {
    if (!engine) return `${name} wirft ${total}. Rest ${rest}.`;
    try {
      const prompt = `Du bist ein frecher Dart-Moderator. Spieler: ${name}, Wurf: ${total}, Rest: ${rest}. ${bust ? 'Überworfen!' : ''} Antworte kurz, humorvoll, Deutsch. Max 12 Wörter.`;
      const reply = await engine.chat.completions.create({ messages: [{ role: "user", content: prompt }] });
      return reply.choices[0].message.content;
    } catch (e) {
      return `${name} wirft ${total}.`;
    }
  };

  /* 4. SPIEL-LOGIK */
  const addDart = (val) => {
    if (currentRound.length >= 3) return;
    const score = val * multiplier;
    const label = multiplier === 3 ? `T${val}` : multiplier === 2 ? `D${val}` : `${val}`;
    setCurrentRound([...currentRound, { val: score, label: val === 0 ? "Miss" : label }]);
    setMultiplier(1);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const finishRound = async () => {
    const total = currentRound.reduce((s, d) => s + d.val, 0);
    const newPlayers = [...players];
    const p = newPlayers[currentPlayerIdx];
    
    const bust = p.score - total < 0 || p.score - total === 1;
    if (!bust) p.score -= total;

    setLastStats({ total, rest: p.score, name: p.name });
    setShowTV(true);
    
    // KI Moderation starten
    const aiResponse = await fetchAIComment(total, p.score, p.name, bust);
    setComment(aiResponse);
    speak(aiResponse);

    // Nach 3 Sekunden zurück zum Scoreboard
    setTimeout(() => {
      setShowTV(false);
      setCurrentRound([]);
      setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
    }, 3000);
  };

  /* ─────────────── RENDER LOGIK ─────────────── */

  // LADE-SCREEN
  if (loadingAI) return (
    <div style={styles.screenCenter}>
      <div style={styles.logoBox}>DH</div>
      <h2 style={{color: COLORS.primary, letterSpacing: 2}}>DART HOST TWO</h2>
      <div style={styles.progressBar}>
        <div style={{...styles.progressFill, width: loadProgress.includes("%") ? loadProgress.split(":")[1].trim() : "10%"}} />
      </div>
      <p style={{fontSize: 14}}>{loadProgress}</p>
      <div style={{marginTop: 40, fontSize: 10, color: COLORS.textMuted}}>
        Isolierung: {isIsolated ? "✅ Aktiv" : "❌ Blockiert"}
      </div>
      {errorDetail && <p style={styles.errorText}>{errorDetail}</p>}
    </div>
  );

  // SETUP-SCREEN
  if (phase === "setup") return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <div style={styles.logoBox}>DH</div>
        <h1 style={styles.title}>DART HOST</h1>
      </header>
      
      <div style={styles.card}>
        <label style={styles.label}>MODUS</label>
        <div style={styles.row}>
          {[301, 501, 701].map(m => (
            <button key={m} onClick={() => setGameMode(m)} style={{...styles.btn, backgroundColor: gameMode === m ? COLORS.primary : COLORS.bg, color: gameMode === m ? "#000" : "#fff"}}>{m}</button>
          ))}
        </div>

        <label style={styles.label}>SPIELER</label>
        <input style={styles.input} placeholder="Name tippen + Enter..." onKeyDown={(e) => {
          if(e.key === 'Enter' && e.target.value) { setPlayers([...players, {name: e.target.value, score: gameMode}]); e.target.value=""; }
        }} />
        
        <div style={styles.playerScroll}>
          {players.map((p, i) => <div key={i} style={styles.playerTag}>0{i+1} {p.name}</div>)}
        </div>

        <button onClick={() => players.length > 0 && setPhase("playing")} style={styles.startBtn}>MATCH STARTEN ▶</button>
      </div>
    </div>
  );

  // SPIEL-SCREEN
  const activeP = players[currentPlayerIdx];

  return (
    <div style={styles.screen}>
      {/* TV BROADCAST OVERLAY */}
      {showTV && (
        <div style={styles.tvOverlay}>
          <div style={{color: COLORS.primary, fontSize: 24, fontWeight: 700}}>{lastStats.name}</div>
          <div style={{fontSize: 160, fontWeight: 900, lineHeight: 1}}>{lastStats.total}</div>
          <div style={{fontSize: 32, color: COLORS.textMuted}}>REST: {lastStats.rest}</div>
          <div style={styles.tvTag}>LIVE BROADCAST</div>
        </div>
      )}

      {/* KOMMENTAR-BOX */}
      <div style={styles.commentBox}>
        <span style={{color: COLORS.primary, fontWeight: 900, marginRight: 8}}>HOST:</span>
        "{comment}"
      </div>

      {/* SPIELER SCOREBOARD */}
      <div style={styles.playerGrid}>
        {players.map((p, i) => (
          <div key={i} style={{...styles.playerCard, borderLeft: i === currentPlayerIdx ? `4px solid ${COLORS.primary}` : 'none', opacity: i === currentPlayerIdx ? 1 : 0.6}}>
            <div style={{fontSize: 10, color: COLORS.textMuted}}>P{i+1}</div>
            <div style={{fontSize: 20, fontWeight: 800, whiteSpace: 'nowrap'}}>{p.name}</div>
            <div style={{fontSize: 48, fontWeight: 900, color: i === currentPlayerIdx ? COLORS.primary : "#fff"}}>{p.score}</div>
          </div>
        ))}
      </div>

      {/* RUNDEN-ANZEIGE */}
      <div style={styles.roundCard}>
        <div style={styles.dartRow}>
          {[0,1,2].map(i => <div key={i} style={styles.dartSlot}>{currentRound[i]?.label || "-"}</div>)}
        </div>
        <div style={{fontSize: 64, fontWeight: 900}}>{currentRound.reduce((s,d) => s + d.val, 0)}</div>
        <button onClick={handleFinishRound} style={styles.finishBtn} disabled={currentRound.length === 0}>RUNDE BEENDEN</button>
      </div>

      {/* KEYPAD */}
      <div style={styles.keypad}>
        <div style={styles.row}>
          {["SINGLE", "DOUBLE", "TRIPLE"].map((m, i) => (
            <button key={m} onClick={() => setMultiplier(i+1)} style={{...styles.multBtn, backgroundColor: multiplier === i+1 ? "#fff" : COLORS.bg, color: multiplier === i+1 ? "#000" : "#fff"}}>{m}</button>
          ))}
        </div>
        <div style={styles.grid}>
          {[...Array(20)].map((_, i) => (
            <button key={i} onClick={() => addDart(i+1)} style={styles.gridBtn}>{i+1}</button>
          ))}
          <button onClick={() => addDart(25)} style={{...styles.gridBtn, backgroundColor: COLORS.danger}}>BULL</button>
          <button onClick={() => addDart(0)} style={styles.gridBtn}>MISS</button>
          <button onClick={() => setCurrentRound(currentRound.slice(0,-1))} style={{...styles.gridBtn, backgroundColor: "#334155"}}>DEL</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── STYLES (Mobile First) ─────────────── */
const styles = {
  screen: { backgroundColor: COLORS.bg, minHeight: "100vh", color: "#fff", padding: "16px", fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', gap: "16px", overflow: 'hidden' },
  screenCenter: { backgroundColor: COLORS.bg, height: "100vh", color: "#fff", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: "40px", textAlign: 'center' },
  header: { display: 'flex', alignItems: 'center', gap: 12 },
  logoBox: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: "#000" },
  title: { fontSize: 28, fontWeight: 900, letterSpacing: 1 },
  subtitle: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 4, marginBottom: 10 },
  card: { backgroundColor: COLORS.card, padding: 24, borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 16 },
  label: { fontSize: 11, fontWeight: 800, color: COLORS.textMuted },
  row: { display: 'flex', gap: 10 },
  btn: { flex: 1, padding: 14, borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 16 },
  input: { backgroundColor: COLORS.bg, border: '1px solid #334155', padding: 16, borderRadius: 14, color: "#fff", fontSize: 16 },
  playerScroll: { maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 },
  playerTag: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 700, borderLeft: `3px solid ${COLORS.primary}` },
  startBtn: { backgroundColor: "#fff", color: "#000", padding: 20, borderRadius: 16, fontWeight: 900, border: 'none', fontSize: 18, marginTop: 10 },
  commentBox: { backgroundColor: COLORS.card, padding: 16, borderRadius: 16, borderLeft: `4px solid ${COLORS.primary}`, fontStyle: 'italic', fontSize: 15, minHeight: '60px' },
  playerGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  playerCard: { backgroundColor: COLORS.card, padding: 16, borderRadius: 20 },
  roundCard: { backgroundColor: COLORS.card, padding: 20, borderRadius: 28, textAlign: 'center' },
  dartRow: { display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 10 },
  dartSlot: { width: 55, height: 55, backgroundColor: COLORS.bg, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, border: '1px solid #334155' },
  finishBtn: { backgroundColor: COLORS.primary, color: "#000", width: "100%", padding: 18, borderRadius: 16, fontWeight: 900, border: 'none', marginTop: 10 },
  keypad: { backgroundColor: COLORS.card, padding: 16, borderRadius: 24, marginTop: 'auto' },
  multBtn: { flex: 1, padding: 10, borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 800 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 12 },
  gridBtn: { backgroundColor: COLORS.bg, border: 'none', color: '#fff', padding: "16px 0", borderRadius: 10, fontWeight: 700, fontSize: 16 },
  tvOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.98)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  tvTag: { marginTop: 40, backgroundColor: COLORS.danger, padding: "4px 12px", borderRadius: 4, fontSize: 10, fontWeight: 900 },
  progressBar: { width: '100%', height: 8, backgroundColor: COLORS.card, borderRadius: 4, overflow: 'hidden', margin: '20px 0' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, transition: 'width 0.4s ease' },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 20, maxWidth: '280px' }
};
 