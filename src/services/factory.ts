import { USE_MOCK } from '../config/env';
import {
  achievementMockService,
} from './mock/achievementMock';
import { competitionMockService } from './mock/competitionMock';
import { consultantMockService } from './mock/consultantMock';
import { matchingMockService } from './mock/matchingMock';
import { roadmapMockService } from './mock/roadmapMock';
import { statsMockService } from './mock/statsMock';
import { teamMockService } from './mock/teamMock';
import { userMockService } from './mock/userMock';

import {
  achievementApiService,
  competitionApiService,
  consultantApiService,
  matchingApiService,
  roadmapApiService,
  statsApiService,
  teamApiService,
  userApiService,
} from './api';

export const competitionService = USE_MOCK ? competitionMockService : competitionApiService;
export const userService = USE_MOCK ? userMockService : userApiService;
export const matchingService = USE_MOCK ? matchingMockService : matchingApiService;
export const teamService = USE_MOCK ? teamMockService : teamApiService;
export const roadmapService = USE_MOCK ? roadmapMockService : roadmapApiService;
export const achievementService = USE_MOCK ? achievementMockService : achievementApiService;
export const consultantService = USE_MOCK ? consultantMockService : consultantApiService;
export const statsService = USE_MOCK ? statsMockService : statsApiService;
