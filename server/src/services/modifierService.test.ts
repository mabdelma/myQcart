import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid'),
}));

import {
  getModifierGroups,
  getMenuItemModifiers,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  addModifierOption,
  updateModifierOption,
  deleteModifierOption,
  linkMenuItemModifier,
  unlinkMenuItemModifier,
} from './modifierService.js';
import { db } from '../db/index.js';

describe('modifierService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getModifierGroups', () => {
    it('returns groups with their options', async () => {
      const groups = [
        { id: 'g1', name: 'Size', tenantId: 'tenant-1', sortOrder: 1 },
        { id: 'g2', name: 'Toppings', tenantId: 'tenant-1', sortOrder: 2 },
      ];
      const optionsForG1 = [
        { id: 'o1', name: 'Small', groupId: 'g1', priceAdjustment: 0, sortOrder: 1 },
        { id: 'o2', name: 'Large', groupId: 'g1', priceAdjustment: 2, sortOrder: 2 },
      ];
      const optionsForG2 = [
        { id: 'o3', name: 'Cheese', groupId: 'g2', priceAdjustment: 1, sortOrder: 1 },
      ];

      db.__setQueryQueue([groups, optionsForG1, optionsForG2]);

      const result = await getModifierGroups('tenant-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Size');
      expect(result[0].options).toHaveLength(2);
      expect(result[0].options[0].name).toBe('Small');
      expect(result[1].name).toBe('Toppings');
      expect(result[1].options).toHaveLength(1);
      expect(result[1].options[0].name).toBe('Cheese');
    });
  });

  describe('getMenuItemModifiers', () => {
    it('returns modifiers linked to a menu item', async () => {
      const links = [
        { id: 'l1', menuItemId: 'item-1', modifierGroupId: 'g1', sortOrder: 1 },
        { id: 'l2', menuItemId: 'item-1', modifierGroupId: 'g2', sortOrder: 2 },
      ];
      const group1 = [{ id: 'g1', name: 'Size', sortOrder: 1 }];
      const options1 = [
        { id: 'o1', name: 'Small', groupId: 'g1', priceAdjustment: 0, sortOrder: 1 },
      ];
      const group2 = [{ id: 'g2', name: 'Toppings', sortOrder: 2 }];
      const options2 = [
        { id: 'o2', name: 'Cheese', groupId: 'g2', priceAdjustment: 1, sortOrder: 1 },
        { id: 'o3', name: 'Bacon', groupId: 'g2', priceAdjustment: 1.5, sortOrder: 2 },
      ];

      db.__setQueryQueue([links, group1, options1, group2, options2]);

      const result = await getMenuItemModifiers('item-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Size');
      expect(result[0].options).toHaveLength(1);
      expect(result[1].name).toBe('Toppings');
      expect(result[1].options).toHaveLength(2);
    });
  });

  describe('createModifierGroup', () => {
    it('inserts a modifier group and returns its id', async () => {
      const result = await createModifierGroup('tenant-1', {
        name: 'Size',
        selectionType: 'single',
        isRequired: true,
        sortOrder: 1,
      });

      expect(result.id).toBe('mock-uuid');
      expect(db.insert).toHaveBeenCalledOnce();
    });
  });

  describe('updateModifierGroup', () => {
    it('updates a modifier group', async () => {
      await updateModifierGroup('group-1', 'tenant-1', { name: 'Updated Size', isRequired: false });

      expect(db.update).toHaveBeenCalled();
      expect(db.set).toHaveBeenCalled();
    });
  });

  describe('deleteModifierGroup', () => {
    it('deletes options, links, and the group', async () => {
      await deleteModifierGroup('group-1', 'tenant-1');

      expect(db.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('addModifierOption', () => {
    it('inserts a modifier option and returns its id', async () => {
      const result = await addModifierOption('group-1', {
        name: 'Large',
        priceAdjustment: 2,
        sortOrder: 1,
      });

      expect(result.id).toBe('mock-uuid');
      expect(db.insert).toHaveBeenCalledOnce();
    });
  });

  describe('updateModifierOption', () => {
    it('updates a modifier option', async () => {
      await updateModifierOption('option-1', { name: 'Extra Large', priceAdjustment: 3 });

      expect(db.update).toHaveBeenCalled();
      expect(db.set).toHaveBeenCalled();
    });
  });

  describe('deleteModifierOption', () => {
    it('deletes a modifier option', async () => {
      await deleteModifierOption('option-1');

      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('linkMenuItemModifier', () => {
    it('inserts a menu item modifier link and returns its id', async () => {
      const result = await linkMenuItemModifier('item-1', 'group-1');

      expect(result.id).toBe('mock-uuid');
      expect(db.insert).toHaveBeenCalledOnce();
    });
  });

  describe('unlinkMenuItemModifier', () => {
    it('deletes a menu item modifier link', async () => {
      await unlinkMenuItemModifier('item-1', 'group-1');

      expect(db.delete).toHaveBeenCalled();
    });
  });
});
