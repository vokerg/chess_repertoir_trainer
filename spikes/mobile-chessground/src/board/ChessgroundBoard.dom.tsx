'use dom';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Chess, type Move } from 'chess.js';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Config } from '@lichess-org/chessground/config';
import type { Color, Key } from '@lichess-org/chessground/types';
import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';
import './board-theme.css';
import type {
  BoardErrorEvent,
  BoardMoveEvent,
  BoardReadyEvent,
  ChessgroundBoardProps,
} from './board.types';

type PromotionPiece = 'q' | 'r' | 'b' | 'n';

type PendingPromotion = {
  from: Key;
  to: Key;
  color: Color;
  moves: Move[];
};

type DomBoardProps = Omit<ChessgroundBoardProps, 'size'> & {
  dom?: import('expo/dom').DOMProps;
};

const PROMOTION_OPTIONS: Array<{ id: PromotionPiece; label: string; role: string }> = [
  { id: 'q', label: 'Queen', role: 'queen' },
  { id: 'n', label: 'Knight', role: 'knight' },
  { id: 'r', label: 'Rook', role: 'rook' },
  { id: 'b', label: 'Bishop', role: 'bishop' },
];

export default function ChessgroundBoardDom(props: DomBoardProps) {
  const boardElementRef = useRef<HTMLDivElement | null>(null);
  const groundRef = useRef<Api | null>(null);
  const gameRef = useRef(createGame(props.fen));
  const pendingMoveRef = useRef<string | null>(null);
  const pendingPromotionRef = useRef<PendingPromotion | null>(null);
  const propsRef = useRef(props);
  const moveSequenceRef = useRef(0);
  const initializationCountRef = useRef(0);
  const instanceIdRef = useRef(createInstanceId());
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);

  propsRef.current = props;

  useEffect(() => {
    const element = boardElementRef.current;
    if (!element) return;

    try {
      initializationCountRef.current += 1;
      groundRef.current = Chessground(element, buildConfig());
      void propsRef.current.onReady({
        instanceId: instanceIdRef.current,
        initializationCount: initializationCountRef.current,
        readyAt: Date.now(),
      }).catch((error: unknown) => {
        reportError('NATIVE_READY_ACTION_FAILED', error);
      });
    } catch (error) {
      reportError('BOARD_INITIALIZATION_FAILED', error);
    }

    return () => {
      pendingMoveRef.current = null;
      pendingPromotionRef.current = null;
      groundRef.current?.destroy?.();
      groundRef.current = null;
    };
  }, []);

  useEffect(() => {
    resetToAuthoritativePosition();
  }, [props.fen, props.orientation, props.positionVersion]);

  useEffect(() => {
    groundRef.current?.set(buildConfig());
  }, [props.lastMove, props.arrows, props.coordinates, props.movable]);

  function buildConfig(): Config {
    const current = propsRef.current;
    const game = gameRef.current;
    const turnColor: Color = game.turn() === 'w' ? 'white' : 'black';
    const locked = isLocked();

    return {
      fen: game.fen(),
      orientation: current.orientation,
      turnColor,
      check: game.isCheck() ? turnColor : false,
      coordinates: current.coordinates,
      lastMove: toLastMove(current.lastMove),
      autoCastle: true,
      blockTouchScroll: true,
      disableContextMenu: true,
      jsHover: true,
      highlight: {
        lastMove: true,
        check: true,
      },
      drawable: {
        enabled: false,
        visible: true,
        autoShapes: current.arrows
          .filter((arrow) => isKey(arrow.from) && isKey(arrow.to))
          .map((arrow) => ({
            orig: arrow.from as Key,
            dest: arrow.to as Key,
            brush: arrow.brush ?? 'green',
          })),
      },
      movable: {
        free: false,
        color: locked ? undefined : turnColor,
        dests: locked ? new Map<Key, Key[]>() : legalDestinations(game),
        showDests: true,
        events: {
          after: (from, to) => handleMove(from, to),
        },
      },
      draggable: {
        enabled: !locked,
        showGhost: true,
      },
      selectable: {
        enabled: !locked,
      },
      animation: {
        enabled: true,
        duration: 160,
      },
    };
  }

  function handleMove(from: Key, to: Key): void {
    if (isLocked()) return;

    const matchingMoves = gameRef.current
      .moves({ verbose: true })
      .filter((move) => move.from === from && move.to === to);

    if (matchingMoves.length === 0) {
      resetToAuthoritativePosition();
      reportError('BOARD_EMITTED_ILLEGAL_MOVE', new Error(`${from}${to}`));
      return;
    }

    const promotionMoves = matchingMoves.filter(
      (move) => move.promotion && isPromotionPiece(move.promotion),
    );

    if (promotionMoves.length > 0) {
      const nextPromotion: PendingPromotion = {
        from,
        to,
        color: gameRef.current.turn() === 'w' ? 'white' : 'black',
        moves: promotionMoves,
      };
      pendingPromotionRef.current = nextPromotion;
      setPendingPromotion(nextPromotion);
      groundRef.current?.set(buildConfig());
      return;
    }

    commitMove(matchingMoves[0]!, undefined);
  }

  function commitMove(move: Move, promotion: PromotionPiece | undefined): void {
    const played = gameRef.current.move({
      from: move.from,
      to: move.to,
      promotion,
    });

    if (!played) {
      resetToAuthoritativePosition();
      reportError('BOARD_MOVE_COMMIT_FAILED', new Error(`${move.from}${move.to}${promotion ?? ''}`));
      return;
    }

    const uci = `${played.from}${played.to}${played.promotion ?? ''}`;
    pendingMoveRef.current = uci;
    pendingPromotionRef.current = null;
    setPendingPromotion(null);
    groundRef.current?.set(buildConfig());

    moveSequenceRef.current += 1;
    const event: BoardMoveEvent = {
      eventId: `${instanceIdRef.current}:${moveSequenceRef.current}`,
      uci,
      emittedAt: Date.now(),
    };

    void propsRef.current.onMove(event).catch((error: unknown) => {
      resetToAuthoritativePosition();
      reportError('NATIVE_MOVE_ACTION_FAILED', error);
    });
  }

  function selectPromotion(piece: PromotionPiece): void {
    const promotion = pendingPromotionRef.current;
    const matchingMove = promotion?.moves.find((move) => move.promotion === piece);

    if (!promotion || !matchingMove) {
      resetToAuthoritativePosition();
      reportError('INVALID_PROMOTION_SELECTION', new Error(piece));
      return;
    }

    commitMove(matchingMove, piece);
  }

  function resetToAuthoritativePosition(): void {
    gameRef.current = createGame(propsRef.current.fen);
    pendingMoveRef.current = null;
    pendingPromotionRef.current = null;
    setPendingPromotion(null);
    groundRef.current?.set(buildConfig());
  }

  function isLocked(): boolean {
    return Boolean(
      pendingMoveRef.current ||
        pendingPromotionRef.current ||
        !propsRef.current.movable,
    );
  }

  function reportError(code: string, error: unknown): void {
    const event: BoardErrorEvent = {
      code,
      message: error instanceof Error ? error.message : String(error),
      occurredAt: Date.now(),
    };
    void propsRef.current.onError(event).catch(() => undefined);
  }

  const pickerPosition = promotionPickerPosition(pendingPromotion?.to, props.orientation);

  return (
    <div className="board-shell">
      <div ref={boardElementRef} className="chessground-board" />
      {pendingPromotion ? (
        <div
          className="promotion-picker-backdrop"
          aria-label="Choose promotion piece"
        >
          <div
            className="promotion-picker cg-wrap"
            role="group"
            aria-label="Choose promotion piece"
            style={{
              '--promotion-left': pickerPosition.left,
              '--promotion-top': pickerPosition.top,
            } as CSSProperties}
          >
            {PROMOTION_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="promotion-option"
                aria-label={option.label}
                title={option.label}
                onClick={() => selectPromotion(option.id)}
              >
                <piece
                  className={`${pendingPromotion.color} ${option.role} promotion-piece`}
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function createGame(fen: string): Chess {
  try {
    return !fen || fen === 'startpos' ? new Chess() : new Chess(fen);
  } catch {
    return new Chess();
  }
}

function legalDestinations(game: Chess): Map<Key, Key[]> {
  const destinations = new Map<Key, Key[]>();
  for (const move of game.moves({ verbose: true })) {
    const from = move.from as Key;
    const to = move.to as Key;
    const existing = destinations.get(from) ?? [];
    if (!existing.includes(to)) destinations.set(from, [...existing, to]);
  }
  return destinations;
}

function toLastMove(lastMove: [string, string] | null): Key[] | undefined {
  if (!lastMove || !isKey(lastMove[0]) || !isKey(lastMove[1])) return undefined;
  return [lastMove[0] as Key, lastMove[1] as Key];
}

function isKey(value: string): boolean {
  return /^[a-h][1-8]$/.test(value);
}

function isPromotionPiece(value: string): value is PromotionPiece {
  return value === 'q' || value === 'r' || value === 'b' || value === 'n';
}

function promotionPickerPosition(
  target: Key | undefined,
  orientation: 'white' | 'black',
): { left: string; top: string } {
  if (!target) return { left: '0%', top: '0%' };

  const file = target.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = Number(target[1]) - 1;
  const visibleFile = orientation === 'white' ? file : 7 - file;
  const visibleRank = orientation === 'white' ? 7 - rank : rank;

  return {
    left: `${visibleFile * 12.5}%`,
    top: visibleRank < 4 ? '0%' : '50%',
  };
}

function createInstanceId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `cg-${Date.now().toString(36)}-${random}`;
}
