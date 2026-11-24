import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { achievementService, dashboardService } from '@talenta/services';

export interface AdminNavCounts {
  achievements: {
    menunggu: number;
    perlu_perbaikan: number;
    disetujui: number;
    ditolak: number;
    semua: number;
  };
  competitions: number | null;
  consultants: number | null;
  selections: number | null;
  users: number | null;
}

const DEFAULT_COUNTS: AdminNavCounts = {
  achievements: {
    menunggu: 0,
    perlu_perbaikan: 0,
    disetujui: 0,
    ditolak: 0,
    semua: 0,
  },
  competitions: null,
  consultants: null,
  selections: null,
  users: null,
};

interface AdminNavContextValue {
  counts: AdminNavCounts;
  rawDashboard: any | null;
  loadingCounts: boolean;
  refreshNavCounts: () => Promise<void>;
  openMobileDrawer: () => void;
  activeCompetitionName: string | null;
  setActiveCompetitionName: (name: string | null) => void;
}

const AdminNavContext = createContext<AdminNavContextValue>({
  counts: DEFAULT_COUNTS,
  rawDashboard: null,
  loadingCounts: false,
  refreshNavCounts: async () => undefined,
  openMobileDrawer: () => undefined,
  activeCompetitionName: null,
  setActiveCompetitionName: () => undefined,
});

export const AdminNavProvider: React.FC<{
  children: React.ReactNode;
  onOpenMobileDrawer: () => void;
}> = ({ children, onOpenMobileDrawer }) => {
  const [counts, setCounts] = useState<AdminNavCounts>(DEFAULT_COUNTS);
  const [rawDashboard, setRawDashboard] = useState<any | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [activeCompetitionName, setActiveCompetitionName] = useState<string | null>(null);

  const refreshNavCounts = useCallback(async () => {
    try {
      const raw = await dashboardService.getAdminDashboard();
      if (raw && raw.queue) {
        setRawDashboard(raw);
        const menunggu = Number(raw.queue.pendingVerifications ?? 0);
        const perluPerbaikan = Number(raw.queue.revisionNeededCount ?? 0);
        const disetujui = Number(raw.queue.approvedCount ?? 0);
        const ditolak = Number(raw.queue.rejectedCount ?? 0);
        const semua =
          raw.queue.total !== undefined
            ? Number(raw.queue.total)
            : menunggu + perluPerbaikan + disetujui + ditolak;

        const compTotal =
          raw.competitions?.total !== undefined
            ? Number(raw.competitions.total)
            : raw.competitions
              ? Number(raw.competitions.published ?? 0) + Number(raw.competitions.draft ?? 0)
              : null;

        const consTotal =
          raw.consultants?.total !== undefined
            ? Number(raw.consultants.total)
            : raw.users?.approvedConsultants !== undefined
              ? Number(raw.users.approvedConsultants)
              : null;

        const selTotal =
          raw.selections?.total !== undefined
            ? Number(raw.selections.total)
            : raw.selections?.confirmedPassed !== undefined
              ? Number(raw.selections.confirmedPassed)
              : null;

        const usersTotal =
          raw.users?.total !== undefined
            ? Number(raw.users.total)
            : raw.users
              ? Number(raw.users.totalStudents ?? 0) + Number(raw.users.totalStaff ?? 0)
              : null;

        setCounts({
          achievements: {
            menunggu,
            perlu_perbaikan: perluPerbaikan,
            disetujui,
            ditolak,
            semua,
          },
          competitions: compTotal,
          consultants: consTotal,
          selections: selTotal,
          users: usersTotal,
        });
        setLoadingCounts(false);
        return;
      }
    } catch {
      // Fallback untuk mode mock/demo
    }

    try {
      const all = await achievementService.getAll();
      setCounts((prev) => ({
        ...prev,
        achievements: {
          menunggu: all.filter((a) => a.status === 'menunggu').length,
          perlu_perbaikan: all.filter((a) => a.status === 'perlu_perbaikan').length,
          disetujui: all.filter((a) => a.status === 'disetujui').length,
          ditolak: all.filter((a) => a.status === 'ditolak').length,
          semua: all.length,
        },
      }));
    } catch {
      // Biarkan state sebelumnya
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  useEffect(() => {
    void refreshNavCounts();
  }, [refreshNavCounts]);

  return (
    <AdminNavContext.Provider
      value={{
        counts,
        rawDashboard,
        loadingCounts,
        refreshNavCounts,
        openMobileDrawer: onOpenMobileDrawer,
        activeCompetitionName,
        setActiveCompetitionName,
      }}
    >
      {children}
    </AdminNavContext.Provider>
  );
};

export function useAdminNav() {
  return useContext(AdminNavContext);
}
