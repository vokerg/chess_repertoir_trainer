import type { MobileCourseBundleDto } from '@chess-trainer/contracts/mobile-sync';
import type { SQLiteDatabase } from 'expo-sqlite';

export async function writeCourseBundleRevision(
  tx: SQLiteDatabase,
  appUserId: string,
  bundle: MobileCourseBundleDto,
  now: string,
): Promise<void> {
  await tx.runAsync(
    `INSERT INTO course_revision (
      app_user_id, course_id, content_revision, bundle_schema_version, status,
      course_name, course_description, generated_at, downloaded_at, activated_at
    ) VALUES (?, ?, ?, ?, 'STAGING', ?, ?, ?, ?, NULL)`,
    appUserId,
    bundle.courseId,
    bundle.contentRevision,
    bundle.bundleSchemaVersion,
    bundle.course.name,
    bundle.course.description,
    bundle.generatedAt,
    now,
  );

  for (const chapter of bundle.chapters) {
    await tx.runAsync(
      `INSERT INTO course_chapter (
        app_user_id, course_id, content_revision, chapter_id,
        name, description, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      appUserId, bundle.courseId, bundle.contentRevision, chapter.id,
      chapter.name, chapter.description, chapter.sortOrder,
    );
  }

  for (const line of bundle.lines) {
    await tx.runAsync(
      `INSERT INTO course_line (
        app_user_id, course_id, content_revision, line_id, chapter_id,
        name, side_to_train, starting_fen, notes, tags_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      appUserId, bundle.courseId, bundle.contentRevision, line.id, line.chapterId,
      line.name, line.sideToTrain, line.startingFen, line.notes, JSON.stringify(line.tags),
    );
  }

  for (const node of bundle.moveNodes) {
    await tx.runAsync(
      `INSERT INTO move_node (
        app_user_id, course_id, content_revision, node_id, line_id, parent_id,
        ply_number, fen_before, fen_after, move_uci, move_san, move_number,
        color_to_move_before, side, is_user_move, is_correct_user_move,
        sort_order, branch_label, branch_weight, comment, annotation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      appUserId, bundle.courseId, bundle.contentRevision, node.id, node.lineId,
      node.parentId, node.plyNumber, node.fenBefore, node.fenAfter, node.moveUci,
      node.moveSan, node.moveNumber, node.colorToMoveBefore, node.side,
      node.isUserMove ? 1 : 0, node.isCorrectUserMove ? 1 : 0, node.sortOrder,
      node.branchLabel, node.branchWeight, node.comment, node.annotation,
    );
  }

  for (const subline of bundle.sublines) {
    await tx.runAsync(
      `INSERT INTO training_subline (
        app_user_id, course_id, content_revision, subline_hash,
        subline_key_version, line_id, leaf_node_id, starting_fen, side_to_train
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      appUserId, bundle.courseId, bundle.contentRevision, subline.sublineHash,
      subline.sublineKeyVersion, subline.lineId, subline.leafNodeId,
      subline.startingFen, subline.sideToTrain,
    );
    for (let index = 0; index < subline.moves.length; index += 1) {
      const move = subline.moves[index];
      if (!move) continue;
      await tx.runAsync(
        `INSERT INTO training_subline_move (
          app_user_id, course_id, content_revision, subline_hash,
          subline_key_version, sequence, node_id, move_uci, move_san,
          fen_before, fen_after, is_user_move, comment, annotation, branch_label
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        appUserId, bundle.courseId, bundle.contentRevision, subline.sublineHash,
        subline.sublineKeyVersion, index + 1, move.nodeId, move.moveUci, move.moveSan,
        move.fenBefore, move.fenAfter, move.isUserMove ? 1 : 0,
        move.comment ?? null, move.annotation ?? null, move.branchLabel ?? null,
      );
    }
  }
}
