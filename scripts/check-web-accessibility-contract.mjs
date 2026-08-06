import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const webSourceRoot = new URL('../apps/web/src/', import.meta.url);
const designSystemUrl = new URL('../apps/web/src/design-system.css', import.meta.url);
const evaluationGraphCssUrl = new URL(
  '../apps/web/src/app/features/games/components/game-evaluation-graph.component.css',
  import.meta.url,
);
const evaluationGraphHtmlUrl = new URL(
  '../apps/web/src/app/features/games/components/game-evaluation-graph.component.html',
  import.meta.url,
);
const gamesTableCssUrl = new URL(
  '../apps/web/src/app/features/games/components/games-table.component.css',
  import.meta.url,
);

const lowContrastStandaloneOutline =
  /outline\s*:\s*[^;\n{}]+\s+solid\s+(?:var\(--ui-focus-ring\)|rgba\(\s*31\s*,\s*120\s*,\s*101\s*,\s*0\.38\s*\))\s*;/i;
const anchorButtonRole = /<a\b(?=[^>]*\brole\s*=\s*["']button["'])[^>]*>/is;

for (const fileUrl of sourceFiles(webSourceRoot)) {
  const path = fileURLToPath(fileUrl);
  const source = readFileSync(fileUrl, 'utf8');

  if (path.endsWith('.css')) {
    assert.doesNotMatch(
      source,
      lowContrastStandaloneOutline,
      `Standalone focus outlines must use --ui-focus-outline, not the translucent halo token: ${path}`,
    );
  }

  if (path.endsWith('.html')) {
    assert.doesNotMatch(
      source,
      anchorButtonRole,
      `Use a native button instead of an anchor with role="button": ${path}`,
    );
  }
}

const designSystem = readFileSync(designSystemUrl, 'utf8');
const focusOutline = readHexToken(designSystem, '--ui-focus-outline');
assert.match(
  designSystem,
  /outline:\s*3px\s+solid\s+var\(--ui-focus-outline\);/,
  'The shared signed-in-shell focus rule must use the opaque focus-outline token',
);

for (const surfaceToken of ['--ui-surface', '--ui-canvas', '--ui-chrome']) {
  const surface = readHexToken(designSystem, surfaceToken);
  assert.ok(
    contrastRatio(focusOutline, surface) >= 3,
    `${surfaceToken} must have at least 3:1 contrast with --ui-focus-outline`,
  );
}

const evaluationGraphCss = readFileSync(evaluationGraphCssUrl, 'utf8');
assert.match(
  evaluationGraphCss,
  /\.point-hit-target:focus-visible\s*\{[^}]*stroke:\s*var\(--ui-focus-outline\);[^}]*\}/s,
  'Keyboard-selectable evaluation points must retain a visible focus stroke',
);

const evaluationGraphHtml = readFileSync(evaluationGraphHtmlUrl, 'utf8');
assert.doesNotMatch(
  evaluationGraphHtml,
  /<svg\b[^>]*\brole\s*=\s*["']img["']/is,
  'Interactive evaluation-graph controls must not be descendants of role="img"',
);
assert.match(
  evaluationGraphHtml,
  /<svg\b[^>]*\brole\s*=\s*["']group["'][^>]*\baria-label\s*=/is,
  'The evaluation graph must expose a labelled interactive group',
);
assert.match(
  evaluationGraphHtml,
  /\[attr\.tabindex\]="pointTabIndex\(point\.nodeId\)"/,
  'The evaluation graph must use roving tabindex instead of one page tab stop per point',
);
assert.match(
  evaluationGraphHtml,
  /\(keydown\)="handlePointKeydown\(\$event, point\.nodeId\)"/,
  'The evaluation graph must retain composite keyboard navigation',
);

const gamesTableCss = readFileSync(gamesTableCssUrl, 'utf8');
assert.doesNotMatch(
  gamesTableCss,
  /\.games-row-action-link\[aria-disabled=['"]true['"]\]/,
  'Native Analyse buttons must not retain the removed anchor aria-disabled selector',
);
assert.match(
  gamesTableCss,
  /\.games-row-action-link:disabled\s*\{[^}]*cursor:\s*wait;[^}]*\}/s,
  'Disabled Analyse buttons must retain the visible waiting treatment',
);

function readHexToken(css, token) {
  const match = css.match(new RegExp(`${escapeRegExp(token)}:\\s*(#[0-9a-f]{6});`, 'i'));
  assert.ok(match, `${token} must be defined as an opaque six-digit hex color`);
  return match[1];
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sourceFiles(directoryUrl) {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const childUrl = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directoryUrl);
    return entry.isDirectory() ? sourceFiles(childUrl) : [childUrl];
  });
}
