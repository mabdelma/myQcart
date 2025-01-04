import { Clock, AlertTriangle, Check } from 'lucide-react';
import { getDB } from '../../lib/db';
import { OrderDetails } from './OrderDetails';
import { updateOrderStatus } from '../../lib/utils/orderStatus';
import type { Order, MenuItem } from '../../lib/db/schema';
import { OrderEditDialog } from './OrderEditDialog';
import { ErrorMessage } from '../ui/ErrorMessage';

type OrderWithDetails = Order & {
  menuItems: MenuItem[];
  tableName: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { state: authState } = useAuth();

  async function handleStatusChange(orderId: string, status: Order['status']) {
    if (!authState.user) {
      setError('You must be logged in to update orders');
      return;
    }

    try {
      await updateOrderStatus({
        orderId,
        status,
        userId: authState.user.id,
        userRole: authState.user.role
      });
      loadOrders();
      setError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update order status';
      setError(message);
      console.error('Failed to update order status:', message);
    }
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => setEditingOrder(order as OrderWithDetails)}
        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Edit Order
      </button>

      {editingOrder && (
        <OrderEditDialog
          order={editingOrder}
          menuItems={menuItems}
          onClose={() => setEditingOrder(null)}
          onUpdate={loadOrders}
        />
      )}
    </div>
  );
}