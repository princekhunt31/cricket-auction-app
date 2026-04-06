export type PlayerRole = 'Batsman' | 'Bowler' | 'AllRounder' | 'WicketKeeper';
export type PlayerStatus = 'Unsold' | 'Sold' | 'InAuction';

export interface PlayerStats {
  runs: number;
  wickets: number;
  matches: number;
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  country: string;
  basePrice: number;           // in Lakhs
  profileImageUrl: string;
  stats: PlayerStats;
  status: PlayerStatus;
  soldPrice: number | null;    // in Lakhs, null if not sold
  soldToTeamId: string | null;
}
