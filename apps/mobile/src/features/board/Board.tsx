import { WebViewChessBoard } from './WebViewChessBoard';
import { ChessBoardProps } from './types';

export function Board(props: ChessBoardProps) {
  return <WebViewChessBoard {...props} />;
}
