import { create } from 'zustand';

const useStore = create((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
  updateBears: (newBears) => set({ bears: newBears }),
}));

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

  setId: (newId) => set((state) => ({ id: newId })),
  setEmail: (newEmail) => set((state) => ({ email: newEmail })),
  setRole: (newRole) => set((state) => ({ role: newRole })),
}));
