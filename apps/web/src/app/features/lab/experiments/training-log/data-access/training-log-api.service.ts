import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { TrainingLogResponse } from './training-log.models';

@Injectable()
export class TrainingLogApiService {
  private readonly api = inject(ApiService);

  getTrainingLog(): Observable<TrainingLogResponse> {
    return this.api.get<TrainingLogResponse>('/lab/training-log');
  }
}
