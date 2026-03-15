import React, { useState, useEffect, useRef } from "react";
import * as webllm from "@mlc-ai/web-llm";

/* ─────────────── DESIGN SYSTEM ─────────────── */
const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  primary: "#30D158", // Neon-Grün
  text: "#FFFFFF",
  textMuted: "#94A3B8",
  danger: "#EF4444",
  accent: "#58A6FF"
};

const SELECTED_MODEL = "Gemma-2b-it-q4f16_1-MLC";

export default function App() {
  // KI-System-State
  const [engine, setEngine] = useState(null);
  const [loadingAI, setLoadingAI] = useState(true);
  const [loadProgress, setLoadProgress] = useState("System-Check...");
  const [errorDetail, setErrorDetail] = useState("");
  
  // Game-State
  const [phase, setPhase] = useState("setup"); 
  const [players, setPlayers] = useState([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [gameMode, setGameMode] = useState(501);
  const [currentRound, setCurrentRound] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [comment, setComment] = useState("Bereit für das Match?");
  const [showTV, setShowTV] = useState(false);
  const [lastStats, setLastStats] = useState({ total: 0, rest: 0, name: "" });
  const [inputMode, setInputMode] = useState("keypad");

  /* ─────────────── KI INITIALISIERUNG ─────────────── */
  useEffect(() => {
    async function initAI() {
      try {
        if (!navigator.gpu) throw new Error("WebGPU nicht vom Browser erkannt.");
        
        setLoadProgress("GPU gefunden. Initialisiere...");
        
        // Erstelle den Worker aus dem Public-Ordner
        const worker = new Worker(new URL("/ai-worker.js", import.meta.url), {
          type: "module",
        });

        const engineInstance = await webllm.CreateWebWorkerMLCEngine(
          worker,
          SELECTED_MODEL,
          { 
            initProgressCallback: (p) => {
              const percent = Math.round(p.progress * 100);
              setLoadProgress(`Lade Modell: ${percent}%`);
              if (p.text.includes("Finish")) setLoadProgress("KI ist startklar!");
            } 
          }
        );
        
        setEngine(engineInstance);
        setLoadingAI(false);
      } catch (e) {
        console.error("KI-Fehler:", e);
        setErrorDetail(e.message);
        setLoadProgress("KI konnte nicht geladen werden.");
        // Fallback: Nach 5 Sekunden trotzdem starten (Standard-Modus)
        setTimeout(() => setLoadingAI(false), 5000);
      }
    }
    initAI();
  }, []);

  /* ─────────────── GAME LOGIK ─────────────── */
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  };

  const generateAIComment = async (total, rest, name, bust) => {
    if (!engine) return `${name} wirft ${total}. Rest ${rest}.`;
    try {
      const prompt = `Du bist ein charmanter Dart-Moderator. Spieler ${name} warf ${total}, Rest ${rest}. ${bust ? 'Bust!' : ''} Antworte kurz, witzig, auf Deutsch. Max 12 Wörter.`;
      const reply = await engine.chat.completions.create({ messages: [{ role: "user", content: prompt }] });
      return reply.choices[0].message.content;
    } catch (e) {
      return `${name} wirft ${total}.`;
    }
  };

  const handleInput = (val) => {
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
    
    const aiResponse = await generateAIComment(total, p.score, p.name, bust);
    setComment(aiResponse);
    speak(aiResponse);

    setTimeout(() => {
      setShowTV(false);
      setCurrentRound([]);
      setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
    }, 2800);
  };

  /* ─────────────── UI RENDERING ─────────────── */
  if (loadingAI) return (
    <div style={styles.loaderScreen}>
      <div style={styles.logoBox}>DH</div>
      <h2 style={{color: COLORS.primary, letterSpacing: 2, marginTop: 20}}>DART HOST ENGINE</h2>
      <div style={styles.progressBar}>
        <div style={{...styles.progressFill, width: loadProgress.includes("%") ? loadProgress.split(":")[1].trim() : "10%"}} />
      </div>
      <p style={{fontSize: 14}}>{loadProgress}</p>
      {errorDetail && (
        <div style={styles.errorContainer}>
          <p style={{color: COLORS.danger, fontSize: 12}}>Details: {errorDetail}</p>
          <button onClick={() => setLoadingAI(false)} style={styles.smallBtn}>Ohne KI fortfahren</button>
        </div>
      )}
    </div>
  );

  if (phase === "setup") return (
    <div style={styles.container}>
      <h1 style={styles.title}>DART HOST</h1>
      <p style={styles.subtitle}>PREMIUM EDITION</p>
      <div style={styles.card}>
        <label style={styles.label}>MODUS</label>
        <div style={styles.row}>
          {[301, 501].map(m => (
            <button key={m} onClick={() => setGameMode(m)} style={{...styles.btn, backgroundColor: gameMode === m ? COLORS.primary : COLORS.bg, color: gameMode === m ? "#000" : "#fff"}}>{m}</button>
          ))}
        </div>
        <input style={styles.input} placeholder="Spieler-Name..." onKeyDown={(e) => {
          if(e.key === 'Enter' && e.target.value) { setPlayers([...players, {name: e.target.value, score: gameMode}]); e.target.value=""; }
        }} />
        {players.map((p, i) => <div key={i} style={styles.playerTag}>0{i+1} {p.name}</div>)}
        <button onClick={() => players.length > 0 && setPhase("playing")} style={styles.startBtn}>START MATCH</button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {showTV && (
        <div style={styles.tvOverlay}>
          <div style={{color: COLORS.primary, fontSize: 28}}>{lastStats.name}</div>
          <div style={{fontSize: 140, fontWeight: 900}}>{lastStats.total}</div>
          <div style={{fontSize: 32, color: COLORS.textMuted}}>REST: {lastStats.rest}</div>
        </div>
      )}

      <div style={styles.commentBox}>"{comment}"</div>

      <div style={styles.scoreGrid}>
        {players.map((p, i) => (
          <div key={i} style={{...styles.playerCard, borderLeft: i === currentPlayerIdx ? `4px solid ${COLORS.primary}` : 'none', opacity: i === currentPlayerIdx ? 1 : 0.6}}>
            <div style={{fontSize: 11, color: COLORS.textMuted}}>P{i+1}</div>
            <div style={{fontSize: 20, fontWeight: 800}}>{p.name}</div>
            <div style={{fontSize: 48, fontWeight: 900, color: i === currentPlayerIdx ? COLORS.primary : "#fff"}}>{p.score}</div>
          </div>
        ))}
      </div>

      <div style={styles.roundArea}>
        <div style={styles.dartRow}>
          {[0,1,2].map(i => <div key={i} style={styles.slot}>{currentRound[i]?.label || "-"}</div>)}
        </div>
        <div style={{fontSize: 60, fontWeight: 900}}>{currentRound.reduce((s,d) => s + d.val, 0)}</div>
        <button onClick={finishRound} style={styles.finishBtn} disabled={currentRound.length === 0}>OK</button>
      </div>

      <div style={styles.keypad}>
        <div style={styles.row}>
          {["SINGLE", "DOUBLE", "TRIPLE"].map((m, i) => (
            <button key={m} onClick={() => setMultiplier(i+1)} style={{...styles.multBtn, backgroundColor: multiplier === i+1 ? "#fff" : COLORS.bg, color: multiplier === i+1 ? "#000" : "#fff"}}>{m}</button>
          ))}
        </div>
        <div style={styles.grid}>
          {[...Array(20)].map((_, i) => (
            <button key={i} onClick={() => handleInput(i+1)} style={styles.gridBtn}>{i+1}</button>
          ))}
          <button onClick={() => handleInput(25)} style={{...styles.gridBtn, color: COLORS.danger}}>BULL</button>
          <button onClick={() => handleInput(0)} style={styles.gridBtn}>MISS</button>
          <button onClick={() => setCurrentRound(currentRound.slice(0,-1))} style={{...styles.gridBtn, backgroundColor: "#334155"}}>DEL</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: COLORS.bg, minHeight: "100vh", color: "#fff", padding: "16px", fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', gap: "16px", overflow: 'hidden' },
  loaderScreen: { backgroundColor: COLORS.bg, height: "100vh", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: "40px", textAlign: 'center' },
  logoBox: { width: 55, height: 55, backgroundColor: COLORS.primary, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: "#000" },
  title: { fontSize: 42, fontWeight: 900, color: COLORS.primary, textAlign: 'center', margin: 0 },
  subtitle: { fontSize: 10, textAlign: 'center', color: COLORS.textMuted, letterSpacing: 4, marginBottom: 5 },
  card: { backgroundColor: COLORS.card, padding: 24, borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 15 },
  label: { fontSize: 11, fontWeight: 800, color: COLORS.textMuted },
  row: { display: 'flex', gap: 10 },
  btn: { flex: 1, padding: 14, borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 16 },
  input: { backgroundColor: COLORS.bg, border: '1px solid #334155', padding: 16, borderRadius: 14, color: "#fff", fontSize: 16 },
  playerTag: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 700, borderLeft: `3px solid ${COLORS.primary}` },
  startBtn: { backgroundColor: "#fff", color: "#000", padding: 20, borderRadius: 16, fontWeight: 900, border: 'none', fontSize: 18 },
  commentBox: { backgroundColor: COLORS.card, padding: 15, borderRadius: 16, borderLeft: `4px solid ${COLORS.primary}`, fontStyle: 'italic', fontSize: 15 },
  scoreGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  playerCard: { backgroundColor: COLORS.card, padding: 15, borderRadius: 20 },
  roundArea: { backgroundColor: COLORS.card, padding: 20, borderRadius: 28, textAlign: 'center' },
  dartRow: { display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 5 },
  slot: { width: 52, height: 52, backgroundColor: COLORS.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, border: '1px solid #334155' },
  finishBtn: { backgroundColor: COLORS.primary, color: "#000", width: "100%", padding: 16, borderRadius: 16, fontWeight: 900, border: 'none', marginTop: 10 },
  keypad: { backgroundColor: COLORS.card, padding: 15, borderRadius: 24, marginTop: 'auto' },
  multBtn: { flex: 1, padding: 10, borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 800 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 10 },
  gridBtn: { backgroundColor: COLORS.bg, border: 'none', color: '#fff', padding: "15px 0", borderRadius: 10, fontWeight: 700, fontSize: 16 },
  tvOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.98)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  progressBar: { width: '100%', height: 8, backgroundColor: COLORS.card, borderRadius: 4, overflow: 'hidden', margin: '20px 0' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, transition: 'width 0.4s ease' },
  errorContainer: { marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 },
  smallBtn: { backgroundColor: '#334155', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: 8, fontSize: 12 }
};
