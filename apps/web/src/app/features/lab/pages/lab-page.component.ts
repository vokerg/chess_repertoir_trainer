import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-lab-page',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent],
  templateUrl: './lab-page.component.html',
  styleUrl: './lab-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabPageComponent {}
