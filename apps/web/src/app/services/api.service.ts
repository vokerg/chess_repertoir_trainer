import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { appConfig } from '../app-config';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = appConfig.apiBaseUrl;

  constructor(private http: HttpClient) {}

  get<T>(url: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${url}`);
  }

  post<T>(url: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${url}`, body);
  }

  patch<T>(url: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${url}`, body);
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${url}`);
  }
}
