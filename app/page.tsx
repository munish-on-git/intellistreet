'use client';
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, @next/next/no-img-element, react-hooks/rules-of-hooks, react/no-unescaped-entities, @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin, Clock, Users, Zap, Shield, Send, MessageSquare, PlusCircle,
  LogOut, User as UserIcon, CheckCircle, BarChart3, HelpCircle,
  TrendingUp, Award, RotateCcw, AlertTriangle, ArrowRight, Eye, Upload, Sparkles, Navigation,
  Trash2, Star
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

function compressImage(file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
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
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'feed' | 'chat' | 'admin' | 'copilot' | 'patterns' | 'garbage'>('home');

  // Swachh Connect Garbage Pickup States
  const [activePortal, setActivePortal] = useState<'citizen' | 'admin' | 'zonal' | 'area'>('citizen');
  const [pickups, setPickups] = useState<any[]>([]);
  const [isPickupsLoading, setIsPickupsLoading] = useState(false);
  const [newPickupCategory, setNewPickupCategory] = useState('dry');
  const [newPickupImage, setNewPickupImage] = useState<File | null>(null);
  const [newPickupImagePreview, setNewPickupImagePreview] = useState<string | null>(null);
  const [triggerAiClassification, setTriggerAiClassification] = useState(false);
  const [aiClassificationResult, setAiClassificationResult] = useState<any | null>(null);
  const [isAiClassificationLoading, setIsAiClassificationLoading] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number, lon: number }>({ lat: 22.7196, lon: 75.8577 });
  const [pickupCoordsManual, setPickupCoordsManual] = useState('22.7196, 75.8577');

  // Interactive states for assignments
  const [adminAssigneeMap, setAdminAssigneeMap] = useState<Record<string, string>>({});
  const [zonalCrewMap, setZonalCrewMap] = useState<Record<string, string>>({});
  const [zonalEtaMap, setZonalEtaMap] = useState<Record<string, string>>({});
  const [areaOtpInputs, setAreaOtpInputs] = useState<Record<string, string>>({});
  const [areaProofImages, setAreaProofImages] = useState<Record<string, File | null>>({});
  const [areaProofPreviews, setAreaProofPreviews] = useState<Record<string, string | null>>({});
  const [selectedSimCrew, setSelectedSimCrew] = useState<string>('area_1');

  // Rating and reviews states
  const [citizenRatingMap, setCitizenRatingMap] = useState<Record<string, number>>({});
  const [citizenReviewMap, setCitizenReviewMap] = useState<Record<string, string>>({});

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

  async function fetchPickups() {
    setIsPickupsLoading(true);
    try {
      const res = await fetch('/api/pickups');
      if (res.ok) {
        const data = await res.json();
        setPickups(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load pickups:', err);
    } finally {
      setIsPickupsLoading(false);
    }
  }

  async function handleCreatePickup(e: any) {
    e.preventDefault();
    if (!user) return;
    setIsAiClassificationLoading(true);
    setAiClassificationResult(null);

    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('category', newPickupCategory);
      formData.append('latitude', pickupCoords.lat.toString());
      formData.append('longitude', pickupCoords.lon.toString());
      if (newPickupImage) {
        formData.append('image', newPickupImage);
      }
      formData.append('trigger_ai', triggerAiClassification ? 'true' : 'false');

      const res = await fetch('/api/pickups', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ai) {
          setAiClassificationResult(data.ai);
        }
        // Reset request states
        setNewPickupImage(null);
        setNewPickupImagePreview(null);
        fetchPickups();
      } else {
        let errorMsg = 'Failed to submit pickup request';
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch {
          try {
            const text = await res.text();
            if (text.includes('413') || text.toLowerCase().includes('payload too large') || text.toLowerCase().includes('too large')) {
              errorMsg = 'Image file is too large. Please upload an image smaller than 1MB.';
            } else {
              errorMsg = `Server error: ${res.status}`;
            }
          } catch {}
        }
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error('Error submitting pickup:', err);
      alert('Error: ' + (err.message || 'Failed to submit pickup request'));
    } finally {
      setIsAiClassificationLoading(false);
    }
  }

  async function handleAssignZonal(pickupId: string, officerId: string, officerName: string) {
    try {
      const res = await fetch(`/api/pickups/${pickupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_zonal',
          zonal_officer_id: officerId,
          zonal_officer_name: officerName
        })
      });
      if (res.ok) {
        fetchPickups();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to assign zonal officer');
      }
    } catch (err) {
      console.error('Error assigning zonal officer:', err);
    }
  }

  async function handleDispatchCrew(pickupId: string, crewId: string, crewName: string, eta: string) {
    try {
      const res = await fetch(`/api/pickups/${pickupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch',
          area_man_id: crewId,
          area_man_name: crewName,
          pickup_eta: eta || 'Today 4:00 PM'
        })
      });
      if (res.ok) {
        fetchPickups();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to dispatch crew');
      }
    } catch (err) {
      console.error('Error dispatching crew:', err);
    }
  }

  async function handleCompletePickup(pickupId: string, otp: string, proofImageFile: File | null) {
    try {
      const proofUrl = proofImageFile 
        ? 'https://picsum.photos/seed/collectedproof/800/600' 
        : 'https://picsum.photos/seed/collected/800/600';

      const res = await fetch(`/api/pickups/${pickupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'collect',
          otp,
          photo_proof_url: proofUrl
        })
      });

      if (res.ok) {
        setAreaOtpInputs(prev => {
          const next = { ...prev };
          delete next[pickupId];
          return next;
        });
        setAreaProofImages(prev => {
          const next = { ...prev };
          delete next[pickupId];
          return next;
        });
        setAreaProofPreviews(prev => {
          const next = { ...prev };
          delete next[pickupId];
          return next;
        });
        fetchPickups();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete collection. Please verify the code.');
      }
    } catch (err) {
      console.error('Error completing collection:', err);
    }
  }

  async function handleSubmitReview(pickupId: string, rating: number, text: string) {
    try {
      const res = await fetch(`/api/pickups/${pickupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          rating,
          review_text: text
        })
      });
      if (res.ok) {
        setCitizenRatingMap(prev => {
          const next = { ...prev };
          delete next[pickupId];
          return next;
        });
        setCitizenReviewMap(prev => {
          const next = { ...prev };
          delete next[pickupId];
          return next;
        });
        fetchPickups();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
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
    fetchPickups();
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

  // Synchronize active Swachh Connect portal with the logged-in user's role
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setActivePortal('admin');
      } else if (user.role === 'officer') {
        setActivePortal('zonal');
      } else {
        setActivePortal('citizen');
      }
    }
  }, [user]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setReportImage(compressed);
        const reader = new FileReader();
        reader.onloadend = () => {
          setReportImagePreview(reader.result as string);
        };
        reader.readAsDataURL(compressed);

        // Trigger AI Analysis real-time categorizer preview!
        triggerAiCategorizerPreview(compressed);
      } catch (err) {
        console.error('Image compression failed, using original:', err);
        setReportImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setReportImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        triggerAiCategorizerPreview(file);
      }
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
                { id: 'garbage', label: 'Swachh Connect', icon: <Trash2 size={18} className="text-lime-400" /> },
                ...(user.role === 'officer' || user.role === 'admin'
                  ? [{ id: 'admin', label: 'Officer Terminal', icon: <Shield size={18} /> }]
                  : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id !== 'map') {
                      setSelectedComplaint(null);
                      setFlyToCoord(null);
                    }
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
                  setSelectedComplaint(null);
                  setFlyToCoord(null);
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

                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined' && (window as any).inspectTelemetry) {
                            (window as any).inspectTelemetry(selectedComplaint.id);
                          }
                        }}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-[#070a13] font-extrabold rounded-2xl text-xs cursor-pointer shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.99] flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Sparkles size={14} /> Inspect Live Satellite Telemetry
                      </button>

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
                            onClick={() => {
                              const complaint = selectedComplaint;
                              setActiveTab('map');
                              setSelectedComplaint(complaint);
                              setFlyToCoord({ latitude: complaint.latitude, longitude: complaint.longitude });
                              setTimeout(() => {
                                if (typeof window !== 'undefined' && (window as any).inspectTelemetry) {
                                  (window as any).inspectTelemetry(complaint.id);
                                }
                              }, 600);
                            }}
                            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 hover:brightness-110 text-white font-extrabold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all"
                          >
                            <Sparkles size={13} /> Inspect GIS Telemetry
                          </button>
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

            {/* View Tab: Swachh Connect Garbage pickup loop */}
            {activeTab === 'garbage' && (
              <div className="space-y-6">
                {/* Portal switcher row */}
                <div className="bg-[#111827]/60 border border-gray-800/80 rounded-3xl p-4 shadow-xl flex flex-wrap gap-2 items-center justify-between backdrop-blur">
                  <div className="space-y-0.5">
                    <h3 className="text-md font-bold font-display text-gray-100 flex items-center gap-2">
                      <Trash2 className="text-lime-400 animate-bounce" size={20} />
                      Swachh Connect Portal
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      {user?.role === 'citizen' && "Access your personalized citizen waste collection dashboard."}
                      {user?.role === 'admin' && "Master administration panel for Indore Municipal Corporation."}
                      {user?.role === 'officer' && "Official municipal officer dispatch and field work verification."}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-gray-800/60">
                    {[
                      { id: 'citizen', label: '👤 Citizen App', desc: 'New requests & OTP codes', roles: ['citizen'] },
                      { id: 'admin', label: '🏛 Admin Dashboard', desc: 'Review & Zonal assign', roles: ['admin'] },
                      { id: 'zonal', label: '📍 Zonal Officer', desc: 'Dispatch local crew', roles: ['officer'] },
                      { id: 'area', label: '🚛 Area Crew', desc: 'Verify OTP & Complete', roles: ['officer'] }
                    ].filter(portal => portal.roles.includes(user?.role || 'citizen')).map((portal) => (
                      <button
                        key={portal.id}
                        type="button"
                        onClick={() => setActivePortal(portal.id as any)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                          activePortal === portal.id
                            ? 'bg-gradient-to-r from-lime-500 to-emerald-500 text-[#070a13] shadow-md'
                            : 'text-gray-300 hover:bg-slate-800/50'
                        }`}
                      >
                        {portal.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CITIZEN PORTAL */}
                {activePortal === 'citizen' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Citizen input form */}
                    <div className="lg:col-span-7 bg-[#111827]/60 border border-gray-800/80 rounded-3xl p-6 shadow-xl space-y-6 backdrop-blur">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-lime-400">Submit Pickup Request</h4>
                        <p className="text-xs text-gray-400">Schedule door-to-door collection with Indore Municipal Corporation.</p>
                      </div>

                      <form onSubmit={handleCreatePickup} className="space-y-5">
                        {/* Categories selection */}
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Select Waste Category</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              { id: 'dry', label: 'Dry Waste', color: 'border-blue-500/30 text-blue-400 bg-blue-500/5', desc: 'Plastics, papers' },
                              { id: 'wet', label: 'Wet Waste', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5', desc: 'Kitchen leftovers' },
                              { id: 'electronics', label: 'Electrical/E-waste', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5', desc: 'Cords, devices' },
                              { id: 'medical', label: 'Medical Waste', color: 'border-red-500/30 text-red-400 bg-red-500/5', desc: 'Syringes, medicine' },
                              { id: 'tin_metal', label: 'Tin & Metal', color: 'border-orange-500/30 text-orange-400 bg-orange-500/5', desc: 'Screws, tin cans' },
                              { id: 'construction', label: 'Solid/Construction', color: 'border-gray-500/30 text-gray-400 bg-gray-500/5', desc: 'Cement, bricks' },
                              { id: 'hazardous', label: 'Hazardous Waste', color: 'border-red-600/30 text-red-500 bg-red-600/5', desc: 'Paints, batteries' },
                              { id: 'organic', label: 'Garden Waste', color: 'border-green-600/30 text-green-400 bg-green-600/5', desc: 'Dry leaves, grass' },
                              { id: 'textile', label: 'Textile Waste', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5', desc: 'Fabrics, clothes' },
                              { id: 'glass', label: 'Glass Waste', color: 'border-pink-500/30 text-pink-400 bg-pink-500/5', desc: 'Bottles, jars' },
                              { id: 'sanitary', label: 'Sanitary Waste', color: 'border-teal-500/30 text-teal-400 bg-teal-500/5', desc: 'Diapers, hygiene' }
                            ].map((cat) => (
                              <button
                                type="button"
                                key={cat.id}
                                onClick={() => setNewPickupCategory(cat.id)}
                                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer h-20 ${
                                  newPickupCategory === cat.id
                                    ? 'border-lime-500 ring-2 ring-lime-500/20 bg-lime-500/10'
                                    : 'border-gray-800 bg-slate-900/50 hover:border-gray-700'
                                }`}
                              >
                                <span className="text-xs font-bold leading-tight">{cat.label}</span>
                                <span className="text-[9px] text-gray-400 line-clamp-1">{cat.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Image Upload helper */}
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Upload Trash Image</label>
                          <div className="border border-dashed border-gray-800 hover:border-gray-700 bg-slate-900/30 rounded-xl p-4 flex flex-col items-center justify-center relative cursor-pointer min-h-[120px]">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0] || null;
                                if (file) {
                                  try {
                                    const compressed = await compressImage(file);
                                    setNewPickupImage(compressed);
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setNewPickupImagePreview(reader.result as string);
                                    };
                                    reader.readAsDataURL(compressed);
                                  } catch (err) {
                                    console.error('Image compression failed, using original:', err);
                                    setNewPickupImage(file);
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setNewPickupImagePreview(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                } else {
                                  setNewPickupImage(null);
                                  setNewPickupImagePreview(null);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            {newPickupImagePreview ? (
                              <div className="flex items-center gap-4 w-full">
                                <img
                                  src={newPickupImagePreview}
                                  alt="Preview"
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-800"
                                />
                                <div className="space-y-0.5 text-left">
                                  <p className="text-xs font-semibold text-gray-200 line-clamp-1">{newPickupImage?.name}</p>
                                  <p className="text-[10px] text-gray-500">{(newPickupImage!.size / 1024).toFixed(1)} KB</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewPickupImage(null);
                                      setNewPickupImagePreview(null);
                                    }}
                                    className="text-[10px] text-red-400 hover:underline cursor-pointer"
                                  >
                                    Remove photo
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center space-y-1.5 pointer-events-none">
                                <Upload className="mx-auto text-gray-500" size={24} />
                                <p className="text-xs text-gray-300 font-medium">Click or Drag & Drop photo</p>
                                <p className="text-[10px] text-gray-500">Provide photo for instant Gemini AI smart classification.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* AI Smart Assist Toggle */}
                        {newPickupImage && (
                          <div className="bg-lime-500/5 border border-lime-500/20 rounded-xl p-3 flex items-start gap-3">
                            <input
                              type="checkbox"
                              id="triggerAiClassification"
                              checked={triggerAiClassification}
                              onChange={(e) => setTriggerAiClassification(e.target.checked)}
                              className="mt-1 cursor-pointer accent-lime-500"
                            />
                            <label htmlFor="triggerAiClassification" className="text-xs space-y-0.5 cursor-pointer text-gray-300">
                              <span className="font-bold flex items-center gap-1.5 text-lime-400">
                                <Sparkles size={14} />
                                Enable Gemini AI Smart Assistant
                              </span>
                              <span className="block text-[10px] text-gray-400 leading-normal">
                                Confused about waste classification? Gemini will examine your photo to auto-detect the optimal waste bin category, assign priority level, and suggest local disposal guidelines.
                              </span>
                            </label>
                          </div>
                        )}

                        {/* Location picker */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">GPS Coordinates</label>
                            <input
                              type="text"
                              value={pickupCoordsManual}
                              onChange={(e) => {
                                setPickupCoordsManual(e.target.value);
                                const parts = e.target.value.split(',');
                                if (parts.length === 2) {
                                  const lat = parseFloat(parts[0]);
                                  const lon = parseFloat(parts[1]);
                                  if (!isNaN(lat) && !isNaN(lon)) {
                                    setPickupCoords({ lat, lon });
                                  }
                                }
                              }}
                              placeholder="22.7196, 75.8577"
                              className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-lime-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Collection Area</label>
                            <button
                              type="button"
                              onClick={() => {
                                // Rotate coordinate slightly around Indore centers
                                const idx = Math.floor(Math.random() * 3);
                                const locales = [
                                  { lat: 22.7533, lon: 75.8937, label: 'Vijay Nagar' },
                                  { lat: 22.7196, lon: 75.8577, label: 'Rajwada Palace' },
                                  { lat: 22.7301, lon: 75.8845, label: 'Saket Nagar' }
                                ];
                                const loc = locales[idx];
                                setPickupCoords({ lat: loc.lat, lon: loc.lon });
                                setPickupCoordsManual(`${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`);
                              }}
                              className="w-full h-[38px] bg-slate-900 border border-gray-800 rounded-xl text-xs font-semibold hover:border-gray-700 flex items-center justify-center gap-1 text-gray-300 cursor-pointer"
                            >
                              <MapPin size={14} className="text-lime-500" />
                              Cycle Indore Locales
                            </button>
                          </div>
                        </div>

                        {/* Submit Request Button */}
                        <button
                          type="submit"
                          disabled={isAiClassificationLoading}
                          className="w-full py-3.5 bg-gradient-to-r from-lime-500 to-emerald-500 hover:brightness-110 text-slate-950 font-bold rounded-xl text-xs tracking-wider uppercase cursor-pointer transition-all shadow-lg shadow-lime-500/10 flex items-center justify-center gap-2"
                        >
                          {isAiClassificationLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                              <span>AI Analyzing & Creating pickup...</span>
                            </>
                          ) : (
                            <>
                              <PlusCircle size={16} />
                              <span>Submit Collection Request</span>
                            </>
                          )}
                        </button>
                      </form>

                      {/* AI Classification report card */}
                      {aiClassificationResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-3 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <Sparkles size={14} className="animate-spin" />
                              Gemini Real-time AI Analysis Report
                            </span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                              Analyzed Successfully
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-gray-500 font-bold uppercase block">Auto Classified Category</span>
                              <span className="font-bold text-gray-200 capitalize">{aiClassificationResult.category}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-gray-500 font-bold uppercase block">Risk Assessment Priority</span>
                              <span className="font-bold text-red-400 block capitalize">{aiClassificationResult.priority}</span>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-gray-300">
                            <span className="text-[10px] text-gray-500 font-bold uppercase block">Classification Reasoning</span>
                            <p className="leading-relaxed">{aiClassificationResult.explanation}</p>
                          </div>

                          {aiClassificationResult.handlingTip && (
                            <div className="bg-[#111827]/60 rounded-xl p-3 text-xs border border-emerald-500/10 space-y-0.5">
                              <span className="text-[10px] text-emerald-400 font-bold uppercase block">Civic Safety Instruction</span>
                              <p className="text-gray-400">{aiClassificationResult.handlingTip}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* My request history & OTPs */}
                    <div className="lg:col-span-5 bg-[#111827]/60 border border-gray-800/80 rounded-3xl p-6 shadow-xl space-y-6 backdrop-blur flex flex-col h-[600px] overflow-hidden">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                          {user?.role === 'admin' ? 'All Active Pickups History' : 'My Pickups History'}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {user?.role === 'admin' ? 'Track all city-wide door-to-door assignments and security keys.' : 'Track your personal door-to-door assignments and security keys.'}
                        </p>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                        {isPickupsLoading ? (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <div className="w-6 h-6 border-2 border-lime-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span className="text-xs">Syncing city pickups...</span>
                          </div>
                        ) : (user?.role === 'admin' ? pickups : pickups.filter(p => p.user_id === user?.id)).length === 0 ? (
                          <div className="text-center py-12 text-gray-500 text-xs">
                            {user?.role === 'admin' ? 'No city-wide garbage pickup requests registered.' : 'You have no registered garbage pickup requests.'}
                          </div>
                        ) : (
                          (user?.role === 'admin' ? pickups : pickups.filter(p => p.user_id === user?.id)).map((p) => (
                            <div key={p.id} className="bg-slate-900/50 border border-gray-800/80 rounded-2xl p-4 space-y-3 shadow text-left">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono font-bold text-gray-400">SC-{p.id.replace('SC-', '')}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                                  p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                  p.status === 'zonal_assigned' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                  p.status === 'dispatched' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {p.status.replace('_', ' ')}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-[9px] text-gray-500 font-bold block uppercase">Category</span>
                                  <span className="font-semibold text-gray-300 capitalize">{p.category}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-gray-500 font-bold block uppercase">Priority</span>
                                  <span className={`font-semibold capitalize ${
                                    p.priority === 'high' || p.priority === 'critical' ? 'text-red-400' : 'text-gray-300'
                                  }`}>{p.priority}</span>
                                </div>
                              </div>

                              <div className="text-xs space-y-0.5">
                                <span className="text-[9px] text-gray-500 font-bold block uppercase">Address</span>
                                <p className="text-gray-400 line-clamp-2 text-[11px] leading-tight">{p.address}</p>
                              </div>

                              {p.pickup_eta && p.status !== 'completed' && (
                                <div className="text-xs bg-[#111827]/40 p-2 rounded-lg border border-gray-800 flex items-center justify-between text-gray-300 font-semibold text-[11px]">
                                  <span className="text-gray-500 uppercase text-[9px]">Arrival Window</span>
                                  <span className="text-purple-400">{p.pickup_eta}</span>
                                </div>
                              )}

                              {/* Security OTP key block - visible only to owner citizen, admin, or assigned area collector crew */}
                              {p.status !== 'completed' && (
                                user?.role === 'admin' ||
                                user?.id === p.user_id ||
                                (p.area_man_name && user?.name === p.area_man_name) ||
                                (p.area_man_id && user?.id === p.area_man_id)
                              ) && (
                                <div className="bg-lime-500/5 border border-lime-500/10 rounded-xl p-3 text-center space-y-1">
                                  <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block">Security Verification Code</span>
                                  <div className="font-mono text-lg font-bold tracking-widest text-lime-400 bg-slate-900/80 inline-block px-4 py-1.5 rounded-lg border border-lime-500/10">
                                    {p.otp}
                                  </div>
                                  <p className="text-[9px] text-gray-500 leading-normal px-2">
                                    Provide this 4-digit code to the collection worker when they arrive at your door.
                                  </p>
                                </div>
                              )}

                              {/* Completed Proof details */}
                              {p.status === 'completed' && p.photo_proof_url && (
                                <div className="bg-[#111827]/50 rounded-xl p-2 border border-gray-800 flex items-center gap-3">
                                  <img
                                    src={p.photo_proof_url}
                                    alt="Proof"
                                    className="w-12 h-12 rounded object-cover border border-gray-800"
                                  />
                                  <div className="text-left">
                                    <span className="text-[9px] uppercase font-bold text-gray-500 block">Collection Proof</span>
                                    <span className="text-[10px] text-emerald-400 font-semibold block flex items-center gap-1">
                                      <CheckCircle size={10} /> Verified Collected
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Rating & Review module */}
                              {p.status === 'completed' && !p.rating && (
                                <div className="bg-[#111827]/40 border border-gray-800 rounded-xl p-3 space-y-2.5">
                                  <span className="text-[9px] uppercase font-bold tracking-wider text-lime-400 block">Submit Service Feedback</span>
                                  
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        type="button"
                                        key={star}
                                        onClick={() => setCitizenRatingMap(prev => ({ ...prev, [p.id]: star }))}
                                        className="text-gray-500 hover:text-yellow-400 transition-colors cursor-pointer"
                                      >
                                        <Star
                                          size={16}
                                          fill={(citizenRatingMap[p.id] || 0) >= star ? '#FBBF24' : 'none'}
                                          className={(citizenRatingMap[p.id] || 0) >= star ? 'text-yellow-400' : 'text-gray-500'}
                                        />
                                      </button>
                                    ))}
                                  </div>

                                  <input
                                    type="text"
                                    placeholder="Write comments..."
                                    value={citizenReviewMap[p.id] || ''}
                                    onChange={(e) => setCitizenReviewMap(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    className="w-full bg-slate-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-lime-500"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleSubmitReview(p.id, citizenRatingMap[p.id] || 5, citizenReviewMap[p.id] || 'Collected on time')}
                                    className="w-full py-1.5 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded-lg text-[10px] uppercase tracking-wide cursor-pointer transition-all"
                                  >
                                    Submit Feedback
                                  </button>
                                </div>
                              )}

                              {/* Rating already complete */}
                              {p.status === 'completed' && p.rating && (
                                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-gray-800/80 text-left text-xs space-y-1">
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        size={10}
                                        fill={star <= p.rating ? '#FBBF24' : 'none'}
                                        className={star <= p.rating ? 'text-yellow-400' : 'text-gray-700'}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-gray-400 italic text-[11px]">"{p.review_text}"</p>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ADMIN PORTAL */}
                {activePortal === 'admin' && (
                  <div className="space-y-6 text-left">
                    {/* Admin Dashboard statistics row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-900/60 border border-gray-800 rounded-2xl p-4 space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-gray-500 block">Total Requests</span>
                        <div className="text-2xl font-bold font-display text-gray-100">{pickups.length}</div>
                      </div>
                      <div className="bg-slate-900/60 border border-gray-800 rounded-2xl p-4 space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-yellow-500 block">Pending Assign</span>
                        <div className="text-2xl font-bold font-display text-yellow-500">
                          {pickups.filter(p => p.status === 'pending').length}
                        </div>
                      </div>
                      <div className="bg-slate-900/60 border border-gray-800 rounded-2xl p-4 space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-purple-400 block">Dispatched Crews</span>
                        <div className="text-2xl font-bold font-display text-purple-400">
                          {pickups.filter(p => p.status === 'dispatched').length}
                        </div>
                      </div>
                      <div className="bg-slate-900/60 border border-gray-800 rounded-2xl p-4 space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-emerald-400 block">Completed</span>
                        <div className="text-2xl font-bold font-display text-emerald-400">
                          {pickups.filter(p => p.status === 'completed').length}
                        </div>
                      </div>
                    </div>

                    {/* Admin management panel card */}
                    <div className="bg-[#111827]/60 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
                      <div>
                        <h4 className="text-md font-bold font-display">Municipal Request Intake</h4>
                        <p className="text-xs text-gray-400 mt-0.5">Approve requests and assign zonal officers to coordinate area dispatches.</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs text-left">
                          <thead>
                            <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-3 px-4">Request ID</th>
                              <th className="py-3 px-4">Reporter</th>
                              <th className="py-3 px-4">Waste Category</th>
                              <th className="py-3 px-4">Indore Area</th>
                              <th className="py-3 px-4">Priority</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Zonal Coordinator</th>
                              <th className="py-3 px-4 text-right">Escalation Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/60 text-gray-300">
                            {pickups.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-900/30">
                                <td className="py-4 px-4 font-mono font-bold text-gray-400">{p.id}</td>
                                <td className="py-4 px-4">
                                  <div className="font-semibold">{p.reporter_name}</div>
                                  <div className="text-[10px] text-gray-500">{p.reporter_phone}</div>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-gray-700 capitalize font-medium text-gray-300 text-[11px]">
                                    {p.category}
                                  </span>
                                </td>
                                <td className="py-4 px-4 font-medium text-gray-400 max-w-[150px] truncate">{p.address}</td>
                                <td className="py-4 px-4">
                                  <span className={`font-semibold capitalize ${
                                    p.priority === 'critical' || p.priority === 'high' ? 'text-red-400' : 'text-gray-400'
                                  }`}>{p.priority}</span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                                    p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                    p.status === 'zonal_assigned' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                    p.status === 'dispatched' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {p.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-gray-300">
                                  {p.zonal_officer_name ? (
                                    <span className="font-semibold text-cyan-400 flex items-center gap-1">
                                      <CheckCircle size={12} /> {p.zonal_officer_name}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 italic">Unassigned</span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-right">
                                  {p.status === 'pending' ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <select
                                        value={adminAssigneeMap[p.id] || ''}
                                        onChange={(e) => setAdminAssigneeMap(prev => ({ ...prev, [p.id]: e.target.value }))}
                                        className="bg-slate-900 border border-gray-800 rounded-lg p-1.5 text-xs text-gray-200"
                                      >
                                        <option value="">Choose Zonal Officer...</option>
                                        <option value="user_2:Officer Rajesh Kumar">Officer Rajesh Kumar</option>
                                        <option value="zonal_2:Zonal Leader Sunita Rao">Sunita Rao (Vijay Nagar)</option>
                                      </select>
                                      <button
                                        type="button"
                                        disabled={!adminAssigneeMap[p.id]}
                                        onClick={() => {
                                          const raw = adminAssigneeMap[p.id];
                                          if (!raw) return;
                                          const [id, name] = raw.split(':');
                                          handleAssignZonal(p.id, id, name);
                                        }}
                                        className="px-3 py-1.5 bg-lime-500 hover:bg-lime-400 text-[#070a13] font-bold rounded-lg text-[10px] uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                      >
                                        Assign & Escalate
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Assigned</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {pickups.length === 0 && (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-gray-500">
                                  No active garbage collection requests registered.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ZONAL OFFICER PORTAL */}
                {activePortal === 'zonal' && (() => {
                  const zonalFilteredPickups = user?.role === 'admin'
                    ? pickups.filter(p => p.status !== 'pending')
                    : pickups.filter(p => p.status !== 'pending' && p.zonal_officer_id === user?.id);
                  return (
                    <div className="space-y-6 text-left">
                      {/* Zonal KPIs */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-900/60 border border-gray-800 rounded-2xl p-4 space-y-1.5">
                          <span className="text-[9px] uppercase font-bold text-gray-500 block">Zone Assigned tasks</span>
                          <div className="text-2xl font-bold font-display text-gray-100">
                            {zonalFilteredPickups.length}
                          </div>
                        </div>
                        <div className="bg-slate-900/60 border border-gray-800 rounded-2xl p-4 space-y-1.5">
                          <span className="text-[9px] uppercase font-bold text-cyan-400 block">Needs Crew Dispatch</span>
                          <div className="text-2xl font-bold font-display text-cyan-400">
                            {zonalFilteredPickups.filter(p => p.status === 'zonal_assigned').length}
                          </div>
                        </div>
                        <div className="bg-slate-900/60 border border-gray-800 rounded-2xl p-4 space-y-1.5">
                          <span className="text-[9px] uppercase font-bold text-emerald-400 block">Completed Today</span>
                          <div className="text-2xl font-bold font-display text-emerald-400">
                            {zonalFilteredPickups.filter(p => p.status === 'completed').length}
                          </div>
                        </div>
                      </div>

                      {/* Zonal assignments table */}
                      <div className="bg-[#111827]/60 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
                        <div>
                          <h4 className="text-md font-bold font-display">Zonal Command Dispatch</h4>
                          <p className="text-xs text-gray-400 mt-0.5">Deploy area collection crews and specify pickup arrival windows for citizens.</p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs text-left">
                            <thead>
                              <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-4">Request ID</th>
                                <th className="py-3 px-4">Citizen</th>
                                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4">GPS Position</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Assigned Crew</th>
                                <th className="py-3 px-4">Estimated ETA</th>
                                <th className="py-3 px-4 text-right">Dispatch Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/60 text-gray-300">
                              {zonalFilteredPickups.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-900/30">
                                  <td className="py-4 px-4 font-mono font-bold text-gray-400">{p.id}</td>
                                  <td className="py-4 px-4 font-semibold">{p.reporter_name}</td>
                                  <td className="py-4 px-4 capitalize">{p.category}</td>
                                  <td className="py-4 px-4 font-mono text-[11px] text-gray-400">{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</td>
                                  <td className="py-4 px-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                                      p.status === 'zonal_assigned' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                      p.status === 'dispatched' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    }`}>
                                      {p.status.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 font-semibold text-purple-400">
                                    {p.area_man_name || <span className="text-gray-500 italic">None</span>}
                                  </td>
                                  <td className="py-4 px-4 text-gray-300">{p.pickup_eta || <span className="text-gray-500">Awaiting dispatch</span>}</td>
                                  <td className="py-4 px-4 text-right">
                                    {p.status === 'zonal_assigned' ? (
                                      <div className="flex items-center justify-end gap-2">
                                        <select
                                          value={zonalCrewMap[p.id] || ''}
                                          onChange={(e) => setZonalCrewMap(prev => ({ ...prev, [p.id]: e.target.value }))}
                                          className="bg-slate-900 border border-gray-800 rounded-lg p-1.5 text-xs text-gray-200"
                                        >
                                          <option value="">Select Field Crew...</option>
                                          <option value="area_1:Ravi Shankar">Ravi Shankar (Crew Alpha)</option>
                                          <option value="area_2:Mohan Kumar">Mohan Kumar (Crew Beta)</option>
                                          <option value="area_3:Deepak Singh">Deepak Singh (Crew Gamma)</option>
                                        </select>
                                        <input
                                          type="text"
                                          placeholder="ETA (e.g. Today 3:30 PM)"
                                          value={zonalEtaMap[p.id] || ''}
                                          onChange={(e) => setZonalEtaMap(prev => ({ ...prev, [p.id]: e.target.value }))}
                                          className="bg-slate-900 border border-gray-800 rounded-lg p-1.5 text-xs text-gray-200 w-44"
                                        />
                                        <button
                                          type="button"
                                          disabled={!zonalCrewMap[p.id]}
                                          onClick={() => {
                                            const raw = zonalCrewMap[p.id];
                                            if (!raw) return;
                                            const [id, name] = raw.split(':');
                                            handleDispatchCrew(p.id, id, name, zonalEtaMap[p.id] || 'Today 4:00 PM');
                                          }}
                                          className="px-3 py-1.5 bg-lime-500 hover:bg-lime-400 text-[#070a13] font-bold rounded-lg text-[10px] uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                          Dispatch Crew
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Dispatched</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {zonalFilteredPickups.length === 0 && (
                                <tr>
                                  <td colSpan={8} className="py-8 text-center text-gray-500">
                                    No zone-assigned active requests available.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* AREA CREW PORTAL */}
                {activePortal === 'area' && (
                  <div className="space-y-6 text-left">
                    {/* Crew Identity Selector Bar */}
                    <div className="bg-slate-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Field Worker Identity Simulation</span>
                        <h5 className="text-sm font-bold text-gray-200">Select Active Field Crew Worker Profile</h5>
                      </div>
                      <select
                        value={selectedSimCrew}
                        onChange={(e) => setSelectedSimCrew(e.target.value)}
                        className="bg-[#111827] border border-gray-800 rounded-xl p-2.5 text-xs text-gray-200 font-medium focus:outline-none focus:border-purple-500 max-w-xs cursor-pointer"
                      >
                        <option value="area_1">Ravi Shankar (Crew Alpha)</option>
                        <option value="area_2">Mohan Kumar (Crew Beta)</option>
                        <option value="area_3">Deepak Singh (Crew Gamma)</option>
                      </select>
                    </div>

                    <div className="bg-[#111827]/60 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
                      <div>
                        <h4 className="text-md font-bold font-display">Active Collection Orders</h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Review active pickup spots, verify citizen 4-digit OTP codes, and submit completion images for{' '}
                          <strong className="text-purple-400">
                            {selectedSimCrew === 'area_1' ? 'Ravi Shankar (Crew Alpha)' : selectedSimCrew === 'area_2' ? 'Mohan Kumar (Crew Beta)' : 'Deepak Singh (Crew Gamma)'}
                          </strong>.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {pickups
                          .filter((p) => (p.status === 'dispatched' || p.status === 'completed') && p.area_man_id === selectedSimCrew)
                          .map((p) => (
                            <div key={p.id} className="bg-slate-900/60 border border-gray-800 rounded-2xl p-5 space-y-4 shadow flex flex-col justify-between">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-gray-850 pb-2">
                                  <span className="font-mono font-bold text-lime-400 text-xs">{p.id}</span>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                                    p.status === 'dispatched' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse' :
                                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {p.status}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Citizen Name</span>
                                    <span className="font-bold">{p.reporter_name}</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Phone</span>
                                    <span className="font-mono">{p.reporter_phone}</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Waste Category</span>
                                    <span className="font-semibold capitalize text-lime-400">{p.category}</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Priority</span>
                                    <span className="font-semibold capitalize text-red-400">{p.priority}</span>
                                  </div>
                                </div>

                                <div className="space-y-0.5 text-xs">
                                  <span className="text-[9px] text-gray-500 uppercase font-bold block">Address coordinates</span>
                                  <p className="text-gray-400 text-[11px] leading-tight">{p.address} ({p.latitude.toFixed(4)}, {p.longitude.toFixed(4)})</p>
                                </div>

                                {p.image_url && (
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Citizen Reported Photo</span>
                                    <img
                                      src={p.image_url}
                                      alt="Trash"
                                      className="w-full h-32 object-cover rounded-xl border border-gray-800"
                                    />
                                  </div>
                                )}
                              </div>

                              {p.status === 'dispatched' && (
                                <div className="bg-slate-950/80 border border-gray-800 rounded-xl p-3 space-y-3 mt-4 text-left">
                                  <span className="text-[9px] uppercase font-bold tracking-wider text-purple-400 block">Complete Pickup Assignment</span>
                                  
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-400 font-semibold block">Enter Citizen 4-Digit Security OTP</label>
                                    <input
                                      type="text"
                                      maxLength={4}
                                      placeholder="4-digit OTP code"
                                      value={areaOtpInputs[p.id] || ''}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setAreaOtpInputs(prev => ({ ...prev, [p.id]: val }));
                                      }}
                                      className="w-full bg-slate-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono font-bold tracking-widest text-center text-gray-200 focus:outline-none focus:border-purple-500"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-400 font-semibold block">Upload Collection Proof Photo</label>
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Auto assign simulated file
                                          const mockFile = new File([""], "proof.jpg", { type: "image/jpeg" });
                                          setAreaProofImages(prev => ({ ...prev, [p.id]: mockFile }));
                                          setAreaProofPreviews(prev => ({ ...prev, [p.id]: 'https://picsum.photos/seed/collectedproof/800/600' }));
                                        }}
                                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-gray-800 rounded-lg text-xs font-semibold text-gray-300 flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Upload size={12} /> Capture Proof
                                      </button>
                                      {areaProofPreviews[p.id] && (
                                        <div className="flex items-center gap-1.5">
                                          <img
                                            src={areaProofPreviews[p.id]!}
                                            alt="Proof Preview"
                                            className="w-8 h-8 rounded object-cover border border-gray-800"
                                          />
                                          <span className="text-[10px] text-gray-500">proof.jpg ready</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={!(areaOtpInputs[p.id]?.length === 4)}
                                    onClick={() => handleCompletePickup(p.id, areaOtpInputs[p.id], areaProofImages[p.id] || null)}
                                    className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg text-[10px] uppercase tracking-wide transition-all cursor-pointer"
                                  >
                                    Authenticate & Complete
                                  </button>
                                </div>
                              )}

                              {p.status === 'completed' && p.photo_proof_url && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-left space-y-2 mt-4">
                                  <span className="text-[9px] uppercase font-bold text-emerald-400 block">Collection Completed</span>
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={p.photo_proof_url}
                                      alt="Collected Proof"
                                      className="w-16 h-12 rounded object-cover border border-gray-800"
                                    />
                                    <div className="text-xs">
                                      <div className="font-semibold text-gray-200">OTP Authenticated</div>
                                      <div className="text-gray-500 text-[10px]">{new Date(p.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        {pickups.filter((p) => (p.status === 'dispatched' || p.status === 'completed') && p.area_man_id === selectedSimCrew).length === 0 && (
                          <div className="col-span-2 py-12 text-center text-gray-500 text-xs">
                            No active dispatched garbage collections assigned to this crew member.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
          <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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
