import { JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({
  imports: [JsonPipe],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  auth = inject(AuthService)
  result = signal<unknown>(null)
  
  callMe() {
    this.auth.loadMe().subscribe(u => this.result.set(u))
  }
}
