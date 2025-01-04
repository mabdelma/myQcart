export function StaffList({ staff, metrics }: StaffListProps) {
  // Sort staff by rating
  const sortedStaff = [...staff].sort((a, b) => {
    // Sort by role first, then rating
    if (a.role !== b.role) {
      const roleOrder = { waiter: 0, kitchen: 1, cashier: 2 };
      return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
    }
    const ratingA = (metrics[a.id]?.rating || 0) * 10;
    const ratingB = (metrics[b.id]?.rating || 0) * 10;
    return ratingB - ratingA;
  });

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-lg font-medium text-gray-900">Staff Performance by Role</h3>
      </div>
      <div className="divide-y">
        {sortedStaff.map((member) => {
          const memberMetrics = metrics[member.id] || {};
          return (
            <div key={member.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">{member.name}</h4>
                    <p className={`text-sm font-medium capitalize ${
                      member.role === 'waiter' 
                        ? 'text-blue-600'
                        : member.role === 'kitchen'
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    }`}>{member.role}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="ml-1 text-lg font-medium">
                    {(memberMetrics.rating * 10).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm text-gray-500">Orders Handled</p>
                    <p className="text-lg font-medium">{memberMetrics.ordersHandled}</p>
                    {member.role === 'cashier' && (
                      <p className="text-xs text-gray-500">
                        ({memberMetrics.ordersHandled} Payments Processed)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {member.role === 'cashier' 
                        ? 'Avg Payment Processing Time' 
                        : member.role === 'kitchen'
                        ? 'Avg Preparation Time'
                        : 'Avg Service Time'
                      }
                    </p>
                    <p className="text-lg font-medium">
                      {memberMetrics.avgServiceTime.toFixed(1)} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Total Sales</p>
                    <p className="text-lg font-medium">
                      ${memberMetrics.totalSales.toFixed(2)}
                    </p>
                    {member.role === 'cashier' && (
                      <p className="text-xs text-gray-500">
                        (Processed Payments)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance Bars */}
              <div className="mt-4 space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">
                      {member.role === 'cashier' ? 'Processing Speed' : 'Service Speed'}
                    </span>
                    <span className="text-gray-900">
                      {calculateSpeedScore(memberMetrics.avgServiceTime).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${calculateSpeedScore(memberMetrics.avgServiceTime)}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">
                      {member.role === 'cashier' ? 'Payment Efficiency' : 'Service Efficiency'}
                    </span>
                    <span className="text-gray-900">
                      {calculateEfficiencyScore(memberMetrics.ordersHandled).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${calculateEfficiencyScore(memberMetrics.ordersHandled)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}