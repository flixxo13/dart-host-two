import React, { useState, useEffect } from "react";
import * as webllm from "@mlc-ai/web-llm";

[span_3](start_span)// Utility Imports[span_3](end_span)
import { translateRound } from "./utils/dartTranslator"
import { simpleCommentary } from "./ai/simpleCommentator"
import { detectHighscore } from "./game/highscoreDetector"
import { getCheckoutSuggestion } from "./game/checkoutHelper"

/* ─────────────── DESIGN SYSTEM ─────────────── */
const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  primary: "#30D158", // Neon Green
  text: "#FFFFFF",
  textMuted: "#94A3B8",
  danger: "#EF4444",
  accent: "#3B82F6"
};

const SELECTED_MODEL = "Gemma-2b-it-q4f16_1-MLC"; [span_4](start_span)//[span_4](end_span)

export default function App() {
  [span_5](start_span)// KI-System States[span_5](end_span)
  const [engine, setEngine] = useState(null);
  const [loadingAI, setLoadingAI] = useState(true);
  const [loadProgress, setLoadProgress] = useState("System-Check...");
  
  [span_6](start_span)// Setup-Logik States[span_6](end_span)
  const [phase, setPhase] = useState("setup");
  const [playerName, setPlayerName] = useState(""); 
  const [players, setPlayers] = useState([]);
  const [gameMode, setGameMode] = useState(501);

  [span_7](start_span)// Game-Logik States[span_7](end_span)
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentRound, setCurrentRound] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [comment, setComment] = useState("Willkommen beim Match!");
  const [showTV, setShowTV] = useState(false);
  const [lastStats, setLastStats] = useState({ total: 0, rest: 0, name: "" });

  /* ─────────────── KI INITIALISIERUNG ─────────────── */
  useEffect(() => {
    async function initAI() {
      try {
        if (!navigator.gpu) throw new Error("WebGPU fehlt");
        const worker = new Worker(new URL("./ai-worker.js", import.meta.url), { type: "module" });
        const engineInstance = await webllm.CreateWebWorkerMLCEngine(worker, SELECTED_MODEL, { 
          initProgressCallback: (p) => setLoadProgress(`Gehirn wird geladen: ${Math.round(p.progress * 100)}%`)
        });
        [span_8](start_span)setEngine(engineInstance); //[span_8](end_span)
        setLoadingAI(false);
      } catch (e) {
        console.error("AI Error:", e);
        setLoadingAI(false);
      }
    }
    initAI();
  }, []);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE"; [span_9](start_span)//[span_9](end_span)
    window.speechSynthesis.speak(u);
  };

  const fetchAIComment = async (total, rest, name, bust) => {
    if (!engine) return `${name} wirft ${total}. Rest ${rest}.`; [span_10](start_span)//[span_10](end_span)
    try {
      const prompt = `Du bist ein frecher Dart-Moderator. Spieler: ${name}, Wurf: ${total}, Rest: ${rest}. ${bust ? 'Bust!' : ''} Antworte kurz, witzig, auf Deutsch. Max 12 Wörter.`; [span_11](start_span)//[span_11](end_span)
      const reply = await engine.chat.completions.create({ messages: [{ role: "user", content: prompt }] }); [span_12](start_span)//[span_12](end_span)
      return reply.choices[0].message.content;
    } catch (e) { return `${name} wirft ${total}.`; [span_13](start_span)} //[span_13](end_span)
  };

  /* ─────────────── SPIEL-AKTIONEN ─────────────── */
  const addPlayer = () => {
    if (playerName.trim() !== "" && players.length < 4) {
      setPlayers([...players, { 
        name: playerName.trim(), 
        score: gameMode, 
        avg: "0.0", 
        dartsThrown: 0 
      }]);
      setPlayerName(""); [span_14](start_span)// Feld leeren[span_14](end_span)
    }
  };

  const addDart = (val) => {
    if (currentRound.length >= 3) return; [span_15](start_span)//[span_15](end_span)
    const score = val * multiplier;
    const label = val === 0 ? "Miss" : (multiplier === 3 ? `T${val}` : multiplier === 2 ? `D${val}` : `${val}`); [span_16](start_span)//[span_16](end_span)
    setCurrentRound([...currentRound, { val: score, label }]); [span_17](start_span)//[span_17](end_span)
    setMultiplier(1);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const finishRound = async () => {
    if (currentRound.length === 0) return;

    const total = currentRound.reduce((s, d) => s + d.val, 0);
    const newPlayers = [...players];
    const p = newPlayers[currentPlayerIdx];

    const bust = p.score - total < 0 || p.score - total === 1;

    if (!bust) {
      p.score -= total;
    }

    p.dartsThrown += currentRound.length;
    p.avg = ((gameMode - p.score) / (p.dartsThrown / 3) || 0).toFixed(1);
    setPlayers(newPlayers);

    /* ---------- Einfache Sprache ---------- */
    const simpleThrows = translateRound(currentRound);
    const simpleComment = simpleCommentary(currentRound, p.score + total, p.score);

    /* ---------- Highscore erkennen ---------- */
    const highscore = detectHighscore(currentRound);
    let extraComment = "";
    if (highscore === "180") {
      extraComment = "Perfekte Runde! Einhundertachtzig Punkte.";
    } else if (highscore === "140+") {
      extraComment = "Sehr starke Runde über einhundertvierzig Punkte.";
    }

    /* ---------- Checkout Empfehlung ---------- */
    const checkout = getCheckoutSuggestion(p.score);
    if (checkout) {
      extraComment += ` Empfehlung: ${checkout}`;
    }

    /* ---------- Kommentar zusammensetzen ---------- */
    const baseComment = `${p.name}: ${simpleThrows}. ${simpleComment}.`;
    let aiResponse = baseComment;

    if (engine) {
      try {
        const aiComment = await fetchAIComment(total, p.score, p.name, bust);
        aiResponse = `${baseComment} ${aiComment}`;
      } catch (e) {
        console.error(e);
      }
    }

    if (extraComment !== "") {
      aiResponse += " " + extraComment;
    }

    setComment(aiResponse);
    speak(aiResponse);
    setLastStats({ total, rest: p.score, name: p.name });
    setShowTV(true);

    setTimeout(() => {
      setShowTV(false);
      setCurrentRound([]);
      if (p.score === 0) {
        setComment(`GAME OVER! ${p.name} GEWINNT!`);
        setPhase("setup");
      } else {
        setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
      }
    }, 3000);
  };

  /* ─────────────── RENDERING ─────────────── */

  if (loadingAI) return (
    <div style={styles.screenCenter}>
      <div style={styles.logoBoxLarge}>DH</div>
      <h2 style={{color: COLORS.primary, letterSpacing: 4, marginTop: 20}}>DART HOST</h2>
      <div style={styles.progressBar}><div style={{...styles.progressFill, width: loadProgress.includes("%") ? `${loadProgress.split(":")[1].trim()}` : "10%"}} /></div>
      <p style={{fontSize: 14, color: COLORS.textMuted}}>{loadProgress}</p>
    </div>
  );

  if (phase === "setup") return (
    <div style={styles.screen}>
      <div style={{textAlign: 'center', marginTop: 40}}>
        <h1 style={styles.setupTitle}>DART HOST</h1>
        <p style={styles.setupSubtitle}>PREMIUM SCOREBOARD ASSISTANT</p>
      </div>
      
      <div style={styles.setupCard}>
        <label style={styles.label}>SPIELMODUS</label>
        <div style={styles.row}>
          {[301, 501, 701].map(m => (
            <button key={m} onClick={() => setGameMode(m)} style={{...styles.modeBtn, backgroundColor: gameMode === m ? COLORS.primary : COLORS.bg, color: gameMode === m ? "#000" : "#fff"}}>{m}</button>
          ))}
        </div>

        <label style={styles.label}>SPIELER ({players.length}/4)</label>
        <div style={{ display: 'flex', gap: 10 }}>
            <input 
              style={{...styles.input, flex: 1}} 
              placeholder="Name eingeben..." 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()} 
            />
            <button onClick={addPlayer} style={styles.addPlayerBtn}>+</button>
        </div>
        
        <div style={styles.playerList}>
          {players.map((p, i) => (
            <div key={i} style={styles.playerTag}>
              <span>0{i+1} {p.name}</span>
              <button onClick={() => setPlayers(players.filter((_, idx) => idx !== i))} style={styles.delBtn}>✕</button>
            </div>
          ))}
        </div>

        <button 
          onClick={() => players.length > 0 && setPhase("playing")} 
          style={{...styles.startBtn, opacity: players.length > 0 ? 1 : 0.5}}
          disabled={players.length === 0}
        >
          {players.length > 0 ? "SPIEL STARTEN ▶" : "SPIELER HINZUFÜGEN"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.screen}>
      {showTV && (
        <div style={styles.tvOverlay}>
          <div style={{color: COLORS.primary, fontSize: 24, fontWeight: 700}}>{lastStats.name}</div>
          <div style={{fontSize: 140, fontWeight: 900}}>{lastStats.total}</div>
          <div style={{fontSize: 32, color: COLORS.textMuted}}>REST: {lastStats.rest}</div>
        </div>
      )}

      <header style={styles.header}>
        <div style={styles.logoBoxSmall}>DH</div>
        <div>
          <div style={{fontSize: 18, fontWeight: 900}}>DART HOST</div>
          <div style={{fontSize: 10, color: COLORS.primary, letterSpacing: 1}}>LIVE MATCH</div>
        </div>
        <div style={{marginLeft: 'auto', display: 'flex', gap: 15}}>
          <button style={styles.iconBtn} onClick={() => setCurrentRound([])}>↺</button>
          <button style={styles.iconBtn} onClick={() => setPhase("setup")}>✕</button>
        </div>
      </header>

      <div style={styles.commentBox}>
        <div style={{fontSize: 10, fontWeight: 900, color: COLORS.primary, marginBottom: 4}}>📢 HOST KOMMENTAR</div>
        <div style={{fontStyle: 'italic', fontSize: 15}}>"{comment}"</div>
      </div>

      <div style={styles.scoreboard}>
        {players.map((p, i) => (
          <div key={i} style={{...styles.playerCard, borderLeft: i === currentPlayerIdx ? `4px solid ${COLORS.primary}` : 'none', opacity: i === currentPlayerIdx ? 1 : 0.5}}>
             <div style={{fontSize: 10, color: COLORS.textMuted}}>SPIELER {i+1}</div>
             <div style={{fontSize: 22, fontWeight: 800, color: i === currentPlayerIdx ? COLORS.primary : "#fff"}}>{p.name}</div>
             <div style={{fontSize: 48, fontWeight: 900, margin: '5px 0'}}>{p.score}</div>
             <div style={styles.statRow}>
               <span>AVG: {p.avg}</span>
               <span>DARTS: {p.dartsThrown}</span>
             </div>
          </div>
        ))}
      </div>

      <div style={styles.roundCard}>
        <div style={styles.dartRow}>
          {[0,1,2].map(i => <div key={i} style={styles.dartSlot}>{currentRound[i]?.label || "-"}</div>)}
        </div>
        <div style={{fontSize: 56, fontWeight: 900, color: COLORS.primary}}>{currentRound.reduce((s,d) => s + d.val, 0)}</div>
        
        <button onClick={finishRound} style={styles.finishBtn}>RUNDE ABSCHLIESSEN</button>
        <div style={styles.actionRow}>
          <button style={styles.subBtn} onClick={() => setCurrentRound(currentRound.slice(0,-1))}>LÖSCHEN</button>
          <button style={styles.subBtn} onClick={() => addDart(0)}>FEHLWURF</button>
        </div>
      </div>

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
    </div>
  );
}

