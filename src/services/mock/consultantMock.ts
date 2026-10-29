import consultantsData from '../../mocks/consultants.json';
import { Consultant } from '../../types';
import { IConsultantService } from '../types';

export const consultantMockService: IConsultantService = {
  async getByCompetition(_slug: string): Promise<Consultant[]> {
    // Tahap 1 mock: kembalikan konsultan yang ada
    return consultantsData as Consultant[];
  },
};
