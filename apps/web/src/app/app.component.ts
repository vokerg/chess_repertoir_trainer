import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: `
    <header style="background:#222;color:#fff;padding:10px;">
      <h1>Chess Repertoire Trainer</h1>
      <nav>
        <a routerLink="/courses" routerLinkActive="active">Courses</a>
        <a routerLink="/stats" routerLinkActive="active">Stats</a>
      </nav>
    </header>
    <main style="padding:10px;">
      <router-outlet></router-outlet>
    </main>
  `
})
export class AppComponent {}