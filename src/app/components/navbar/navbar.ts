import { Component, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatRippleModule } from '@angular/material/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription, filter } from 'rxjs';

export interface NavLink {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatRippleModule,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar implements OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isMobile = false;
  private subscriptions = new Subscription();

  navLinks: NavLink[] = [
    { path: '/admin',   label: 'Admin Panel',  icon: 'admin_panel_settings' },
    { path: '/auction', label: 'Live Auction', icon: 'gavel' },
    { path: '/teams',   label: 'Teams',        icon: 'groups' },
    { path: '/players', label: 'Players',      icon: 'sports_cricket' },
  ];

  constructor(
    private breakpointObserver: BreakpointObserver,
    private router: Router,
  ) {
    this.subscriptions.add(
      this.breakpointObserver
        .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
        .subscribe(result => {
          this.isMobile = result.matches;
        })
    );

    // Close sidenav on route change
    this.subscriptions.add(
      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(() => {
          if (this.sidenav?.opened) {
            this.sidenav.close();
          }
        })
    );
  }

  toggleSidenav() {
    this.sidenav.toggle();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
