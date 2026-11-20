import usersData from '../../mocks/users.json';
import profilesData from '../../mocks/profiles.json';
import { Profile, User } from '../../types';
import { getItem, setItem } from '../../lib/storage';
import { IUserService } from '../types';

const USERS_KEY = 'talenta-users';
const PROFILES_KEY = 'talenta-profiles';
export const CURRENT_USER_KEY = 'talenta-user-id';

function getUsers(): User[] {
  const cached = getItem<User[]>(USERS_KEY, usersData as User[]);
  return cached.map((u) => {
    const raw = (usersData as User[]).find((r) => r.id === u.id);
    return {
      ...u,
      avatar: u.avatar || raw?.avatar || '/images/avatar-andi.jpg',
    };
  });
}

function getProfiles(): Profile[] {
  return getItem<Profile[]>(PROFILES_KEY, profilesData as Profile[]);
}

export const userMockService: IUserService = {
  async getAll(): Promise<User[]> {
    return getUsers();
  },

  async getById(id: string): Promise<User | null> {
    return getUsers().find((u) => u.id === id) || null;
  },

  async getCurrentUser(): Promise<User> {
    const currentId = getItem<string>(CURRENT_USER_KEY, 'u-01');
    const user = getUsers().find((u) => u.id === currentId);
    if (!user) {
      return getUsers()[0];
    }
    return user;
  },

  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const list = getUsers();
    const idx = list.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User tidak ditemukan');
    list[idx] = { ...list[idx], ...data };
    setItem(USERS_KEY, list);
    return list[idx];
  },

  async getProfile(userId: string): Promise<Profile | null> {
    return getProfiles().find((p) => p.userId === userId) || null;
  },

  async setTargetCompetition(userId: string, slug: string): Promise<Profile> {
    const list = getProfiles();
    const idx = list.findIndex((p) => p.userId === userId);
    const updated: Profile = {
      userId,
      institutionId: 'inst-01',
      targetKompetisiSlug: slug,
      kelengkapan: 85,
    };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    setItem(PROFILES_KEY, list);
    return updated;
  },

  async login(email: string, _pass: string) {
    const list = getUsers();
    const found = list.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) throw new Error('Email tidak terdaftar');
    return { user: found, token: 'mock-session-token' };
  },

  async register(data: any) {
    const list = getUsers();
    const newUser: User = {
      id: `u-${Date.now()}`,
      institutionId: 'inst-01',
      nama: data.fullName || 'Mahasiswa Baru',
      email: data.email,
      prodi: data.studyProgram || 'Teknik Informatika',
      angkatan: 2026,
      role: ['mahasiswa'],
      skill: [],
      minat: [],
      ketersediaan: { hari: ['Senin'], jam: 4 },
      peranBisa: ['Anggota'],
    };
    list.push(newUser);
    setItem(USERS_KEY, list);
    return { user: newUser, token: 'mock-session-token' };
  },

  async logout() {
    // No-op for mock
  },

  async forgotPassword(_email: string) {
    return { message: 'Jika email terdaftar, instruksi reset kata sandi telah dikirim.' };
  },

  async resetPassword(_token: string, _pass: string) {
    return { message: 'Kata sandi berhasil diatur ulang.' };
  },
};
