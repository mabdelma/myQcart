import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid'),
}));

import {
  getStockItems,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  recordStockMovement,
  getStockMovements,
  getLowStockItems,
  linkIngredient,
  unlinkIngredient,
  getMenuItemIngredients,
} from './inventoryService.js';
import { db } from '../db/index.js';

describe('inventoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStockItems', () => {
    it('returns stock items for a tenant ordered by name', async () => {
      const mockItems = [
        { id: 'si-1', tenantId: 'tenant-1', name: 'Flour', unit: 'kg', currentStock: 50, minStock: 10, costPerUnit: 0.5 },
        { id: 'si-2', tenantId: 'tenant-1', name: 'Sugar', unit: 'kg', currentStock: 20, minStock: 5, costPerUnit: 0.8 },
      ];
      db.__setQueryData(mockItems);

      const result = await getStockItems('tenant-1');

      expect(result).toEqual(mockItems);
    });
  });

  describe('createStockItem', () => {
    it('inserts a stock item and returns its id', async () => {
      const result = await createStockItem('tenant-1', { name: 'Flour', unit: 'kg', currentStock: 50, minStock: 10 });

      expect(db.insert).toHaveBeenCalledOnce();
      expect(result).toEqual({ id: 'mock-uuid' });
    });
  });

  describe('updateStockItem', () => {
    it('updates a stock item with new values', async () => {
      await updateStockItem('si-1', 'tenant-1', { name: 'Flour', currentStock: 100 });

      expect(db.update).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
    });
  });

  describe('deleteStockItem', () => {
    it('deletes ingredients, movements, and the stock item', async () => {
      db.__setQueryQueue([[], [], []]);

      await deleteStockItem('si-1', 'tenant-1');

      expect(db.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('recordStockMovement', () => {
    it('records an "in" movement and increases current stock', async () => {
      db.__setQueryData([{ currentStock: 20 }]);

      const result = await recordStockMovement('tenant-1', {
        stockItemId: 'si-1',
        type: 'in',
        quantity: 10,
        reason: 'Restock',
      });

      expect(result).toEqual({ id: 'mock-uuid' });
      expect(db.insert).toHaveBeenCalledOnce();
      expect(db.update).toHaveBeenCalled();
    });

    it('records an "out" movement and decreases current stock', async () => {
      db.__setQueryData([{ currentStock: 20 }]);

      const result = await recordStockMovement('tenant-1', {
        stockItemId: 'si-1',
        type: 'out',
        quantity: 5,
        reason: 'Used in preparation',
      });

      expect(result).toEqual({ id: 'mock-uuid' });
      expect(db.insert).toHaveBeenCalledOnce();
      expect(db.update).toHaveBeenCalled();
    });

    it('does not let stock go below zero', async () => {
      db.__setQueryData([{ currentStock: 3 }]);

      await recordStockMovement('tenant-1', {
        stockItemId: 'si-1',
        type: 'out',
        quantity: 10,
      });

      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('getStockMovements', () => {
    it('returns all movements for a tenant', async () => {
      const mockMovements = [
        { id: 'sm-1', tenantId: 'tenant-1', stockItemId: 'si-1', type: 'in', quantity: 10 },
      ];
      db.__setQueryData(mockMovements);

      const result = await getStockMovements('tenant-1');

      expect(result).toEqual(mockMovements);
    });

    it('filters movements by stockItemId when provided', async () => {
      const mockMovements = [
        { id: 'sm-2', tenantId: 'tenant-1', stockItemId: 'si-1', type: 'out', quantity: 3 },
      ];
      db.__setQueryData(mockMovements);

      const result = await getStockMovements('tenant-1', 'si-1');

      expect(result).toEqual(mockMovements);
    });
  });

  describe('getLowStockItems', () => {
    it('returns items where currentStock is at or below minStock', async () => {
      const mockItems = [
        { id: 'si-1', tenantId: 'tenant-1', name: 'Tomato', currentStock: 3, minStock: 5 },
      ];
      db.__setQueryData(mockItems);

      const result = await getLowStockItems('tenant-1');

      expect(result).toEqual(mockItems);
    });
  });

  describe('linkIngredient', () => {
    it('inserts a new ingredient link and returns its id', async () => {
      const result = await linkIngredient('menu-item-1', 'si-1', 2);

      expect(db.insert).toHaveBeenCalledOnce();
      expect(result).toEqual({ id: 'mock-uuid' });
    });
  });

  describe('unlinkIngredient', () => {
    it('deletes the ingredient link with compound where', async () => {
      await unlinkIngredient('menu-item-1', 'si-1');

      expect(db.delete).toHaveBeenCalledOnce();
    });
  });

  describe('getMenuItemIngredients', () => {
    it('returns ingredients with stock item details via inner join', async () => {
      const mockData = [
        {
          menuItemIngredients: { id: 'mii-1', menuItemId: 'menu-item-1', stockItemId: 'si-1', quantity: 2 },
          stockItems: { id: 'si-1', name: 'Tomato', unit: 'kg', currentStock: 10 },
        },
      ];
      db.__setQueryData(mockData);

      const result = await getMenuItemIngredients('menu-item-1');

      expect(result).toEqual(mockData);
      expect(db.innerJoin).toHaveBeenCalled();
    });
  });
});
