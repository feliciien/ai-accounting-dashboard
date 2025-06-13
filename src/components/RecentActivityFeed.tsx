import React, { useEffect, useState } from 'react';

interface ActivityItem {
  type: 'upload' | 'login' | 'achievement' | 'integration' | 'task' | 'other';
  message: string;
  timestamp: string;
  meta?: Record<string, any>;
}

const ACTIVITY_KEY = 'recentActivityFeed';

function getRecentActivity(): ActivityItem[] {
  const data = localStorage.getItem(ACTIVITY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as ActivityItem[];
  } catch {
    return [];
  }
}

function addActivity(item: ActivityItem) {
  const current = getRecentActivity();
  const updated = [item, ...current].slice(0, 20); // Keep only last 20
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
}

export function logActivity(type: ActivityItem['type'], message: string, meta?: Record<string, any>) {
  addActivity({
    type,
    message,
    timestamp: new Date().toISOString(),
    meta,
  });
}

const typeIcon: Record<ActivityItem['type'], React.ReactNode> = {
  upload: <span className="bg-blue-100 text-blue-600 rounded-full p-2 mr-2">⬆️</span>,
  login: <span className="bg-green-100 text-green-600 rounded-full p-2 mr-2">🔑</span>,
  achievement: <span className="bg-yellow-100 text-yellow-700 rounded-full p-2 mr-2">🏆</span>,
  integration: <span className="bg-purple-100 text-purple-600 rounded-full p-2 mr-2">🔗</span>,
  task: <span className="bg-pink-100 text-pink-600 rounded-full p-2 mr-2">✅</span>,
  other: <span className="bg-gray-100 text-gray-600 rounded-full p-2 mr-2">ℹ️</span>,
};

function formatTimeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

const RecentActivityFeed: React.FC = () => {
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    setActivity(getRecentActivity());
    const interval = setInterval(() => setActivity(getRecentActivity()), 10000);
    return () => clearInterval(interval);
  }, []);

  if (activity.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-50 via-blue-50 to-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-10 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: "url('https://www.transparenttextures.com/patterns/cubes.png')" }} />
        <h2 className="text-2xl font-extrabold text-primary-700 mb-3 tracking-tight drop-shadow">Recent Activity</h2>
        <p className="text-gray-400 italic">No recent activity yet. Your actions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-2xl border border-blue-100 p-8 mb-10 overflow-hidden transition-all duration-300">
      <div className="absolute inset-0 pointer-events-none opacity-10" style={{ background: "url('https://www.transparenttextures.com/patterns/cubes.png')" }} />
      <h2 className="text-2xl font-extrabold text-primary-700 mb-5 tracking-tight drop-shadow">Recent Activity</h2>
      <ol className="relative border-l-4 border-gradient-to-b from-blue-400 via-indigo-300 to-indigo-500 ml-5 before:content-[''] before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:rounded-full before:bg-gradient-to-b before:from-blue-400 before:via-indigo-300 before:to-indigo-500">
        {activity.map((item, idx) => (
          <li
            key={idx}
            className="mb-10 ml-7 group animate-fadeIn"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <span className={`
              absolute -left-6 flex items-center justify-center w-10 h-10 rounded-full ring-4 ring-white
              scale-90 group-hover:scale-110 group-hover:ring-indigo-200
              ${item.type === 'upload' ? 'bg-blue-500/90 text-white shadow-lg' :
                item.type === 'login' ? 'bg-green-500/90 text-white shadow-lg' :
                item.type === 'achievement' ? 'bg-yellow-400/90 text-yellow-900 shadow-lg' :
                item.type === 'integration' ? 'bg-purple-500/90 text-white shadow-lg' :
                item.type === 'task' ? 'bg-pink-500/90 text-white shadow-lg' :
                'bg-gray-300/90 text-gray-700 shadow-lg'
              }
              transition-transform transition-shadow duration-300 ease-out
              animate-popIn
            `}>
              {typeIcon[item.type] || typeIcon.other}
            </span>
            <div className="relative bg-white/90 backdrop-blur-md border border-gray-100 rounded-xl px-6 py-4 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="text-lg text-gray-800 font-semibold leading-tight tracking-tight">{item.message}</div>
                <span className="text-xs text-gray-400 font-mono ml-4">{formatTimeAgo(item.timestamp)}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

/* Add popIn animation for icons */
const style = document.createElement('style');
style.innerHTML = `
@keyframes popIn {
  0% { transform: scale(0.7); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-popIn {
  animation: popIn 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}
.animate-fadeIn {
  animation: fadeIn 0.7s cubic-bezier(0.23, 1, 0.32, 1);
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px);}
  to { opacity: 1; transform: translateY(0);}
}
`;
if (typeof window !== 'undefined' && !document.getElementById('recent-activity-animations')) {
  style.id = 'recent-activity-animations';
  document.head.appendChild(style);
}

export default RecentActivityFeed;
