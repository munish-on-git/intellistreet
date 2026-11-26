'use client';
import { useState } from 'react';
import { MapPin, Shield, Send, MessageSquare, PlusCircle, LogOut, BarChart3, TrendingUp, Award, Sparkles, Trash2, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { User } from '@/features/auth/types';
import type { TabId } from './types';

interface MobileNavProps {
  user: User;
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
  onReport: () => void;
  onLogout: () => void;
}

export default function MobileNav({ user, activeTab, onNavigate, onReport, onLogout }: MobileNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
    {/* Mobile Bottom Navigation Bar (Visible only on mobile/tablet) */}
    <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[#0d1222]/95 backdrop-blur-md border-t border-gray-800/80 px-2 py-2 flex justify-around items-center z-[9990] shadow-2xl pb-safe pb-4">
      {[
        { id: 'home', label: 'Home', icon: <BarChart3 size={20} /> },
        { id: 'map', label: 'GIS Map', icon: <MapPin size={20} /> },
        { id: 'feed', label: 'Feed', icon: <MessageSquare size={20} /> },
        { id: 'garbage', label: 'Swachh', icon: <Trash2 size={20} className="text-lime-400" /> },
        { id: 'more', label: 'More', icon: <MoreHorizontal size={20} /> }
      ].map((tab) => {
        const isSelected = tab.id === 'more' ? isMobileMenuOpen : (activeTab === tab.id && !isMobileMenuOpen);
        return (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'more') {
                setIsMobileMenuOpen(true);
              } else {
                setIsMobileMenuOpen(false);
                onNavigate(tab.id as TabId);
              }
            }}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all relative cursor-pointer min-w-[64px] ${
              isSelected
                ? 'text-emerald-400 font-bold'
                : 'text-gray-400'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="activeTabMobileIndicator"
                className="absolute inset-0 bg-emerald-500/10 rounded-xl -z-10 border border-emerald-500/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            {tab.icon}
            <span className="text-[10px] tracking-wide mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </div>

    {/* Floating Action Button (FAB) for reporting community issues - floats nicely above mobile nav */}
    {user && user.role === 'citizen' && (
      <button
        onClick={() => {
          onReport();
        }}
        className="lg:hidden fixed bottom-20 right-4 z-[9980] bg-gradient-to-tr from-emerald-500 to-teal-400 hover:brightness-110 text-[#070a13] w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
        title="Report Community Issue"
      >
        <PlusCircle size={22} />
      </button>
    )}

    {/* Android-style Bottom Sheet for 'More' workspace navigation options */}
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          {/* Dark Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 z-[9995] lg:hidden backdrop-blur-sm"
          />

          {/* Bottom Sheet Card */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-0 inset-x-0 bg-[#0d1222] border-t border-gray-800/80 rounded-t-[2.5rem] p-6 pb-10 z-[9996] lg:hidden max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col gap-5"
          >
            {/* Pull Handle Bar */}
            <div className="w-12 h-1.5 bg-gray-700/80 rounded-full mx-auto cursor-pointer" onClick={() => setIsMobileMenuOpen(false)} />

            {/* Header */}
            <div className="flex justify-between items-center mt-2 pb-3 border-b border-gray-800/60">
              <div>
                <h4 className="text-base font-bold text-gray-200">Municipal Workspace Hub</h4>
                <p className="text-[11px] text-gray-400">IntelliStreet services and active nodes</p>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-400 hover:text-white text-xs bg-slate-800 hover:bg-slate-750 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Grid of Navigation Links */}
            <div className="grid grid-cols-2 gap-3.5 mt-2">
              {[
                { id: 'chat', label: 'Private Messenger', icon: <Send size={18} />, desc: 'Communicate with officers' },
                { id: 'copilot', label: 'AI Dispatch Agent', icon: <Sparkles size={18} className="text-emerald-400" />, desc: 'Autonomous AI assistant' },
                { id: 'patterns', label: 'AI Trend Analytics', icon: <TrendingUp size={18} className="text-teal-400" />, desc: 'Predictive pattern insights' },
                ...(user && (user.role === 'officer' || user.role === 'admin')
                  ? [{ id: 'admin', label: 'Officer Terminal', icon: <Shield size={18} />, desc: 'Manage submissions' }]
                  : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                          onNavigate(tab.id as TabId);
                  }}
                  className={`p-4 rounded-2xl flex flex-col gap-2 border text-left transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-900/40 border-gray-800/80 hover:bg-slate-800/40 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${activeTab === tab.id ? 'bg-emerald-500/10' : 'bg-slate-900'}`}>
                      {tab.icon}
                    </div>
                    <span className="text-xs font-bold">{tab.label}</span>
                  </div>
                  <p className="text-[9px] text-gray-500 leading-tight">{tab.desc}</p>
                </button>
              ))}
            </div>

            {/* Neighborhood standing XP status inside sheet */}
            <div className="bg-[#111827]/60 border border-gray-800/80 rounded-2xl p-4 flex justify-between items-center gap-3 mt-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                  <Award size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-100">{user?.points} XP</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Reputation Standing</p>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono uppercase font-bold border border-emerald-500/20">
                Level Active
              </span>
            </div>

            {/* Profile & Logout controls */}
            <div className="border-t border-gray-800/60 pt-4 flex items-center justify-between mt-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-emerald-400 font-bold border border-gray-700">
                  {user?.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-300 leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-gray-500 leading-tight capitalize">{user?.role} Account</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="px-3.5 py-2 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut size={13} /> Log Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
