import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Subscription } from 'rxjs';

import { LocalStorageService } from '../../services/local-storage.service';
import { BroadcastService } from '../../services/broadcast.service';
import { Player, Team } from '../../models';
import {
  TeamSquadSheetComponent,
  TeamSquadSheetData,
} from '../../components/team-squad-sheet/team-squad-sheet';

@Component({
  selector: 'app-teams',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatBottomSheetModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './teams.html',
  styleUrl:    './teams.scss',
})
export class Teams implements OnInit, OnDestroy {

  teams:   Team[]   = [];
  players: Player[] = [];

  private broadcastSub?: Subscription;

  constructor(
    private lsService:   LocalStorageService,
    private broadcast:   BroadcastService,
    private bottomSheet: MatBottomSheet,
    private cdr:         ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.refreshState();
    this.broadcastSub = this.broadcast.listen().subscribe(() => this.refreshState());
  }

  ngOnDestroy(): void {
    this.broadcastSub?.unsubscribe();
  }

  refreshState(): void {
    this.teams   = this.lsService.getTeams();
    this.players = this.lsService.getPlayers();
    this.cdr.markForCheck();
  }

  // ── Team helpers ───────────────────────────────────────────────────────────

  getTeamPlayers(team: Team): Player[] {
    return this.players.filter(p => team.playerIds.includes(p.id));
  }

  getBudgetPercent(team: Team): number {
    return Math.max(0, (team.remainingBudget / team.totalBudget) * 100);
  }

  getBudgetColorClass(team: Team): string {
    const pct = this.getBudgetPercent(team);
    if (pct > 50) return 'budget-green';
    if (pct > 20) return 'budget-yellow';
    return 'budget-red';
  }

  getBudgetLabel(team: Team): string {
    const pct = this.getBudgetPercent(team);
    if (pct > 50) return 'Healthy';
    if (pct > 20) return 'Moderate';
    return 'Low';
  }

  openSquad(team: Team): void {
    const data: TeamSquadSheetData = {
      team,
      players: this.getTeamPlayers(team),
    };
    this.bottomSheet.open(TeamSquadSheetComponent, {
      data,
      panelClass: 'dark-bottom-sheet',
    });
  }

  // ── Auction summary stats ──────────────────────────────────────────────────

  get totalSold(): number {
    return this.players.filter(p => p.status === 'Sold').length;
  }

  get totalUnsold(): number {
    return this.players.filter(p => p.status === 'Unsold').length;
  }

  get totalMoneySpent(): number {
    return this.players.reduce((sum, p) => sum + (p.soldPrice ?? 0), 0);
  }

  // ── Formatting ─────────────────────────────────────────────────────────────

  formatAmount(lakhs: number): string {
    if (!lakhs) return '₹0';
    if (lakhs >= 100) {
      const cr = lakhs / 100;
      return cr % 1 === 0 ? `₹${cr}Cr` : `₹${cr.toFixed(1)}Cr`;
    }
    return `₹${lakhs}L`;
  }

  budgetDisplay(team: Team): string {
    return `${this.formatAmount(team.remainingBudget)} / ${this.formatAmount(team.totalBudget)}`;
  }
}
