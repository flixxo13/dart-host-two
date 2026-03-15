import React, { useState, useEffect, useReducer, useRef } from "react";
import * as webllm from "@mlc-ai/web-llm";

/* ─────────────── KONFIGURATION ─────────────── */
const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  primary: "#30D158",
  text: "#FFFFFF",
  textMuted: "#94A3B8",
  danger: "#EF4444",
  accent: "#58A6FF"
};

const SELECTED_MODEL = "Gemma-2b-it-q4f16_1-MLC"; // Optimal für Snapdragon 8 Gen 2

/* ─────────────── APP KOMPONENTE ─────────────── */
export default function DartHostPro() {
  // AI State
  const [engine, setEngine] = useState(null);
  const [loadingAI, setLoadingAI] = useState(true);
  const [loadProgress, setLoadProgress] = useState("Initialisiere...");

  // Game State
  const [phase, setPhase] = useState("setup"); 
  const [players, setPlayers] = useState([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [gameMode, setGameMode] = useState(501);
  const [currentRound, setCurrentRound] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [comment, setComment] = useState("Bereit für das Match?");
  const [showTVOverlay, setShowTVOverlay] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);

  /* 1. OFFLINE KI INITIALISIERUNG */
  useEffect(() => {
    async function initAI() {
      try {
        const engineInstance = await webllm.CreateWebWorkerMLCEngine(
          new Worker(new URL("./ai-worker.js", import.meta.url), { type: "module" }),
          SELECTED_MODEL,
          { initProgressCallback: (p) => setLoadProgress(p.text) }
        );
        setEngine(engineInstance);
        setLoadingAI(false);
      } catch (e) {
        console.error("WebGPU nicht verfügbar oder Modell-Fehler:", e);
        setLoadProgress("WebGPU Fehler. Nutze Standard-Moderation.");
        setTimeout(() => setLoadingAI(false), 2000);
      }
    }
    initAI();
  }, []);

  /* 2. AUDIO AUSGABE (Offline) */
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  };

  /* 3. KI MODERATION GENERIEREN */
  const getAIResponse = async (total, score, name, bust) => {
    if (!engine) return `${name} wirft ${total}. Rest ${score}.`;
    
    const prompt = `Du bist ein charmanter Dart-Moderator. Spieler ${name} warf ${total}, Rest ${score}. ${bust ? 'Bust!' : ''} Antworte kurz, kreativ und nenne am Ende den Reststand. Max 15 Wörter.`;
    const reply = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }]
    });
    return reply.choices[0].message.content;
  };

  /* 4. SPIEL-LOGIK */
  const handleThrow = (val) => {
    if (currentRound.length >= 3) return;
    const score = val * multiplier;
    setCurrentRound([...currentRound, { val: score, label: multiplier === 3 ? `T${val}` : multiplier === 2 ? `D${val}` : `${val}` }]);
    setMultiplier(1);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const finishRound = async () => {
    const total = currentRound.reduce((s, d) => s + d.val, 0);
    const newPlayers = [...players];
    const p = newPlayers[currentPlayerIdx];
    
    let isBust = (p.score - total < 0 || p.score - total === 1);
    if (!isBust) p.score -= total;
    
    setLastTotal(total);
    setShowTVOverlay(true);
    
    const aiText = await getAIResponse(total, p.score, p.name, isBust);
    setComment(aiText);
    speak(aiText);

    setTimeout(() => {
      setShowTVOverlay(false);
      setCurrentRound([]);
      setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
    }, 2500);
  };

  /* ─────────────── UI RENDERING ─────────────── */

  if (loadingAI) return (
    <div style={styles.loadingScreen}>
      <div style={styles.logoBox}>DH</div>
      <h2 style={{color: COLORS.primary, marginTop: 20}}>LADE OFFLINE-GEHIRN</h2>
      <div style={styles.progressBar}><div style={{...styles.progressFill, width: loadProgress.includes("%") ? loadProgress.split("%")[0]+"%" : "10%"}} /></div>
      <p style={styles.progressText}>{loadProgress}</p>
    </div>
  );

  if (phase === "setup") return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logoBox}>DH</div>
        <h1 style={styles.title}>DART HOST</h1>
      </header>
      <div style={styles.setupCard}>
        <label style={styles.label}>MODUS</label>
        <div style={styles.row}>
          {[301, 501].map(m => (
            <button key={m} onClick={() => setGameMode(m)} style={{...styles.modeBtn, backgroundColor: gameMode === m ? COLORS.primary : COLORS.card, color: gameMode === m ? "#000" : "#fff"}}>{m}</button>
          ))}
        </div>
        <input style={styles.input} placeholder="Spieler hinzufügen..." onKeyDown={(e) => {
          if (e.key === 'Enter') { setPlayers([...players, { name: e.target.value, score: gameMode }]); e.target.value = ""; }
        }} />
        {players.map((p, i) => <div key={i} style={styles.playerTag}>{p.name}</div>)}
        <button onClick={() => players.length > 0 && setPhase("playing")} style={styles.startBtn}>START</button>
      </div>
    </div>
  );

  const activeP = players[currentPlayerIdx];

  return (
    <div style={styles.container}>
      {/* TV OVERLAY */}
      {showTVOverlay && (
        <div style={styles.tvOverlay}>
          <div style={{fontSize: 24, color: COLORS.primary}}>{activeP.name}</div>
          <div style={{fontSize: 120, fontWeight: 900}}>{lastTotal}</div>
          <div style={{fontSize: 32, color: COLORS.textMuted}}>REST: {activeP.score}</div>
        </div>
      )}

      {/* GAME UI */}
      <div style={styles.commentBox}>"{comment}"</div>
      
      <div style={styles.mainScore}>
        <div style={{fontSize: 14, color: COLORS.primary}}>{activeP.name}</div>
        <div style={{fontSize: 84, fontWeight: 900}}>{activeP.score}</div>
      </div>

      <div style={styles.dartSlots}>
        {[0, 1, 2].map(i => <div key={i} style={styles.slot}>{currentRound[i]?.label || "-"}</div>)}
      </div>

      <div style={styles.keypad}>
        <div style={styles.row}>
          <button onClick={() => setMultiplier(2)} style={{...styles.multBtn, borderColor: multiplier === 2 ? COLORS.primary : COLORS.textMuted}}>DOUBLE</button>
          <button onClick={() => setMultiplier(3)} style={{...styles.multBtn, borderColor: multiplier === 3 ? COLORS.primary : COLORS.textMuted}}>TRIPLE</button>
        </div>
        <div style={styles.grid}>
          {[...Array(20)].map((_, i) => (
            <button key={i} onClick={() => handleThrow(i+1)} style={styles.gridBtn}>{i+1}</button>
          ))}
          <button onClick={() => handleThrow(25)} style={{...styles.gridBtn, color: COLORS.danger}}>BULL</button>
          <button onClick={finishRound} style={{...styles.gridBtn, backgroundColor: COLORS.primary, color: "#000", gridColumn: "span 2"}}>OK</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: COLORS.bg, minHeight: "100vh", color: "#fff", padding: 20, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', gap: 20 },
  loadingScreen: { backgroundColor: COLORS.bg, height: "100vh", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 },
  progressBar: { width: "100%", height: 6, backgroundColor: COLORS.card, borderRadius: 3, marginTop: 20, overflow: 'hidden' },
  progressFill: { height: "100%", backgroundColor: COLORS.primary, transition: 'width 0.3s' },
  header: { display: 'flex', alignItems: 'center', gap: 15 },
  logoBox: { width: 45, height: 45, backgroundColor: COLORS.primary, color: "#000", borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20 },
  title: { fontSize: 24, fontWeight: 900, letterSpacing: 2 },
  setupCard: { backgroundColor: COLORS.card, padding: 25, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 15 },
  input: { background: COLORS.bg, border: '1px solid #334155', padding: 15, borderRadius: 12, color: "#fff" },
  startBtn: { backgroundColor: COLORS.primary, color: "#000", padding: 18, borderRadius: 12, fontWeight: 900, border: 'none' },
  commentBox: { backgroundColor: COLORS.card, padding: 15, borderRadius: 15, fontStyle: 'italic', borderLeft: `4px solid ${COLORS.primary}` },
  mainScore: { textAlign: 'center', padding: 20 },
  dartSlots: { display: 'flex', justifyContent: 'center', gap: 10 },
  slot: { width: 50, height: 50, backgroundColor: COLORS.card, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 },
  keypad: { marginTop: 'auto', backgroundColor: COLORS.card, padding: 15, borderRadius: 20 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 10 },
  gridBtn: { background: COLORS.bg, border: 'none', color: '#fff', padding: 15, borderRadius: 10, fontWeight: 700 },
  multBtn: { flex: 1, padding: 10, borderRadius: 10, background: 'none', border: '2px solid', color: '#fff' },
  tvOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15,23,42,0.95)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  row: { display: 'flex', gap: 10 }
};
