import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CourseCoverKey, CourseSide } from '@chess-trainer/contracts/courses';
import { courseCoverOptionsForSide } from '../../helpers/course-presentation';

@Component({
  selector: 'app-course-cover-picker',
  standalone: true,
  templateUrl: './course-cover-picker.component.html',
  styleUrl: './course-cover-picker.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCoverPickerComponent {
  readonly side = input.required<CourseSide>();
  readonly selectedKey = input.required<CourseCoverKey>();
  readonly selectedKeyChange = output<CourseCoverKey>();

  protected readonly options = computed(() => courseCoverOptionsForSide(this.side()));
}
