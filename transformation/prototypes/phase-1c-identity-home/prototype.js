const controls = Array.from(document.querySelectorAll('[data-mode]'));
const directionControls = Array.from(document.querySelectorAll('[data-direction]'));
const frame = document.querySelector('.app-frame');
const navButtons = Array.from(document.querySelectorAll('[data-action="nav-menu"]'));
const navMenus = Array.from(document.querySelectorAll('[data-menu]'));
const collapseButton = document.querySelector('[data-action="collapse"]');
const directionTitle = document.querySelector('[data-direction-title]');
const directionNote = document.querySelector('[data-direction-note]');

const directions = {
  instrument: {
    title: 'Instrument — repertoire as an analytical tool',
    note: 'A balanced analytical workspace: one decisive dark session surface with supporting light evidence modules.',
  },
  editorial: {
    title: 'Opening Book — calm, spacious, and considered',
    note: 'A lighter editorial workspace: generous typography and white paper-like surfaces keep the repertoire line as the focused dark inset.',
  },
  control: {
    title: 'Control Room — compact, operational, evidence-first',
    note: 'A denser operational workspace: reduced vertical rhythm, tighter navigation, and a larger analytical readout support faster scanning.',
  },
};

function setOpenMenu(target) {
  navButtons.forEach((button) => {
    button.setAttribute('aria-expanded', String(button.dataset.target === target));
  });
  navMenus.forEach((menu) => {
    menu.classList.toggle('open', menu.dataset.menu === target);
  });
}

function setMode(mode) {
  const collapsed = mode === 'collapsed' || mode === 'compact';
  document.body.dataset.mode = mode;
  frame.classList.toggle('rail-collapsed', collapsed);
  frame.classList.toggle('compact-frame', mode === 'compact');
  collapseButton.textContent = collapsed ? '›' : '‹';
  collapseButton.setAttribute(
    'aria-label',
    collapsed ? 'Expand navigation rail' : 'Collapse navigation rail',
  );
  controls.forEach((control) => {
    const active = control.dataset.mode === mode;
    control.classList.toggle('active', active);
    control.setAttribute('aria-pressed', String(active));
  });
  setOpenMenu(mode === 'study' ? 'study' : null);
}

function setDirection(direction) {
  const selectedDirection = directions[direction] ? direction : 'instrument';
  document.body.dataset.direction = selectedDirection;
  directionControls.forEach((control) => {
    const active = control.dataset.direction === selectedDirection;
    control.classList.toggle('active', active);
    control.setAttribute('aria-pressed', String(active));
  });
  directionTitle.textContent = directions[selectedDirection].title;
  directionNote.textContent = directions[selectedDirection].note;
}

controls.forEach((control) => {
  control.addEventListener('click', () => setMode(control.dataset.mode || 'expanded'));
});

directionControls.forEach((control) => {
  control.addEventListener('click', () => setDirection(control.dataset.direction || 'instrument'));
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const opening = button.getAttribute('aria-expanded') !== 'true';
    setOpenMenu(opening ? button.dataset.target : null);
  });
});

collapseButton.addEventListener('click', () => {
  setMode(frame.classList.contains('rail-collapsed') ? 'expanded' : 'collapsed');
});

setMode('expanded');
setDirection('instrument');
