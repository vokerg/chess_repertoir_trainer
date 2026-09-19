const PIECES = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔',
};

const candidates = {
  be3: {
    move: '6.Be3', label: 'Structured main line', role: 'Target-aligned',
    fen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq - 1 6',
    eval: '+0.32', peers: '31%', masters: '28%', theory: 'Medium', burden: '14 branches',
    line: '6.Be3 e5 7.Nb3 Be6 8.f3',
    headline: 'Keeps the position flexible without conceding practical pressure.',
    reasons: ['Best match for the selected Solid persona', 'Healthy score in the selected peer bands', 'Leaves kingside and queenside plans available'],
    caution: 'Still requires preparation against ...e5 and ...Ng4.',
  },
  bg5: {
    move: '6.Bg5', label: 'Sharp pressure', role: 'Profile-aligned',
    fen: 'rnbqkb1r/1p2pppp/p2p1n2/6B1/3NP3/2N5/PPP2PPP/R2QKB1R b KQkq - 1 6',
    eval: '+0.26', peers: '24%', masters: '22%', theory: 'High', burden: '23 branches',
    line: '6.Bg5 e6 7.f4 Be7 8.Qf3',
    headline: 'Matches the player’s attacking tendency, but increases theory and volatility.',
    reasons: ['Strongest profile fit', 'Rich attacking structures', 'Well represented in master practice'],
    caution: 'Conflicts with the explicitly selected Solid persona.',
  },
  g4: {
    move: '6.g4?!', label: 'Surprise weapon', role: 'Practical alternative',
    fen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP1P1/2N5/PPP2P1P/R1BQKB1R b KQkq - 0 6',
    eval: '−0.38', peers: '9%', masters: '2%', theory: 'Low', burden: '8 branches',
    line: '6.g4?! Bxg4 7.f3 Bd7',
    headline: 'Cuts theory and may surprise peers, but accepts a visible objective cost.',
    reasons: ['Low preparation burden', 'Rare at the selected level', 'Can be kept as an explicit alternate persona'],
    caution: 'Engine warning: objective cost exceeds the default Solid tolerance.',
  },
};

function parseFen(fen) {
  const board = [];
  const rows = fen.split(' ')[0].split('/');
  for (const row of rows) {
    const cells = [];
    for (const token of row) {
      if (/\d/.test(token)) {
        for (let i = 0; i < Number(token); i += 1) cells.push('');
      } else cells.push(token);
    }
    board.push(cells);
  }
  return board;
}

function renderBoard(element, fen) {
  if (!element || !fen) return;
  element.innerHTML = '';
  const board = parseFen(fen);
  board.forEach((row, rank) => row.forEach((piece, file) => {
    const square = document.createElement('span');
    square.className = `square ${(rank + file) % 2 ? 'dark' : 'light'}`;
    square.dataset.square = `${'abcdefgh'[file]}${8 - rank}`;
    square.setAttribute('aria-hidden', 'true');
    if (piece) {
      const glyph = document.createElement('span');
      glyph.className = /[A-Z]/.test(piece) ? 'piece white-piece' : 'piece black-piece';
      glyph.textContent = PIECES[piece];
      square.append(glyph);
    }
    element.append(square);
  }));
}

function renderAllBoards() {
  document.querySelectorAll('[data-board-fen]').forEach((board) => renderBoard(board, board.dataset.boardFen));
}

function updateDecision(candidateId) {
  const candidate = candidates[candidateId];
  if (!candidate) return;
  document.querySelectorAll('[data-candidate-button]').forEach((button) => {
    const selected = button.dataset.candidateButton === candidateId;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const board = document.querySelector('[data-primary-board]');
  if (board) renderBoard(board, candidate.fen);
  const mappings = {
    '[data-selected-move]': candidate.move,
    '[data-selected-label]': candidate.label,
    '[data-selected-role]': candidate.role,
    '[data-selected-headline]': candidate.headline,
    '[data-selected-eval]': candidate.eval,
    '[data-selected-peers]': candidate.peers,
    '[data-selected-masters]': candidate.masters,
    '[data-selected-theory]': candidate.theory,
    '[data-selected-burden]': candidate.burden,
    '[data-selected-line]': candidate.line,
    '[data-selected-caution]': candidate.caution,
  };
  Object.entries(mappings).forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
  });
  const reasons = document.querySelector('[data-selected-reasons]');
  if (reasons) reasons.innerHTML = candidate.reasons.map((reason) => `<li>${reason}</li>`).join('');
}

function setupCandidates() {
  const buttons = [...document.querySelectorAll('[data-candidate-button]')];
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => updateDecision(button.dataset.candidateButton));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) return;
      event.preventDefault();
      const delta = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
      const target = buttons[(index + delta + buttons.length) % buttons.length];
      target.focus();
      target.click();
    });
  });
  if (buttons.length) updateDecision(buttons.find((button) => button.classList.contains('selected'))?.dataset.candidateButton || buttons[0].dataset.candidateButton);
}

function setupCoverage() {
  document.querySelectorAll('[data-coverage-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('[data-coverage-row]');
      if (!row) return;
      const status = button.dataset.coverageAction;
      row.dataset.status = status;
      row.querySelectorAll('[data-coverage-action]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      const label = row.querySelector('[data-coverage-status]');
      if (label) label.textContent = status === 'cover' ? 'Selected' : status === 'defer' ? 'Deferred' : 'Ignored';
      recalculateCoverage();
    });
  });
  recalculateCoverage();
}

function recalculateCoverage() {
  let total = 0;
  document.querySelectorAll('[data-coverage-row][data-status="cover"]').forEach((row) => { total += Number(row.dataset.frequency || 0); });
  document.querySelectorAll('[data-coverage-total]').forEach((element) => { element.textContent = `${total}%`; });
  document.querySelectorAll('[data-coverage-fill]').forEach((element) => { element.style.width = `${Math.min(total, 100)}%`; });
}

document.addEventListener('DOMContentLoaded', () => {
  renderAllBoards();
  setupCandidates();
  setupCoverage();
});
