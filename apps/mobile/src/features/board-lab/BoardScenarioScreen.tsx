import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { Chess } from 'chess.js';
import { ChessgroundBoard } from '../board/ChessgroundBoard';
import type {
  BoardErrorEvent,
  BoardMoveEvent,
  BoardReadyEvent,
} from '../board/board.types';
import { BOARD_SCENARIOS, findScenario } from './fixtures';

type LogEntry = {
  id: number;
  kind: 'ready' | 'move' | 'error' | 'state';
  message: string;
  timestamp: number;
};

const STRESS_POSITIONS: Array<{
  fen: string;
  lastMove: [string, string] | null;
}> = [
  { fen: 'startpos', lastMove: null },
  {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    lastMove: ['e2', 'e4'],
  },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    lastMove: ['e7', 'e5'],
  },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    lastMove: ['g1', 'f3'],
  },
];

export function BoardScenarioScreen() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const [scenarioId, setScenarioId] = useState(BOARD_SCENARIOS[0]!.id);
  const initialScenario = findScenario(scenarioId);
  const [fen, setFen] = useState(initialScenario.fen);
  const [orientation, setOrientation] = useState(initialScenario.orientation);
  const [lastMove, setLastMove] = useState<[string, string] | null>(
    initialScenario.lastMove ?? null,
  );
  const [arrows, setArrows] = useState(initialScenario.arrows ?? []);
  const [coordinates, setCoordinates] = useState(true);
  const [movable, setMovable] = useState(initialScenario.movable ?? true);
  const [positionVersion, setPositionVersion] = useState(0);
  const [pendingMove, setPendingMove] = useState<BoardMoveEvent | null>(null);
  const [boardReady, setBoardReady] = useState<BoardReadyEvent | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stressRunning, setStressRunning] = useState(false);
  const seenEventIdsRef = useRef(new Set<string>());
  const logSequenceRef = useRef(0);

  const scenario = useMemo(() => findScenario(scenarioId), [scenarioId]);
  const boardSize = Math.min(width - 24, 520);
  const dark = colorScheme === 'dark';

  function appendLog(kind: LogEntry['kind'], message: string): void {
    logSequenceRef.current += 1;
    setLogs((current) => [
      {
        id: logSequenceRef.current,
        kind,
        message,
        timestamp: Date.now(),
      },
      ...current,
    ].slice(0, 40));
  }

  function loadScenario(nextId: string): void {
    const next = findScenario(nextId);
    setScenarioId(next.id);
    setFen(next.fen);
    setOrientation(next.orientation);
    setLastMove(next.lastMove ?? null);
    setArrows(next.arrows ?? []);
    setMovable(next.movable ?? true);
    setPendingMove(null);
    setPositionVersion((value) => value + 1);
    appendLog('state', `Loaded scenario: ${next.label}`);
  }

  async function handleMove(event: BoardMoveEvent): Promise<void> {
    const duplicate = seenEventIdsRef.current.has(event.eventId);
    if (duplicate) {
      setDuplicateCount((value) => value + 1);
      appendLog('error', `Duplicate move event ${event.eventId}: ${event.uci}`);
      return;
    }

    seenEventIdsRef.current.add(event.eventId);
    setMoveCount((value) => value + 1);
    setPendingMove(event);
    appendLog('move', `${event.eventId}: ${event.uci}`);
  }

  async function handleReady(event: BoardReadyEvent): Promise<void> {
    setBoardReady(event);
    appendLog(
      'ready',
      `${event.instanceId}; initialization count ${event.initializationCount}`,
    );
  }

  async function handleError(event: BoardErrorEvent): Promise<void> {
    setErrorCount((value) => value + 1);
    appendLog('error', `${event.code}: ${event.message}`);
  }

  function acceptPendingMove(): void {
    if (!pendingMove) return;
    try {
      const next = applyUci(fen, pendingMove.uci);
      setFen(next.fen);
      setLastMove(next.lastMove);
      setPendingMove(null);
      setPositionVersion((value) => value + 1);
      appendLog('state', `Accepted ${pendingMove.uci}`);
    } catch (error) {
      Alert.alert('Could not accept move', error instanceof Error ? error.message : String(error));
    }
  }

  function rejectPendingMove(): void {
    if (!pendingMove) return;
    appendLog('state', `Rejected ${pendingMove.uci}; authoritative FEN restored`);
    setPendingMove(null);
    setLastMove(null);
    setPositionVersion((value) => value + 1);
  }

  function applyExternalMove(): void {
    try {
      const game = createGame(fen);
      const move = game.moves({ verbose: true })[0];
      if (!move) {
        appendLog('error', 'No legal external move in this position');
        return;
      }
      game.move({ from: move.from, to: move.to, promotion: move.promotion });
      setFen(game.fen());
      setLastMove([move.from, move.to]);
      setPendingMove(null);
      appendLog('state', `Applied external move ${move.from}${move.to}${move.promotion ?? ''}`);
    } catch (error) {
      appendLog('error', `External move failed: ${String(error)}`);
    }
  }

  async function runPositionStress(): Promise<void> {
    if (stressRunning) return;
    setStressRunning(true);
    appendLog('state', 'Starting 100 external position updates');
    for (let index = 0; index < 100; index += 1) {
      const position = STRESS_POSITIONS[index % STRESS_POSITIONS.length]!;
      setFen(position.fen);
      setLastMove(position.lastMove);
      await delay(35);
    }
    setPositionVersion((value) => value + 1);
    setStressRunning(false);
    appendLog('state', 'Completed 100 external position updates');
  }

  async function runResetStress(): Promise<void> {
    if (stressRunning) return;
    setStressRunning(true);
    appendLog('state', 'Starting 100 authoritative same-FEN resets');
    for (let index = 0; index < 100; index += 1) {
      setPositionVersion((value) => value + 1);
      await delay(35);
    }
    setStressRunning(false);
    appendLog('state', 'Completed 100 authoritative same-FEN resets');
  }

  async function shareDiagnostics(): Promise<void> {
    const body = [
      'Chessground Phase 0 diagnostics',
      `Scenario: ${scenario.label}`,
      `FEN: ${fen}`,
      `Orientation: ${orientation}`,
      `Board instance: ${boardReady?.instanceId ?? 'not ready'}`,
      `Initialization count: ${boardReady?.initializationCount ?? 0}`,
      `Move events: ${moveCount}`,
      `Duplicate events: ${duplicateCount}`,
      `Errors: ${errorCount}`,
      '',
      ...logs.map((entry) => `${new Date(entry.timestamp).toISOString()} [${entry.kind}] ${entry.message}`),
    ].join('\n');
    await Share.share({ message: body });
  }

  return (
    <SafeAreaView style={[styles.safeArea, dark && styles.safeAreaDark]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.eyebrow, dark && styles.mutedDark]}>PHASE 0 FEASIBILITY HARNESS</Text>
        <Text style={[styles.title, dark && styles.textDark]}>Actual Lichess Chessground</Text>
        <Text style={[styles.subtitle, dark && styles.mutedDark]}>
          The board below runs inside an Expo DOM component. Use the controls to accept or reject its semantic move event.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scenarioRow}
        >
          {BOARD_SCENARIOS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => loadScenario(item.id)}
              style={[
                styles.scenarioChip,
                item.id === scenarioId && styles.scenarioChipActive,
                dark && styles.panelDark,
              ]}
            >
              <Text
                style={[
                  styles.scenarioChipText,
                  item.id === scenarioId && styles.scenarioChipTextActive,
                  dark && item.id !== scenarioId && styles.textDark,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.panel, dark && styles.panelDark]}>
          <Text style={[styles.panelTitle, dark && styles.textDark]}>{scenario.label}</Text>
          <Text style={[styles.panelBody, dark && styles.mutedDark]}>{scenario.description}</Text>
          {scenario.suggestedMove ? (
            <Text style={[styles.hint, dark && styles.textDark]}>Suggested move: {scenario.suggestedMove}</Text>
          ) : null}
        </View>

        <ChessgroundBoard
          size={boardSize}
          fen={fen}
          orientation={orientation}
          lastMove={lastMove}
          arrows={arrows}
          coordinates={coordinates}
          movable={movable}
          positionVersion={positionVersion}
          onMove={handleMove}
          onReady={handleReady}
          onError={handleError}
        />

        <View style={[styles.pendingPanel, dark && styles.panelDark]}>
          <Text style={[styles.panelTitle, dark && styles.textDark]}>
            {pendingMove ? `Pending move: ${pendingMove.uci}` : 'No pending move'}
          </Text>
          <Text style={[styles.panelBody, dark && styles.mutedDark]}>
            A move remains locked until native state accepts it or restores the authoritative FEN.
          </Text>
          <View style={styles.buttonRow}>
            <ControlButton
              label="Accept"
              disabled={!pendingMove}
              onPress={acceptPendingMove}
            />
            <ControlButton
              label="Reject / snap back"
              disabled={!pendingMove}
              onPress={rejectPendingMove}
              secondary
            />
          </View>
        </View>

        <View style={styles.controlGrid}>
          <ControlButton
            label={`Orientation: ${orientation}`}
            onPress={() => setOrientation((value) => value === 'white' ? 'black' : 'white')}
            secondary
          />
          <ControlButton
            label={`Coordinates: ${coordinates ? 'on' : 'off'}`}
            onPress={() => setCoordinates((value) => !value)}
            secondary
          />
          <ControlButton
            label={`Movable: ${movable ? 'yes' : 'no'}`}
            onPress={() => setMovable((value) => !value)}
            secondary
          />
          <ControlButton label="Apply external move" onPress={applyExternalMove} secondary />
          <ControlButton
            label={stressRunning ? 'Stress running…' : '100 position updates'}
            disabled={stressRunning}
            onPress={() => void runPositionStress()}
            secondary
          />
          <ControlButton
            label={stressRunning ? 'Stress running…' : '100 same-FEN resets'}
            disabled={stressRunning}
            onPress={() => void runResetStress()}
            secondary
          />
        </View>

        <View style={[styles.panel, dark && styles.panelDark]}>
          <Text style={[styles.panelTitle, dark && styles.textDark]}>Diagnostics</Text>
          <Diagnostic label="Board instance" value={boardReady?.instanceId ?? 'Waiting…'} dark={dark} />
          <Diagnostic label="Initialization count" value={String(boardReady?.initializationCount ?? 0)} dark={dark} />
          <Diagnostic label="Move events" value={String(moveCount)} dark={dark} />
          <Diagnostic label="Duplicate events" value={String(duplicateCount)} dark={dark} danger={duplicateCount > 0} />
          <Diagnostic label="Errors" value={String(errorCount)} dark={dark} danger={errorCount > 0} />
          <Diagnostic label="Position version" value={String(positionVersion)} dark={dark} />
          <ControlButton label="Share diagnostics" onPress={() => void shareDiagnostics()} secondary />
        </View>

        <View style={[styles.panel, dark && styles.panelDark]}>
          <Text style={[styles.panelTitle, dark && styles.textDark]}>Recent events</Text>
          {logs.length === 0 ? (
            <Text style={[styles.panelBody, dark && styles.mutedDark]}>No events yet.</Text>
          ) : logs.slice(0, 12).map((entry) => (
            <Text key={entry.id} style={[styles.logLine, dark && styles.mutedDark]}>
              {new Date(entry.timestamp).toLocaleTimeString()} [{entry.kind}] {entry.message}
            </Text>
          ))}
        </View>

        <Text style={[styles.scrollProbe, dark && styles.mutedDark]}>
          Scroll probe: dragging a piece must not scroll this page. Starting a gesture here should scroll normally.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ControlButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

