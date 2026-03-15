import React, { useState, useEffect, useRef } from "react";
import * as webllm from "@mlc-ai/web-llm";

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
  const [loadProgress, setLoadProgress] = useState("");
  const [phase, setPhase] = useState("setup"); 
  const [players, setPlayers] = useState([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [gameMode, setGameMode] = useState(501);
  const [currentRound, setCurrentRound] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [comment, setComment] = useState("Willkommen bei Dart Host!");
  const [showTV, setShowTV] = useState(false);
  const [lastStats, setLastStats] = useState({ total: 0, rest: 0 });
  const [inputMode, setInputMode] = useState("keypad");

  // Initialisierung der Offline-KI
  useEffect(() => {
    async function init() {
      try {
        const engineInstance = await webllm.CreateWebWorkerMLCEngine(
          new Worker(new URL("/ai-worker.js", import.meta.url), { type: "module" }),
          SELECTED_MODEL,
          { initProgressCallback: (p) => setLoadProgress(p.text) }
        );
        setEngine(engineInstance);
        setLoadingAI(false);
      } catch (e) {
        setLoadProgress("WebGPU nicht aktiv. Nutze Standard-Audio.");
        setTimeout(() => setLoadingAI(false), 3000);
      }
    }
    init();
  }, []);

  const speak = (text) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  };

  const getAIModeration = async (total, rest, name, bust) => {
    if (!engine) return `${name} wirft ${total}. Rest ${rest}.`;
    const prompt = `Du bist ein frecher Dart-Moderator. ${name} warf ${total}, Rest ${rest}. ${bust ? 'Bust!' : ''} Antworte kurz und witzig auf Deutsch (max 15 Wörter).`;
    const reply = await engine.chat.completions.create({ messages: [{ role: "user", content: prompt }] });
    return reply.choices[0].message.content;
  };

  const addDart = (val) => {
    if (currentRound.length >= 3) return;
    const score = val * multiplier;
    const label = multiplier === 3 ? `T${val}` : multiplier === 2 ? `D${val}` : `${val}`;
    setCurrentRound([...currentRound, { val: score, label: val === 0 ? "Miss" : label }]);
    setMultiplier(1);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const handleFinishRound = async () => {
    const total = currentRound.reduce((s, d) => s + d.val, 0);
    const newPlayers = [...players];
    const p = newPlayers[currentPlayerIdx];
    const bust = p.score - total < 0 || p.score - total === 1;
    if (!bust) p.score -= total;

    setLastStats({ total, rest: p.score, name: p.name });
    setShowTV(true);
    
    const text = await getAIModeration(total, p.score, p.name, bust);
    setComment(text);
    speak(text);

    setTimeout(() => {
      setShowTV(false);
      setCurrentRound([]);
      setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
    }, 2800);
  };

  if (loadingAI) return (
    <div style={styles.screen}>
      <div style={styles.logoBox}>DH</div>
      <h2 style={{color: COLORS.primary, marginTop: 20}}>LADE OFFLINE-KI</h2>
      <div style={styles.progressBar}><div style={{...styles.progressFill, width: loadProgress.includes("%") ? loadProgress.split("%")[0]+"%" : "10%"}} /></div>
      <p style={{fontSize: 12, color: COLORS.textMuted, marginTop: 10}}>{loadProgress}</p>
    </div>
  );

  if (phase === "setup") return (
    <div style={styles.screen}>
      <h1 style={styles.title}>DART HOST</h1>
      <p style={styles.subtitle}>PREMIUM SCOREBOARD ASSISTANT</p>
      <div style={styles.card}>
        <label style={styles.label}>SPIELMODUS</label>
        <div style={styles.row}>
          {[301, 501, 701].map(m => (
            <button key={m} onClick={() => setGameMode(m)} style={{...styles.btn, backgroundColor: gameMode === m ? COLORS.primary : COLORS.bg, color: gameMode === m ? "#000" : "#fff"}}>{m}</button>
          ))}
        </div>
        <input style={styles.input} placeholder="Name eingeben..." onKeyDown={(e) => {
          if(e.key === 'Enter' && e.target.value) { setPlayers([...players, {name: e.target.value, score: gameMode}]); e.target.value=""; }
        }} />
        {players.map((p, i) => <div key={i} style={styles.playerTag}>0{i+1} {p.name}</div>)}
        <button onClick={() => players.length > 0 && setPhase("playing")} style={styles.startBtn}>SPIEL STARTEN ▶</button>
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

      <div style={styles.commentBox}>{comment}</div>

      <div style={styles.playerContainer}>
        {players.map((p, i) => (
          <div key={i} style={{...styles.playerCard, backgroundColor: i === currentPlayerIdx ? COLORS.primary : COLORS.card, color: i === currentPlayerIdx ? "#000" : "#fff"}}>
            <div style={{fontSize: 12}}>SPIELER {i+1}</div>
            <div style={{fontSize: 22, fontWeight: 800}}>{p.name}</div>
            <div style={{fontSize: 44, fontWeight: 900}}>{p.score}</div>
          </div>
        ))}
      </div>

      <div style={styles.roundCard}>
        <div style={{fontSize: 14, fontWeight: 700, marginBottom: 15}}>AKTUELLE RUNDE: <span style={{color: COLORS.primary}}>{players[currentPlayerIdx].name}</span></div>
        <div style={styles.dartRow}>
          {[0,1,2].map(i => <div key={i} style={styles.dartSlot}>{currentRound[i]?.label || "-"}</div>)}
        </div>
        <div style={{fontSize: 54, fontWeight: 900, color: COLORS.primary}}>{currentRound.reduce((s,d) => s + d.val, 0)}</div>
        <button onClick={handleFinishRound} style={styles.finishBtn}>RUNDE ABSCHLIESSEN</button>
      </div>

      <div style={styles.inputToggle}>
        <button onClick={() => setInputMode("keypad")} style={{...styles.toggle, color: inputMode === 'keypad' ? COLORS.primary : '#fff'}}>KEYPAD</button>
        <button onClick={() => setInputMode("board")} style={{...styles.toggle, color: inputMode === 'board' ? COLORS.primary : '#fff'}}>BOARD</button>
      </div>

      {inputMode === "keypad" && (
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
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  screen: { backgroundColor: COLORS.bg, minHeight: "100vh", color: "#fff", padding: "15px", fontFamily: 'Rajdhani, sans-serif', display: 'flex', flexDirection: 'column', gap: "15px" },
  logoBox: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: "#000" },
  title: { fontSize: 44, fontWeight: 900, color: COLORS.primary, textAlign: 'center', margin: 0 },
  subtitle: { fontSize: 12, textAlign: 'center', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 10 },
  card: { backgroundColor: COLORS.card, padding: 20, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 15 },
  label: { fontSize: 12, fontWeight: 700, color: COLORS.textMuted },
  row: { display: 'flex', gap: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 10, border: 'none', fontWeight: 800 },
  input: { backgroundColor: COLORS.bg, border: '1px solid #334155', padding: 15, borderRadius: 12, color: "#fff" },
  playerTag: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 700 },
  startBtn: { backgroundColor: "#fff", color: "#000", padding: 18, borderRadius: 15, fontWeight: 900, border: 'none', fontSize: 18 },
  commentBox: { backgroundColor: COLORS.card, padding: 15, borderRadius: 15, borderLeft: `4px solid ${COLORS.primary}`, fontStyle: 'italic' },
  playerContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  playerCard: { padding: 15, borderRadius: 20 },
  roundCard: { backgroundColor: COLORS.card, padding: 20, borderRadius: 24, textAlign: 'center' },
  dartRow: { display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 10 },
  dartSlot: { width: 55, height: 55, backgroundColor: COLORS.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, border: '1px solid #334155' },
  finishBtn: { backgroundColor: COLORS.primary, color: "#000", width: "100%", padding: 15, borderRadius: 15, fontWeight: 800, border: 'none', marginTop: 10 },
  inputToggle: { display: 'flex', backgroundColor: COLORS.card, borderRadius: 12, padding: 5 },
  toggle: { flex: 1, background: 'none', border: 'none', fontWeight: 700, padding: 10 },
  keypad: { backgroundColor: COLORS.card, padding: 15, borderRadius: 24 },
  multBtn: { flex: 1, padding: 10, borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 10 },
  gridBtn: { backgroundColor: COLORS.bg, border: 'none', color: '#fff', padding: "12px 0", borderRadius: 8, fontWeight: 700 },
  tvOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.98)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  progressBar: { width: '100%', height: 8, backgroundColor: COLORS.card, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, transition: 'width 0.3s' }
};
