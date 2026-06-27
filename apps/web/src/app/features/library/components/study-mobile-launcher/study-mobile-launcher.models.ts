import { LibraryMarathonMode, LibraryTrainingScope } from '../../data-access/library.models';

export type StudyLauncherScope = 'COURSE' | 'CHAPTER' | 'LINE';

export interface StudyLauncherSummary {
  title: string;
  description: string;
  lineCountLabel: string;
  lineCount: number;
  activeSublineCount: number;
  weakSublineCount: number;
  untrainedSublineCount: number;
  coverageLabel: string;
  masteryLabel: string;
  canStart: boolean;
}

export type StudyLauncherStartTraining =
  | {
      scope: Exclude<LibraryTrainingScope, 'SELECTED_LINES'>;
      mode: LibraryMarathonMode;
    }
  | {
      scope: 'LINE';
      lineId: number;
      mode: LibraryMarathonMode;
    };
