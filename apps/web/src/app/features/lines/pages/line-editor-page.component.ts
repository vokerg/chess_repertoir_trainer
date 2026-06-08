import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { LineEditorWorkbenchComponent } from '../components/line-editor-workbench.component';
import { LineEditorStore } from '../state/line-editor.store';

@Component({
  selector: 'app-line-editor-page',
  standalone: true,
  imports: [RouterLink, LineEditorWorkbenchComponent],
  providers: [LineEditorStore],
  templateUrl: './line-editor-page.component.html',
  styleUrl: './line-editor-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineEditorPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(LineEditorStore);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('lineId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lineId) => this.store.initialize(lineId));
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    this.store.handleKeyboard(event);
  }

  protected confirmDeleteSelectedSubtree(): void {
    const message = this.store.deleteConfirmationText();
    if (!message || !window.confirm(message)) return;
    void this.store.deleteSelectedSubtree();
  }
}
