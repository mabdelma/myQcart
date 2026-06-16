interface PeakHoursHeatmapProps {
  data: { dayOfWeek: number; hour: number; orderCount: number }[];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM – 9 PM

function intensityClass(count: number, maxCount: number): string {
  if (maxCount === 0) return 'bg-green-50';
  const ratio = count / maxCount;
  if (ratio > 0.75) return 'bg-green-800';
  if (ratio > 0.5) return 'bg-green-600';
  if (ratio > 0.25) return 'bg-green-400';
  if (ratio > 0.1) return 'bg-green-200';
  return 'bg-green-100';
}

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  const lookup = new Map<string, number>();
  let maxCount = 0;
  for (const d of data) {
    const key = `${d.dayOfWeek}-${d.hour}`;
    lookup.set(key, d.orderCount);
    if (d.orderCount > maxCount) maxCount = d.orderCount;
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(${HOURS.length}, 1fr)` }}>
          <div className="text-xs font-medium text-gray-500 p-1" />
          {HOURS.map((h) => (
            <div key={h} className="text-xs font-medium text-gray-500 p-1 text-center">
              {h}:00
            </div>
          ))}
          {DAY_LABELS.map((day, dayIdx) => (
            <>
              <div key={day} className="text-xs font-medium text-gray-500 p-1 flex items-center">
                {day}
              </div>
              {HOURS.map((h) => {
                const count = lookup.get(`${dayIdx}-${h}`) || 0;
                return (
                  <div
                    key={`${dayIdx}-${h}`}
                    className={`${intensityClass(count, maxCount)} border border-green-50 rounded p-1 text-center text-xs`}
                    title={`${day} ${h}:00 — ${count} orders`}
                  >
                    <span className={`font-medium ${count > 0 ? 'text-white' : 'text-green-800'}`}>
                      {count || ''}
                    </span>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
