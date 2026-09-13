import { create } from "zustand";

type CartStore = {
  itemCount: number;
  setItemCount: (count: number) => void;
  increment: (by: number) => void;
};

export const useCartStore = create<CartStore>((set) => ({
  itemCount: 0,
  setItemCount: (count) => set({ itemCount: count }),
  increment: (by) =>
    set((state) => ({ itemCount: Math.max(0, state.itemCount + by) })),
}));
