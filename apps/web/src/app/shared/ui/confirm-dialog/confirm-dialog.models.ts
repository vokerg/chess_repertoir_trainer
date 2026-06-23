export type ConfirmDialogTone = 'default' | 'warning' | 'danger';

export interface ConfirmDialogRequest {
  title: string;
  message: string;
  details?: readonly string[];
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  requireTypedConfirmation?: string;
}
