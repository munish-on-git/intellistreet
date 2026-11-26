export interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  text: string;
  created_at: string;
}

export interface Complaint {
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
