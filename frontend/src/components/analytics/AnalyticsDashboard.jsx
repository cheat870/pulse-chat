import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, MessageSquare, Users, Globe, TrendingUp } from 'lucide-react';
import { apiRequest } from '../../services/api';

export default function AnalyticsDashboard({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/users/analytics')
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maxMsgCount = data && data.msgPerDay?.length > 0
    ? Math.max(...(data.msgPerDay.map(d => d.count)), 1)
    : 1;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto">
      <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Chat Analytics & Insights</h2>
            <p className="text-[10px] text-slate-400">Activity statistics and metrics</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Calculating analytics...</p>
        </div>
      ) : !data ? null : (
        <div className="p-6 max-w-xl mx-auto w-full space-y-6">
          {/* Key Stat Tiles */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 text-center shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="w-4 h-4" />
              </div>
              <p className="text-2xl font-extrabold text-white">{data.totalMessages}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Messages</p>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 text-center shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-2xl font-extrabold text-white">{data.friendsCount}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Friends</p>
            </div>

            <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-4 text-center shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto mb-2">
                <Globe className="w-4 h-4" />
              </div>
              <p className="text-2xl font-extrabold text-white">{data.totalPosts}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Feed Posts</p>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Weekly Messages Trend</span>
            </h3>

            <div className="flex items-end gap-2 h-36 pt-4">
              {last7Days.map(day => {
                const dayData = (data.msgPerDay || []).find(d => d.day === day);
                const count = dayData?.count || 0;
                const height = maxMsgCount > 0 ? Math.max((count / maxMsgCount) * 100, count > 0 ? 8 : 0) : 0;
                const label = new Date(day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' });

                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] text-indigo-300 font-bold">{count > 0 ? count : ''}</span>
                    <div className="w-full bg-slate-800/60 rounded-xl h-full max-h-24 flex items-end overflow-hidden p-0.5">
                      <div
                        className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-lg transition-all duration-300"
                        style={{ height: `${height}%`, minHeight: count > 0 ? '6px' : '0px' }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 font-medium">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Conversations */}
          {data.topConvs && data.topConvs.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-200 mb-3 uppercase tracking-wider">
                🔥 Most Active Conversations
              </h3>
              <div className="space-y-3">
                {data.topConvs.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-indigo-400 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-200">{c.name || 'Direct Chat'}</span>
                        <span className="text-xs text-slate-400">{c.message_count} msgs</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${(c.message_count / data.topConvs[0].message_count) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
