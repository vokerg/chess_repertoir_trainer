import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TrainingLogApiService } from './data-access/training-log-api.service';
import { TrainingLogItem, TrainingLogResult } from './data-access/training-log.models';
import { TrainingLogStore } from './state/training-log.store';

@Component({
  selector: 'app-lab-training-log',
  standalone: true,
  imports: [DatePipe],
  providers: [TrainingLogApiService, TrainingLogStore],
  templateUrl: './training-log-experiment.component.html',
  styleUrl: './training-log-experiment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingLogExperimentComponent implements OnInit {
  protected readonly store = inject(TrainingLogStore);

  ngOnInit(): void {
    void this.store.load();
  }

  protected resultLabel(result: TrainingLogResult): string {
    switch (result) {
      case 'PASSED':
        return 'Pass';
      case 'FAILED':
        return 'Fail';
      case 'ABANDONED':
        return 'Abandoned';
      default:
        return 'In progress';
    }
  }

  protected activeLabel(item: TrainingLogItem): string {
    return item.isActiveSubline ? 'Current' : 'Historical';
  }

  protected accuracyLabel(accuracy: number | null): string {
    return accuracy === null ? '\u2014' : `${Math.round(accuracy * 100)}%`;
  }

  protected sequenceLabel(sequence: string | null): string {
    return sequence?.trim() || '\u2014';
  }

  protected sequenceLines(sequence: string | null): string[] {
    const text = sequence?.trim();
    if (!text) return ['\u2014'];

    const moves = text.split(/\s+/).filter(Boolean);
    if (moves.length <= 4) return [text];

    const lineCount = moves.length > 8 ? 3 : 2;
    const chunkSize = Math.ceil(moves.length / lineCount);
    const lines: string[] = [];

    for (let index = 0; index < moves.length; index += chunkSize) {
      lines.push(moves.slice(index, index + chunkSize).join(' '));
    }

    return lines;
  }
}
