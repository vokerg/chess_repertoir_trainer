export interface UiShellStat {
  id: string;
  label: string;
  value: string | number;
}

interface UiShellActionBase {
  id: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
}

export type UiShellAction = UiShellActionBase &
  (
    | { link: string | Array<string | number>; run?: never }
    | { link?: never; run: () => void }
  );
