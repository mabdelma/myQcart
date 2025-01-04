import { getDB } from '../db';
import type { Order, User, Payment } from '../db/schema';

export interface StaffMetrics {
  ordersHandled: number;
  avgServiceTime: number;
  totalSales: number;
  paymentMethods?: {
    cash: number;
    card: number;
    wallet: number;
  };
  rating: number;
}

export async function updateStaffMetrics(userId: string): Promise<void> {
  const db = await getDB();

  try {
    const [user, allOrders, allPayments] = await Promise.all([
      db.get('users', userId),
      db.getAll('orders'),
      db.getAll('payments'),
    ]);

    if (!user) {
      console.error('User not found:', userId);
      return;
    }

    if (!allOrders || !allPayments) {
      console.error('Orders or Payments data missing');
      return;
    }

    let metrics: StaffMetrics;

    if (user.role === 'cashier') {
      const processedPayments = allPayments.filter((p) =>
        p.status === 'paid' && allOrders.find(o => o.id === p.orderId)?.cashierId === userId
      );

      const totalSales = processedPayments.reduce((sum, p) => sum + p.amount, 0);

      const processingTimes = processedPayments.map(payment => {
        const order = allOrders.find(o => o.id === payment.orderId);
        if (!order) return 0;
        return Math.max(0, (new Date(payment.createdAt).getTime() - new Date(order.createdAt).getTime()) / 60000);
      }).filter(time => time > 0);

      const avgProcessingTime =
        processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
          : 0;

      const paymentMethods = {
        cash: processedPayments.filter((p) => p.method === 'cash').length,
        card: processedPayments.filter((p) => p.method === 'card').length,
        wallet: processedPayments.filter((p) => p.method === 'wallet').length,
      };

      metrics = {
        ordersHandled: processedPayments.length,
        avgServiceTime: avgProcessingTime,
        totalSales,
        paymentMethods,
        rating: calculateStaffRating(processedPayments.length, avgProcessingTime, user.role),
      };
    } else {
      const userOrders = allOrders.filter((o) => {
        switch (user.role) {
          case 'kitchen':
            return o.kitchenStaffId === userId && 
                   ['ready', 'delivered', 'paid'].includes(o.status);
          case 'waiter':
            return o.waiterStaffId === userId && 
                   ['delivered', 'paid'].includes(o.status);
          default:
            return false;
        }
      });

      const serviceTimes = userOrders.map((order) => {
        const start = new Date(order.createdAt).getTime();
        const end = new Date(order.updatedAt).getTime();
        return (end - start) / 60000;
      });

      const avgServiceTime =
        serviceTimes.length > 0
          ? serviceTimes.reduce((sum, time) => sum + time, 0) / serviceTimes.length
          : 0;

      metrics = {
        ordersHandled: userOrders.length,
        avgServiceTime,
        totalSales: userOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        rating: calculateStaffRating(
          userOrders.length,
          avgServiceTime,
          user.role,
          userOrders.filter((o) => !o.hasComplaints).length / userOrders.length
        ),
      };
    }

    await db.put('users', {
      ...user,
      metrics,
      lastActive: new Date(),
    });
  } catch (error) {
    console.error('Failed to update staff metrics:', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

function calculateStaffRating(
  ordersCount: number,
  avgTime: number,
  role: User['role'],
  satisfactionRate = 1
): number {
  const targetTime = role === 'kitchen' ? 30 : role === 'cashier' ? 5 : 15;
  const speedScore = avgTime === 0 ? 0 : Math.min(1, targetTime / avgTime) * 4;

  const targetVolume = role === 'kitchen' ? 30 : role === 'cashier' ? 40 : 20;
  const volumeScore = Math.min(1, ordersCount / targetVolume) * 3;

  const qualityScore = satisfactionRate * 3;

  return (speedScore + volumeScore + qualityScore) / 10;
}
