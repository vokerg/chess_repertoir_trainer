export interface UiShellStat {
  id: string;
  label: string;
  value: string | number;
}

interface UiShellActionBase {
  id: string;
  label: string;
  disabled?: boolean;
}

export type UiShellAction =
  | (UiShellActionBase & {
      kind?: 'command';
      link: string | Array<string | number>;
      run?: never;
    })
  | (UiShellActionBase & {
      kind?: 'command';
      link?: never;
      run: () => void;
    })
  | (UiShellActionBase & {
      kind: 'toggle';
      pressed: boolean;
      link?: never;
      run: () => void;
    });
