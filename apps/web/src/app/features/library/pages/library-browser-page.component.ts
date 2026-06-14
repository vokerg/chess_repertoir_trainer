import { DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../components/page-header.component';
import { LibraryApiService } from '../data-access/library-api.service';
import {
  failureRate,
  lineStatus,
  sideLabel,
  startingPositionLabel,
  statusClass,
  statusLabel,
} from '../helpers/library-line.helpers';
import { LibraryBrowserStore } from '../state/library-browser.store';

@Component({
  selector: 'app-library-browser-page',
  standalone: true,
  imports: [DecimalPipe, NgClass, FormsModule, RouterLink, PageHeaderComponent],
  providers: [LibraryApiService, LibraryBrowserStore],
  templateUrl: './library-browser-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryBrowserPageComponent implements OnInit {
  protected readonly store = inject(LibraryBrowserStore);
  protected readonly lineStatus = lineStatus;
  protected readonly failureRate = failureRate;
  protected readonly statusLabel = statusLabel;
  protected readonly statusClass = statusClass;
  protected readonly sideLabel = sideLabel;
  protected readonly startingPositionLabel = startingPositionLabel;

  ngOnInit(): void {
    void this.store.loadCourses();
  }
}