const styles = {
  screen: { backgroundColor: COLORS.bg, minHeight: "100vh", color: "#fff", padding: "16px", fontFamily: "sans-serif", display: 'flex', flexDirection: 'column', gap: "16px" },
  screenCenter: { backgroundColor: COLORS.bg, height: "100vh", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: "40px" },
  logoBoxLarge: { width: 60, height: 60, backgroundColor: COLORS.primary, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: "#000" },
  logoBoxSmall: { width: 42, height: 42, backgroundColor: COLORS.primary, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: "#000" },
  setupTitle: { fontSize: 48, fontWeight: 900, color: COLORS.primary, margin: 0 },
  setupSubtitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 30 },
  setupCard: { backgroundColor: COLORS.card, padding: 24, borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', alignItems: 'center', gap: 12 },
  iconBtn: { background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 22 },
  commentBox: { backgroundColor: COLORS.card, padding: 16, borderRadius: 20, borderLeft: `4px solid ${COLORS.primary}` },
  scoreboard: { display: 'flex', flexDirection: 'column', gap: 12 },
  playerCard: { backgroundColor: COLORS.card, padding: 16, borderRadius: 22 },
  statRow: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.textMuted },
  roundCard: { backgroundColor: COLORS.card, padding: 20, borderRadius: 28, textAlign: 'center' },
  dartRow: { display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 },
  dartSlot: { width: 55, height: 55, backgroundColor: COLORS.bg, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, border: '1px solid #334155' },
  finishBtn: { backgroundColor: COLORS.primary, color: "#000", width: "100%", padding: 18, borderRadius: 16, fontWeight: 900, border: 'none' },
  actionRow: { display: 'flex', gap: 10, marginTop: 12 },
  subBtn: { flex: 1, backgroundColor: "#334155", color: "#fff", padding: 12, borderRadius: 12, border: 'none' },
  keypad: { backgroundColor: COLORS.card, padding: 16, borderRadius: 24 },
  multBtn: { flex: 1, padding: 12, borderRadius: 10, border: 'none', fontWeight: 800 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 15 },
  gridBtn: { backgroundColor: COLORS.bg, border: 'none', color: '#fff', padding: "16px 0", borderRadius: 12, fontWeight: 700 },
  modeBtn: { flex: 1, padding: 15, borderRadius: 12, border: 'none', fontWeight: 800 },
  input: { backgroundColor: COLORS.bg, border: '1px solid #334155', padding: 16, borderRadius: 14, color: "#fff" },
  addPlayerBtn: { backgroundColor: COLORS.primary, border: 'none', borderRadius: 14, width: 55, fontSize: 24, fontWeight: 'bold' },
  playerList: { display: 'flex', flexDirection: 'column', gap: 8 },
  playerTag: { backgroundColor: COLORS.bg, padding: 14, borderRadius: 14, display: 'flex', justifyContent: 'space-between' },
  startBtn: { backgroundColor: COLORS.primary, color: "#000", padding: 20, borderRadius: 18, fontWeight: 900, border: 'none', fontSize: 18 },
  tvOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15,23,42,0.98)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  progressBar: { width: '100%', height: 8, backgroundColor: COLORS.card, borderRadius: 4, overflow: 'hidden', margin: '20px 0' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, transition: 'width 0.4s' },
  label: { fontSize: 11, fontWeight: 800, color: COLORS.textMuted },
  row: { display: 'flex', gap: 10 },
  delBtn: { background: 'none', border: 'none', color: COLORS.danger, fontSize: 18 }
};
