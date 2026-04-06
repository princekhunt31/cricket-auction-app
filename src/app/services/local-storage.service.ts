import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Player, Team, AuctionState } from '../models';

const KEYS = {
  PLAYERS: 'cric_auction_players',
  TEAMS:   'cric_auction_teams',
  AUCTION: 'cric_auction_state',
} as const;

// ─── Seed Data ────────────────────────────────────────────────────────────────

function avatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=112244&color=f5a623&bold=true&size=128`;
}

const SEED_PLAYERS: Player[] = [];

// No hardcoded teams — admin creates custom teams at runtime

const DEFAULT_AUCTION_STATE: AuctionState = {
  currentPlayerId:      null,
  currentBid:           0,
  currentBiddingTeamId: null,
  status:               'Idle',
  bidHistory:           [],
  auctionQueue:         [],
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class LocalStorageService {

  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /** Low-level get — returns null when running on the server. */
  private get(key: string): string | null {
    return this.isBrowser ? localStorage.getItem(key) : null;
  }

  /** Low-level set — no-op when running on the server. */
  private set(key: string, value: string): void {
    if (this.isBrowser) localStorage.setItem(key, value);
  }

  /**
   * Called once at app startup. Seeds data only if LocalStorage is empty.
   * Runs only in the browser; on the server this is a harmless no-op.
   */
  initializeData(): void {
    if (!this.isBrowser) return;
    if (!this.get(KEYS.PLAYERS)) this.savePlayers(SEED_PLAYERS);
    if (!this.get(KEYS.TEAMS))   this.saveTeams([]);   // start with no teams
    if (!this.get(KEYS.AUCTION)) this.saveAuctionState(DEFAULT_AUCTION_STATE);
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  getPlayers(): Player[] {
    const raw = this.get(KEYS.PLAYERS);
    return raw ? (JSON.parse(raw) as Player[]) : [];
  }

  getTeams(): Team[] {
    const raw = this.get(KEYS.TEAMS);
    return raw ? (JSON.parse(raw) as Team[]) : [];
  }

  getAuctionState(): AuctionState {
    const raw = this.get(KEYS.AUCTION);
    return raw ? (JSON.parse(raw) as AuctionState) : { ...DEFAULT_AUCTION_STATE };
  }

  // ── Setters ──────────────────────────────────────────────────────────────

  savePlayers(players: Player[]): void {
    this.set(KEYS.PLAYERS, JSON.stringify(players));
  }

  saveTeams(teams: Team[]): void {
    this.set(KEYS.TEAMS, JSON.stringify(teams));
  }

  saveAuctionState(state: AuctionState): void {
    this.set(KEYS.AUCTION, JSON.stringify(state));
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  /**
   * Resets the full auction:
   * - All teams get full budget back, playerIds cleared
   * - All players marked 'Unsold', soldPrice/soldToTeamId nulled
   * - Auction state reset to Idle
   */
  resetAuction(): void {
    const players = this.getPlayers().map(p => ({
      ...p,
      status: 'Unsold' as const,
      soldPrice: null,
      soldToTeamId: null,
    }));

    const teams = this.getTeams().map(t => ({
      ...t,
      remainingBudget: t.totalBudget,
      playerIds: [],
    }));

    this.savePlayers(players);
    this.saveTeams(teams);
    this.saveAuctionState({ ...DEFAULT_AUCTION_STATE });
  }

  // ── Convenience Helpers ───────────────────────────────────────────────────

  getPlayerById(id: string): Player | undefined {
    return this.getPlayers().find(p => p.id === id);
  }

  getTeamById(id: string): Team | undefined {
    return this.getTeams().find(t => t.id === id);
  }

  updatePlayer(updated: Player): void {
    const players = this.getPlayers().map(p => p.id === updated.id ? updated : p);
    this.savePlayers(players);
  }

  updateTeam(updated: Team): void {
    const teams = this.getTeams().map(t => t.id === updated.id ? updated : t);
    this.saveTeams(teams);
  }

  addTeam(team: Team): void {
    this.saveTeams([...this.getTeams(), team]);
  }

  /**
   * Safe team deletion — blocked during active auction.
   * Returns { success: true } on deletion or { success: false, reason } otherwise.
   */
  deleteTeam(teamId: string): { success: boolean; reason?: string } {
    if (this.getAuctionState().status === 'Active') {
      return { success: false, reason: 'Cannot delete team during active auction' };
    }
    this.saveTeams(this.getTeams().filter(t => t.id !== teamId));
    return { success: true };
  }

  /**
   * Safe player deletion — rejects if Sold or currently in live auction.
   * Returns { success: true } on deletion, or { success: false, reason } otherwise.
   */
  deletePlayer(playerId: string): { success: boolean; reason?: string } {
    const player = this.getPlayerById(playerId);
    if (!player) return { success: false, reason: 'Player not found' };
    if (player.status === 'Sold') {
      return { success: false, reason: 'Cannot delete a sold player' };
    }
    const auctionState = this.getAuctionState();
    if (auctionState.currentPlayerId === playerId) {
      return { success: false, reason: 'Cannot delete — player is currently in live auction' };
    }
    this.savePlayers(this.getPlayers().filter(p => p.id !== playerId));

    // During active auction: auto-remove deleted player from queue
    if (auctionState.status === 'Active') {
      const newQueue = (auctionState.auctionQueue ?? []).filter(id => id !== playerId);
      this.saveAuctionState({ ...auctionState, auctionQueue: newQueue });
    }

    return { success: true };
  }

  /**
   * Returns auction readiness based on 25-player minimum.
   * During an active auction this always returns allowed=true
   * so the check is skipped entirely once auction has started.
   */
  canStartAuction(): { allowed: boolean; unsoldCount: number; remaining: number } {
    const auctionState = this.getAuctionState();
    if (auctionState.status === 'Active') {
      return { allowed: true, unsoldCount: 0, remaining: 0 };
    }
    const unsoldCount = this.getPlayers().filter(p => p.status === 'Unsold').length;
    const allowed    = unsoldCount >= 25;
    const remaining  = Math.max(0, 25 - unsoldCount);
    return { allowed, unsoldCount, remaining };
  }
}
