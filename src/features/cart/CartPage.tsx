import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useCart } from '../../contexts/CartContext';
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, MessageCircle } from 'lucide-react';

export function CartPage() {
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const { slug, tableId } = useParams();
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>

      {state.items.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Cart is empty</h3>
          <p className="mt-1 text-sm text-gray-500">Add items from the menu</p>
          <button onClick={() => navigate(`/r/${slug}/table/${tableId}/menu`)}
            className="mt-4 px-4 py-2 bg-[#8B4513] text-white rounded-lg text-sm hover:bg-[#5C4033]">
            Browse Menu
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {state.items.map((item) => (
              <div key={item.menuItem.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.menuItem.name}</h3>
                    <p className="text-sm text-gray-500">${item.menuItem.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => {
                      if (item.quantity > 1) {
                        dispatch({ type: 'UPDATE_QUANTITY', payload: { id: item.menuItem.id, quantity: item.quantity - 1 } });
                      } else {
                        dispatch({ type: 'REMOVE_ITEM', payload: item.menuItem.id });
                      }
                    }}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-medium w-6 text-center">{item.quantity}</span>
                    <button onClick={() => dispatch({ type: 'UPDATE_QUANTITY', payload: { id: item.menuItem.id, quantity: item.quantity + 1 } })}
                      className="w-8 h-8 rounded-full bg-[#8B4513] text-white flex items-center justify-center hover:bg-[#5C4033]">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditingComment(item.menuItem.id); setCommentText(item.comment || ''); }}
                      className={`p-1.5 rounded ml-1 transition-colors ${item.comment ? 'text-[#8B4513] bg-[#F5DEB3]' : 'text-gray-400 hover:text-[#8B4513] hover:bg-[#F5DEB3]/50'}`}>
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: item.menuItem.id })}
                      className="p-1 text-red-500 hover:bg-red-50 rounded ml-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editingComment === item.menuItem.id && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add special instructions..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B4513] focus:border-[#8B4513] text-sm"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingComment(null)}
                        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
                        Cancel
                      </button>
                      <button onClick={() => { dispatch({ type: 'SET_COMMENT', payload: { id: item.menuItem.id, comment: commentText } }); setEditingComment(null); }}
                        className="px-3 py-1 text-sm bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]">
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {item.comment && editingComment !== item.menuItem.id && (
                  <p className="mt-1 text-sm text-gray-600 italic">"{item.comment}"</p>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-[#8B4513]">${state.total.toFixed(2)}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => dispatch({ type: 'CLEAR_CART' })}
                className="flex-1 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">
                Clear
              </button>
              <button onClick={() => navigate(`/r/${slug}/table/${tableId}/checkout`)}
                className="flex-1 py-2.5 bg-[#8B4513] text-white rounded-lg text-sm hover:bg-[#5C4033] flex items-center justify-center gap-1">
                Checkout <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
