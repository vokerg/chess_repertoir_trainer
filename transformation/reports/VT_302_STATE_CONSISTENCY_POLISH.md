# VT-302 — Repertoire authoring state-consistency slice

Date: 2026-08-07

Issue: [#133](https://github.com/vokerg/chess_repertoir_trainer/issues/133)

Branch: `visual-transformation/vt-302-state-consistency-polish`

## Scope

This continuation slice addresses verified loading/error/recovery inconsistencies in the related repertoire-authoring detail routes that can be fixed independently of functional onboarding:

- `/courses/:courseId`;
- `/chapters/:chapterId/lines`.

It does not complete VT-302 and must not close issue #133.

## Findings

### Course detail

The course-detail route rendered its shell whenever a route id existed, even when the initial overview request failed and no course had loaded. Course-specific navigation and authoring surfaces therefore remained visible despite the route having no authoritative course data. Invalid route ids could also leave the route blank because the whole page was gated by `courseId`.

Because Angular can reuse this component when only `:courseId` changes, the store may still hold the previously loaded course while the next route id is resolving. Treating any non-null `course()` as current would expose stale authoring/navigation under the new URL.

### Chapter lines

The chapter-lines route gated the entire page on the loaded chapter object. During the first request the chapter is null, so the declared loading state was unreachable. On failure the store correctly retained a null chapter and set an error, which also made the declared error state unreachable. The user could therefore receive a blank route for both initial loading and initial failure.

The same Angular route-reuse boundary applies here: the previous chapter can remain in the store while a new `:chapterId` is resolving, so non-null chapter data alone is not sufficient evidence that the current route is ready.

## Implemented behavior

Both routes now render their page shell and fallback header independently of loaded domain data.

Initial route state follows one bounded hierarchy:

1. an explicit route/load error without route-matched domain data shows an alert panel with deterministic recovery/navigation, even if a superseded request still reports loading;
2. loading without route-matched domain data and without a current error shows a live status panel;
3. domain data is treated as loaded only when its entity id matches the current route id;
4. matched domain data reveals course/chapter workflow and authoring controls;
5. later command errors remain visible without discarding already loaded matched content.

Course detail now exposes only the Back action until an authoritative course for the current `:courseId` is loaded. Its create-chapter and subline surfaces are not rendered after initial load failure or while stale data belongs to a previous course. Unknown header metrics are omitted rather than represented as zero. A valid failed course request can be retried in place.

Chapter lines now exposes loading and error states outside the chapter-data gate. Training, line authoring, and PGN tools remain hidden until a chapter matching the current `:chapterId` has loaded. Stale chapter/course navigation from a previous route identity is not exposed during transition. Unknown header metrics are omitted. A valid failed chapter request can be retried in place, while invalid/unavailable route state always provides a path back to Courses.

## Architecture decision

No new global loading/empty/error component is introduced in this slice. The repository architecture requires shared UI extraction only after compatible contracts are demonstrated by multiple consumers. The audited routes establish a common state hierarchy, but their actions, route context, recovery boundaries, and loaded workflow composition remain feature-specific. Existing `app-page-header`, `app-panel`, production status styles, and feature stores are reused instead.

Adjacent repertoire routes were checked for the same blank-data gate before broadening scope. The line editor and training pages already expose explicit loading shells, so they are not changed merely for stylistic uniformity.

## Regression coverage

Focused page-template specs cover:

- explicit initial loading presentation for course detail;
- suppression of stale previous-course content while a new route identity loads;
- bounded course-load failure presentation;
- suppression of course authoring/subline surfaces after initial failure;
- in-place course retry;
- explicit initial loading presentation for chapter lines;
- suppression of stale previous-chapter content while a new route identity loads;
- non-blank chapter-load failure presentation;
- suppression of line/PGN authoring surfaces after initial failure;
- in-place chapter retry for a valid route id.

Repository CI remains authoritative for Angular template/type compilation, web tests, lint, architecture checks, and the full monorepo gate. Exact-head CI must pass before this slice is eligible for integration.

## Remaining VT-302 boundary

This slice does not claim completion of the wider state inventory. Additional guarded-route state inconsistencies, if verified, remain future VT-302 work.

Functional first-run onboarding and Home re-entry remain blocked behind ONB-008 / #193, ONB-009 / #194, and ONB-010 / #195. Direct authenticated browser, screen-reader, zoom, contrast-tool, reduced-motion, and representative-device evidence is not available in this execution environment and is not claimed. Final transformation status/decision/migration reconciliation remains deferred until the complete VT-302 acceptance boundary is delivered and approved.
