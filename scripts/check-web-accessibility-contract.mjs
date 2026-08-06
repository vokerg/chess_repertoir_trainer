import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const webSourceRoot = new URL('../apps/web/src/', import.meta.url);
const designSystemUrl = new URL('../apps/web/src/design-system.css', import.meta.url);
const evaluationGraphCssUrl = new URL(
  '../apps/web/src/app/features/games/components/game-evaluation-graph.component.css',
  import.meta.url,
);

const lowContrastStandaloneOutline =
  /outline\s*:\s*[^;\n{}]+\s+solid\s+(?:var\(--ui-focus-ring\)|rgba\(\s*31\s*,\s*120\s*,\s*101\s*,\s*0\.38\s*\))\s*;/i;
const anchorButtonRole = /<a\b(?=[^>]*\brole\s*=\s*["']button["'])[^>]*>/gis;

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
assert.match(
  designSystem,
  /--ui-focus-outline:\s*#[0-9a-f]{6};/i,
  'The production design system must expose an opaque focus-outline token',
);
assert.match(
  designSystem,
  /outline:\s*3px\s+solid\s+var\(--ui-focus-outline\);/,
  'The shared signed-in-shell focus rule must use the opaque focus-outline token',
);

const evaluationGraphCss = readFileSync(evaluationGraphCssUrl, 'utf8');
assert.match(
  evaluationGraphCss,
  /\.point-hit-target:focus-visible\s*\{[^}]*stroke:\s*var\(--ui-focus-outline\);[^}]*\}/s,
  'Keyboard-selectable evaluation points must retain a visible focus stroke',
);

function sourceFiles(directoryUrl) {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const childUrl = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directoryUrl);
    return entry.isDirectory() ? sourceFiles(childUrl) : [childUrl];
  });
}
