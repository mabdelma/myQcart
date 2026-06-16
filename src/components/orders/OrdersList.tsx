import type { Order, MenuItem } from '../../lib/api/types';
import { OrderEditDialog } from './OrderEditDialog';

type OrderWithDetails = Order & {
  menuItems: MenuItem[];
  tableName: string;
};

export default function OrdersPage() {
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null);

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