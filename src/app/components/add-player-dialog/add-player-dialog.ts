import {
  Component, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';

import { LocalStorageService } from '../../services/local-storage.service';
import { BroadcastService } from '../../services/broadcast.service';
import { Player } from '../../models/player.model';

@Component({
  selector: 'app-add-player-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <div class="apd-root">

      <!-- Header -->
      <div class="apd-header">
        <h2 class="apd-title">Add New Player 🏏</h2>
        <button mat-icon-button class="apd-close" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="apd-body">
        <form [formGroup]="form" (ngSubmit)="addPlayer()">

          <!-- ── Image Upload ─────────────────── -->
          <div class="iu-section">
            <label class="iu-label">Player Profile Image</label>
            <div class="iu-box" (click)="imgInput.click()" [class.has-img]="imagePreview">
              @if (imagePreview) {
                <img [src]="imagePreview" alt="Preview" class="iu-preview" />
                <button mat-icon-button type="button" class="iu-clear"
                        (click)="$event.stopPropagation(); clearImage()">
                  <mat-icon>close</mat-icon>
                </button>
              } @else {
                <div class="iu-placeholder">
                  <mat-icon class="iu-cam-icon">add_a_photo</mat-icon>
                  <span>Click to upload photo</span>
                </div>
              }
            </div>
            <input #imgInput type="file" accept=".jpg,.jpeg,.png,.webp"
                   style="display:none" (change)="onImageSelected($event)">
            <span class="iu-hint">Supported: JPG, PNG, WEBP (Max 2MB)</span>
            @if (imageError) {
              <span class="iu-error">
                <mat-icon style="font-size:14px;width:14px;height:14px">error</mat-icon>
                {{ imageError }}
              </span>
            }
          </div>

          <mat-divider class="form-divider"></mat-divider>

          <!-- ── Name ───────────────────────── -->
          <mat-form-field appearance="outline" class="apd-field">
            <mat-label>Player Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. Virat Kohli">
            <mat-icon matSuffix>person</mat-icon>
            @if (f['name'].invalid && f['name'].touched) {
              <mat-error>Name is required (min 2 chars)</mat-error>
            }
          </mat-form-field>

          <!-- ── Role ───────────────────────── -->
          <mat-form-field appearance="outline" class="apd-field">
            <mat-label>Role</mat-label>
            <mat-select formControlName="role">
              @for (role of roles; track role) {
                <mat-option [value]="role">{{ role }}</mat-option>
              }
            </mat-select>
            <mat-icon matSuffix>sports_cricket</mat-icon>
          </mat-form-field>

          <!-- ── Country ────────────────────── -->
          <mat-form-field appearance="outline" class="apd-field">
            <mat-label>Country</mat-label>
            <input matInput formControlName="country" placeholder="e.g. India">
            <mat-icon matSuffix>flag</mat-icon>
            @if (f['country'].invalid && f['country'].touched) {
              <mat-error>Country is required</mat-error>
            }
          </mat-form-field>

          <!-- ── Base Price ──────────────────── -->
          <mat-form-field appearance="outline" class="apd-field">
            <mat-label>Base Price (Lakhs)</mat-label>
            <input matInput type="number" formControlName="basePrice" min="20">
            <span matTextPrefix>₹&nbsp;</span>
            <span matTextSuffix>&nbsp;L</span>
            @if (f['basePrice'].invalid && f['basePrice'].touched) {
              <mat-error>Min base price is ₹20L</mat-error>
            }
          </mat-form-field>

          <!-- ── Stats (optional 3-col) ─────── -->
          <div class="stats-grid">
            <mat-form-field appearance="outline" class="apd-field">
              <mat-label>Matches</mat-label>
              <input matInput type="number" formControlName="matches" min="0"
                     placeholder="e.g. 150">
              <mat-icon matSuffix>sports</mat-icon>
              <mat-hint>Optional</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="apd-field">
              <mat-label>Runs</mat-label>
              <input matInput type="number" formControlName="runs" min="0"
                     placeholder="e.g. 4500">
              <mat-icon matSuffix>trending_up</mat-icon>
              <mat-hint>Optional</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="apd-field">
              <mat-label>Wickets</mat-label>
              <input matInput type="number" formControlName="wickets" min="0"
                     placeholder="e.g. 12">
              <mat-icon matSuffix>speed</mat-icon>
              <mat-hint>Optional</mat-hint>
            </mat-form-field>
          </div>

        </form>

        <!-- Readiness chip -->
        @if (!isActive) {
          <div class="apd-chip"
               [class.chip-warn]="!auctionReadiness.allowed"
               [class.chip-ok]="auctionReadiness.allowed">
            @if (!auctionReadiness.allowed) {
              📋 {{ auctionReadiness.unsoldCount }}/25 players — need {{ auctionReadiness.remaining }} more
            } @else {
              ✅ {{ auctionReadiness.unsoldCount }} players ready!
            }
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="apd-footer">
        <button mat-stroked-button type="button" class="apd-cancel" (click)="cancel()">
          Cancel
        </button>
        <button mat-raised-button class="apd-submit" (click)="addPlayer()">
          <mat-icon>add</mat-icon>
          Add Player
        </button>
      </div>
    </div>
  `,
  styles: [`
    .apd-root {
      background: #0a0e1a;
      color: #e8eaf6;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      font-family: 'Roboto', sans-serif;
    }

    /* ── Header ── */
    .apd-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px 12px;
      border-bottom: 1px solid rgba(255,215,0,0.12);
      flex-shrink: 0;
    }
    .apd-title { font-size: 1.15rem; font-weight: 800; margin: 0; }
    .apd-close  { color: #7a8bb0 !important; }

    /* ── Body ── */
    .apd-body {
      overflow-y: auto;
      padding: 20px 24px 8px;
      display: flex;
      flex-direction: column;
      gap: 0;
      flex: 1;
    }

    /* ── Image Upload ── */
    .iu-section {
      display: flex; flex-direction: column;
      align-items: flex-start; gap: 8px; margin-bottom: 16px;
    }
    .iu-label { font-size: 0.82rem; font-weight: 600; color: #7a8bb0; }
    .iu-box {
      position: relative; width: 150px; height: 150px;
      border: 2px dashed #ffd700; border-radius: 8px; cursor: pointer;
      background: #1a1a2e; display: flex; align-items: center;
      justify-content: center; overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
      &:hover { border-color: #fff176; box-shadow: 0 0 12px rgba(255,215,0,0.25); }
      &.has-img { border-style: solid; border-color: rgba(255,215,0,0.6); }
    }
    .iu-preview { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
    .iu-clear {
      position: absolute; top: 4px; right: 4px;
      width: 26px !important; height: 26px !important;
      background: rgba(0,0,0,0.65) !important; color: #fff !important;
    }
    .iu-placeholder {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; color: #7a8bb0; font-size: 0.75rem; text-align: center; padding: 0 8px;
    }
    .iu-cam-icon { font-size: 32px !important; width: 32px !important; height: 32px !important; color: rgba(255,215,0,0.5); }
    .iu-hint    { font-size: 0.72rem; color: #5a6880; }
    .iu-error   { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #ef5350; }

    .form-divider { border-color: rgba(255,215,0,0.1) !important; margin-bottom: 16px; }

    /* ── Fields ── */
    .apd-field {
      width: 100%;
      margin-bottom: 2px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }

    /* ── Readiness chip ── */
    .apd-chip {
      display: inline-flex; align-items: center;
      padding: 5px 14px; border-radius: 20px;
      font-size: 0.77rem; font-weight: 600;
      border: 1px solid transparent; margin-top: 10px;
      &.chip-warn { color: #ff9800; background: rgba(255,152,0,.1); border-color: rgba(255,152,0,.3); }
      &.chip-ok   { color: #00e676; background: rgba(0,230,118,.08); border-color: rgba(0,230,118,.25); }
    }

    /* ── Footer ── */
    .apd-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 12px;
      padding: 14px 24px 20px;
      border-top: 1px solid rgba(255,215,0,0.1);
      flex-shrink: 0;
    }
    .apd-cancel {
      border-color: rgba(255,255,255,0.15) !important;
      color: #7a8bb0 !important; border-radius: 10px !important;
    }
    .apd-submit {
      background: linear-gradient(135deg, #f5a623, #ffd700) !important;
      color: #0a0e1a !important; font-weight: 700 !important;
      border-radius: 10px !important;
      box-shadow: 0 4px 14px rgba(255,215,0,0.2) !important;
    }
  `],
})
export class AddPlayerDialogComponent {
  form:         FormGroup;
  imagePreview: string | null = null;
  imageError:   string | null = null;
  auctionReadiness = { allowed: false, unsoldCount: 0, remaining: 25 };
  isActive = false;

  readonly roles = ['Batsman', 'Bowler', 'AllRounder', 'WicketKeeper'];
  get f() { return this.form.controls; }

  constructor(
    private dialogRef: MatDialogRef<AddPlayerDialogComponent>,
    private fb:        FormBuilder,
    private lsService: LocalStorageService,
    private broadcast: BroadcastService,
    private snackBar:  MatSnackBar,
    private cdr:       ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      name:      ['', [Validators.required, Validators.minLength(2)]],
      role:      ['Batsman', Validators.required],
      country:   ['India', Validators.required],
      basePrice: [50, [Validators.required, Validators.min(20)]],
      matches:   [null],
      runs:      [null],
      wickets:   [null],
    });
    const state = this.lsService.getAuctionState();
    this.isActive = state.status === 'Active';
    this.auctionReadiness = this.lsService.canStartAuction();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.imageError = null;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.imageError = 'Only JPG, PNG, WEBP allowed.';
      this.imagePreview = null; input.value = '';
      this.cdr.markForCheck(); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.imageError = 'Image too large. Please upload under 2MB.';
      this.imagePreview = null; input.value = '';
      this.cdr.markForCheck(); return;
    }
    const reader = new FileReader();
    reader.onload = () => { this.imagePreview = reader.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  clearImage(): void { this.imagePreview = null; this.imageError = null; }

  addPlayer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    const n = v.name.trim();
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=1a237e&color=ffd700&bold=true&size=200`;
    const newPlayer: Player = {
      id: `p${Date.now()}`, name: n, role: v.role, country: v.country.trim(),
      basePrice: +v.basePrice,
      profileImageUrl: this.imagePreview ?? fallback,
      stats: { matches: +(v.matches ?? 0), runs: +(v.runs ?? 0), wickets: +(v.wickets ?? 0) },
      status: 'Unsold', soldPrice: null, soldToTeamId: null,
    };
    this.lsService.savePlayers([...this.lsService.getPlayers(), newPlayer]);
    this.broadcast.publish('PLAYERS_UPDATED', {
      players: this.lsService.getPlayers() as unknown as Record<string, unknown>,
    });
    this.snackBar.open(`✅ ${newPlayer.name} added successfully!`, '✕', {
      duration: 4000, panelClass: ['snack-success'],
      horizontalPosition: 'right', verticalPosition: 'top',
    });
    this.dialogRef.close('added');
  }

  cancel(): void { this.dialogRef.close(); }
}
