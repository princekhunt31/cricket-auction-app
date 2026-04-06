import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatRippleModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { LocalStorageService } from '../../services/local-storage.service';
import { BroadcastService } from '../../services/broadcast.service';
import { Player, Team, AuctionState, BidHistoryEntry } from '../../models';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';

export interface Increment { label: string; value: number; }

@Component({
  selector: 'app-auction',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule, MatChipsModule, MatProgressBarModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    MatTooltipModule, MatBadgeModule, MatRippleModule,
    MatSnackBarModule, MatDialogModule,
  ],
  templateUrl: './auction.html',
  styleUrl:    './auction.scss',
})
export class Auction implements OnInit, OnDestroy {

  // ── State ──────────────────────────────────────────────────────────────────
  players: Player[]     = [];
  teams:   Team[]       = [];
  auctionState!: AuctionState;

  currentPlayer:      Player | null = null;
  currentBiddingTeam: Team   | null = null;
  selectedTeamId:     string | null = null;
  auctionReadiness = { allowed: false, unsoldCount: 0, remaining: 25 };

  private broadcastSub?: Subscription;

  readonly increments: Increment[] = [
    { label: '+10L', value: 10  },
    { label: '+25L', value: 25  },
    { label: '+50L', value: 50  },
    { label: '+1Cr', value: 100 },
  ];

  readonly roleColors: Record<string, string> = {
    Batsman: 'role-blue', Bowler: 'role-red',
    AllRounder: 'role-green', WicketKeeper: 'role-yellow',
  };

  constructor(
    private lsService:  LocalStorageService,
    private broadcast:  BroadcastService,
    private snackBar:   MatSnackBar,
    private dialog:     MatDialog,
    private cdr:        ChangeDetectorRef,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.refreshState();
    // Real-time sync — triggers on any message from another tab
    this.broadcastSub = this.broadcast.listen().subscribe(() => this.refreshState());
  }

  ngOnDestroy(): void {
    this.broadcastSub?.unsubscribe();
  }

  // ── Data Refresh ───────────────────────────────────────────────────────────

