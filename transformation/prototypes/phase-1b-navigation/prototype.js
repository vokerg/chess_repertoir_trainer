const controls = Array.from(document.querySelectorAll('[data-view]'));

function selectView(view) {
  document.body.dataset.view = view;
  controls.forEach((control) => {
    const selected = control.dataset.view === view;
    control.classList.toggle('active', selected);
    control.setAttribute('aria-pressed', String(selected));
  });
}

controls.forEach((control) => {
  control.addEventListener('click', () => selectView(control.dataset.view ?? 'expanded'));
});

selectView('expanded');
