'use client';
/* eslint-disable react-hooks/set-state-in-effect -- TODO: remove once data fetching moves to TanStack Query */

import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';

export default function InsightsPanel() {
  const [patternInsights, setPatternInsights] = useState<string[]>([]);
  const [predictiveRecs, setPredictiveRecs] = useState<any[]>([]);
  const [patternHotspots, setPatternHotspots] = useState<any[]>([]);
  const [isPatternsLoading, setIsPatternsLoading] = useState(false);

  const fetchPatternInsights = async () => {
    setIsPatternsLoading(true);
    try {
      const res = await fetch('/api/python/learning');
      if (res.ok) {
        const data = await res.json();
        setPatternInsights(data.insights || []);
        setPredictiveRecs(data.predictive_recommendations || []);
        setPatternHotspots(data.hotspots || []);
      }
    } catch (err) {
      console.error('[AI Learning Error]', err);
    } finally {
      setIsPatternsLoading(false);
    }
  };

  // Load insights when the panel mounts (previously: when the 'patterns' tab became active)
  useEffect(() => {
    fetchPatternInsights();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header overview card */}
      <div className="bg-gradient-to-r from-teal-950/20 via-slate-900/10 to-[#070a13] border border-teal-500/10 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-100 mb-1 flex items-center gap-2">
            <TrendingUp size={20} className="text-teal-400" />
            Infrastructural Trend Analytics Node
          </h2>
          <p className="text-gray-400 text-xs max-w-lg leading-relaxed">
            Our Python learning engine analyzes temporal patterns, geolocated clusters, and complaints records to generate predictive maintenance recommendations.
          </p>
        </div>
        <button
          onClick={fetchPatternInsights}
          disabled={isPatternsLoading}
          className="px-4 py-2 bg-teal-500 text-[#070a13] font-bold rounded-xl shadow-lg hover:brightness-110 cursor-pointer text-xs disabled:opacity-50"
        >
          {isPatternsLoading ? 'Analyzing...' : 'Refresh Insights'}
        </button>
      </div>

      {isPatternsLoading ? (
        <div className="p-20 text-center bg-[#111827]/30 border border-gray-800 rounded-3xl flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 font-medium text-sm">Querying Python trend-learning engine...</p>
          <p className="text-xs text-gray-500 mt-1">Aggregating municipal logs & running temporal clustering</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: AI Insights and Hotspots */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#111827]/60 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400">Core AI Learnings</h3>
                <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[9px] uppercase font-bold rounded-md">
                  Active
                </span>
              </div>
              <div className="space-y-3">
                {patternInsights.length > 0 ? (
                  patternInsights.map((ins, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-900/60 border border-gray-800/80 rounded-2xl flex gap-3">
                      <span className="text-teal-400 font-bold font-mono text-sm">0{idx+1}</span>
                      <p className="text-xs text-gray-300 leading-relaxed">{ins}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No active trend insights detected yet. Submit more complaints to trigger clustering.</p>
                )}
              </div>
            </div>

            <div className="bg-[#111827]/40 border border-gray-800/80 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Detected Hotspots</h3>
              <div className="space-y-3 overflow-y-auto max-h-[220px]">
                {patternHotspots.length > 0 ? (
                  patternHotspots.map((h: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-900/30 border border-gray-800/60 rounded-xl">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-300 truncate">{h.address || 'indore core'}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        h.priority === 'critical' ? 'bg-red-950/40 text-red-400 border border-red-950' : 'bg-slate-800 text-gray-400'
                      }`}>
                        {h.category.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No geographic cluster hotspots cataloged yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Predictive Maintenance recommendations */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#111827]/60 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400">
                Predictive Maintenance Schedules (Auto-Generated)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-3 px-2">Target Zone</th>
                      <th className="py-3 px-2">Action Required</th>
                      <th className="py-3 px-2 text-center">Interval</th>
                      <th className="py-3 px-2">Priority</th>
                      <th className="py-3 px-2">AI Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {predictiveRecs.length > 0 ? (
                      predictiveRecs.map((rec: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-900/10">
                          <td className="py-3.5 px-2 font-semibold text-gray-200">{rec.target_zone}</td>
                          <td className="py-3.5 px-2 text-teal-400 font-medium">{rec.action}</td>
                          <td className="py-3.5 px-2 text-center font-mono text-gray-300">{rec.estimated_interval_months} mo</td>
                          <td className="py-3.5 px-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              rec.priority === 'high' ? 'bg-orange-950/20 text-orange-400 border border-orange-500/10' : 'bg-yellow-950/20 text-yellow-400 border border-yellow-500/10'
                            }`}>
                              {rec.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-gray-400 leading-normal max-w-[200px] text-justify">{rec.justification}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-500">No preventive schedules cataloged. Submit reports to run analytics.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
