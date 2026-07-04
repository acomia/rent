import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * In-memory demo cart for the restyle. Just enough state to make the bag badge
 * respond when you add an item — no persistence, no checkout (Phase 2).
 */
type CartContextValue = {
  items: string[];
  count: number;
  add: (productId: string) => void;
  has: (productId: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>([]);

  const add = useCallback((productId: string) => {
    setItems((prev) =>
      prev.includes(productId) ? prev : [...prev, productId],
    );
  }, []);

  const has = useCallback(
    (productId: string) => items.includes(productId),
    [items],
  );

  const value = useMemo(
    () => ({ items, count: items.length, add, has }),
    [items, add, has],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
