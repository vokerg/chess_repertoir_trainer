import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { messageFromUnknownError } from '@/api/errors';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { LineCard } from '@/features/library/components/LineCard';
import { useLines } from '@/features/library/hooks/useStudyLibrary';
import { UserColor } from '@/api/dto';
import { spacing } from '@/theme/spacing';

export function ChapterLinesScreen() {
  const params = useLocalSearchParams<{ chapterId: string }>();
  const chapterId = Number(params.chapterId);
  const queryClient = useQueryClient();
  const lines = useLines(chapterId);
  const [name, setName] = useState('');
  const [sideToTrain, setSideToTrain] = useState<UserColor>('WHITE');
  const [startingFen, setStartingFen] = useState('startpos');

  const createLine = useMutation({
    mutationFn: () => endpoints.chapters.createLine(chapterId, { name: name.trim(), sideToTrain, startingFen: startingFen.trim() || 'startpos' }),
    onSuccess: async () => {
      setName('');
      setStartingFen('startpos');
      await queryClient.invalidateQueries({ queryKey: ['lines', chapterId] });
    },
    onError: (error) => Alert.alert('Create failed', messageFromUnknownError(error)),
  });
  const deleteLine = useMutation({
    mutationFn: endpoints.lines.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lines', chapterId] }),
  });

  async function exportPgn(lineId: number): Promise<void> {
    const result = await endpoints.lines.exportPgn(lineId);
    await Clipboard.setStringAsync(typeof result === 'string' ? result : result.pgn ?? '');
    Alert.alert('PGN copied');
  }

  return (
    <Screen>
      <Header title="Lines" subtitle="Create, train, edit, and export chapter lines." />
      <View style={styles.form}>
        <TextField label="Name" value={name} onChangeText={setName} placeholder="Main line" />
        <SegmentedControl
          value={sideToTrain}
          onChange={setSideToTrain}
          options={[
            { label: 'White', value: 'WHITE' },
            { label: 'Black', value: 'BLACK' },
          ]}
        />
        <TextField label="Starting FEN" value={startingFen} onChangeText={setStartingFen} />
        <Button title="Create line" disabled={!name.trim()} onPress={() => createLine.mutate()} />
      </View>
      {lines.isLoading ? <LoadingState label="Loading lines..." /> : null}
      {lines.error ? <ErrorState message={lines.error.message} onRetry={() => void lines.refetch()} /> : null}
      {lines.data?.map((line) => (
        <LineCard key={line.id} line={line} onExport={() => void exportPgn(line.id)} onDelete={() => deleteLine.mutate(line.id)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
});
