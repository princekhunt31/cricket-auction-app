import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { LocalStorageService } from '../../services/local-storage.service';
import { BroadcastService } from '../../services/broadcast.service';
import { Player, Team, AuctionState } from '../../models';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatExpansionModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatDialogModule, MatDividerModule, MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './admin.html',
  styleUrl:    './admin.scss',
})
export class Admin implements OnInit, OnDestroy {

  // ── State ──────────────────────────────────────────────────────────────────
  players:      Player[]      = [];
  teams:        Team[]        = [];
  auctionState!: AuctionState;
  currentPlayer: Player | null = null;   // needed for stopAuction
  auctionReadiness = { allowed: false, unsoldCount: 0, remaining: 25 };

  // ── Forms ──────────────────────────────────────────────────────────────────
  teamForm!:   FormGroup;

  private broadcastSub?: Subscription;

  readonly roles = ['Batsman', 'Bowler', 'AllRounder', 'WicketKeeper'];
  readonly roleColors: Record<string, string> = {
    Batsman: 'role-blue', Bowler: 'role-red',
    AllRounder: 'role-green', WicketKeeper: 'role-yellow',
  };

  constructor(
    private lsService: LocalStorageService,
    private broadcast: BroadcastService,
    private snackBar:  MatSnackBar,
    private dialog:    MatDialog,
    private fb:        FormBuilder,
    private cdr:       ChangeDetectorRef,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.buildTeamForm();
    this.refreshState();
    this.broadcastSub = this.broadcast.listen().subscribe(() => this.refreshState());
  }

  ngOnDestroy(): void {
    this.broadcastSub?.unsubscribe();
  }

  // ── Form Builders ──────────────────────────────────────────────────────────

  private buildTeamForm(): void {
    this.teamForm = this.fb.group({
      name:        ['', [Validators.required, Validators.minLength(2)]],
      shortName:   ['', [Validators.required, Validators.maxLength(4), Validators.minLength(2)]],
      colorCode:   ['#3b82f6', Validators.required],
      totalBudget: [10000, [Validators.required, Validators.min(1000)]],
    });
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  refreshState(): void {
    this.players      = this.lsService.getPlayers();
    this.teams        = this.lsService.getTeams();
    this.auctionState = this.lsService.getAuctionState();
    this.auctionReadiness = this.lsService.canStartAuction();
    this.currentPlayer = this.auctionState.currentPlayerId
      ? this.players.find(p => p.id === this.auctionState.currentPlayerId) ?? null
      : null;
    this.cdr.markForCheck();
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  get isActive(): boolean      { return this.auctionState?.status === 'Active'; }
  get isIdle(): boolean        { return this.auctionState?.status === 'Idle'; }
  get unsoldPlayers(): Player[] { return this.players.filter(p => p.status === 'Unsold'); }
  get soldPlayers():   Player[] { return this.players.filter(p => p.status === 'Sold'); }
  get queueLength(): number    { return this.auctionState?.auctionQueue?.length ?? 0; }

  get canStartAuction(): boolean {
    return this.unsoldPlayers.length > 0 && this.teams.length >= 2 && this.auctionReadiness.allowed;
  }

  get startDisabledReason(): string {
    if (this.teams.length < 2)          return 'Add at least 2 teams first';
    if (!this.auctionReadiness.allowed) return `Add ${this.auctionReadiness.remaining} more players (need 25 min)`;
    return '';
  }

  // ── Fisher-Yates Shuffle ──────────────────────────────────────────────────

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Auction Control ────────────────────────────────────────────────────────

  startAuction(): void {
    if (this.teams.length < 2) { this.snack('Add at least 2 teams first!', 'warn'); return; }
    const unsold = this.players.filter(p => p.status === 'Unsold');
    if (!unsold.length) { this.snack('No unsold players!', 'warn'); return; }

    const shuffled = this.shuffle(unsold);
    const [first, ...rest] = shuffled;

    const newState: AuctionState = {
      currentPlayerId:      first.id,
      currentBid:           first.basePrice,
      currentBiddingTeamId: null,
      status:               'Active',
      bidHistory:           [],
      auctionQueue:         rest.map(p => p.id),
    };

    this.lsService.saveAuctionState(newState);
    this.broadcast.publish('AUCTION_STARTED', { auctionState: newState as unknown as Record<string, unknown> });
    this.refreshState();
    this.snack(`🏏 Auction Started! First: ${first.name}`, 'success');
  }

  stopAuction(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      panelClass: 'dark-dialog', width: '420px', disableClose: true,
      data: {
        title: 'Stop Auction?',
        lines: [
          'Current player will be returned to Unsold',
          'Remaining queue will be cleared',
          'All bid history will be lost',
        ],
        confirmLabel: 'Stop Auction', isDanger: true,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      if (this.currentPlayer) {
        this.lsService.updatePlayer({ ...this.currentPlayer, status: 'Unsold' });
      }
      const idleState: AuctionState = {
        currentPlayerId: null, currentBid: 0,
        currentBiddingTeamId: null, status: 'Idle',
        bidHistory: [], auctionQueue: [],
      };
      this.lsService.saveAuctionState(idleState);
      this.broadcast.publish('AUCTION_STOPPED', {});
      this.refreshState();
      this.snack('⏹ Auction Stopped.', 'warn');
    });
  }

  // ── Team Management ────────────────────────────────────────────────────────

  onShortNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.teamForm.get('shortName')?.setValue(input.value.toUpperCase(), { emitEvent: false });
  }

