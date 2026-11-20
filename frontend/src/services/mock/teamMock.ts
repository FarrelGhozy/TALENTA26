import teamsData from '../../mocks/teams.json';
import { Team } from '../../types';
import { getItem, setItem } from '../../lib/storage';
import { ITeamService } from '../types';

const TEAMS_KEY = 'talenta-teams';

function getTeams(): Team[] {
  return getItem<Team[]>(TEAMS_KEY, teamsData as Team[]);
}

export const teamMockService: ITeamService = {
  async getTeamByUserId(userId: string): Promise<Team | null> {
    const teams = getTeams();
    return teams.find((t) => t.status !== 'arsip' && t.anggota.some((m) => m.userId === userId)) || null;
  },

  async leaveTeam(userId: string, teamId: string): Promise<void> {
    const teams = getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;

    team.anggota = team.anggota.filter((m) => m.userId !== userId);
    team.isFormed = false;
    team.status = 'mencari';
    setItem(TEAMS_KEY, teams);
  },

  async createTeam(competitionSlug: string, creatorId: string, teamName: string): Promise<Team> {
    const teams = getTeams();
    const newTeam: Team = {
      id: `t-${Date.now()}`,
      institutionId: 'inst-01',
      competitionSlug,
      nama: teamName || 'Tim Baru',
      anggota: [{ userId: creatorId, status: 'diterima' }],
      isFormed: false,
      status: 'mencari',
    };
    teams.push(newTeam);
    setItem(TEAMS_KEY, teams);
    return newTeam;
  },
};
