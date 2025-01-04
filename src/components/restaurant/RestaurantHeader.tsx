import React from 'react';
import { NavLink } from 'react-router-dom';
import { UtensilsCrossed, ShoppingCart, ClipboardList, ChefHat } from 'lucide-react';
import { CartPanel } from './CartPanel';
import { useCart } from '../../contexts/CartContext';

export function RestaurantHeader() {
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const { state } = useCart();

  return (
    <>
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <ChefHat className="h-8 w-8 text-[#8B4513]" />
            <h1 className="ml-3 text-2xl font-bold text-gray-900">
              QCart
            </h1>
          </div>
          
          <nav className="flex space-x-8">
            <NavLink
              to="/menu"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'text-[#8B4513] bg-[#F5DEB3]'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              Menu
            </NavLink>
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 relative"
            >
              <ShoppingCart className="h-5 w-5 mr-1" />
              Cart
              {state.items.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#8B4513] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {state.items.length}
                </span>
              )}
            </button>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'text-[#8B4513] bg-[#F5DEB3]'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              <ClipboardList className="h-5 w-5 mr-1" />
              Orders
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
    <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}