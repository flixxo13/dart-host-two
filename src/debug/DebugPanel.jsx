import React from 'react';

const C = {
  bg: '#060D1A',
  card: '#0F1E30',
  border: '#1E3A52',
  green: '#30D158',
  red: '#EF4444',
  yellow: '#F59E0B',
  blue: '#3B82F6',
  purple: '#A855F7',
  gray: '#94A3B8',
  white: '#F1F5F9'
};

function Badge({ label, color, blink }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        backgroundColor: color + '22',
        border: '1px solid ' + color + '66',
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: 11,
        fontWeight: 700,
        color: color,
        letterSpacing: 0.5,
        animation: blink ? 'blink 1s step-start infinite' : 'none'
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
          boxShadow: blink ? '0 0 6px ' + color : 'none'
        }}
      />
      {label}
    </span>
  );
}

function Row({ label, children }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '7px 0',
        borderBottom: '1px solid ' + C.border,
        gap: 12
      }}
    >
      <span style={{ fontSize: 11, color: C.gray, fontWeight: 600, minWidth: 130 }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: C.white, fontWeight: 700, textAlign: 'right' }}>
        {children}
      </span>
    </div>
  );
}

function EventTypeBadge({ type }) {
  const colorMap = {
    finish: C.green,
    bust: C.red,
    perfect: C.yellow,
    highscore: C.yellow,
    checkout: C.blue,
    strong: C.blue,
    miss: C.gray,
    normal: C.gray,
    idle: C.purple,
    '-': C.gray
  };
  const color = colorMap[type] || C.gray;
  return <Badge label={type || '-'} color={color} />;
}

function SourceBadge({ source }) {
  const map = {
    ai: { label: 'KI generiert', color: C.purple },
    rules: { label: 'Regelbasiert', color: C.blue },
    none: { label: 'Übersprungen', color: C.gray },
    '-': { label: 'Kein Eintrag', color: C.gray }
  };
  const entry = map[source] || map['-'];
  return <Badge label={entry.label} color={entry.color} />;
}

function PriorityBadge({ priority }) {
  const map = {
    critical: C.red,
    high: C.yellow,
    normal: C.blue,
    low: C.gray
  };
  const color = map[priority] || C.gray;
  return <Badge label={priority || '-'} color={color} />;
}

function CommentaryLogEntry({ entry, index }) {
  const time = new Date(entry.at).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div
      style={{
        backgroundColor: index === 0 ? C.card : 'transparent',
        borderRadius: 10,
        padding: '10px 12px',
        marginBottom: 6,
        border: index === 0 ? '1px solid ' + C.border : '1px solid transparent'
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 6
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: C.gray,
            fontFamily: 'monospace',
            minWidth: 70
          }}
        >
          {time}
        </span>
        <EventTypeBadge type={entry.type} />
        <SourceBadge source={entry.source} />
        {entry.priority && <PriorityBadge priority={entry.priority} />}
      </div>
      <div
        style={{
          fontSize: 13,
          color: index === 0 ? C.white : C.gray,
          fontStyle: 'italic',
          lineHeight: 1.5
        }}
      >
        "{entry.text}"
      </div>
    </div>
  );
}

