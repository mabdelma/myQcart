import { Outlet, useNavigate, useLocation } from 'react-router';

const tabs = [
  { id: '', label: 'Dashboard' },
  { id: 'sales', label: 'Reports' },
  { id: 'exports', label: 'Exports' },
];

export function Analytics() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const activeSub = pathParts[3] || '';

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <div className="flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(`/admin/analytics/${tab.id}`)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeSub === tab.id
                  ? 'border-[#8B4513] text-[#8B4513]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <Outlet />
    </div>
  );
}

