import { Component, Inject, Optional } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogData {
  title:         string;
  lines:         string[];
  confirmLabel?: string;
  isDanger?:     boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="confirm-wrap">
      <div class="confirm-header">
        <div class="warn-circle">
          <mat-icon>{{ isDanger ? 'delete_forever' : 'warning' }}</mat-icon>
        </div>
        <h2 class="confirm-title">{{ title }}</h2>
      </div>

      <mat-dialog-content class="confirm-body">
        <p>This will:</p>
        <ul>
          @for (line of lines; track line) {
            <li>{{ line }}</li>
          }
        </ul>
        <p class="irreversible">⚠️ This action cannot be undone.</p>
      </mat-dialog-content>

      <mat-dialog-actions class="confirm-actions">
        <button mat-stroked-button mat-dialog-close class="cancel-btn">Cancel</button>
        <button mat-raised-button [mat-dialog-close]="true" class="confirm-btn"
                [style.background]="isDanger ? '#b71c1c' : '#c62828'">
          <mat-icon>{{ isDanger ? 'delete' : 'restart_alt' }}</mat-icon>
          {{ confirmLabel }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-wrap {
      background: #0f1629; color: #e8eaf6;
      padding: 8px 4px; border-radius: 12px; min-width: 340px;
    }
    .confirm-header {
      display: flex; align-items: center; gap: 16px;
      padding: 16px 24px 8px;
    }
    .warn-circle {
      width: 48px; height: 48px; border-radius: 50%;
      background: rgba(255,82,82,.15); border: 2px solid rgba(255,82,82,.35);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { color: #ff5252; font-size: 24px; width: 24px; height: 24px; }
    }
    .confirm-title { font-size: 1.1rem; font-weight: 700; color: #e8eaf6; margin: 0; }
    .confirm-body {
      padding: 8px 24px 16px !important;
      color: #8ca0c0; font-size: .9rem; max-height: unset !important;
      p { margin: 6px 0; }
      ul { margin: 8px 0; padding-left: 20px; li { margin: 4px 0; } }
    }
    .irreversible { color: #ff5252 !important; font-weight: 600; margin-top: 12px !important; }
    .confirm-actions {
      display: flex; gap: 12px; justify-content: flex-end;
      padding: 8px 24px 16px !important;
    }
    .cancel-btn { color: #8ca0c0 !important; border-color: rgba(255,255,255,.12) !important; }
    .confirm-btn {
      color: #fff !important; display: flex; align-items: center; gap: 6px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
  `],
})
export class ConfirmDialogComponent {
  title:        string;
  lines:        string[];
  confirmLabel: string;
  isDanger:     boolean;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) data?: ConfirmDialogData,
  ) {
    this.title        = data?.title ?? 'Reset Entire Auction?';
    this.lines        = data?.lines ?? [
      'Reset all team budgets to their original totals',
      'Clear all player rosters',
      'Mark all players as Unsold',
      'Clear all bid history',
    ];
    this.confirmLabel = data?.confirmLabel ?? 'Yes, Reset Everything';
    this.isDanger     = data?.isDanger ?? false;
  }
}
