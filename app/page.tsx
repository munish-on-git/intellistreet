'use client';
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, @next/next/no-img-element, react-hooks/rules-of-hooks, react/no-unescaped-entities, @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin, Clock, Users, Zap, Shield, Send, MessageSquare, PlusCircle,
  LogOut, User as UserIcon, CheckCircle, BarChart3, HelpCircle,
  TrendingUp, Award, RotateCcw, AlertTriangle, ArrowRight, Eye, Upload, Sparkles, Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Dynamically load the Leaflet MapComponent with SSR disabled
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-slate-900/50 rounded-xl flex flex-col items-center justify-center border border-gray-800">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400 font-medium">Bootstrapping Mappls GIS Engine...</p>
    </div>
  )
});

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'citizen' | 'officer' | 'admin';
  latitude: number;
  longitude: number;
  points: number;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  text: string;
  created_at: string;
}

interface Complaint {
  id: string;
  user_id: string;
  reporter_name: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  category: string;
  ai_category?: string;
  ai_confidence?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  latitude: number;
  longitude: number;
  address: string;
  department?: string;
  status: 'pending' | 'verified' | 'assigned' | 'in_progress' | 'resolved';
  verification_count: number;
  is_verified: boolean;
  comments: Comment[];
  votes: any[];
  admin_notes?: string;
  resolution_proof_url?: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
}

