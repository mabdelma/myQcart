import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, DollarSign, ChevronRight } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { generateOrderId } from '../../lib/utils/orderUtils';
import { useParams } from 'react-router-dom';
import { getDB } from '../../lib/db';
import type { Payment } from '../../lib/db/schema';

export function Checkout() {
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const { tableId } = useParams();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOrder = async () => {
    setProcessing(true);
    setError(null);

    try {
      const db = await getDB();

      // Create the order
      const order = {
        id: generateOrderId(),
        tableId: tableId || '1',
        kitchenStaffId: null,
        waiterStaffId: null,
        cashierId: null,
        status: 'pending',
        paymentStatus: 'unpaid',
        items: state.items.map(item => ({
          id: crypto.randomUUID(),
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: item.comment || undefined
        })),
        total: state.total,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save order
      await db.add('orders', order);

      // Clear the cart
      dispatch({ type: 'CLEAR_CART' });

      // Redirect to orders page
      navigate(tableId ? `/table/${tableId}/orders` : '/orders');
    } catch (err) {
      console.error('Failed to place order:', err);
      setError('Failed to place order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (state.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h2 className="text-2xl font-serif text-[#5C4033] mb-4">Your cart is empty</h2>
        <button
          onClick={() => navigate(tableId ? `/table/${tableId}/menu` : '/menu')}
          className="text-[#8B4513] hover:text-[#5C4033]"
        >
          Return to menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-serif text-[#5C4033] mb-8">Checkout</h2>

      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
        <div className="space-y-4">
          {state.items.map((item) => (
            <div key={item.menuItem.id} className="flex justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="text-gray-800">{item.menuItem.name}</span>
                  <span className="text-gray-500 ml-2">×{item.quantity}</span>
                </div>
                {item.comment && (
                  <div className="mt-1 text-sm text-gray-600 italic">
                    "{item.comment}"
                  </div>
                )}
              </div>
              <span className="text-gray-800 ml-4">
                ${(item.menuItem.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="border-t pt-4 flex justify-between font-medium">
            <span className="text-[#5C4033]">Total</span>
            <span className="text-[#8B4513]">${state.total.toFixed(2)}</span>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => navigate('/menu')}
              className="text-[#8B4513] hover:text-[#5C4033]"
            >
              Continue Shopping
            </button>
            <button
              onClick={handleOrder}
              disabled={processing}
              className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033] disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-8">
          {error}
        </div>
      )}
    </div>
  );
}