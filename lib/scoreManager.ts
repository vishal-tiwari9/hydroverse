export type PlayerId = string;

export interface PlayerScore {
  id: PlayerId;
  name: string;
  kills: number;
  deaths: number;
  score: number;
  stylePoints: number; // For "NFS" style reward system
  team?: 'red' | 'blue';
}

export interface MatchResult {
  winner: string;
  team?: string;
}

class ScoreManagerClass {
  players: Record<PlayerId, PlayerScore> = {};
  teamScores = { red: 0, blue: 0 };

  reset(names: { id: PlayerId; name: string; team?: 'red' | 'blue' }[]) {
    this.players = {};
    this.teamScores = { red: 0, blue: 0 };
    names.forEach(({ id, name, team }) => {
      this.players[id] = { id, name, kills: 0, deaths: 0, score: 0, stylePoints: 0, team };
    });
  }

  onKill(killerId: PlayerId, victimId: PlayerId, mode: string): MatchResult | null {
    if (this.players[killerId]) {
      this.players[killerId].kills++;
      this.players[killerId].stylePoints += 150; // Bonus for the kill
      this.players[killerId].score += mode === 'TDM' ? 1 : 2;
      if (this.players[killerId].team) {
        this.teamScores[this.players[killerId].team!]++;
      }
    }
    if (this.players[victimId]) this.players[victimId].deaths++;
    return null;
  }

  onDeath(id: PlayerId) {
    if (this.players[id]) this.players[id].deaths++;
  }

  getSorted(): PlayerScore[] {
    return Object.values(this.players).sort((a, b) => b.score - a.score);
  }

  calculateRewards(id: PlayerId, matchTimeSeconds: number): { hydroTokens: number, xp: number } {
    const p = this.players[id];
    if (!p) return { hydroTokens: 0, xp: 0 };

    const killTokens = p.kills * 75;
    const styleTokens = Math.floor(p.stylePoints * 0.5);
    const timeXP = Math.floor(matchTimeSeconds * 2.5);
    
    return { 
      hydroTokens: killTokens + styleTokens, 
      xp: (p.kills * 100) + timeXP 
    };
  }
}

export const ScoreManager = new ScoreManagerClass();
