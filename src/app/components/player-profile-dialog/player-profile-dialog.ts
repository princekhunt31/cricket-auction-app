import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { Player, Team, AuctionState } from '../../models';

export interface PlayerDialogData {
  player:       Player;
  team:         Team | null;
  auctionState: AuctionState;
  isInAuction:  boolean;
}

@Component({
  selector: 'app-player-profile-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule],
  template: `
    <div class="dialog-root">

      <!-- Header -->
      <div class="dialog-header">
        <button mat-icon-button class="close-btn" (click)="close()" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Body -->
      <div class="dialog-body">

        <!-- LEFT — Avatar & Identity -->
        <div class="profile-left">
          <div class="avatar-ring">
            <img [src]="data.player.profileImageUrl"
                 [alt]="data.player.name"
                 class="profile-avatar" />
          </div>
          <h2 class="profile-name">{{ data.player.name }}</h2>
          <span class="role-badge" [class]="getRoleCls(data.player.role)">
            {{ data.player.role }}
          </span>
          <p class="profile-country">
            {{ countryEmoji }} {{ data.player.country }}
          </p>
        </div>

        <!-- RIGHT — Stats & Status -->
        <div class="profile-right">

          <!-- Stats Grid -->
          <div class="stats-grid">
            <div class="stat-box">
              <span class="stat-value">{{ data.player.stats.matches }}</span>
              <span class="stat-label">Matches</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{{ data.player.stats.runs }}</span>
              <span class="stat-label">Runs</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{{ data.player.stats.wickets }}</span>
              <span class="stat-label">Wickets</span>
            </div>
          </div>

          <mat-divider class="divider"></mat-divider>

          <!-- Base Price -->
          <div class="base-price-row">
            <mat-icon class="bp-icon">currency_rupee</mat-icon>
            <span class="bp-label">Base Price</span>
            <span class="bp-value">{{ formatAmount(data.player.basePrice) }}</span>
          </div>

          <mat-divider class="divider"></mat-divider>

          <!-- Status Card -->
          @if (data.isInAuction) {
            <div class="status-card auction-card">
              <span class="auction-dot"></span>
              <div>
                <div class="status-card-title">Currently in Auction</div>
                <div class="status-card-sub">
                  Current Bid:
                  <strong>{{ formatAmount(data.auctionState.currentBid) }}</strong>
                </div>
              </div>
            </div>
          } @else if (data.player.status === 'Sold' && data.team) {
            <div class="status-card sold-card">
              <mat-icon>check_circle</mat-icon>
              <div>
                <div class="status-card-title">SOLD</div>
                <div class="status-card-sub">
                  <span class="team-dot-sm"
                        [style.background]="data.team.colorCode"></span>
                  {{ data.team.name }} ·
                  <strong>{{ formatAmount(data.player.soldPrice!) }}</strong>
                </div>
              </div>
            </div>
          } @else {
            <div class="status-card unsold-card">
              <mat-icon>sports_cricket</mat-icon>
              <div>
                <div class="status-card-title">Available for Auction</div>
                <div class="status-card-sub">This player has not been sold yet</div>
              </div>
            </div>
          }

        </div>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        @if (!data.isInAuction && data.player.status === 'Unsold') {
          <button mat-stroked-button class="delete-dialog-btn" (click)="requestDelete()">
            <mat-icon>delete</mat-icon>
            Delete Player
          </button>
        } @else if (data.player.status === 'Sold') {
          <span class="dialog-note note-info">ℹ️ Sold players cannot be deleted</span>
        } @else if (data.isInAuction) {
          <span class="dialog-note note-warn">⚠️ Player is currently in live auction</span>
        }
        <button mat-raised-button class="close-main-btn" (click)="close()">
          Close
        </button>
      </div>

    </div>
  `,
  styles: [`
    .dialog-root {
      background: #0f1629;
      color: #e8eaf6;
      border-radius: 16px;
      overflow: hidden;
      font-family: 'Roboto', sans-serif;
      min-width: 340px;
    }
    .dialog-header {
      display: flex;
      justify-content: flex-end;
      padding: 12px 16px 0;
    }
    .close-btn { color: #7a8bb0 !important; }

    .dialog-body {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 24px;
      padding: 8px 28px 24px;
      @media (max-width: 520px) {
        grid-template-columns: 1fr;
        text-align: center;
      }
    }

    /* LEFT */
    .profile-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .avatar-ring {
      width: 108px;
      height: 108px;
      border-radius: 50%;
      padding: 3px;
      background: conic-gradient(#ffd700, #f5a623, #ffd700);
      animation: ring-spin 4s linear infinite;
    }
    @keyframes ring-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .profile-avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
      border: 3px solid #0f1629;
    }
    .profile-name {
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0;
      text-align: center;
      color: #e8eaf6;
    }
    .profile-country {
      font-size: 0.88rem;
      color: #7a8bb0;
      margin: 0;
    }

    /* Role Badges */
    .role-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .role-blue   { background: rgba(33,150,243,.18); color: #64b5f6; border: 1px solid rgba(33,150,243,.3); }
    .role-red    { background: rgba(244,67,54,.18);  color: #ef9a9a; border: 1px solid rgba(244,67,54,.3); }
    .role-green  { background: rgba(76,175,80,.18);  color: #a5d6a7; border: 1px solid rgba(76,175,80,.3); }
    .role-yellow { background: rgba(255,215,0,.15);  color: #ffd700; border: 1px solid rgba(255,215,0,.3); }

    /* RIGHT */
    .profile-right { display: flex; flex-direction: column; gap: 16px; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .stat-box {
      background: #152040;
      border: 1px solid rgba(255,215,0,0.1);
      border-radius: 12px;
      padding: 14px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .stat-value {
      font-size: 1.3rem;
      font-weight: 800;
      color: #e8eaf6;
    }
    .stat-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #7a8bb0;
    }

    .divider { border-color: rgba(255,215,0,0.1) !important; }

    .base-price-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
    }
    .bp-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; color: #f5a623; }
    .bp-label { color: #7a8bb0; flex: 1; }
    .bp-value { font-weight: 700; color: #ffd700; font-size: 1rem; }

    /* Status Cards */
    .status-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid;
      font-size: 0.85rem;
      mat-icon { font-size: 24px; width: 24px; height: 24px; }
    }
    .status-card-title { font-weight: 700; margin-bottom: 2px; }
    .status-card-sub   { font-size: 0.78rem; opacity: 0.8; display: flex; align-items: center; gap: 5px; }

    .sold-card {
      background: rgba(0,230,118,0.07);
      border-color: rgba(0,230,118,0.25);
      color: #a5d6a7;
      mat-icon { color: #00e676; }
    }

    .unsold-card {
      background: rgba(255,255,255,0.03);
      border-color: rgba(255,255,255,0.08);
      color: #7a8bb0;
    }

    .auction-card {
      background: rgba(255,152,0,0.1);
      border-color: rgba(255,152,0,0.3);
      color: #ffcc80;
      animation: auction-pulse 2s ease infinite;
    }
    @keyframes auction-pulse {
      0%,100% { box-shadow: 0 0 0 rgba(255,152,0,0); }
      50%      { box-shadow: 0 0 16px rgba(255,152,0,0.25); }
    }
    .auction-dot {
      width: 10px; height: 10px; border-radius: 50%; background: #ff9800;
      flex-shrink: 0;
      animation: blink 1.2s ease infinite;
    }
    @keyframes blink {
      0%,100% { opacity: 1; }
      50%      { opacity: 0.2; }
    }

    .team-dot-sm {
      width: 8px; height: 8px; border-radius: 50%;
      display: inline-block; flex-shrink: 0;
    }

    .dialog-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 0 28px 24px;
    }
    .close-main-btn {
      background: #152040 !important;
      color: #7a8bb0 !important;
      border-radius: 10px !important;
      min-width: 120px !important;
    }
    .delete-dialog-btn {
      border-color: rgba(244,67,54,0.45) !important;
      color: #ef5350 !important;
      border-radius: 10px !important;
      mat-icon { margin-right: 4px; font-size: 18px !important; width: 18px !important; height: 18px !important; }
      &:hover { background: rgba(244,67,54,0.08) !important; }
    }
    .dialog-note {
      font-size: 0.78rem;
      font-weight: 500;
    }
    .note-info { color: #7a8bb0; }
    .note-warn { color: #ffcc80; }
  `],
})
export class PlayerProfileDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PlayerDialogData,
    private dialogRef: MatDialogRef<PlayerProfileDialogComponent>,
  ) {}

  get countryEmoji(): string {
    const map: Record<string, string> = {
      'India': '🇮🇳', 'Australia': '🇦🇺', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      'South Africa': '🇿🇦', 'New Zealand': '🇳🇿', 'West Indies': '🏏',
      'Pakistan': '🇵🇰', 'Sri Lanka': '🇱🇰', 'Bangladesh': '🇧🇩',
      'Afghanistan': '🇦🇫',
    };
    return map[this.data.player.country] ?? '🌍';
  }

  getRoleCls(role: string): string {
    const map: Record<string, string> = {
      Batsman: 'role-badge role-blue', Bowler: 'role-badge role-red',
      AllRounder: 'role-badge role-green', WicketKeeper: 'role-badge role-yellow',
    };
    return map[role] ?? 'role-badge';
  }

  formatAmount(lakhs: number): string {
    if (!lakhs) return '₹0';
    if (lakhs >= 100) {
      const cr = lakhs / 100;
      return cr % 1 === 0 ? `₹${cr}Cr` : `₹${cr.toFixed(1)}Cr`;
    }
    return `₹${lakhs}L`;
  }

  close(): void { this.dialogRef.close(); }

  /** Signal the parent players page to trigger delete confirmation */
  requestDelete(): void { this.dialogRef.close('delete'); }
}
