import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Subscription } from 'rxjs';

import { LocalStorageService } from '../../services/local-storage.service';
import { BroadcastService } from '../../services/broadcast.service';
import { Player, Team, AuctionState } from '../../models';
import {
  PlayerProfileDialogComponent,
  PlayerDialogData,
} from '../../components/player-profile-dialog/player-profile-dialog';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-players',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatCardModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './players.html',
  styleUrl:    './players.scss',
})
export class Players implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort)      sort!: MatSort;

  // ── Data ───────────────────────────────────────────────────────────────────
  allPlayers: Player[]      = [];
  teams:      Team[]        = [];
  auctionState!: AuctionState;
  countries:  string[]      = [];

  // ── Table data source ──────────────────────────────────────────────────────
  dataSource = new MatTableDataSource<Player>([]);
  displayedColumns = ['index', 'avatar', 'name', 'role', 'country', 'basePrice', 'status', 'soldPrice', 'team', 'actions'];

  // ── Filters ────────────────────────────────────────────────────────────────
  searchQuery   = '';
  roleFilter    = 'All';
  statusFilter  = 'All';
  countryFilter = 'All';

  readonly roles   = ['All', 'Batsman', 'Bowler', 'AllRounder', 'WicketKeeper'];
  readonly statuses = ['All', 'Unsold', 'Sold', 'InAuction'];

  readonly roleColors: Record<string, string> = {
    Batsman: 'role-blue', Bowler: 'role-red',
    AllRounder: 'role-green', WicketKeeper: 'role-yellow',
  };

  private broadcastSub?: Subscription;
  auctionReadiness = { allowed: false, unsoldCount: 0, remaining: 25 };

  constructor(
    private lsService: LocalStorageService,
    private broadcast: BroadcastService,
    private dialog:    MatDialog,
    private snackBar:  MatSnackBar,
    private cdr:       ChangeDetectorRef,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.refreshState();
    this.broadcastSub = this.broadcast.listen().subscribe(() => this.refreshState());
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort      = this.sort;
  }

  ngOnDestroy(): void {
    this.broadcastSub?.unsubscribe();
  }

  // ── Data Refresh ───────────────────────────────────────────────────────────

  refreshState(): void {
    this.allPlayers   = this.lsService.getPlayers();
    this.teams        = this.lsService.getTeams();
    this.auctionState = this.lsService.getAuctionState();
    this.auctionReadiness = this.lsService.canStartAuction();
    this.countries    = [...new Set(this.allPlayers.map(p => p.country))].sort();
    this.applyFilters();
    this.cdr.markForCheck();
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  applyFilters(): void {
    let filtered = [...this.allPlayers];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    if (this.roleFilter !== 'All') {
      filtered = filtered.filter(p => p.role === this.roleFilter);
    }

    if (this.statusFilter !== 'All') {
      if (this.statusFilter === 'InAuction') {
        filtered = filtered.filter(p => this.isInAuction(p));
      } else {
        filtered = filtered.filter(p =>
          p.status === this.statusFilter && !this.isInAuction(p)
        );
      }
    }

    if (this.countryFilter !== 'All') {
      filtered = filtered.filter(p => p.country === this.countryFilter);
    }

    this.dataSource.data = filtered;

    // Reset to first page on filter change
    if (this.paginator) this.paginator.firstPage();
  }

  clearFilters(): void {
    this.searchQuery   = '';
    this.roleFilter    = 'All';
    this.statusFilter  = 'All';
    this.countryFilter = 'All';
    this.applyFilters();
  }

  get hasActiveFilter(): boolean {
    return this.searchQuery !== '' || this.roleFilter !== 'All' ||
           this.statusFilter !== 'All' || this.countryFilter !== 'All';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  get isActive(): boolean {
    return this.auctionState?.status === 'Active';
  }

  isInAuction(player: Player): boolean {
    return this.auctionState?.currentPlayerId === player.id;
  }

  getStatusLabel(player: Player): string {
    if (this.isInAuction(player)) return 'In Auction';
    return player.status;
  }

  getStatusCls(player: Player): string {
    if (this.isInAuction(player)) return 'status-auction';
    if (player.status === 'Sold')   return 'status-sold';
    return 'status-unsold';
  }

  getTeamForPlayer(player: Player): Team | null {
    return player.soldToTeamId
      ? this.teams.find(t => t.id === player.soldToTeamId) ?? null
      : null;
  }

  // ── Dialog ─────────────────────────────────────────────────────────────────

  openPlayerDialog(player: Player): void {
    const data: PlayerDialogData = {
      player,
      team:         this.getTeamForPlayer(player),
      auctionState: this.auctionState,
      isInAuction:  this.isInAuction(player),
    };
    const ref = this.dialog.open(PlayerProfileDialogComponent, {
      data,
      width:       '620px',
      maxWidth:    '96vw',
      panelClass:  'dark-dialog',
    });
    ref.afterClosed().subscribe((result: string | undefined) => {
      if (result === 'delete') this.deletePlayer(player);
    });
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

  // Stats for summary
  get totalPlayers(): number  { return this.allPlayers.length; }
  get soldCount(): number     { return this.allPlayers.filter(p => p.status === 'Sold').length; }
  get unsoldCount(): number   { return this.allPlayers.filter(p => p.status === 'Unsold' && !this.isInAuction(p)).length; }

  getRowIndex(localIndex: number): number {
    const pageIndex = this.paginator?.pageIndex ?? 0;
    const pageSize  = this.paginator?.pageSize  ?? 10;
    return pageIndex * pageSize + localIndex + 1;
  }

  // ── Delete Player ──────────────────────────────────────────────────────────

  canDeletePlayer(player: Player): boolean {
    return player.status !== 'Sold' && !this.isInAuction(player);
  }

  getDeleteTooltip(player: Player): string {
    if (player.status === 'Sold') {
      const team = this.getTeamForPlayer(player);
      return `Cannot delete — ${player.name} is already sold${team ? ' to ' + team.shortName : ''}`;
    }
    if (this.isInAuction(player)) {
      return `Cannot delete — ${player.name} is currently in live auction`;
    }
    return 'Delete Player';
  }

  deletePlayer(player: Player, event?: Event): void {
    event?.stopPropagation();
    if (!this.canDeletePlayer(player)) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      panelClass: 'dark-dialog', width: '420px', disableClose: true,
      data: {
        title: `Delete ${player.name}?`,
        lines: [
          'This action cannot be undone',
          'Player will be permanently removed from the auction pool',
        ],
        confirmLabel: 'Yes, Delete', isDanger: true,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      const result = this.lsService.deletePlayer(player.id);
      if (result.success) {
        this.broadcast.publish('PLAYERS_UPDATED', { players: this.lsService.getPlayers() as unknown as Record<string, unknown> });
        this.refreshState();
        this.snack(`🗑️ ${player.name} deleted successfully!`, 'success');
      } else {
        this.snack(result.reason ?? 'Cannot delete player', 'warn');
      }
    });
  }

  private snack(msg: string, type: 'success' | 'warn'): void {
    this.snackBar.open(msg, '✕', {
      duration: 4000, panelClass: [`snack-${type}`],
      horizontalPosition: 'right', verticalPosition: 'top',
    });
  }
}
