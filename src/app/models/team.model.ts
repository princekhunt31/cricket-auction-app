export interface Team {
  id: string;
  name: string;
  shortName: string;
  colorCode: string;
  totalBudget: number;       // in Lakhs (10000 = 100 Crore)
  remainingBudget: number;   // in Lakhs
  playerIds: string[];
}