export default function DebugPanel({
  visible,
  onClose,
  aiStatus,
  webGpuAvailable,
  personaId,
  personaLabel,
  moderationMode,
  speechState,
  debugInfo,
  commentaryLog
}) {
  if (!visible) return null;

  const aiStatusConfig = {
    loading: { label: 'KI lädt...', color: C.yellow, blink: true },
    active: { label: 'KI aktiv (WebGPU)', color: C.green, blink: false },
    fallback: { label: 'Offline-Regeln aktiv', color: C.blue, blink: false },
    disabled: { label: 'KI deaktiviert', color: C.gray, blink: false },
    error: { label: 'KI Fehler', color: C.red, blink: true }
  };

  const statusEntry = aiStatusConfig[aiStatus] || aiStatusConfig.fallback;

  return (
    <>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2000,
          backgroundColor: '#030912',
          borderTop: '2px solid ' + C.border,
          maxHeight: '70vh',
          overflowY: 'auto',
          padding: '16px 16px 32px 16px',
          fontFamily: 'monospace'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: C.green,
                letterSpacing: 2
              }}
            >
              DEBUG PANEL
            </span>
            <Badge label="DART HOST" color={C.green} />
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid ' + C.border,
              color: C.gray,
              borderRadius: 8,
              padding: '4px 12px',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            SCHLIESSEN ✕
          </button>
        </div>

        {/* System Status */}
        <div
          style={{
            backgroundColor: C.card,
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 12,
            border: '1px solid ' + C.border
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: C.gray,
              letterSpacing: 2,
              marginBottom: 10
            }}
          >
            SYSTEM STATUS
          </div>

          <Row label="KI Engine">
            <Badge
              label={statusEntry.label}
              color={statusEntry.color}
              blink={statusEntry.blink}
            />
          </Row>

          <Row label="WebGPU">
            <Badge
              label={webGpuAvailable ? 'Verfügbar' : 'Nicht verfügbar'}
              color={webGpuAvailable ? C.green : C.red}
            />
          </Row>

          <Row label="Persona">
            <Badge label={personaLabel || personaId} color={C.yellow} />
          </Row>

          <Row label="Moderation Modus">
            <Badge
              label={moderationMode?.toUpperCase() || 'AUTO'}
              color={
                moderationMode === 'minimal'
                  ? C.gray
                  : moderationMode === 'showtime'
                    ? C.yellow
                    : C.blue
              }
            />
          </Row>
        </div>

        {/* Speech State */}
        <div
          style={{
            backgroundColor: C.card,
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 12,
            border: '1px solid ' + C.border
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: C.gray,
              letterSpacing: 2,
              marginBottom: 10
            }}
          >
            SPRACH-ENGINE
          </div>

          <Row label="TTS aktiv">
            <Badge
              label={speechState?.speaking ? 'SPRICHT GERADE' : 'BEREIT'}
              color={speechState?.speaking ? C.green : C.gray}
              blink={speechState?.speaking}
            />
          </Row>

          <Row label="Queue Länge">
            <span
              style={{
                color: speechState?.queued > 0 ? C.yellow : C.gray,
                fontWeight: 900
              }}
            >
              {speechState?.queued ?? 0} Einträge
            </span>
          </Row>
        </div>

        {/* Last Event */}
        <div
          style={{
            backgroundColor: C.card,
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 12,
            border: '1px solid ' + C.border
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: C.gray,
              letterSpacing: 2,
              marginBottom: 10
            }}
          >
            LETZTES MODERATIONSEREIGNIS
          </div>

          <Row label="Event Typ">
            <EventTypeBadge type={debugInfo?.eventType} />
          </Row>

          <Row label="Quelle">
            <SourceBadge source={debugInfo?.source} />
          </Row>

          <Row label="Priorität">
            <PriorityBadge priority={debugInfo?.priority} />
          </Row>

          <Row label="Persona verwendet">
            <Badge
              label={debugInfo?.persona || '-'}
              color={C.yellow}
            />
          </Row>

          <Row label="Übersprungen">
            <Badge
              label={debugInfo?.skipped ? 'JA' : 'NEIN'}
              color={debugInfo?.skipped ? C.red : C.green}
            />
          </Row>

          {debugInfo?.error && (
            <Row label="Fehler">
              <span style={{ fontSize: 11, color: C.red }}>
                {String(debugInfo.error).slice(0, 60)}
              </span>
            </Row>
          )}
        </div>

        {/* Commentary Log */}
        <div
          style={{
            backgroundColor: C.card,
            borderRadius: 14,
            padding: '12px 16px',
            border: '1px solid ' + C.border
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: C.gray,
              letterSpacing: 2,
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>KOMMENTAR VERLAUF</span>
            <span style={{ color: C.blue }}>
              {commentaryLog?.length || 0} Einträge
            </span>
          </div>

          {(!commentaryLog || commentaryLog.length === 0) && (
            <div style={{ color: C.gray, fontSize: 12, padding: '8px 0' }}>
              Noch keine Kommentare in dieser Sitzung.
            </div>
          )}

          {commentaryLog &&
            commentaryLog.slice(0, 8).map((entry, i) => (
              <CommentaryLogEntry key={i} entry={entry} index={i} />
            ))}
        </div>
      </div>
    </>
  );
}
