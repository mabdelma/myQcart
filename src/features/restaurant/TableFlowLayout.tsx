import { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, NavLink, useParams } from 'react-router';
import { ShoppingCart, ClipboardList, ChefHat, Receipt } from 'lucide-react';
import { CartProvider, useCart } from '../../contexts/CartContext';
import { CartPanel } from '../../components/restaurant/CartPanel';
import { tenantApi, menuApi, tableApi } from '../../lib/api';
import type { Tenant, MenuItem, MenuCategory, TableData } from '../../lib/api/types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

interface TableFlowContextValue {
  tenant: Tenant;
  table: TableData;
  categories: MenuCategory[];
  items: MenuItem[];
  slug: string;
}

const TableFlowContext = createContext<TableFlowContextValue | null>(null);
export function useTableFlow() {
  const ctx = useContext(TableFlowContext);
  if (!ctx) throw new Error('useTableFlow must be used within TableFlowLayout');
  return ctx;
}

function TableFlowInner() {
  const { slug, tableId } = useParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<TableData | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { state } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (!slug || !tableId) return;
    setLoading(true);
    Promise.all([
      tenantApi.get(slug),
      tableApi.getByQr(slug, tableId),
      menuApi.getFullMenu(slug),
    ])
      .then(([tenantData, tableData, menuData]) => {
        setTenant(tenantData);
        setTable(tableData);
        setCategories(menuData.categories);
        setItems(menuData.items);
      })
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [slug, tableId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!tenant || !table) return <ErrorMessage message="Data not found" />;

  const value: TableFlowContextValue = { tenant, table, categories, items, slug: slug! };

  return (
    <TableFlowContext.Provider value={value}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <ChefHat className="h-6 w-6 text-[#8B4513]" />
                  <span className="ml-2 text-lg font-bold text-gray-900">{tenant.name}</span>
                </div>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Table {table.number}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <NavLink to={`/r/${slug}/table/${tableId}/menu`}
                  className={({ isActive }) => `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-[#F5DEB3] text-[#8B4513]' : 'text-gray-500 hover:text-[#8B4513] hover:bg-[#F5DEB3]/50'}`}>
                  Menu
                </NavLink>
                <button onClick={() => setIsCartOpen(true)}
                  className="relative px-3 py-1.5 text-sm font-medium rounded-md text-gray-500 hover:text-[#8B4513] hover:bg-[#F5DEB3]/50 transition-colors">
                  <ShoppingCart className="h-4 w-4 inline mr-1" />
                  Cart
                  {state.items.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#8B4513] text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                      {state.items.length}
                    </span>
                  )}
                </button>
                <NavLink to={`/r/${slug}/table/${tableId}/orders`}
                  className={({ isActive }) => `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-[#F5DEB3] text-[#8B4513]' : 'text-gray-500 hover:text-[#8B4513] hover:bg-[#F5DEB3]/50'}`}>
                  <ClipboardList className="h-4 w-4 inline mr-1" />
                  Orders
                </NavLink>
                <NavLink to={`/r/${slug}/table/${tableId}/bill`}
                  className={({ isActive }) => `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-[#F5DEB3] text-[#8B4513]' : 'text-gray-500 hover:text-[#8B4513] hover:bg-[#F5DEB3]/50'}`}>
                  <Receipt className="h-4 w-4 inline mr-1" />
                  Bill
                </NavLink>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6">
          <Outlet />
        </main>
      </div>
      <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} tableId={tableId} />
    </TableFlowContext.Provider>
  );
}

export function TableFlowLayout() {
  return (
    <CartProvider>
      <TableFlowInner />
    </CartProvider>
  );
}
