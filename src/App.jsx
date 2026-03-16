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
  const [loadProgress, setLoadProgress] = useState("Initialisiere...");
  const [playerName, setPlayerName] = useState("");
  
  const [phase, setPhase] = useState("setup"); 
  const [players, setPlayers] = useState([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [gameMode, setGameMode] = useState(501);
  const [currentRound, setCurrentRound] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [comment, setComment] = useState("Willkommen!");
  const [showTV, setShowTV] = useState(false);
  const [lastStats, setLastStats] = useState({ total: 0, rest: 0, name: "" });

  useEffect(() => {
    async function init() {
      try {
        const worker = new Worker(new URL("./ai-worker.js", import.meta.url), { type: "module" });
        const engineInstance = await webllm.CreateWebWorkerMLCEngine(worker, SELECTED_MODEL, { 
          initProgressCallback: (p) => {
            setLoadProgress(`Lade KI: ${Math.round(p.progress * 100)}%`);
            if (p.progress >= 1) {
                setTimeout(() => setLoadingAI(false), 1000);
            }
          }
        });
        setEngine(engineInstance);
        setLoadingAI(false);
      } catch (e) {
        setLoadProgress("KI nicht verfügbar.");
        setTimeout(() => setLoadingAI(false), 2000);
      }
    }
    init();
  }, []);

  const addPlayer = () => {
    if (playerName.trim() !== "") {
      setPlayers([...players, { 
        name: playerName, 
        score: gameMode, 
        avg: "0.0", 
        dartsThrown: 0 
      }]);
      setPlayerName("");
    }
  };

  const finishRound = async () => {
    if (currentRound.length === 0) return;
    const total = currentRound.reduce((s, d) => s + d.val, 0);
    const newPlayers = [...players];
    const p = newPlayers[currentPlayerIdx];
    
    const bust = p.score - total < 0 || p.score - total === 1;
    if (!bust) p.score -= total;
    p.dartsThrown += currentRound.length;

    setLastStats({ total, rest: p.score, name: p.name });
    setShowTV(true);
    
    // KI Moderation (optional, falls Engine bereit)
    if (engine) {
        const prompt = `Kurzer Dart Kommentar auf Deutsch: ${p.name} warf ${total}. Rest ${p.score}.`;
        const reply = await engine.chat.completions.create({ messages: [{ role: "user", content: prompt }] });
        setComment(reply.choices[0].message.content);
    }

    setTimeout(() => {
      setShowTV(false);
      setCurrentRound([]);
      setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
    }, 2500);
  };

  if (loadingAI) return (
    <div style={styles.screenCenter}>
      <div style={styles.logoBoxLarge}>DH</div>
      <h2 style={{color: COLORS.primary, marginTop: 20}}>DART HOST TWO</h2>
      <div style={styles.progressBar}>
        <div style={{...styles.progressFill, width: loadProgress.includes("%") ? loadProgress.split(":")[1].trim() : "10%"}} />
      </div>
      <p style={{fontSize: 14}}>{loadProgress}</p>
      <button onClick={() => setLoadingAI(false)} style={{marginTop: 30, background: 'none', border: `1px solid ${COLORS.textMuted}`, color: COLORS.textMuted, padding: '5px 15px', borderRadius: 20, fontSize: 12}}>
        Überspringen & Starten
      </button>
    </div>
  );

  if (phase === "setup") return (
    <div style={styles.screen}>
      <h1 style={styles.setupTitle}>DART HOST</h1>
      <div style={styles.setupCard}>
        <label style={styles.label}>MODUS</label>
        <div style={styles.row}>
          {[301, 501].map(m => (
            <button key={m} onClick={() => setGameMode(m)} style={{...styles.modeBtn, backgroundColor: gameMode === m ? COLORS.primary : COLORS.bg, color: gameMode === m ? "#000" : "#fff"}}>{m}</button>
          ))}
        </div>

        <label style={styles.label}>SPIELER HINZUFÜGEN</label>
        <div style={styles.row}>
          <input 
            style={{...styles.input, flex: 1}} 
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Name..." 
          />
          <button onClick={addPlayer} style={styles.addBtn}>+</button>
        </div>
        
        <div style={styles.playerList}>
          {players.map((p, i) => (
            <div key={i} style={styles.playerTag}>
              <span>{p.name}</span>
              <button onClick={() => setPlayers(players.filter((_, idx) => idx !== i))} style={{background:'none', border:'none', color: COLORS.danger}}>✕</button>
            </div>
          ))}
        </div>

        <button 
          disabled={players.length === 0}
          onClick={() => setPhase("playing")} 
          style={{...styles.startBtn, opacity: players.length > 0 ? 1 : 0.3}}
        >
          SPIEL STARTEN ▶
        </button>
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
      <div style={styles.scoreboard}>
        {players.map((p, i) => (
          <div key={i} style={{...styles.playerCard, borderLeft: i === currentPlayerIdx ? `4px solid ${COLORS.primary}` : 'none', opacity: i === currentPlayerIdx ? 1 : 0.4}}>
             <div style={{fontSize: 18, fontWeight: 800}}>{p.name}</div>
             <div style={{fontSize: 48, fontWeight: 900}}>{p.score}</div>
          </div>
        ))}
      </div>
      <div style={styles.roundCard}>
        <div style={styles.dartRow}>
          {[0,1,2].map(i => <div key={i} style={styles.dartSlot}>{currentRound[i]?.label || "-"}</div>)}
        </div>
        <button onClick={finishRound} style={styles.finishBtn}>OK</button>
      </div>
      {/* Hier das Keypad wie zuvor... */}
    </div>
  );
}

const styles = {
  screen: { backgroundColor: COLORS.bg, minHeight: "100vh", color: "#fff", padding: "16px", display: "flex", flexDirection: "column", gap: "16px", fontFamily: "sans-serif" },
  screenCenter: { backgroundColor: COLORS.bg, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" },
  logoBoxLarge: { width: 60, height: 60, backgroundColor: COLORS.primary, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "#000" },
  setupTitle: { fontSize: 42, fontWeight: 900, color: COLORS.primary, textAlign: 'center' },
  setupCard: { backgroundColor: COLORS.card, padding: 24, borderRadius: 28, display: "flex", flexDirection: "column", gap: 16 },
  label: { fontSize: 11, fontWeight: 800, color: COLORS.textMuted },
  row: { display: "flex", gap: 10 },
  input: { backgroundColor: COLORS.bg, border: "1px solid #334155", padding: 15, borderRadius: 12, color: "#fff" },
  addBtn: { width: 50, backgroundColor: COLORS.primary, border: 'none', borderRadius: 12, fontSize: 24, fontWeight: 900 },
  playerList: { display: 'flex', flexDirection: 'column', gap: 8 },
  playerTag: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 12, display: 'flex', justifyContent: 'space-between' },
  startBtn: { backgroundColor: "#fff", color: "#000", padding: 20, borderRadius: 18, fontWeight: 900, border: "none", fontSize: 18 },
  modeBtn: { flex: 1, padding: 12, borderRadius: 10, border: "none", fontWeight: 800 },
  progressBar: { width: '100%', height: 8, backgroundColor: COLORS.card, borderRadius: 4, margin: '20px 0', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, transition: 'width 0.3s' },
  // ... Restliche Styles wie zuvor
  commentBox: { backgroundColor: COLORS.card, padding: 15, borderRadius: 15, borderLeft: `4px solid ${COLORS.primary}`, fontStyle: 'italic' },
  scoreboard: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  playerCard: { backgroundColor: COLORS.card, padding: 15, borderRadius: 20 },
  roundCard: { backgroundColor: COLORS.card, padding: 20, borderRadius: 24, textAlign: 'center' },
  dartRow: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 },
  dartSlot: { width: 50, height: 50, backgroundColor: COLORS.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155' },
  finishBtn: { backgroundColor: COLORS.primary, color: "#000", width: "100%", padding: 15, borderRadius: 12, fontWeight: 800, border: "none" }
};
