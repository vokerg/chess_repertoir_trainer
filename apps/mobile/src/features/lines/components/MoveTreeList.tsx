import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MoveTreeNodeDto } from '@/api/dto';
import { FlatMoveNode, flattenMoveTree } from '../utils/tree';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function MoveTreeList({
  root,
  selectedNodeId,
  onSelect,
}: {
  root: MoveTreeNodeDto;
  selectedNodeId: number;
  onSelect: (node: FlatMoveNode) => void;
}) {
  return (
    <View style={styles.wrap}>
      {flattenMoveTree(root).map((row) => {
        const selected = row.id === selectedNodeId;
        return (
          <Pressable
            accessibilityRole="button"
            key={row.id}
            onPress={() => onSelect(row)}
            style={[styles.row, selected && styles.selected, { marginLeft: Math.min(row.depth * 12, 72) }]}
          >
            <Text style={styles.move}>{row.label}</Text>
            <Text style={styles.meta}>{row.node.isUserMove ? 'you' : 'opp'} · {row.node.moveUci}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    minHeight: 44,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.sm,
  },
  selected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  move: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
  },
});