  refreshState(): void {
    this.players      = this.lsService.getPlayers();
    this.teams        = this.lsService.getTeams();
    this.auctionState = this.lsService.getAuctionState();
    this.auctionReadiness = this.lsService.canStartAuction();

    this.currentPlayer = this.auctionState.currentPlayerId
      ? this.players.find(p => p.id === this.auctionState.currentPlayerId) ?? null
      : null;

    this.currentBiddingTeam = this.auctionState.currentBiddingTeamId
      ? this.teams.find(t => t.id === this.auctionState.currentBiddingTeamId) ?? null
      : null;

    this.cdr.markForCheck();
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  get isActive(): boolean     { return this.auctionState?.status === 'Active'; }
  get isIdle(): boolean       { return this.auctionState?.status === 'Idle'; }
  get queueLength(): number   { return this.auctionState?.auctionQueue?.length ?? 0; }
  get unsoldPlayerCount(): number { return this.players.filter(p => p.status === 'Unsold').length; }
  get unsoldPlayersExist(): boolean { return this.unsoldPlayerCount > 0; }

  get recentBids(): BidHistoryEntry[] {
    return [...(this.auctionState?.bidHistory ?? [])].reverse().slice(0, 10);
  }

  get canStartAuction(): boolean {
    return this.isIdle && this.teams.length >= 2 && this.auctionReadiness.allowed;
  }

  get startDisabledReason(): string {
    if (!this.isIdle)                   return '';
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

  // ── Auction Start ──────────────────────────────────────────────────────────

  startAuction(): void {
    const unsold = this.players.filter(p => p.status === 'Unsold');
    if (!unsold.length || this.teams.length < 2) return;

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
    this.broadcast.publish('AUCTION_STARTED', { auctionState: newState });
    this.refreshState();
    this.snack(`🏏 Auction Started! First: ${first.name}`, 'success');
  }

  // ── Queue Advance (internal) ───────────────────────────────────────────────

  private advanceQueue(snackMsg: string): void {
    const state   = this.lsService.getAuctionState();
    const queue   = [...(state.auctionQueue ?? [])];
    const players = this.lsService.getPlayers();

    if (queue.length > 0) {
      const nextId = queue.shift()!;
      const next   = players.find(p => p.id === nextId);

      if (next) {
        const newState: AuctionState = {
          currentPlayerId:      nextId,
          currentBid:           next.basePrice,
          currentBiddingTeamId: null,
          status:               'Active',
          bidHistory:           [],
          auctionQueue:         queue,
        };
        this.lsService.saveAuctionState(newState);
        this.refreshState();
        this.snack(`${snackMsg} ▶ Next: ${next.name}`, 'success');
      } else {
        // Player deleted — skip
        this.lsService.saveAuctionState({ ...state, auctionQueue: queue });
        this.advanceQueue(snackMsg);
      }
    } else {
      const idleState: AuctionState = {
        currentPlayerId: null, currentBid: 0,
        currentBiddingTeamId: null, status: 'Idle',
        bidHistory: [], auctionQueue: [],
      };
      this.lsService.saveAuctionState(idleState);
      this.broadcast.publish('AUCTION_COMPLETE', {});
      this.refreshState();
      this.snack(`${snackMsg} 🎉 Auction Complete!`, 'success');
    }
  }

  // ── SOLD / UNSOLD ─────────────────────────────────────────────────────────

  markSold(): void {
    if (!this.currentPlayer || !this.auctionState.currentBiddingTeamId) return;

    const soldToTeam = this.teams.find(t => t.id === this.auctionState.currentBiddingTeamId)!;
    const soldPrice  = this.auctionState.currentBid;
    const name       = this.currentPlayer.name;

    const updatedPlayer = { ...this.currentPlayer, status: 'Sold' as const, soldPrice, soldToTeamId: soldToTeam.id };
    this.lsService.updatePlayer(updatedPlayer);
    this.lsService.updateTeam({
      ...soldToTeam,
      remainingBudget: soldToTeam.remainingBudget - soldPrice,
      playerIds:       [...soldToTeam.playerIds, this.currentPlayer.id],
    });

    this.broadcast.publish('PLAYER_SOLD', {
      player:       updatedPlayer as unknown as Record<string, unknown>,
      team:         soldToTeam   as unknown as Record<string, unknown>,
      auctionState: this.lsService.getAuctionState() as unknown as Record<string, unknown>,
    });

    this.advanceQueue(`🏏 ${name} SOLD to ${soldToTeam.shortName} for ${this.formatAmount(soldPrice)}!`);
  }

  markUnsold(): void {
    if (!this.currentPlayer) return;
    const name = this.currentPlayer.name;
    const updated = { ...this.currentPlayer, status: 'Unsold' as const };
    this.lsService.updatePlayer(updated);

    this.broadcast.publish('PLAYER_UNSOLD', {
      player:       updated as unknown as Record<string, unknown>,
      auctionState: this.lsService.getAuctionState() as unknown as Record<string, unknown>,
    });

    this.advanceQueue(`❌ ${name} — Unsold.`);
  }

  // ── Team Selection ─────────────────────────────────────────────────────────

  selectTeam(teamId: string): void {
    if (!this.isActive) return;
    this.selectedTeamId = this.selectedTeamId === teamId ? null : teamId;
  }

  get selectedTeam(): Team | null {
    return this.selectedTeamId
      ? this.teams.find(t => t.id === this.selectedTeamId) ?? null
      : null;
  }

  // ── Bidding ────────────────────────────────────────────────────────────────

  placeBid(increment: number): void {
    if (!this.selectedTeamId || !this.isActive) return;
    const team = this.teams.find(t => t.id === this.selectedTeamId);
    if (!team) return;

    const newBid = this.auctionState.currentBid + increment;
    if (team.remainingBudget < newBid) return;

    const entry: BidHistoryEntry = {
      playerId:  this.auctionState.currentPlayerId ?? '',
      teamId:    team.id,
      bidAmount: newBid,
      timestamp: new Date().toISOString(),
      type:      'increment',
    };

    const newState: AuctionState = {
      ...this.auctionState,
      currentBid:           newBid,
      currentBiddingTeamId: team.id,
      bidHistory:           [...this.auctionState.bidHistory, entry],
    };

    this.lsService.saveAuctionState(newState);
    this.broadcast.publish('BID_PLACED', { auctionState: newState as unknown as Record<string, unknown> });
    this.refreshState();
  }

  isTeamLeading(teamId: string): boolean {
    return !!this.auctionState?.currentBiddingTeamId &&
           this.auctionState.currentBiddingTeamId === teamId;
  }

  get hasOpeningBid(): boolean {
    return !!this.auctionState?.currentBiddingTeamId;
  }

  get waitingForOpeningBid(): boolean {
    return this.isActive && !this.hasOpeningBid;
  }

  /** Step 1 — first team to bid accepts the base price */
  placeOpeningBid(team: Team): void {
    if (!this.currentPlayer || !this.isActive) return;
    if (team.remainingBudget < this.currentPlayer.basePrice) return;

    const basePrice = this.currentPlayer.basePrice;
    const entry: BidHistoryEntry = {
      playerId:  this.auctionState.currentPlayerId ?? '',
      teamId:    team.id,
      bidAmount: basePrice,
      timestamp: new Date().toISOString(),
      type:      'opening',
    };

    const newState: AuctionState = {
      ...this.auctionState,
      currentBid:           basePrice,
      currentBiddingTeamId: team.id,
      bidHistory:           [...this.auctionState.bidHistory, entry],
    };

    this.lsService.saveAuctionState(newState);
    this.broadcast.publish('BID_PLACED', { auctionState: newState as unknown as Record<string, unknown> });
    this.refreshState();
    this.snack(`🏏 ${team.name} opened bid at ${this.formatAmount(basePrice)}!`, 'success');
  }

  canSelectedTeamBid(increment: number): boolean {
    if (!this.selectedTeamId) return false;
    if (this.isTeamLeading(this.selectedTeamId)) return false; // leading team cannot outbid themselves
    const team = this.teams.find(t => t.id === this.selectedTeamId);
    return !!team && team.remainingBudget >= (this.auctionState.currentBid + increment);
  }

  canTeamBid(teamId: string, increment: number): boolean {
    const team = this.teams.find(t => t.id === teamId);
    return !!team && this.isActive && team.remainingBudget >= (this.auctionState.currentBid + increment);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getBudgetPercent(t: Team): number { return Math.max(0, (t.remainingBudget / t.totalBudget) * 100); }

  getBudgetColorClass(t: Team): string {
    const p = this.getBudgetPercent(t);
    return p > 50 ? 'budget-green' : p > 20 ? 'budget-yellow' : 'budget-red';
  }

  formatAmount(lakhs: number): string {
    if (!lakhs) return '₹0';
    if (lakhs >= 100) { const cr = lakhs / 100; return cr % 1 === 0 ? `₹${cr}Cr` : `₹${cr.toFixed(1)}Cr`; }
    return `₹${lakhs}L`;
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  getTeamById(id: string): Team | undefined { return this.teams.find(t => t.id === id); }
  isCurrentBidder(teamId: string): boolean  { return this.auctionState?.currentBiddingTeamId === teamId; }
  teamCanAfford(team: Team): boolean         { return team.remainingBudget >= this.auctionState.currentBid; }

  statusLabel(status: string): string {
    return ({ Idle: '⏳ Waiting', Active: '🔴 LIVE', Paused: '⏸ Paused' } as Record<string, string>)[status] ?? status;
  }

  private snack(msg: string, type: 'success' | 'warn'): void {
    this.snackBar.open(msg, '✕', {
      duration: 4500, panelClass: [`snack-${type}`],
      horizontalPosition: 'right', verticalPosition: 'top',
    });
  }
}
