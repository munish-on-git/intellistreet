'use client';
/* eslint-disable react/no-unescaped-entities -- TODO: remove once data fetching moves to TanStack Query */

import { useState } from 'react';
import { Send } from 'lucide-react';

interface CopilotPanelProps {
  /** Called after the agent may have changed complaints, so the parent can refresh its list. */
  onComplaintsChanged: () => void;
}

export default function CopilotPanel({ onComplaintsChanged }: CopilotPanelProps) {
  const [copilotMessages, setCopilotMessages] = useState<any[]>([
    { role: 'assistant', text: 'Greetings! I am the IntelliStreet Municipal AI Dispatch Agent. I can help you list unresolved issues, escalate severe hazards, dispatch department crews, or verify work orders using autonomous Python-based reasoning loops. How can I assist Indore city operations today?' }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotResponding, setIsCopilotResponding] = useState(false);

  const submitCopilotMessage = async (e: any) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    const userMsg = copilotInput.trim();
    setCopilotMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setCopilotInput('');
    setIsCopilotResponding(true);

    try {
      const res = await fetch('/api/python/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg })
      });

      if (res.ok) {
        const data = await res.json();
        setCopilotMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.agent_response,
            toolCalls: data.tool_calls_executed
          }
        ]);
        // Auto-refresh main complaints dashboard feed
        onComplaintsChanged();
      } else {
        setCopilotMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Error executing Python AI coordination. Please verify the sidecar.' }
        ]);
      }
    } catch (err) {
      console.error('[AI Agent Error]', err);
      setCopilotMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sidecar is offline. Initiating self-healing startup uvicorn server...' }
      ]);
    } finally {
      setIsCopilotResponding(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-[#111827]/40 border border-gray-800 rounded-3xl h-[650px] overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Information and Quick Tools Rail */}
      <div className="lg:col-span-1 border-r border-gray-800/80 p-5 flex flex-col justify-between overflow-y-auto bg-[#0a0f1d]/50">
        <div className="space-y-5">
          <div>
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase rounded-md tracking-wider">
              Python Sidecar Agent
            </span>
            <h3 className="text-md font-extrabold text-gray-200 mt-2 font-display">Civic Dispatch Loop</h3>
            <p className="text-xs text-gray-400 leading-relaxed mt-1">
              An autonomous LLM agent equipped with native municipal database tools. It interprets natural language prompts, coordinates with the Python backend, and executes live operations.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Agent Capabilities</p>
            <ul className="text-xs text-gray-300 space-y-1.5 list-disc pl-4 leading-normal">
              <li>Fetch real-time complaints</li>
              <li>Update report statuses</li>
              <li>Dispatch named repair crews</li>
              <li>Escalate high-hazard safety risks</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Quick Suggestions</p>
            <div className="flex flex-col gap-2">
              {[
                'Show unresolved complaints',
                'Dispatch Asphalt Crew Delta to report_1',
                'Escalate report_3 because of flooding'
              ].map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCopilotInput(s);
                  }}
                  className="text-left text-xs bg-slate-900 border border-gray-800 hover:border-emerald-500/40 text-gray-300 p-2.5 rounded-xl transition-all cursor-pointer truncate"
                >
                  "{s}"
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800/60 pt-4">
          <p className="text-[10px] text-gray-500 text-center">
            Engine: <strong>FastAPI + Gemini 3.5</strong>
          </p>
        </div>
      </div>

      {/* Main Interactive Chat Area */}
      <div className="lg:col-span-3 flex flex-col h-full overflow-hidden bg-[#0d1222]/10">
        {/* Chat logs */}
        <div className="flex-grow p-6 overflow-y-auto space-y-4">
          {copilotMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-xl rounded-2xl p-4 shadow-md text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-500 text-[#070a13] font-medium rounded-tr-none'
                    : 'bg-slate-900 border border-gray-800 text-gray-200 rounded-tl-none'
                }`}
              >
                <p>{msg.text}</p>

                {/* Render executed tool badges for transparency */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-800/50 space-y-2">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-emerald-400">
                      Autonomous Tool Calls (MCP Loop):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.toolCalls.map((t: any, tid: number) => (
                        <span
                          key={tid}
                          className="px-2 py-0.5 bg-slate-950/80 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg font-mono flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                          {t.tool}({JSON.stringify(t.arguments)})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest px-1">
                {msg.role === 'user' ? 'Citizen Operations' : 'AI Coordinator'}
              </span>
            </div>
          ))}

          {isCopilotResponding && (
            <div className="flex flex-col items-start">
              <div className="bg-slate-900 border border-gray-800 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                <span className="text-xs text-gray-400 font-mono ml-2">Invoking Python tools...</span>
              </div>
            </div>
          )}
        </div>

        {/* Message prompt form */}
        <form onSubmit={submitCopilotMessage} className="p-4 border-t border-gray-800 flex gap-2">
          <input
            type="text"
            value={copilotInput}
            onChange={(e) => setCopilotInput(e.target.value)}
            placeholder="Ask AI dispatch to list complaints, re-assign status, or escalate issues..."
            className="flex-grow bg-slate-900 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 text-gray-100"
          />
          <button
            type="submit"
            disabled={isCopilotResponding}
            className="px-5 bg-emerald-500 text-[#070a13] font-extrabold rounded-xl cursor-pointer hover:brightness-110 shadow-lg shadow-emerald-500/5 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Send size={15} />
            Dispatch
          </button>
        </form>
      </div>
    </div>
  );
}