  addTeam(): void {
    if (this.teamForm.invalid) { this.teamForm.markAllAsTouched(); return; }
    const v         = this.teamForm.value;
    const shortName = (v.shortName as string).toUpperCase();
    if (this.teams.some(t => t.shortName.toUpperCase() === shortName)) {
      this.snack(`Short name "${shortName}" already exists!`, 'warn'); return;
    }
    const team: Team = {
      id: `t${Date.now()}`, name: v.name.trim(), shortName,
      colorCode: v.colorCode, totalBudget: +v.totalBudget,
      remainingBudget: +v.totalBudget, playerIds: [],
    };
    this.lsService.addTeam(team);
    this.broadcast.publish('TEAMS_UPDATED', { teams: this.lsService.getTeams() as unknown as Record<string, unknown> });
    this.refreshState();
    this.snack(`✅ Team ${team.name} added!`, 'success');
    this.teamForm.reset({ colorCode: '#3b82f6', totalBudget: 10000 });
  }

  deleteTeam(team: Team): void {
    if (this.isActive) {
      this.snack('Cannot delete teams during active auction.', 'warn');
      return;
    }
    const ref = this.dialog.open(ConfirmDialogComponent, {
      panelClass: 'dark-dialog', width: '420px', disableClose: true,
      data: {
        title: `Delete ${team.name}?`,
        lines: [
          `Release ${team.playerIds.length} bought player(s) back to Unsold`,
          `Remove ${team.shortName} from auction`,
        ],
        confirmLabel: 'Yes, Delete Team', isDanger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      for (const pid of team.playerIds) {
        const p = this.players.find(pl => pl.id === pid);
        if (p) this.lsService.updatePlayer({ ...p, status: 'Unsold', soldPrice: null, soldToTeamId: null });
      }
      if (this.auctionState.currentBiddingTeamId === team.id) {
        this.lsService.saveAuctionState({ ...this.auctionState, currentBiddingTeamId: null });
      }
      const result = this.lsService.deleteTeam(team.id);
      if (!result.success) {
        this.snack(result.reason ?? 'Cannot delete team', 'warn');
        return;
      }
      this.broadcast.publish('TEAMS_UPDATED', { teams: this.lsService.getTeams() as unknown as Record<string, unknown> });
      this.refreshState();
      this.snack(`🗑️ Team ${team.name} deleted!`, 'warn');
    });
  }


  // ── Reset ──────────────────────────────────────────────────────────────────

  openResetDialog(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      panelClass: 'dark-dialog', width: '420px', disableClose: true,
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.lsService.resetAuction();
        this.broadcast.publish('AUCTION_STOPPED', {});
        this.refreshState();
        this.snack('🔄 Auction fully reset!', 'warn');
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  formatAmount(lakhs: number): string {
    if (!lakhs) return '₹0';
    if (lakhs >= 100) { const cr = lakhs / 100; return cr % 1 === 0 ? `₹${cr}Cr` : `₹${cr.toFixed(1)}Cr`; }
    return `₹${lakhs}L`;
  }

  getTeamById(id: string): Team | undefined { return this.teams.find(t => t.id === id); }
  getBudgetPercent(t: Team): number { return Math.max(0, (t.remainingBudget / t.totalBudget) * 100); }

  private snack(msg: string, type: 'success' | 'warn'): void {
    this.snackBar.open(msg, '✕', {
      duration: 4500, panelClass: [`snack-${type}`],
      horizontalPosition: 'right', verticalPosition: 'top',
    });
  }

  get tf() { return this.teamForm.controls; }
}
