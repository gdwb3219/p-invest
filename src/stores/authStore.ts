import { create } from 'zustand';

interface AuthStore {
  id: string;
  email: string;
  role: string;
  setId: (id: string) => void;
  setEmail: (email: string) => void;
  setRole: (role: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  id: '',
  email: '',
  role: '',
  setId: (id) => set({ id }),
  setEmail: (email) => set({ email }),
  setRole: (role) => set({ role }),
}));
