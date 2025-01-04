import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getDB } from '../../lib/db';
import { Outlet } from 'react-router-dom';
import { CartProvider } from '../../contexts/CartContext';
import { TableHeader } from './TableHeader';
import type { Table } from '../../lib/db/schema';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

export function TableMenu() {
  const { tableId } = useParams();
  const [table, setTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTable();
  }, [tableId]);

  async function loadTable() {
    if (!tableId) {
      setError('Invalid table ID');
      setLoading(false);
      return;
    }

    try {
      const db = await getDB();
      const tableData = await db.get('tables', tableId);
      
      if (!tableData) {
        setError('Table not found');
      } else {
        setTable(tableData);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to load table:', err);
      setError('Failed to load table information');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!table) return null;
  if (table.status !== 'occupied') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Table Not Available</h2>
          <p className="text-gray-600">
            Please wait for a staff member to seat you at this table before placing orders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        <TableHeader table={table} />
        <main>
          <Outlet />
        </main>
      </div>
    </CartProvider>
  );
}