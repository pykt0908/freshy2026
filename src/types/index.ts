// ==========================================
// Types for Freshy Scoring System
// ==========================================

export interface Competition {
  id: string;
  name: string;
  description: string;
  rounds: Round[];
  currentRound: number;
  criteria: Criterion[];
  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
}

export interface Round {
  name: string;
  topN: number;
  status: 'pending' | 'active' | 'completed';
  criteria?: Criterion[];
}

export interface Criterion {
  id: string;
  name: string;
  maxScore: number;
}

export interface Contestant {
  id: string;
  name: string;
  nickname: string;
  classroom?: string;
  number: number;
  imageUrl: string;
  competitionId: string;
  eliminatedAtRound: number | null;
  manuallySelected: boolean;
}

export interface Score {
  id: string;
  judgeId: string;
  judgeName: string;
  contestantId: string;
  competitionId: string;
  round: number;
  scores: Record<string, number>; // criterionId -> score
  totalScore: number;
  submittedAt: Date;
}

export interface AppUser {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: 'admin' | 'judge';
  competitionIds: string[];
  createdAt: Date;
}

export interface ScoreboardEntry {
  contestant: Contestant;
  judgeScores: Score[];
  totalScore: number;
  averageScore: number;
  rank: number;
  isAdvanced: boolean;
  isManuallySelected: boolean;
}
