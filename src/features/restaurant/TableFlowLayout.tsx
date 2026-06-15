import { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, NavLink, useParams, useLocation } from 'react-router';
import { ShoppingCart, ClipboardList, ChefHat, Receipt } from 'lucide-react';
import { CartProvider, useCart } from '../../contexts/CartContext';
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
  const location = useLocation();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<TableData | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { state } = useCart();

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
  const isCartPage = location.pathname.endsWith('/cart');

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
              <div className="flex items-center space-x-1 sm:space-x-3">
                <NavLink to={`/r/${slug}/table/${tableId}/menu`}
                  className={({ isActive }) => `px-2 sm:px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${isActive ? 'bg-[#F5DEB3] text-[#8B4513]' : 'text-gray-500 hover:text-[#8B4513] hover:bg-[#F5DEB3]/50'}`}>
                  Menu
                </NavLink>
                <NavLink to={`/r/${slug}/table/${tableId}/cart`}
                  className={({ isActive }) => `relative px-2 sm:px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-[#F5DEB3] text-[#8B4513]' : 'text-gray-500 hover:text-[#8B4513] hover:bg-[#F5DEB3]/50'}`}>
                  <ShoppingCart className="h-4 w-4 inline sm:mr-1" />
                  <span className="hidden sm:inline">Cart</span>
                  {state.items.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#8B4513] text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                      {state.items.length}
                    </span>
                  )}
                </NavLink>
                <NavLink to={`/r/${slug}/table/${tableId}/orders`}
                  className={({ isActive }) => `px-2 sm:px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${isActive ? 'bg-[#F5DEB3] text-[#8B4513]' : 'text-gray-500 hover:text-[#8B4513] hover:bg-[#F5DEB3]/50'}`}>
                  <ClipboardList className="h-4 w-4 inline sm:mr-1" />
                  <span className="hidden sm:inline">Orders</span>
                </NavLink>
                <NavLink to={`/r/${slug}/table/${tableId}/bill`}
                  className={({ isActive }) => `px-2 sm:px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${isActive ? 'bg-[#F5DEB3] text-[#8B4513]' : 'text-gray-500 hover:text-[#8B4513] hover:bg-[#F5DEB3]/50'}`}>
                  <Receipt className="h-4 w-4 inline sm:mr-1" />
                  <span className="hidden sm:inline">Bill</span>
                </NavLink>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6 pb-20">
          <Outlet />
        </main>
      </div>

      {state.items.length > 0 && !isCartPage && (
        <NavLink to={`/r/${slug}/table/${tableId}/cart`}
          className="fixed bottom-6 right-6 bg-[#8B4513] text-white rounded-full px-5 py-3 shadow-lg flex items-center gap-2 hover:bg-[#5C4033] transition-colors z-30">
          <ShoppingCart className="w-5 h-5" />
          <span className="font-medium">{state.items.length}</span>
          <span className="font-bold">${state.total.toFixed(2)}</span>
        </NavLink>
      )}
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