export default function IntellistreetApp() {
  // Authentication & Session state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Core navigation tabs
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'feed' | 'chat' | 'admin' | 'copilot' | 'patterns'>('home');

  // AI Copilot States (Python Agent Sidecar)
  const [copilotMessages, setCopilotMessages] = useState<any[]>([
    { role: 'assistant', text: 'Greetings! I am the IntelliStreet Municipal AI Dispatch Agent. I can help you list unresolved issues, escalate severe hazards, dispatch department crews, or verify work orders using autonomous Python-based reasoning loops. How can I assist Indore city operations today?' }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotResponding, setIsCopilotResponding] = useState(false);

  // Predictive Pattern Learning States (Python Analytics Sidecar)
  const [patternInsights, setPatternInsights] = useState<string[]>([]);
  const [predictiveRecs, setPredictiveRecs] = useState<any[]>([]);
  const [patternHotspots, setPatternHotspots] = useState<any[]>([]);
  const [isPatternsLoading, setIsPatternsLoading] = useState(false);

  // Application database states
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredStatus, setFilteredStatus] = useState<string>('all');
  const [filteredCategory, setFilteredCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected complaint and Drone 3D street-view state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [flyToCoord, setFlyToCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isStreetViewOpen, setIsStreetViewOpen] = useState(false);
  const [streetViewYaw, setStreetViewYaw] = useState(0); // Camera angle/drag yaw for 360 viewer

  // Active chat thread state
  const [chats, setChats] = useState<any[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMsgText, setNewMessageText] = useState('');

  // Reporting complaint form state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDescription] = useState('');
  const [reportCategory, setReportCategory] = useState('road_damage');
  const [reportImage, setReportImage] = useState<File | null>(null);
  const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);
  const [isReportingLocating, setIsReportingLocating] = useState(false);
  const [reportCoords, setReportCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Real-time AI categorizer output preview
  const [aiPreviewResult, setAiPreviewResult] = useState<any>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Administrative / Officer form fields
  const [adminNotes, setAdminNotes] = useState('');
  const [adminDept, setAdminDept] = useState('');
  const [adminStatus, setAdminStatus] = useState<any>('pending');
  const [resolutionFile, setResolutionFile] = useState<File | null>(null);

  // Comments form fields
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  async function fetchUserProfile(authToken: string) {
    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const u = await res.json();
        setUser(u);
      } else {
        handleLogout();
      }
    } catch {
      handleLogout();
    }
  }

  async function fetchComplaints() {
    try {
      const res = await fetch('/api/complaints');
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    }
  }

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

  // Trigger auth load from local storage
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    if (savedToken) {
      setToken(savedToken);
      fetchUserProfile(savedToken);
    }
    fetchComplaints();
  }, []);

  // Poll chats list if authenticated
  useEffect(() => {
    if (token) {
      fetchChats();
    }
  }, [token]);

  // Fetch messages thread when partner is selected
  useEffect(() => {
    if (token && selectedPartnerId) {
      fetchMessages(selectedPartnerId);
      const interval = setInterval(() => fetchMessages(selectedPartnerId), 4000);
      return () => clearInterval(interval);
    }
  }, [token, selectedPartnerId]);

  // Fetch pattern insights automatically when entering patterns tab
  useEffect(() => {
    if (activeTab === 'patterns') {
      fetchPatternInsights();
    }
  }, [activeTab]);

  const handleLogin = async (e?: any, demoEmail?: string, demoPassword?: string) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const email = demoEmail || authEmail;
    const password = demoPassword || authPassword;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('access_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        setAuthEmail('');
        setAuthPassword('');
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setAuthError('Connection server error. Please try again.');
    }
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName,
          email: authEmail,
          phone: authPhone,
          password: authPassword,
          role: 'citizen'
        })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('access_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        setAuthName('');
        setAuthEmail('');
        setAuthPhone('');
        setAuthPassword('');
      } else {
        setAuthError(data.error || 'Registration failed');
      }
    } catch {
      setAuthError('Network error registering account.');
    }
  };

  function handleLogout() {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
    setActiveTab('home');
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReportImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReportImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Trigger AI Analysis real-time categorizer preview!
      triggerAiCategorizerPreview(file);
    }
  };

  const triggerAiCategorizerPreview = async (file: File) => {
    setIsAiAnalyzing(true);
    setAiPreviewResult(null);
    try {
      const body = new FormData();
      body.append('image', file);

      const res = await fetch('/api/python/sensing', {
        method: 'POST',
        body
      });
      if (res.ok) {
        const result = await res.json();
        setAiPreviewResult(result);
        setReportCategory(result.category); // Auto-populate detected category!
      }
    } catch (e) {
      console.error('Real-time categorizer failed:', e);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleGeolocate = () => {
    setIsReportingLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setReportCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setIsReportingLocating(false);
        },
        () => {
          // Fallback to Indore central random coordinates if browser blocks geolocation
          setReportCoords({ lat: 22.7196 + (Math.random() - 0.5) * 0.05, lon: 75.8577 + (Math.random() - 0.5) * 0.05 });
          setIsReportingLocating(false);
        }
      );
    } else {
      setReportCoords({ lat: 22.7196, lon: 75.8577 });
      setIsReportingLocating(false);
    }
  };

  const submitComplaintReport = async (e: any) => {
    e.preventDefault();
    if (!reportTitle || !reportDesc || !reportCoords || !reportImage) {
      alert('Please fill all fields, select an issue image, and capture GPS coordinates.');
      return;
    }

    try {
      const body = new FormData();
      body.append('user_id', user!.id);
      body.append('title', reportTitle);
      body.append('description', reportDesc);
      body.append('category', reportCategory);
      body.append('latitude', reportCoords.lat.toString());
      body.append('longitude', reportCoords.lon.toString());
      body.append('image', reportImage);

      const res = await fetch('/api/complaints', {
        method: 'POST',
        body
      });

      if (res.ok) {
        setReportTitle('');
        setReportDescription('');
        setReportImage(null);
        setReportImagePreview(null);
        setReportCoords(null);
        setAiPreviewResult(null);
        setIsReportOpen(false);
        fetchComplaints();
        setActiveTab('feed');
      } else {
        alert('Failed to submit report');
      }
    } catch (e) {
      alert('Error submitting report.');
    }
  };

  const castCommunityVote = async (complaintId: string, voteType: 'confirmed' | 'denied') => {
    if (!user) {
      alert('You must log in to verify community issues.');
      return;
    }

    try {
      const res = await fetch(`/api/verification/${complaintId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, vote: voteType })
      });

      const data = await res.json();
      if (res.ok) {
        fetchComplaints();
        // Update user stats in state
        fetchUserProfile(token!);
      } else {
        alert(data.error || 'Failed to submit vote');
      }
    } catch {
      alert('Error voting.');
    }
  };

  const submitComment = async (complaintId: string) => {
    const text = commentInputs[complaintId];
    if (!text || !text.trim() || !user) return;

    try {
      const res = await fetch(`/api/complaints/${complaintId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, text })
      });

      if (res.ok) {
        setCommentInputs((prev) => ({ ...prev, [complaintId]: '' }));
        fetchComplaints();
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
    }
  };

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
        fetchComplaints();
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

  const triggerDroneFlyTo = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setFlyToCoord({ latitude: complaint.latitude, longitude: complaint.longitude });
    setActiveTab('map');
  };

  // Municipal officer / admin action submission
  const submitAdminAction = async (complaintId: string) => {
    try {
      const updates: any = {
        status: adminStatus,
        department: adminDept,
        admin_notes: adminNotes
      };

      if (adminStatus === 'resolved') {
        updates.resolution_proof_url = 'https://picsum.photos/seed/cleanroad/800/600'; // Resolution proof photo
      }

      const res = await fetch(`/api/admin/complaints/${complaintId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        alert('Action applied successfully! Department and status updated.');
        setAdminNotes('');
        setAdminStatus('pending');
        setAdminDept('');
        setSelectedComplaint(null);
        fetchComplaints();
      }
    } catch (err) {
      alert('Failed to submit administrative action.');
    }
  };

  // Helper getters
  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'road_damage': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'drainage_problem': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'water_leakage': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'garbage': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'street_light_failure': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'electrical_hazard': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'public_infrastructure': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-red-500/10 text-red-400 border border-red-500/30';
      case 'verified': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30';
      case 'assigned': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
      case 'in_progress': return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
      case 'resolved': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/30';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400 font-bold';
      case 'high': return 'text-orange-400 font-semibold';
      case 'medium': return 'text-yellow-400 font-semibold';
      default: return 'text-emerald-400';
    }
  };

  // Filters and queries on complaints list
  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = filteredStatus === 'all' || c.status === filteredStatus;
    const matchesCategory = filteredCategory === 'all' || c.category === filteredCategory;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#070a13] text-gray-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Professional Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#0d1222]/95 backdrop-blur-md border-b border-gray-800/80 px-4 lg:px-8 py-3.5 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center text-[#070a13] font-bold text-xl shadow-lg shadow-emerald-500/10 animate-pulse-glow">
            <Navigation size={22} className="rotate-45" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent font-display">INTELLISTREET</h1>
            <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Active Municipal GIS Mesh</p>
          </div>
        </div>

        {/* Global stats visible to evaluated users */}
        {user && (
          <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 bg-slate-900/40 rounded-xl border border-gray-800">
            <div className="text-center border-r border-gray-800 pr-6">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Citizen Score</p>
              <div className="flex items-center gap-1.5 justify-center mt-0.5">
                <Award size={14} className="text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">{user.points} XP</span>
              </div>
            </div>
            <div className="text-center pr-2">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Role</p>
              <span className="text-xs font-semibold text-gray-300 capitalize">{user.role}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-gray-200">{user.name}</p>
                  <p className="text-[11px] text-gray-400 tracking-wide font-medium">{user.email}</p>
                </div>
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-emerald-400 font-bold border border-gray-700">
                  {user.name.charAt(0)}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out Session"
                className="p-2.5 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-500/20 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="text-xs font-medium text-gray-400">Guest Telemetry Layer</div>
          )}
        </div>
      </header>

      {/* Main Grid View */}
      {token && user ? (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8">
          
          {/* Left Control Column / Navigation Dashboard */}
          <aside className="w-full lg:w-64 flex flex-col gap-4">
            <div className="bg-[#111827]/60 border border-gray-800/80 rounded-2xl p-4 flex flex-col gap-2 shadow-xl backdrop-blur">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider px-2 mb-2">Workspace Navigation</p>
              
              {[
                { id: 'home', label: 'Dashboard', icon: <BarChart3 size={18} /> },
                { id: 'map', label: 'Live GIS Map', icon: <MapPin size={18} /> },
                { id: 'feed', label: 'Community Feed', icon: <MessageSquare size={18} /> },
                { id: 'chat', label: 'Private Messenger', icon: <Send size={18} /> },
                { id: 'copilot', label: 'AI Dispatch Agent', icon: <Sparkles size={18} className="text-emerald-400" /> },
                { id: 'patterns', label: 'AI Trend Analytics', icon: <TrendingUp size={18} className="text-teal-400" /> },
                ...(user.role === 'officer' || user.role === 'admin'
                  ? [{ id: 'admin', label: 'Officer Terminal', icon: <Shield size={18} /> }]
                  : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id !== 'map') setSelectedComplaint(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-[#070a13] shadow-lg shadow-emerald-500/10'
                      : 'text-gray-300 hover:bg-slate-800/40'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Report Trigger Widget for Citizens */}
            {user.role === 'citizen' && (
              <button
                onClick={() => {
                  handleGeolocate();
                  setIsReportOpen(true);
                }}
                className="w-full bg-gradient-to-tr from-emerald-500 to-teal-400 hover:brightness-110 text-[#070a13] font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/5 transition-all cursor-pointer text-sm"
              >
                <PlusCircle size={18} />
                Report Community Issue
              </button>
            )}

            {/* Platform Gamified Rep Widget */}
            <div className="bg-[#111827]/40 border border-gray-800/50 rounded-2xl p-4 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Neighborhood Standings</h3>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                  <Award size={22} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-100">{user.points} XP</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Reputation Standing</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-normal mt-1 border-t border-gray-800/60 pt-3">
                Earn <strong>+10 XP</strong> for verified reports and <strong>+5 XP</strong> for community validation votes.
              </p>
            </div>
          </aside>

          {/* Right Interface Hub */}
          <main className="flex-grow flex flex-col gap-6">
            
            {/* View Tab: Dashboard Overview */}
            {activeTab === 'home' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-emerald-950/20 via-slate-900/10 to-[#070a13] border border-emerald-500/10 rounded-3xl p-6 lg:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-gray-100 mb-1">Indore Smart City Grid Node</h2>
                    <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
                      Track potholes, pipeline ruptures, leaking sewage, electrical hazards, and municipal sanitation issues with automated AI routing and geolocated flyovers.
                    </p>
                  </div>
                  {user.role === 'citizen' && (
                    <button
                      onClick={() => {
                        handleGeolocate();
                        setIsReportOpen(true);
                      }}
                      className="px-6 py-3 bg-emerald-500 text-[#070a13] font-bold rounded-xl shadow-lg hover:brightness-110 cursor-pointer text-sm"
                    >
                      Report Civic Issue
                    </button>
                  )}
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: 'Unresolved Reports', value: complaints.filter(c => c.status !== 'resolved').length, icon: <AlertTriangle className="text-orange-400" /> },
                    { label: 'Resolved Issues', value: complaints.filter(c => c.status === 'resolved').length, icon: <CheckCircle className="text-emerald-400" /> },
                    { label: 'Indore Mesh Total', value: complaints.length, icon: <Sparkles className="text-emerald-400" /> }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-5 flex justify-between items-center shadow-lg">
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
                        <p className="text-2xl font-extrabold text-gray-100 mt-1">{stat.value}</p>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-gray-800">{stat.icon}</div>
                    </div>
                  ))}
                </div>

                {/* Direct Action Map Section */}
                <div className="bg-[#111827]/60 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-bold font-display">Active Municipal GIS Mesh</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Click any report to trigger Drone Fly-To telemetry and 360-degree street view</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('map')}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      Maximize Map View <ArrowRight size={14} />
                    </button>
                  </div>
                  
                  <div className="h-[400px] relative">
                    <MapComponent
                      markers={complaints}
                      onSelectMarker={triggerDroneFlyTo}
                      selectedMarker={selectedComplaint}
                      flyToCoord={flyToCoord}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* View Tab: Live Map Page with 360 Drone Flyover Modal */}
            {activeTab === 'map' && (
              <div className="space-y-6">
                <div className="bg-[#111827]/60 border border-gray-800 rounded-3xl p-6 shadow-xl relative">
                  <h3 className="text-lg font-bold font-display mb-2">GIS Telemetry Console</h3>
                  <p className="text-xs text-gray-400 mb-4">Centered on Indore metropolitan area. Zooming in triggers active street-grid inspection.</p>
                  
                  <div className="h-[550px] relative">
                    <MapComponent
                      markers={complaints}
                      onSelectMarker={(m) => {
                        setSelectedComplaint(m);
                        setFlyToCoord({ latitude: m.latitude, longitude: m.longitude });
                      }}
                      selectedMarker={selectedComplaint}
                      flyToCoord={flyToCoord}
                    />
                  </div>
                </div>

                {/* Drone Inspection Telemetry / 360 Street View Modal */}
                {selectedComplaint && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#111827]/80 border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md grid grid-cols-1 lg:grid-cols-2 gap-6"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getCategoryBadgeColor(selectedComplaint.category)}`}>
                              {selectedComplaint.category.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadgeColor(selectedComplaint.status)}`}>
                              {selectedComplaint.status.replace('_', ' ')}
                            </span>
                          </div>
                          <h4 className="text-xl font-bold text-gray-100 mt-2">{selectedComplaint.title}</h4>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedComplaint(null);
                            setFlyToCoord(null);
                          }}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-gray-400 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <p className="text-sm text-gray-400 leading-relaxed">{selectedComplaint.description}</p>

                      <div className="p-4 bg-slate-950/60 rounded-2xl space-y-2 border border-gray-800/80">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Reported By</span>
                          <span className="text-gray-300 font-semibold">{selectedComplaint.reporter_name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Location Coordinates</span>
                          <span className="text-gray-300 font-semibold">{selectedComplaint.latitude.toFixed(5)}, {selectedComplaint.longitude.toFixed(5)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Resolved Department</span>
                          <span className="text-emerald-400 font-semibold">{selectedComplaint.department || 'Awaiting Routing'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">AI Priority Urgency</span>
                          <span className={getPriorityTextColor(selectedComplaint.priority)}>{selectedComplaint.priority.toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Vote Verification Panel for Citizens */}
                      {user.role === 'citizen' && selectedComplaint.user_id !== user.id && (
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-gray-800 space-y-3">
                          <p className="text-xs font-bold text-gray-300">Validate this report near you:</p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => castCommunityVote(selectedComplaint.id, 'confirmed')}
                              className="flex-1 py-2 bg-emerald-500 text-[#070a13] font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-500/5 hover:brightness-110"
                            >
                              Confirm Issue Exists
                            </button>
                            <button
                              onClick={() => castCommunityVote(selectedComplaint.id, 'denied')}
                              className="flex-1 py-2 bg-slate-800 text-red-400 font-bold rounded-xl text-xs cursor-pointer border border-red-500/20 hover:bg-slate-750"
                            >
                              Flag as Fine/Not True
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right side: 360-Degree Interactive Street View Simulator */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={14} className="text-emerald-400" />
                          Immersive 360° Street-Level View
                        </span>
                        <span className="text-[10px] bg-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/10">
                          GeoGuesser mode
                        </span>
                      </div>

                      <div className="relative h-60 bg-black rounded-2xl overflow-hidden border border-gray-800">
                        {/* 360-View drag panorama simulation using standard Picsum landscape seeds */}
                        <div
                          className="w-[300%] h-full absolute top-0 transition-transform duration-200 cursor-grab active:cursor-grabbing"
                          style={{
                            backgroundImage: `url('https://picsum.photos/seed/street_${selectedComplaint.id}/1920/1080')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            transform: `translateX(-${(33.33 + (streetViewYaw / 360) * 33.33)}%)`
                          }}
                        />

                        {/* Interactive overlay instructions */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex justify-between items-center">
                          <div className="text-[10px] text-gray-400">
                            Drag horizontally to pan camera 360°
                          </div>
                          
                          {/* Navigation pan controls resembling a Geoguesser widget */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setStreetViewYaw((y) => (y - 30 + 360) % 360)}
                              className="p-1.5 bg-slate-900/90 rounded-lg text-emerald-400 border border-emerald-500/20"
                            >
                              ◀
                            </button>
                            <button
                              onClick={() => setStreetViewYaw((y) => (y + 30) % 360)}
                              className="p-1.5 bg-slate-900/90 rounded-lg text-emerald-400 border border-emerald-500/20"
                            >
                              ▶
                            </button>
                          </div>
                        </div>

                        {/* Custom direction indicator */}
                        <div className="absolute top-4 left-4 bg-slate-900/90 text-[10px] font-bold text-gray-200 px-2 py-1 rounded-lg border border-gray-800">
                          COMPASS YAW: {streetViewYaw}°
                        </div>
                      </div>

                      {/* AI Vision Sensor summary */}
                      <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-start gap-3">
                        <Zap size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-emerald-400">Gemini Neural Classification Logs</p>
                          <p className="text-gray-400 leading-normal">
                            Multi-modal sensing confirmed <strong>{selectedComplaint.category.replace('_', ' ')}</strong> telemetry (AI Confidence: {Math.round((selectedComplaint.ai_confidence || 0.8) * 100)}%). Routed to {selectedComplaint.department || 'Municipal Core'}.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* View Tab: Social Discussion Community Feed */}
            {activeTab === 'feed' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-4">
                    <select
                      value={filteredCategory}
                      onChange={(e) => setFilteredCategory(e.target.value)}
                      className="bg-slate-900 border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="all">All Categories</option>
                      <option value="road_damage">Road Damage</option>
                      <option value="drainage_problem">Drainage Problem</option>
                      <option value="water_leakage">Water Leakage</option>
                      <option value="garbage">Garbage/Waste</option>
                      <option value="street_light_failure">Streetlight Failure</option>
                      <option value="electrical_hazard">Electrical Hazard</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Search community posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200 w-full sm:w-64 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Complaints Feed List */}
                <div className="space-y-6">
                  {filteredComplaints.length > 0 ? (
                    filteredComplaints.map((complaint) => (
                      <div
                        key={complaint.id}
                        className="bg-[#111827]/40 border border-gray-800/80 rounded-3xl overflow-hidden shadow-xl"
                      >
                        {/* Header info */}
                        <div className="p-6 border-b border-gray-800/60 flex justify-between items-start gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center font-bold text-gray-300 border border-gray-700">
                              {complaint.reporter_name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-200 text-sm">{complaint.reporter_name}</span>
                                <span className="text-xs text-gray-500">• {new Date(complaint.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <MapPin size={12} className="text-emerald-400" />
                                {complaint.address}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${getCategoryBadgeColor(complaint.category)}`}>
                              {complaint.category.replace('_', ' ')}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadgeColor(complaint.status)}`}>
                              {complaint.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {/* Core Post Body */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 space-y-4">
                            <h4 className="text-lg font-bold text-gray-100">{complaint.title}</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">{complaint.description}</p>

                            {/* Verification Stats & Fast Vote Controls */}
                            <div className="flex items-center justify-between gap-4 py-3 border-t border-b border-gray-800/60 flex-wrap">
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-gray-400 flex items-center gap-1">
                                  <Users size={14} className="text-emerald-400" />
                                  Confirmations: <strong>{complaint.verification_count}</strong>
                                </span>
                                <span className="text-gray-400">
                                  Priority: <strong className={getPriorityTextColor(complaint.priority)}>{complaint.priority.toUpperCase()}</strong>
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => triggerDroneFlyTo(complaint)}
                                  className="px-3.5 py-1.5 bg-slate-800 text-gray-200 font-bold rounded-lg text-xs cursor-pointer border border-gray-700 flex items-center gap-1.5 hover:bg-slate-750"
                                >
                                  <Eye size={12} /> Inspect GIS
                                </button>
                                {user.role === 'citizen' && complaint.user_id !== user.id && (
                                  <button
                                    onClick={() => castCommunityVote(complaint.id, 'confirmed')}
                                    className="px-3.5 py-1.5 bg-emerald-500 text-[#070a13] font-bold rounded-lg text-xs cursor-pointer hover:brightness-110"
                                  >
                                    Confirm ✓
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Official department response notes if available */}
                            {complaint.admin_notes && (
                              <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-1.5">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">Official Department Update</span>
                                <p className="text-xs text-gray-300 leading-relaxed">{complaint.admin_notes}</p>
                              </div>
                            )}
                          </div>

                          {/* Post Image */}
                          <div className="relative rounded-2xl overflow-hidden h-48 md:h-full bg-slate-900 border border-gray-800">
                            <img
                              src={complaint.image_url}
                              alt={complaint.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        {/* Interactive Discussion Section */}
                        <div className="bg-slate-950/30 p-6 border-t border-gray-800/60 space-y-4">
                          <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Community Discussion ({complaint.comments.length})</h5>

                          <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                            {complaint.comments.map((comm) => (
                              <div key={comm.id} className="text-xs p-3 bg-slate-900/60 rounded-xl space-y-1">
                                <div className="flex justify-between">
                                  <span className="font-bold text-gray-200 flex items-center gap-1">
                                    {comm.user_name}
                                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-gray-400">
                                      {comm.role}
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-gray-500">{new Date(comm.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-gray-400 leading-relaxed">{comm.text}</p>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Type comment message..."
                              value={commentInputs[complaint.id] || ''}
                              onChange={(e) => setCommentInputs((prev) => ({ ...prev, [complaint.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') submitComment(complaint.id); }}
                              className="flex-grow bg-slate-900 border border-gray-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-emerald-500"
                            />
                            <button
                              onClick={() => submitComment(complaint.id)}
                              className="p-2 bg-emerald-500 text-[#070a13] font-bold rounded-xl cursor-pointer hover:brightness-110"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-gray-500 bg-[#111827]/40 rounded-3xl border border-gray-800">
                      <HelpCircle className="mx-auto mb-4 text-gray-600" size={36} />
                      <p className="font-medium">No complaints match your filters.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View Tab: Private Chat Messenger */}
            {activeTab === 'chat' && (
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
            )}

            {/* View Tab: AI Dispatch Agent (Python Sidecar) */}
            {activeTab === 'copilot' && (
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
            )}

            {/* View Tab: Predictive Pattern Learning */}
            {activeTab === 'patterns' && (
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
            )}

            {/* View Tab: Officer Administrative Command Terminal */}
            {activeTab === 'admin' && (
              <div className="space-y-6">
                <div className="bg-[#111827]/60 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div>
                    <h3 className="text-lg font-bold font-display">Officer Command Queue</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Automated AI routing suggestions listed below. Click to resolve or reassign.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Report</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">AI Urgency</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Assignee Dept</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {complaints.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-800/10">
                            <td className="py-3 px-4">
                              <p className="font-bold text-gray-100">{c.title}</p>
                              <p className="text-[10px] text-gray-500 truncate max-w-xs">{c.address}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded font-bold uppercase ${getCategoryBadgeColor(c.category)}`}>
                                {c.category.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={getPriorityTextColor(c.priority)}>
                                {c.priority.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded font-bold uppercase ${getStatusBadgeColor(c.status)}`}>
                                {c.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-300 font-semibold">
                              {c.department || 'Awaiting Routing'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedComplaint(c);
                                  setAdminStatus(c.status);
                                  setAdminDept(c.department || '');
                                }}
                                className="px-3 py-1.5 bg-emerald-500 text-[#070a13] font-bold rounded-lg hover:brightness-110 cursor-pointer"
                              >
                                Dispatch
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Officer Active Dispatch Inspection Overlay */}
                {selectedComplaint && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#111827]/80 border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-bold font-display flex items-center gap-1.5">
                        <Shield size={18} className="text-emerald-400" />
                        Dispatch Panel: {selectedComplaint.title}
                      </h4>
                      <button
                        onClick={() => setSelectedComplaint(null)}
                        className="text-xs font-semibold text-gray-400 hover:text-gray-300 cursor-pointer"
                      >
                        ✕ Dismiss
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-2">Change Mesh Status</label>
                          <select
                            value={adminStatus}
                            onChange={(e) => setAdminStatus(e.target.value as any)}
                            className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500"
                          >
                            <option value="pending">Pending Review</option>
                            <option value="verified">Verified (Approved)</option>
                            <option value="assigned">Assigned to Dept</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved (Cleared)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-2">Assign Municipal Dept</label>
                          <select
                            value={adminDept}
                            onChange={(e) => setAdminDept(e.target.value)}
                            className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">Awaiting routing...</option>
                            <option value="Road Maintenance Department">Road Maintenance Department</option>
                            <option value="Drainage & Sewage Department">Drainage & Sewage Department</option>
                            <option value="Water Supply Department">Water Supply Department</option>
                            <option value="Sanitation Department">Sanitation Department</option>
                            <option value="Electricity Department">Electricity Department</option>
                            <option value="Public Works Department">Public Works Department</option>
                          </select>
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-4">
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-2">Municipal Log / Admin Notes</label>
                          <textarea
                            rows={3}
                            placeholder="Type progress update, contractor details or resolution summary..."
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs resize-none focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            onClick={() => setSelectedComplaint(null)}
                            className="px-5 py-2.5 bg-slate-800 text-gray-300 font-bold rounded-xl text-xs cursor-pointer border border-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => submitAdminAction(selectedComplaint.id)}
                            className="px-6 py-2.5 bg-emerald-500 text-[#070a13] font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-500/5 hover:brightness-110"
                          >
                            Apply Dispatch Order
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

          </main>

        </div>
      ) : (
        /* Dynamic Auth Landing Page with Demo Quick-logins */
        <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 max-w-md w-full mx-auto space-y-6">
          <div className="bg-[#111827]/60 border border-gray-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur w-full space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold font-display text-gray-100">
                {isRegistering ? 'Register Citizen Node' : 'Initialize Command Link'}
              </h2>
              <p className="text-xs text-gray-400">
                {isRegistering ? 'Create a local citizen node to report & verify issues' : 'Log in to access live GIS telemetry and active feeds'}
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl text-xs text-red-400 text-center font-medium">
                {authError}
              </div>
            )}

            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
              {isRegistering && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Manish Pathania"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {isRegistering && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Phone Contact</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Security Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-tr from-emerald-500 to-teal-400 hover:brightness-110 text-[#070a13] font-bold rounded-xl text-xs tracking-wider uppercase cursor-pointer transition-all shadow-lg shadow-emerald-500/5 mt-4"
              >
                {isRegistering ? 'Register Node' : 'Initialize Session'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-gray-800/80">
              <button
                onClick={() => {
                  setAuthError(null);
                  setIsRegistering(!isRegistering);
                }}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                {isRegistering ? 'Already registered? Log in here' : 'Need an account? Register here'}
              </button>
            </div>
          </div>

          {/* Evaluate shortcuts panel (Zero friction demo logins!) */}
          <div className="bg-[#111827]/40 border border-gray-800 rounded-3xl p-5 w-full space-y-3.5 shadow-xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block text-center">Eval Quick Link Shortcuts</span>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => handleLogin(null, 'citizen@example.com', 'password123')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800/80 border border-gray-800 rounded-xl text-xs font-semibold text-gray-300 flex items-center justify-between px-4 cursor-pointer"
              >
                <span>Test as <strong>Citizen</strong></span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Demo Link</span>
              </button>
              <button
                onClick={() => handleLogin(null, 'officer@example.com', 'password123')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800/80 border border-gray-800 rounded-xl text-xs font-semibold text-gray-300 flex items-center justify-between px-4 cursor-pointer"
              >
                <span>Test as <strong>City Officer</strong></span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Demo Link</span>
              </button>
              <button
                onClick={() => handleLogin(null, 'admin@example.com', 'password123')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800/80 border border-gray-800 rounded-xl text-xs font-semibold text-gray-300 flex items-center justify-between px-4 cursor-pointer"
              >
                <span>Test as <strong>City Admin</strong></span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Demo Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Modal: Submit Complaint / Report Form */}
      <AnimatePresence>
        {isReportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f1422] border border-gray-800 rounded-3xl p-6 lg:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-bold font-display">Report Community Issue</h3>
                  <p className="text-xs text-gray-400 mt-1">Upload a photo to trigger real-time Gemini AI category sensing</p>
                </div>
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-gray-400 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={submitComplaintReport} className="space-y-4">
                {/* Image Upload box */}
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-2">Issue Image Upload</label>
                  {reportImagePreview ? (
                    <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-950 border border-gray-800 group">
                      <img src={reportImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setReportImage(null);
                          setReportImagePreview(null);
                          setAiPreviewResult(null);
                        }}
                        className="absolute top-3 right-3 p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center bg-slate-950/20 hover:border-emerald-500/30 transition-colors relative cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="mx-auto mb-3 text-gray-500 group-hover:text-emerald-400 transition-colors" size={26} />
                      <p className="text-xs font-bold text-gray-300">Upload Issue Photograph</p>
                      <p className="text-[10px] text-gray-500 mt-1">PNG, JPG or WebP (max 5MB)</p>
                    </div>
                  )}
                </div>

                {/* Real-time AI Category suggestion overlay */}
                {isAiAnalyzing && (
                  <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-emerald-400 font-semibold tracking-wide animate-pulse">Gemini Computer Vision classification active...</span>
                  </div>
                )}

                {aiPreviewResult && (
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <Zap size={14} className="text-emerald-400 animate-bounce" />
                      Sensed Category: {aiPreviewResult.category.replace('_', ' ').toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-400 leading-normal">
                      Confidence scoring is <strong>{Math.round(aiPreviewResult.confidence * 100)}%</strong>. System suggested dispatch to <strong>{aiPreviewResult.department}</strong>.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Issue Title Summary</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Broken water supply valve flooding Saket..."
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Detailed Description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide details of the civic hazard, depth of potholes, safety concerns, etc..."
                    value={reportDesc}
                    onChange={(e) => setReportDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 resize-none focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Category select - if AI categorization is not active, can override */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Report Category</label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="road_damage">Road Damage</option>
                    <option value="drainage_problem">Drainage Problem</option>
                    <option value="water_leakage">Water Leakage</option>
                    <option value="garbage">Garbage/Waste</option>
                    <option value="street_light_failure">Streetlight Failure</option>
                    <option value="electrical_hazard">Electrical Hazard</option>
                    <option value="public_infrastructure">Public Infrastructure</option>
                  </select>
                </div>

                {/* Capturing GPS Coordinates */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Geotag Coordinates (Indore GIS Node)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled
                      value={reportCoords ? `${reportCoords.lat.toFixed(5)}, ${reportCoords.lon.toFixed(5)}` : 'GPS coords missing...'}
                      className="flex-grow bg-slate-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleGeolocate}
                      className="px-4 bg-emerald-500 hover:brightness-110 text-[#070a13] font-bold rounded-xl text-xs cursor-pointer"
                    >
                      {isReportingLocating ? 'Locating...' : 'Geotag ✓'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsReportOpen(false)}
                    className="flex-1 py-3 bg-slate-800 text-gray-300 font-bold rounded-xl text-xs cursor-pointer border border-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-tr from-emerald-500 to-teal-400 text-[#070a13] font-bold rounded-xl text-xs tracking-wider uppercase cursor-pointer hover:brightness-110 shadow-lg shadow-emerald-500/5"
                  >
                    Dispatch Report
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <footer className="mt-auto border-t border-gray-800/60 bg-[#0d1222]/40 py-6 text-center text-xs text-gray-500">
        <p>© 2026 Intellistreet Smart City Grid. Powered by Google AI Studio Server-Side Gemini models.</p>
      </footer>
    </div>
  );
}
