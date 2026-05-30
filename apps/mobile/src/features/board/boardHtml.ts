export const boardHtml = String.raw`
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; background: transparent; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    #board { width: 100vw; height: 100vw; display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr); touch-action: manipulation; }
    .square { position: relative; display: flex; align-items: center; justify-content: center; font-size: 10.5vw; line-height: 1; user-select: none; }
    .light { background: #edd9b9; }
    .dark { background: #a36d38; }
    .selected { outline: 4px solid rgba(47,125,79,.9); outline-offset: -4px; }
    .last { box-shadow: inset 0 0 0 999px rgba(183,121,39,.24); }
    .disabled { opacity: .72; }
    .coord { position: absolute; left: 3px; bottom: 2px; font-size: 10px; color: rgba(35,27,21,.72); font-weight: 700; }
  </style>
</head>
<body>
  <div id="board"></div>
  <script>
    const pieceMap = {
      p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
      P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
    };
    let state = { fen: 'startpos', side: 'WHITE', lastMove: null, showCoordinates: true, disabled: false };
    let selected = null;

    function post(message) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }

    function fenBoard(fen) {
      const actual = fen === 'startpos' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : fen;
      const rows = actual.split(' ')[0].split('/');
      const out = {};
      rows.forEach((row, rowIndex) => {
        let file = 0;
        for (const ch of row) {
          if (/\d/.test(ch)) {
            file += Number(ch);
          } else {
            out['abcdefgh'[file] + String(8 - rowIndex)] = ch;
            file += 1;
          }
        }
      });
      return out;
    }

    function orientedSquares(side) {
      const files = side === 'BLACK' ? 'hgfedcba' : 'abcdefgh';
      const ranks = side === 'BLACK' ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
      const squares = [];
      ranks.forEach(rank => {
        for (const file of files) squares.push(file + rank);
      });
      return squares;
    }

    function render() {
      const board = document.getElementById('board');
      const pieces = fenBoard(state.fen);
      board.innerHTML = '';
      board.className = state.disabled ? 'disabled' : '';
      orientedSquares(state.side).forEach((square) => {
        const file = square.charCodeAt(0) - 97;
        const rank = Number(square[1]);
        const el = document.createElement('div');
        el.className = 'square ' + (((file + rank) % 2 === 0) ? 'dark' : 'light');
        if (selected === square) el.className += ' selected';
        if (state.lastMove && (state.lastMove.from === square || state.lastMove.to === square)) el.className += ' last';
        el.dataset.square = square;
        el.textContent = pieceMap[pieces[square]] || '';
        if (state.showCoordinates && (square[0] === 'a' || square[1] === '1')) {
          const coord = document.createElement('span');
          coord.className = 'coord';
          coord.textContent = square;
          el.appendChild(coord);
        }
        el.addEventListener('click', () => tap(square, pieces));
        board.appendChild(el);
      });
    }

    function tap(square, pieces) {
      if (state.disabled) return;
      if (!selected) {
        if (pieces[square]) selected = square;
        render();
        return;
      }
      if (selected === square) {
        selected = null;
        render();
        return;
      }
      const promotionRank = square[1];
      const piece = pieces[selected];
      const promotion = piece && piece.toLowerCase() === 'p' && (promotionRank === '1' || promotionRank === '8') ? 'q' : '';
      post({ type: 'move', uci: selected + square + promotion });
      selected = null;
      render();
    }

    window.__setBoardState = function(next) {
      state = Object.assign({}, state, next);
      selected = null;
      render();
    };

    document.addEventListener('message', function(event) {
      try { window.__setBoardState(JSON.parse(event.data)); } catch (error) { post({ type: 'error', message: String(error) }); }
    });
    window.addEventListener('message', function(event) {
      try { window.__setBoardState(JSON.parse(event.data)); } catch (error) { post({ type: 'error', message: String(error) }); }
    });

    render();
    post({ type: 'ready' });
  </script>
</body>
</html>
`;
