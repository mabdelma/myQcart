import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { timeApi } from '../../lib/api';
import { Clock, LogIn, LogOut, Users } from 'lucide-react';

export default function TimeTracking() {
  const { slug } = useAuth();
  const [active, setActive] = useState<any[]>([]);
  const [timesheet, setTimesheet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [activeData, timesheetData] = await Promise.all([
        timeApi.active(slug).catch(() => []),
        timeApi.timesheet(slug).catch(() => []),
      ]);
      setActive(activeData);
      setTimesheet(timesheetData);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug]);

  if (!slug) return <div className="p-4 text-gray-500">Loading tenant...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Time Tracking</h2>
        <div className="flex space-x-2">
          <button onClick={() => timeApi.clockIn(slug)} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
            <LogIn className="w-4 h-4 mr-1" /> Clock In
          </button>
          <button onClick={() => timeApi.clockOut(slug)} className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">
            <LogOut className="w-4 h-4 mr-1" /> Clock Out
          </button>
        </div>
      </div>

      <div className="flex space-x-2">
        <button onClick={() => setTab('active')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'active' ? 'bg-[#8B4513] text-white' : 'bg-white text-gray-700 border'}`}>
          <Users className="w-4 h-4 inline mr-1" /> Active Shifts
        </button>
        <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'history' ? 'bg-[#8B4513] text-white' : 'bg-white text-gray-700 border'}`}>
          <Clock className="w-4 h-4 inline mr-1" /> Timesheet
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : tab === 'active' ? (
        <div className="space-y-2">
          {active.length === 0 ? (
            <p className="text-gray-500">No active shifts.</p>
          ) : active.map((e: any) => (
            <div key={e.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{e.userName}</p>
                <p className="text-sm text-gray-500">{e.userRole} · since {new Date(e.clockIn).toLocaleTimeString()}</p>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium text-gray-700">Staff</th>
                <th className="text-left p-3 font-medium text-gray-700">Clock In</th>
                <th className="text-left p-3 font-medium text-gray-700">Clock Out</th>
                <th className="text-right p-3 font-medium text-gray-700">Hours</th>
              </tr>
            </thead>
            <tbody>
              {timesheet.length === 0 ? (
                <tr><td colSpan={4} className="p-3 text-center text-gray-500">No entries found.</td></tr>
              ) : timesheet.map((e: any) => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="p-3">{e.userName}</td>
                  <td className="p-3">{new Date(e.clockIn).toLocaleString()}</td>
                  <td className="p-3">{e.clockOut ? new Date(e.clockOut).toLocaleString() : '—'}</td>
                  <td className="p-3 text-right">{e.totalHours?.toFixed(1) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
