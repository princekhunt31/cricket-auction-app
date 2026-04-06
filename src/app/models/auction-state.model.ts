export type AuctionStatus = 'Idle' | 'Active' | 'Paused';

export interface BidHistoryEntry {
  playerId:  string;
  teamId:    string;
  bidAmount: number;       // in Lakhs
  timestamp: string;       // ISO string
  type?:     'opening' | 'increment';
}

export interface AuctionState {
  currentPlayerId:      string | null;
  currentBid:           number;           // in Lakhs
  currentBiddingTeamId: string | null;
  status:               AuctionStatus;
  bidHistory:           BidHistoryEntry[];
  auctionQueue:         string[];          // ordered list of upcoming player IDs
}
