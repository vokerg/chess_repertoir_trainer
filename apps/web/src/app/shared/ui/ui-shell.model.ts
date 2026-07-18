export interface UiShellStat {
  id: string;
  label: string;
  value: string | number;
}

export type UiShellActionAppearance = 'primary' | 'secondary' | 'ghost' | 'danger';

interface UiShellActionBase {
  id: string;
  label: string;
  disabled?: boolean;
}

interface UiShellCommandBase extends UiShellActionBase {
  kind?: 'command';
  appearance?: UiShellActionAppearance;
}

export type UiShellAction =
  | (UiShellCommandBase & {
      link: string | Array<string | number>;
      run?: never;
    })
  | (UiShellCommandBase & {
      link?: never;
      run: () => void;
    })
  | (UiShellActionBase & {
      kind: 'toggle';
      pressed: boolean;
      link?: never;
      run: () => void;
    });
