import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { Player, Team } from '../../models';

export interface TeamSquadSheetData {
  team: Team;
  players: Player[];
}

@Component({
  selector: 'app-team-squad-sheet',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDividerModule],
  template: `
    <div class="sheet-root">

      <!-- Header -->
      <div class="sheet-header" [style.border-bottom-color]="data.team.colorCode">
        <div class="sheet-team-info">
          <span class="sheet-dot" [style.background]="data.team.colorCode"></span>
          <div>
            <h2 class="sheet-team-name">{{ data.team.name }}</h2>
            <span class="sheet-team-short">{{ data.team.shortName }}</span>
          </div>
        </div>
        <button mat-icon-button (click)="close()" class="close-btn" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Budget summary -->
      <div class="sheet-budget-row">
        <div class="budget-item">
          <span class="budget-lbl">Remaining Budget</span>
          <span class="budget-val">{{ formatAmount(data.team.remainingBudget) }}</span>
        </div>
        <div class="budget-item">
          <span class="budget-lbl">Total Spent</span>
          <span class="budget-val spent">{{ formatAmount(totalSpent) }}</span>
        </div>
        <div class="budget-item">
          <span class="budget-lbl">Players Bought</span>
          <span class="budget-val">{{ data.players.length }}</span>
        </div>
      </div>

      <mat-divider class="sheet-divider"></mat-divider>

      <!-- Players List -->
      @if (data.players.length === 0) {
        <div class="sheet-empty">
          <mat-icon>sports_cricket</mat-icon>
          <p>No players bought yet</p>
          <span>Bid in the Live Auction tab to build your squad!</span>
        </div>
      } @else {
        <div class="sheet-player-list">
          @for (player of data.players; track player.id) {
            <div class="sheet-player-row">
              <img [src]="player.profileImageUrl" [alt]="player.name"
                   class="sheet-avatar" />
              <div class="sheet-player-info">
                <span class="sheet-player-name">{{ player.name }}</span>
                <span class="sheet-player-sub">{{ player.country }}</span>
              </div>
              <span class="sheet-role-badge"
                    [class]="getRoleCls(player.role)">
                {{ player.role }}
              </span>
              <span class="sheet-price">{{ formatAmount(player.soldPrice!) }}</span>
            </div>
          }
        </div>

        <mat-divider class="sheet-divider"></mat-divider>
        <div class="sheet-total-row">
          <span class="total-label">Total Spent</span>
          <span class="total-value">{{ formatAmount(totalSpent) }}</span>
        </div>
      }

      <!-- Close button -->
      <button mat-stroked-button class="sheet-close-btn" (click)="close()">
        <mat-icon>keyboard_arrow_down</mat-icon> Close
      </button>
    </div>
  `,
  styles: [`
    .sheet-root {
      background: #0f1629;
      color: #e8eaf6;
      padding: 0;
      border-radius: 20px 20px 0 0;
      max-height: 80vh;
      overflow-y: auto;
      font-family: 'Roboto', sans-serif;
    }
    .sheet-root::-webkit-scrollbar { width: 4px; }
    .sheet-root::-webkit-scrollbar-thumb { background: #1a3260; border-radius: 2px; }

    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 2px solid;
      position: sticky;
      top: 0;
      background: #0f1629;
      z-index: 10;
    }
    .sheet-team-info {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .sheet-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .sheet-team-name {
      font-size: 1.2rem;
      font-weight: 800;
      margin: 0 0 2px;
      color: #e8eaf6;
    }
    .sheet-team-short {
      font-size: 0.78rem;
      color: #7a8bb0;
      letter-spacing: 0.5px;
    }
    .close-btn { color: #7a8bb0 !important; }

    .sheet-budget-row {
      display: flex;
      justify-content: space-around;
      padding: 14px 24px;
      gap: 8px;
    }
    .budget-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .budget-lbl {
      font-size: 0.68rem;
      color: #7a8bb0;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .budget-val {
      font-size: 1rem;
      font-weight: 700;
      color: #e8eaf6;
      &.spent { color: #ff6b6b; }
    }

    .sheet-divider {
      border-color: rgba(255, 215, 0, 0.1) !important;
      margin: 0 !important;
    }

    .sheet-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 40px 24px;
      color: #7a8bb0;
      text-align: center;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #1a3260; }
      p { margin: 0; font-size: 1rem; font-weight: 600; color: #e8eaf6; }
      span { font-size: 0.82rem; }
    }

    .sheet-player-list {
      padding: 8px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sheet-player-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: #152040;
      border: 1px solid rgba(255, 215, 0, 0.08);
      transition: border-color 0.2s;
      &:hover { border-color: rgba(255, 215, 0, 0.2); }
    }
    .sheet-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255, 215, 0, 0.2);
      flex-shrink: 0;
    }
    .sheet-player-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .sheet-player-name { font-size: 0.9rem; font-weight: 700; color: #e8eaf6; }
    .sheet-player-sub  { font-size: 0.72rem; color: #7a8bb0; }
    .sheet-price {
      font-size: 0.9rem;
      font-weight: 800;
      color: #ffd700;
      white-space: nowrap;
    }

    .sheet-role-badge {
      font-size: 0.64rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .role-blue   { background: rgba(33,150,243,0.18); color: #64b5f6; border: 1px solid rgba(33,150,243,.3); }
    .role-red    { background: rgba(244,67,54,0.18);  color: #ef9a9a; border: 1px solid rgba(244,67,54,.3); }
    .role-green  { background: rgba(76,175,80,0.18);  color: #a5d6a7; border: 1px solid rgba(76,175,80,.3); }
    .role-yellow { background: rgba(255,215,0,0.15);  color: #ffd700; border: 1px solid rgba(255,215,0,.3); }

    .sheet-total-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 28px;
      background: rgba(255, 215, 0, 0.04);
    }
    .total-label { font-size: 0.85rem; font-weight: 600; color: #7a8bb0; }
    .total-value { font-size: 1.1rem; font-weight: 800; color: #ffd700; }

    .sheet-close-btn {
      display: flex;
      width: calc(100% - 48px);
      margin: 14px 24px 20px;
      justify-content: center;
      color: #7a8bb0 !important;
      border-color: rgba(255,255,255,0.1) !important;
      border-radius: 10px !important;
    }
  `],
})
export class TeamSquadSheetComponent {
  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: TeamSquadSheetData,
    private sheetRef: MatBottomSheetRef<TeamSquadSheetComponent>,
  ) {}

  get totalSpent(): number {
    return this.data.players.reduce((sum, p) => sum + (p.soldPrice ?? 0), 0);
  }

  getRoleCls(role: string): string {
    const map: Record<string, string> = {
      Batsman: 'sheet-role-badge role-blue',
      Bowler:  'sheet-role-badge role-red',
      AllRounder:   'sheet-role-badge role-green',
      WicketKeeper: 'sheet-role-badge role-yellow',
    };
    return map[role] ?? 'sheet-role-badge';
  }

  formatAmount(lakhs: number): string {
    if (!lakhs) return '₹0';
    if (lakhs >= 100) {
      const cr = lakhs / 100;
      return cr % 1 === 0 ? `₹${cr}Cr` : `₹${cr.toFixed(1)}Cr`;
    }
    return `₹${lakhs}L`;
  }

  close(): void { this.sheetRef.dismiss(); }
}
