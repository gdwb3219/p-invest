import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  id: '',
  email: '',
  role: '',
  setId: (id) => set({ id }),
  setEmail: (email) => set({ email }),
  setRole: (role) => set({ role }),
}));
