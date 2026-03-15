import React, { useState, useEffect, useRef } from "react";
import * as webllm from "@mlc-ai/web-llm";

/* ─────────────── THEME & KONFIGURATION ─────────────── */
const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  primary: "#30D158", 
  text: "#FFFFFF",
  textMuted: "#94A3B8",
  danger: "#EF4444"
};

const SELECTED_MODEL = "Gemma-2b-it-q4f16_1-MLC";

export default function App() {
  const [engine, setEngine] = useState(null);
  const [loadingAI, setLoadingAI] = useState(true);
  const [loadProgress, setLoadProgress] = useState("System-Check...");
  const [errorDetail, setErrorDetail] = useState("");
  const [isIsolated, setIsIsolated] = useState(false);

  const [phase, setPhase] = useState("setup"); 
  const [players, setPlayers] = useState([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [gameMode, setGameMode] = useState(501);
  const [currentRound, setCurrentRound] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [comment, setComment] = useState("Bereit?");
  const [showTV, setShowTV] = useState(false);
  const [lastStats, setLastStats] = useState({ total: 0, rest: 0, name: "" });

  /* 1. INITIALISIERUNG */
  useEffect(() => {
    async function init() {
      const isolated = window.crossOriginIsolated;
      setIsIsolated(isolated);

      if (!navigator.gpu) {
        setLoadProgress("WebGPU nicht unterstützt.");
        setTimeout(() => setLoadingAI(false), 4000);
        return;
      }

      try {
        setLoadProgress("GPU erkannt. Lade KI...");
        
        // Nutzt den Worker aus dem src-Verzeichnis (Vite bündelt dies)
        const worker = new Worker(new URL("./ai-worker.js", import.meta.url), {
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
        console.error(e);
        setErrorDetail(e.message);
        setTimeout(() => setLoadingAI(false), 5000);
      }
    }
    init();
  }, []);

  /* 2. AUDIO & KI LOGIK */
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    window.speechSynthesis.speak(u);
  };

  const fetchAIComment = async (total, rest, name, bust) => {
    if (!engine) return `${name} wirft ${total}. Rest ${rest}.`;
    try {
      const prompt = `Du bist ein frecher Dart-Moderator. Spieler: ${name}, Wurf: ${total}, Rest: ${rest}. ${bust ? 'Bust!' : ''} Antworte kurz, humorvoll, Deutsch. Max 12 Wörter.`;
      const reply = await engine.chat.completions.create({ messages: [{ role: "user", content: prompt }] });
      return reply.choices[0].message.content;
    } catch (e) {
      return `${name} wirft ${total}.`;
    }
  };

  /* 3. GAMEPLAY FUNCTIONS */
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
    
    const aiResponse = await fetchAIComment(total, p.score, p.name, bust);
    setComment(aiResponse);
    speak(aiResponse);

    setTimeout(() => {
      setShowTV(false);
      setCurrentRound([]);
      setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
    }, 2800);
  };

  /* 4. RENDERING */
  if (loadingAI) return (
    <div style={styles.screenCenter}>
      <div style={styles.logoBox}>DH</div>
      <h2 style={{color: COLORS.primary}}>DART HOST TWO</h2>
      <div style={styles.progressBar}>
        <div style={{...styles.progressFill, width: loadProgress.includes("%") ? loadProgress.split(":")[1].trim() : "10%"}} />
      </div>
      <p>{loadProgress}</p>
      <div style={{marginTop: 20, fontSize: 10, color: COLORS.textMuted}}>
        Isolation: {isIsolated ? "✅" : "❌"}
      </div>
      {errorDetail && <p style={styles.errorText}>{errorDetail}</p>}
    </div>
  );

  if (phase === "setup") return (
    <div style={styles.screen}>
      <div style={styles.logoBox}>DH</div>
      <div style={styles.card}>
        <label style={styles.label}>MODUS</label>
        <div style={styles.row}>
          {[301, 501].map(m => (
            <button key={m} onClick={() => setGameMode(m)} style={{...styles.btn, backgroundColor: gameMode === m ? COLORS.primary : COLORS.bg, color: gameMode === m ? "#000" : "#fff"}}>{m}</button>
          ))}
        </div>
        <input style={styles.input} placeholder="Name..." onKeyDown={(e) => {
          if(e.key === 'Enter' && e.target.value) { setPlayers([...players, {name: e.target.value, score: gameMode}]); e.target.value=""; }
        }} />
        {players.map((p, i) => <div key={i} style={styles.playerTag}>{p.name}</div>)}
        <button onClick={() => players.length > 0 && setPhase("playing")} style={styles.startBtn}>START</button>
      </div>
    </div>
  );

  return (
    <div style={styles.screen}>
      {showTV && (
        <div style={styles.tvOverlay}>
          <div style={{color: COLORS.primary, fontSize: 24}}>{lastStats.name}</div>
          <div style={{fontSize: 140, fontWeight: 900}}>{lastStats.total}</div>
          <div style={{fontSize: 32, color: COLORS.textMuted}}>REST: {lastStats.rest}</div>
        </div>
      )}
      <div style={styles.commentBox}>"{comment}"</div>
      <div style={styles.playerGrid}>
        {players.map((p, i) => (
          <div key={i} style={{...styles.playerCard, opacity: i === currentPlayerIdx ? 1 : 0.5, borderLeft: i === currentPlayerIdx ? `4px solid ${COLORS.primary}` : 'none'}}>
            <div style={{fontSize: 20, fontWeight: 800}}>{p.name}</div>
            <div style={{fontSize: 44, fontWeight: 900}}>{p.score}</div>
          </div>
        ))}
      </div>
      <div style={styles.roundCard}>
        <div style={styles.dartRow}>
          {[0,1,2].map(i => <div key={i} style={styles.dartSlot}>{currentRound[i]?.label || "-"}</div>)}
        </div>
        <button onClick={finishRound} style={styles.finishBtn}>OK</button>
      </div>
      <div style={styles.keypad}>
        <div style={styles.row}>
          {["S", "D", "T"].map((m, i) => (
            <button key={m} onClick={() => setMultiplier(i+1)} style={{...styles.multBtn, backgroundColor: multiplier === i+1 ? "#fff" : COLORS.bg, color: multiplier === i+1 ? "#000" : "#fff"}}>{m}</button>
          ))}
        </div>
        <div style={styles.grid}>
          {[...Array(20)].map((_, i) => (
            <button key={i} onClick={() => addDart(i+1)} style={styles.gridBtn}>{i+1}</button>
          ))}
          <button onClick={() => addDart(25)} style={{...styles.gridBtn, color: COLORS.danger}}>BULL</button>
          <button onClick={() => addDart(0)} style={styles.gridBtn}>0</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  screen: { backgroundColor: COLORS.bg, minHeight: "100vh", color: "#fff", padding: "16px", display: "flex", flexDirection: "column", gap: "16px", fontFamily: "sans-serif" },
  screenCenter: { backgroundColor: COLORS.bg, height: "100vh", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", textAlign: "center" },
  logoBox: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#000", alignSelf: "center" },
  card: { backgroundColor: COLORS.card, padding: 20, borderRadius: 24, display: "flex", flexDirection: "column", gap: 12, width: "100%", boxSizing: "border-box" },
  label: { fontSize: 11, fontWeight: 800, color: COLORS.textMuted },
  row: { display: "flex", gap: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 10, border: "none", fontWeight: 800 },
  input: { backgroundColor: COLORS.bg, border: "1px solid #334155", padding: 15, borderRadius: 12, color: "#fff" },
  playerTag: { backgroundColor: COLORS.bg, padding: 10, borderRadius: 10, marginTop: 5 },
  startBtn: { backgroundColor: "#fff", color: "#000", padding: 16, borderRadius: 15, fontWeight: 900, border: "none" },
  commentBox: { backgroundColor: COLORS.card, padding: 15, borderRadius: 15, borderLeft: `4px solid ${COLORS.primary}`, fontStyle: "italic" },
  playerGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  playerCard: { backgroundColor: COLORS.card, padding: 15, borderRadius: 20 },
  roundCard: { backgroundColor: COLORS.card, padding: 20, borderRadius: 24, textAlign: "center" },
  dartRow: { display: "flex", justifyContent: "center", gap: 8, marginBottom: 10 },
  dartSlot: { width: 50, height: 50, backgroundColor: COLORS.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #334155" },
  finishBtn: { backgroundColor: COLORS.primary, color: "#000", width: "100%", padding: 15, borderRadius: 12, fontWeight: 800, border: "none" },
  keypad: { backgroundColor: COLORS.card, padding: 12, borderRadius: 20, marginTop: "auto" },
  grid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginTop: 10 },
  gridBtn: { backgroundColor: COLORS.bg, border: "none", color: "#fff", padding: "12px 0", borderRadius: 8, fontWeight: 700 },
  multBtn: { flex: 1, padding: 8, borderRadius: 8, border: "none" },
  tvOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15,23,42,0.98)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  progressBar: { width: "100%", height: 6, backgroundColor: COLORS.card, borderRadius: 3, margin: "20px 0", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.primary, transition: "width 0.3s" },
  errorText: { color: COLORS.danger, fontSize: 10, marginTop: 10 }
};
