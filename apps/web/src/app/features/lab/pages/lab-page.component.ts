import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';

@Component({
  selector: 'app-lab-page',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, PanelComponent],
  templateUrl: './lab-page.component.html',
  styleUrl: './lab-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabPageComponent {}
