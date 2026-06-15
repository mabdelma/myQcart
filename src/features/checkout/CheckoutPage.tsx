import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTableFlow } from '../restaurant/TableFlowLayout';
import { useCart } from '../../contexts/CartContext';
import { orderApi } from '../../lib/api';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import type { ApiError } from '../../lib/api/types';

export function CheckoutPage() {
  const { slug, table } = useTableFlow();
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const { tableId } = useParams();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function placeOrder() {
    if (!slug || !table) return;
    setPlacing(true);
    setError(null);
    try {
      await orderApi.create(slug, {
        tableId: table.id,
        items: state.items.map((c) => ({
          menuItemId: c.menuItem.id,
          name: c.menuItem.name,
          quantity: c.quantity,
          unitPrice: c.menuItem.price,
          notes: c.comment,
        })),
      });
      dispatch({ type: 'CLEAR_CART' });
      setSuccess(true);
    } catch (err) {
      setError((err as ApiError).message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Order Placed!</h2>
        <p className="text-gray-500">Your order has been sent to the kitchen.</p>
        <button onClick={() => navigate(`/r/${slug}/table/${tableId}/orders`)}
          className="px-6 py-2 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033]">
          View Orders
        </button>
      </div>
    );
  }

  if (state.items.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900">Cart is empty</h2>
        <button onClick={() => navigate(`/r/${slug}/table/${tableId}/menu`)}
          className="px-6 py-2 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033]">
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(`/r/${slug}/table/${tableId}/cart`)}
        className="flex items-center text-sm text-gray-500 hover:text-[#8B4513]">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cart
      </button>

      <h2 className="text-xl font-bold text-gray-900">Checkout</h2>

      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">Order Summary</h3>
        {state.items.map((item) => (
          <div key={item.menuItem.id} className="flex justify-between text-sm">
            <span>{item.menuItem.name} x{item.quantity}</span>
            <span className="font-medium">${(item.menuItem.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t pt-3 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-[#8B4513]">${state.total.toFixed(2)}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <button onClick={placeOrder} disabled={placing}
        className="w-full py-3 bg-[#8B4513] text-white rounded-lg font-medium hover:bg-[#5C4033] disabled:opacity-50 transition-colors">
        {placing ? 'Placing Order...' : `Place Order — $${state.total.toFixed(2)}`}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Pay with cash at the counter when your order is ready, or pay by card from the Orders tab.
      </p>
    </div>
  );
}
