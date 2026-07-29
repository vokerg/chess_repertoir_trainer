import assert from 'node:assert/strict';
import {
  BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION,
  builderCourseDraftSchema,
  builderCourseReintegrationApplyRequestSchema,
  builderCourseReintegrationPreviewRequestSchema,
} from '../dist/courses/index.js';
import { newCourseRepertoireTargetExample } from '../dist/repertoire-target/index.js';

const draft = {
  draftVersion: '2026-07-v1',
  sessionModelVersion: '2026-07-v1',
  sessionId: 'session-1',
  ownerId: '42',
  sessionRevision: 6,
  sessionLifecycle: 'COMPLETED',
  targetRevision: 1,
  targetContractVersion: newCourseRepertoireTargetExample.contractVersion,
  targetId: newCourseRepertoireTargetExample.targetId,
  targetCapturedAt: newCourseRepertoireTargetExample.createdAt,
  target: newCourseRepertoireTargetExample,
  repertoireSide: newCourseRepertoireTargetExample.side,
  startingFen: 'startpos',
  analysisTree: {
    rootFen: 'startpos',
    children: [{
      moveUci: 'e2e4',
      children: [{ moveUci: 'e7e5', children: [] }],
    }],
  },
  materializedDecisionCount: 2,
  materializedMoveCount: 2,
  transpositionLeafCount: 0,
  excludedBranches: [{
    branchId: 'root/e2e4/c7c5',
    pathUci: ['e2e4', 'c7c5'],
    status: 'DEFERRED',
    reason: 'DEFERRED',
  }],
};

assert.deepEqual(builderCourseDraftSchema.parse(draft), draft);
assert.equal(builderCourseDraftSchema.safeParse({
  ...draft,
  materializedMoveCount: 3,
}).success, false);
assert.equal(builderCourseDraftSchema.safeParse({
  ...draft,
  ownerId: '',
}).success, false);

const preview = builderCourseReintegrationPreviewRequestSchema.parse({
  draft,
  newLineName: 'Builder line',
});
assert.equal(preview.contractVersion, BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION);

const apply = builderCourseReintegrationApplyRequestSchema.parse({
  draft,
  newLineName: 'Builder line',
  previewToken: `sha256:${'a'.repeat(64)}`,
  target: {
    kind: 'EXISTING_LINE',
    lineId: 7,
    anchor: {
      kind: 'LINE_START',
      nodeId: null,
      normalizedFen: 'normalized-start',
    },
  },
});
assert.equal(apply.contractVersion, BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION);
assert.equal(apply.target.kind, 'EXISTING_LINE');
assert.equal(builderCourseReintegrationApplyRequestSchema.safeParse({
  ...apply,
  previewToken: 'unsigned',
}).success, false);
