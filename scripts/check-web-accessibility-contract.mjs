import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const webSourceRoot = new URL('../apps/web/src/', import.meta.url);
const designSystemUrl = new URL('../apps/web/src/design-system.css', import.meta.url);
const navigationComponentTsUrl = new URL(
  '../apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts',
  import.meta.url,
);
const navigationDisclosureCssUrl = new URL(
  '../apps/web/src/app/core/layout/main-navigation/main-navigation-disclosure.css',
  import.meta.url,
);
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
const stateMessageTsUrl = new URL(
  '../apps/web/src/app/shared/ui/state-message/state-message.component.ts',
  import.meta.url,
);
const stateMessageHtmlUrl = new URL(
  '../apps/web/src/app/shared/ui/state-message/state-message.component.html',
  import.meta.url,
);
const courseReviewPageHtmlUrl = new URL(
  '../apps/web/src/app/features/course-review/pages/course-review-page.component.html',
  import.meta.url,
);
const migratedStateConsumerUrls = [
  [
    'Courses',
    'courses',
    new URL('../apps/web/src/app/features/courses/pages/courses-page.component.html', import.meta.url),
  ],
  [
    'Accounts',
    'accounts',
    new URL('../apps/web/src/app/features/accounts/pages/accounts-page.component.html', import.meta.url),
  ],
];

const lowContrastStandaloneOutline =
  /outline\s*:\s*[^;\n{}]+\s+solid\s+(?:var\(--focus-ring\)|var\(--ui-focus-ring\)|rgba\(\s*31\s*,\s*120\s*,\s*101\s*,\s*0\.38\s*\))\s*;/i;
