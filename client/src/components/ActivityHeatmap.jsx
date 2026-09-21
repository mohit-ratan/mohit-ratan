import { useEffect, useState } from 'react';
import api from '../api';

const DAYS = 98; // 14 full weeks

function buildWeeks(activity) {
  const byDate = new Map(activity.map((a) => [a.date, a.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cells = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: byDate.get(key) || 0 });
  }
  // Pad the front so the grid starts on a Sunday, keeping weekly columns aligned.
  const firstDow = new Date(`${cells[0].date}T00:00:00`).getDay();
  for (let i = 0; i < firstDow; i++) cells.unshift({ date: null, count: 0 });
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function levelFor(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

export default function ActivityHeatmap({ authorId }) {
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    api.get(`/api/profile/${authorId}/activity`)
      .then(({ data }) => setActivity(data.activity))
      .catch(() => setActivity([]));
  }, [authorId]);

  if (activity === null) return null;

  const weeks = buildWeeks(activity);

  return (
    <div className="card side-card activity-heatmap">
      <h4>Consistency</h4>
      {activity.length ? (
        <>
          <div className="heatmap-grid">
            {weeks.map((week, wi) => (
              <div className="heatmap-week" key={wi}>
                {week.map((day, di) => (
                  <span
                    key={di}
                    className={`heatmap-cell level-${levelFor(day.count)}`}
                    title={day.date ? `${day.date}: ${day.count} update${day.count === 1 ? '' : 's'}` : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="heatmap-legend">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`heatmap-cell level-${l}`} />)}
            <span>More</span>
          </div>
        </>
      ) : (
        <p className="about-text">No activity yet — share something to start building your streak.</p>
      )}
    </div>
  );
}
