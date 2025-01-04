export function downloadCSV(data: string, filename: string) {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateStaffReport(
  staff: any[],
  metrics: Record<string, any>,
  timeRange: string
) {
  const headers = [
    'Name',
    'Role',
    'Orders Handled',
    'Average Service Time (min)',
    'Total Sales ($)',
    'Performance Rating (%)',
    'Speed Score (%)',
    'Efficiency Score (%)'
  ];

  const rows = staff.map(member => {
    const memberMetrics = metrics[member.id] || {
      ordersHandled: 0,
      avgServiceTime: 0,
      totalSales: 0,
      rating: 0
    };

    return [
      member.name,
      member.role,
      memberMetrics.ordersHandled,
      memberMetrics.avgServiceTime.toFixed(1),
      memberMetrics.totalSales.toFixed(2),
      (memberMetrics.rating * 10).toFixed(1),
      Math.min(100, (30 / memberMetrics.avgServiceTime) * 100).toFixed(0),
      Math.min(100, (memberMetrics.ordersHandled / 20) * 100).toFixed(0)
    ];
  });

  const csvContent = [
    headers,
    ...rows
  ].map(row => row.join(',')).join('\n');

  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csvContent, `staff-performance-${timeRange}-${date}.csv`);
}