const anchorButtonRole = /<a\b(?=[^>]*\brole\s*=\s*["']button["'])[^>]*>/is;

for (const fileUrl of sourceFiles(webSourceRoot)) {
  const path = fileURLToPath(fileUrl);
  const source = readFileSync(fileUrl, 'utf8');

  if (path.endsWith('.css')) {
    assert.doesNotMatch(
      source,
      lowContrastStandaloneOutline,
      `Standalone focus outlines must use --ui-focus-outline, not an undefined or translucent focus token: ${path}`,
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

const navigationFocusOutline = mixHex(
  readHexToken(designSystem, '--ui-action-strong'),
  readHexToken(designSystem, '--ui-action'),
  0.55,
);
for (const surfaceToken of [
  '--ui-surface',
  '--ui-canvas',
  '--ui-canvas-soft',
  '--ui-chrome',
  '--ui-chrome-raised',
  '--ui-chrome-soft',
]) {
  const surface = readHexToken(designSystem, surfaceToken);
  assert.ok(
    contrastRatio(navigationFocusOutline, surface) >= 3,
    `${surfaceToken} must have at least 3:1 contrast with the navigation focus color`,
  );
}

const navigationComponentTs = readFileSync(navigationComponentTsUrl, 'utf8');
assert.match(
  navigationComponentTs,
  /styleUrls:\s*\[\s*['"]\.\/main-navigation\.component\.css['"],\s*['"]\.\/main-navigation-disclosure\.css['"]/s,
  'Navigation disclosure styles must remain after the base navigation stylesheet so contrast-safe focus overrides win',
);

const navigationDisclosureCss = readFileSync(navigationDisclosureCssUrl, 'utf8');
assert.match(
  navigationDisclosureCss,
  /--navigation-focus-outline:\s*color-mix\(\s*in srgb,\s*var\(--ui-action-strong\)\s+55%,\s*var\(--ui-action\)\s+45%\s*\);/s,
  'Navigation focus must retain the opaque cross-surface mint mix',
);
assert.match(
  navigationDisclosureCss,
  /\.rail-collapse-button:focus-visible,\s*\.rail-nav-link:focus-visible,\s*\.rail-nav-disclosure:focus-visible,\s*\.rail-flyout-item:focus-visible,\s*\.rail-brand-link:focus-visible\s*\{[^}]*outline:\s*3px\s+solid\s+var\(--navigation-focus-outline\);[^}]*\}/s,
  'Desktop navigation controls must use the cross-surface focus outline',
);
assert.match(
  navigationDisclosureCss,
  /\.rail-inline-item:focus-visible\s*\{[^}]*outline:\s*3px\s+solid\s+var\(--navigation-focus-outline\);[^}]*\}/s,
  'Inline navigation controls must use the cross-surface focus outline',
);

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

const stateMessageTs = readFileSync(stateMessageTsUrl, 'utf8');
assert.match(
  stateMessageTs,
  /export type UiStateMessageTone = 'loading' \| 'empty' \| 'error';/,
  'The shared state-message primitive must retain the bounded loading/empty/error contract',
);
assert.match(
  stateMessageTs,
  /if \(this\.tone\(\) === 'error'\) return 'alert';[\s\S]*if \(this\.tone\(\) === 'loading'\) return 'status';/,
  'Error and loading state messages must retain alert/status semantics',
);

const stateMessageHtml = readFileSync(stateMessageHtmlUrl, 'utf8');
assert.match(
  stateMessageHtml,
  /\[attr\.role\]="semanticRole\(\)"/,
  'Shared state messages must expose the computed semantic role',
);
assert.match(
  stateMessageHtml,
  /\[attr\.aria-live\]="liveMode\(\)"/,
  'Shared state messages must expose the computed live-region behavior',
);
assert.doesNotMatch(
  stateMessageHtml,
  /aria-busy/,
  'The loading status must not mark its own live region busy and suppress its announcement',
);

for (const [consumerName, collectionSignal, consumerUrl] of migratedStateConsumerUrls) {
  const consumer = readFileSync(consumerUrl, 'utf8');
  for (const tone of ['loading', 'empty', 'error']) {
    assert.match(
      consumer,
      new RegExp(`<app-state-message\\b[^>]*tone=["']${tone}["']`, 's'),
      `${consumerName} must retain the shared ${tone} state presentation`,
    );
  }
  assert.match(
    consumer,
    new RegExp(
      `@if \\(!store\\.loading\\(\\) && !store\\.error\\(\\) && store\\.${collectionSignal}\\(\\)\\.length === 0\\)`,
    ),
    `${consumerName} empty state must stay suppressed while loading or an error is active`,
  );
  assert.doesNotMatch(
    consumer,
    /class=["'][^"']*\bempty-state\b[^"']*["']/,
    `${consumerName} must not regress to the legacy local empty-state presentation`,
  );
}

const courseReviewPageHtml = readFileSync(courseReviewPageHtmlUrl, 'utf8');
assert.match(
  courseReviewPageHtml,
  /<app-state-message\b[^>]*tone=["']error["'][^>]*\[message\]=["']error["'][^>]*\/>/s,
  'Course Review errors must retain the shared assertive error announcement',
);
assert.match(
  courseReviewPageHtml,
  /<app-state-message\b[^>]*tone=["']loading["'][^>]*message=["']Checking course endings against indexed games\.\.\.["'][^>]*\/>/s,
  'Course-ending review progress must retain the shared polite loading announcement',
);
assert.match(
  courseReviewPageHtml,
  /<app-state-message\b[^>]*tone=["']loading["'][^>]*message=["']Reviewing imported games\.\.\.["'][^>]*\/>/s,
  'Course Review progress must retain the shared polite loading announcement',
);
assert.doesNotMatch(
  courseReviewPageHtml,
  /<p\b[^>]*class=["'][^"']*\bstatus-(?:error|note)\b[^"']*["'][^>]*>\s*(?:\{\{\s*error\s*\}\}|Checking course endings against indexed games\.\.\.|Reviewing imported games\.\.\.)\s*<\/p>/s,
  'Course Review async error/loading states must not regress to non-announcing local status paragraphs',
);

function readHexToken(css, token) {
  const match = css.match(new RegExp(`${escapeRegExp(token)}:\\s*(#[0-9a-f]{6});`, 'i'));
  assert.ok(match, `${token} must be defined as an opaque six-digit hex color`);
  return match[1];
}

function mixHex(first, second, firstWeight) {
  const firstChannels = hexChannels(first);
  const secondChannels = hexChannels(second);
  const mixedChannels = firstChannels.map((channel, index) =>
    Math.round(channel * firstWeight + secondChannels[index] * (1 - firstWeight)),
  );
  return `#${mixedChannels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function hexChannels(hex) {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
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