function Diagnostic({
  label,
  value,
  dark,
  danger = false,
}: {
  label: string;
  value: string;
  dark: boolean;
  danger?: boolean;
}) {
  return (
    <View style={styles.diagnosticRow}>
      <Text style={[styles.diagnosticLabel, dark && styles.mutedDark]}>{label}</Text>
      <Text
        selectable
        style={[
          styles.diagnosticValue,
          dark && styles.textDark,
          danger && styles.danger,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function createGame(fen: string): Chess {
  return !fen || fen === 'startpos' ? new Chess() : new Chess(fen);
}

function applyUci(fen: string, uci: string): {
  fen: string;
  lastMove: [string, string];
} {
  const game = createGame(fen);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.slice(4, 5) || undefined;
  const move = game.move({ from, to, promotion });
  if (!move) throw new Error(`Illegal UCI move ${uci}`);
  return {
    fen: game.fen(),
    lastMove: [move.from, move.to],
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5efe5' },
  safeAreaDark: { backgroundColor: '#17130f' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 64, gap: 14 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: '#70543e' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: '#2e2118' },
  subtitle: { fontSize: 15, lineHeight: 22, color: '#6e5c4f' },
  textDark: { color: '#fff8ef' },
  mutedDark: { color: '#cbb9a8' },
  scenarioRow: { gap: 8, paddingVertical: 2 },
  scenarioChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: '#fffaf2', borderWidth: 1, borderColor: '#d7c3ae' },
  scenarioChipActive: { backgroundColor: '#5f3b24', borderColor: '#5f3b24' },
  scenarioChipText: { color: '#4f3a2b', fontWeight: '700', fontSize: 13 },
  scenarioChipTextActive: { color: '#fffaf2' },
  panel: { padding: 14, borderRadius: 12, backgroundColor: '#fffaf2', borderWidth: 1, borderColor: '#dfcfbd', gap: 8 },
  panelDark: { backgroundColor: '#2a211b', borderColor: '#514135' },
  panelTitle: { fontSize: 17, fontWeight: '800', color: '#35261c' },
  panelBody: { fontSize: 14, lineHeight: 20, color: '#6e5c4f' },
  hint: { fontSize: 14, fontWeight: '700', color: '#3e5a38' },
  pendingPanel: { padding: 14, borderRadius: 12, backgroundColor: '#f8e8c9', borderWidth: 1, borderColor: '#d7b77b', gap: 10 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  controlGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: '#5f3b24' },
  buttonSecondary: { backgroundColor: '#ede1d3', borderWidth: 1, borderColor: '#cdb7a1' },
  buttonPressed: { opacity: 0.72 },
  buttonDisabled: { opacity: 0.38 },
  buttonText: { color: '#fffaf2', fontSize: 14, fontWeight: '800' },
  buttonTextSecondary: { color: '#4b3526' },
  diagnosticRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  diagnosticLabel: { flex: 1, color: '#7a6656', fontSize: 13 },
  diagnosticValue: { flex: 1.5, color: '#302218', fontSize: 13, fontWeight: '700', textAlign: 'right' },
  danger: { color: '#b42318' },
  logLine: { color: '#6e5c4f', fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },
  scrollProbe: { minHeight: 100, paddingTop: 16, color: '#725f50', fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
