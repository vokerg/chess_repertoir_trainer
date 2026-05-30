import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { messageFromUnknownError } from '@/api/errors';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { Board } from '@/features/board/Board';
import { EnginePanel } from '@/features/engine/components/EnginePanel';
import { useLineTree } from '../hooks/useLineTree';
import { MoveTreeList } from '../components/MoveTreeList';
import { flattenMoveTree } from '../utils/tree';
import { MoveNodeDto } from '@/api/dto';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { fenForChessJs } from '@/utils/chess';

const rootNode: MoveNodeDto = {
  id: 0,
  parentId: null,
  fenAfter: 'startpos',
};

export function LineEditorScreen() {
  const params = useLocalSearchParams<{ lineId: string }>();
  const lineId = Number(params.lineId);
  const { line, tree } = useLineTree(lineId);
  const queryClient = useQueryClient();
  const [selectedNodeId, setSelectedNodeId] = useState(0);
  const [branchLabel, setBranchLabel] = useState('');
  const [comment, setComment] = useState('');
  const [annotation, setAnnotation] = useState('');

  const flatRows = useMemo(() => (tree.data ? flattenMoveTree(tree.data.root) : []), [tree.data]);
  const selectedNode = selectedNodeId === 0 ? rootNode : flatRows.find((row) => row.id === selectedNodeId)?.node ?? rootNode;
  const fen = selectedNodeId === 0 ? line.data?.startingFen ?? 'startpos' : selectedNode.fenAfter;

  const createNode = useMutation({
    mutationFn: (moveUci: string) => endpoints.lines.createNode(lineId, { parentId: selectedNodeId === 0 ? null : selectedNodeId, moveUci }),
    onSuccess: async (node) => {
      setSelectedNodeId(node.id);
      await queryClient.invalidateQueries({ queryKey: ['lineTree', lineId] });
    },
    onError: (error) => Alert.alert('Move rejected', messageFromUnknownError(error)),
  });
  const saveNotes = useMutation({
    mutationFn: () => endpoints.lines.updateNode(selectedNodeId, { branchLabel, comment, annotation }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lineTree', lineId] }),
  });
  const deleteSubtree = useMutation({
    mutationFn: () => endpoints.lines.deleteSubtree(selectedNodeId),
    onSuccess: async () => {
      setSelectedNodeId(0);
      await queryClient.invalidateQueries({ queryKey: ['lineTree', lineId] });
    },
  });

  if (line.isLoading || tree.isLoading) return <Screen><LoadingState label="Loading line editor..." /></Screen>;
  if (line.error) return <Screen><ErrorState message={line.error.message} onRetry={() => void line.refetch()} /></Screen>;
  if (tree.error) return <Screen><ErrorState message={tree.error.message} onRetry={() => void tree.refetch()} /></Screen>;

  return (
    <Screen>
      <Header title={line.data?.name ?? 'Edit line'} subtitle={`Train as ${line.data?.sideToTrain ?? ''}`} />
      <Board
        fen={fenForChessJs(fen)}
        side={line.data?.sideToTrain ?? 'WHITE'}
        disabled={createNode.isPending}
        onMove={(uci) => createNode.mutate(uci)}
      />
      <View style={styles.row}>
        <Button title="Start" variant="secondary" onPress={() => setSelectedNodeId(0)} />
        <Button title="Previous" variant="secondary" onPress={() => setSelectedNodeId(selectedNode.parentId ?? 0)} />
        <Button title="End" variant="secondary" onPress={() => setSelectedNodeId(flatRows.at(-1)?.id ?? 0)} />
      </View>
      <Card style={styles.panel}>
        <Text style={styles.panelTitle}>Move tree</Text>
        {tree.data ? (
          <MoveTreeList
            root={tree.data.root}
            selectedNodeId={selectedNodeId}
            onSelect={(row) => {
              setSelectedNodeId(row.id);
              setBranchLabel(row.node.branchLabel ?? '');
              setComment(row.node.comment ?? '');
              setAnnotation(row.node.annotation ?? '');
            }}
          />
        ) : null}
      </Card>
      {selectedNodeId !== 0 ? (
        <Card style={styles.panel}>
          <Text style={styles.panelTitle}>Notes</Text>
          <TextField label="Branch label" value={branchLabel} onChangeText={setBranchLabel} />
          <TextField label="Comment" value={comment} onChangeText={setComment} multiline />
          <TextField label="Annotation" value={annotation} onChangeText={setAnnotation} />
          <Button title="Save notes" onPress={() => saveNotes.mutate()} />
          <Button title="Delete selected subtree" variant="danger" onPress={() => deleteSubtree.mutate()} />
        </Card>
      ) : null}
      <EnginePanel fen={fenForChessJs(fen)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  panel: {
    gap: spacing.md,
  },
  panelTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '900',
  },
});
