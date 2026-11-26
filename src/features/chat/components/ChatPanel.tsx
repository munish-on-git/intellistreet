'use client';
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- TODO: remove once data fetching moves to TanStack Query */

import { useState, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import type { User } from '@/features/auth/types';
import type { ChatMessage } from '@/features/chat/types';

interface ChatPanelProps {
  token: string;
  user: User;
}

export default function ChatPanel({ token, user }: ChatPanelProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMsgText, setNewMessageText] = useState('');

  async function fetchChats() {
    try {
      const res = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  }

  async function fetchMessages(partnerId: string) {
    try {
      const res = await fetch(`/api/chats/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }

  const submitChatMessage = async (e: any) => {
    e.preventDefault();
    if (!newMsgText.trim() || !selectedPartnerId) return;

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ receiver_id: selectedPartnerId, text: newMsgText })
      });

      if (res.ok) {
        setNewMessageText('');
        fetchMessages(selectedPartnerId);
        fetchChats();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchChats();
    }
  }, [token]);

  useEffect(() => {
    if (token && selectedPartnerId) {
      fetchMessages(selectedPartnerId);
      const interval = setInterval(() => fetchMessages(selectedPartnerId), 4000);
      return () => clearInterval(interval);
    }
  }, [token, selectedPartnerId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#111827]/40 border border-gray-800 rounded-3xl h-[600px] overflow-hidden shadow-2xl">
      {/* Active channels list */}
      <div className="border-r border-gray-800/80 p-4 flex flex-col gap-4 overflow-y-auto">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Active Channels</h3>

        <div className="space-y-1">
          {chats.length > 0 ? (
            chats.map((c) => (
              <button
                key={c.partner.id}
                onClick={() => setSelectedPartnerId(c.partner.id)}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                  selectedPartnerId === c.partner.id
                    ? 'bg-slate-800/80 border border-gray-700/60'
                    : 'hover:bg-slate-800/30'
                }`}
              >
                <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center font-bold text-emerald-400 text-sm">
                  {c.partner.name.charAt(0)}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-bold text-gray-200 truncate">{c.partner.name}</p>
                  <p className="text-xs text-gray-500 truncate">{c.lastMessage.text}</p>
                </div>
              </button>
            ))
          ) : (
            // Seed conversation suggestions if empty
            <div className="space-y-2 mt-4">
              <p className="text-xs text-gray-500 px-2 leading-relaxed">No messaging history. Initiate a chat with the municipal officer:</p>
              <button
                onClick={() => {
                  setSelectedPartnerId('user_2'); // Rajesh Officer
                }}
                className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center gap-3 border border-gray-800 cursor-pointer"
              >
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center font-bold text-sm">
                  R
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-200">Officer Rajesh Kumar</p>
                  <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Municipal Plumber Coordinator</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active chat window */}
      <div className="md:col-span-2 flex flex-col justify-between h-full">
        {selectedPartnerId ? (
          <>
            {/* Thread header */}
            <div className="p-4 border-b border-gray-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center font-bold text-emerald-400 border border-gray-700">
                  {selectedPartnerId === 'user_2' ? 'R' : 'U'}
                </div>
                <div>
                  <p className="font-bold text-gray-100 text-sm">
                    {selectedPartnerId === 'user_2' ? 'Officer Rajesh Kumar' : 'Indore Citizen Partner'}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Secure peer mesh</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow p-4 overflow-y-auto space-y-3.5 flex flex-col">
              {chatMessages.map((msg) => {
                const isMe = msg.sender_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`max-w-[70%] p-3.5 rounded-2xl text-xs leading-normal ${
                      isMe
                        ? 'bg-emerald-500 text-[#070a13] font-semibold self-end rounded-br-none'
                        : 'bg-slate-800 text-gray-200 self-start rounded-bl-none border border-gray-700/60'
                    }`}
                  >
                    {msg.text}
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            <form onSubmit={submitChatMessage} className="p-4 border-t border-gray-800/80 flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                value={newMsgText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-grow bg-slate-900 border border-gray-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="p-3 bg-emerald-500 text-[#070a13] font-bold rounded-xl cursor-pointer hover:brightness-110 shadow-lg shadow-emerald-500/5"
              >
                <Send size={14} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="mb-4 text-gray-700" size={44} />
            <p className="font-medium">Select a channel to begin secure messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
}
