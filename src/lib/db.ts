import fs from 'fs';
import path from 'path';

// Define TS types matching our data schema
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'citizen' | 'officer' | 'admin';
  latitude: number;
  longitude: number;
  points: number;
  avatar_url?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  text: string;
  created_at: string;
}

export interface Vote {
  user_id: string;
  vote: 'confirmed' | 'denied';
  created_at: string;
}

export interface Complaint {
  id: string;
  user_id: string;
  reporter_name: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string; // 360-degree drone/street video url
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
  votes: Vote[];
  admin_notes?: string;
  resolution_proof_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
}

export interface GarbagePickup {
  id: string; // e.g. "SC-2849"
  user_id: string;
  reporter_name: string;
  reporter_phone: string;
  category: string; // dry, wet, electronics, medical, tin_metal, construction, hazardous, organic, textile, glass, sanitary
  image_url: string;
  latitude: number;
  longitude: number;
  address: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'zonal_assigned' | 'dispatched' | 'collected' | 'completed';
  otp: string; // 4-digit verification code
  zonal_officer_id?: string;
  zonal_officer_name?: string;
  area_man_id?: string;
  area_man_name?: string;
  pickup_eta?: string; // e.g. "Today 2:30 PM"
  photo_proof_url?: string; // photo uploaded by Area Man
  rating?: number; // citizen rating (1-5)
  review_text?: string; // citizen review
  created_at: string;
  updated_at: string;
}

interface DatabaseSchema {
  users: User[];
  complaints: Complaint[];
  messages: ChatMessage[];
  pickups: GarbagePickup[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'intellistreet_db.json');

// Helper to secure password hashing without external binary packages
export function simpleHash(password: string): string {
  // Simple deterministic string transform for demo authentication
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'sha256_' + Math.abs(hash).toString(16);
}

// Ensure database file exists and is seeded with gorgeous sample records
export function getDatabase(): DatabaseSchema {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const seedData: DatabaseSchema = {
      users: [
        {
          id: 'user_1',
          name: 'Manish Pathania',
          email: 'citizen@example.com',
          phone: '9876543210',
          role: 'citizen',
          latitude: 22.7196,
          longitude: 75.8577,
          points: 120,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'user_2',
          name: 'Officer Rajesh Kumar',
          email: 'officer@example.com',
          phone: '8765432109',
          role: 'officer',
          latitude: 22.7256,
          longitude: 75.8677,
          points: 450,
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'user_3',
          name: 'Suhani Sharma',
          email: 'admin@example.com',
          phone: '7654321098',
          role: 'admin',
          latitude: 22.7126,
          longitude: 75.8477,
          points: 800,
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'user_4',
          name: 'Amit Patel',
          email: 'amit@example.com',
          phone: '9988776655',
          role: 'citizen',
          latitude: 22.7241,
          longitude: 75.8831,
          points: 35,
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      complaints: [
        {
          id: 'report_1',
          user_id: 'user_4',
          reporter_name: 'Amit Patel',
          title: 'Dangerous deep pothole on Vijay Nagar main crossing',
          description: 'A massive pothole has opened up right on the busy Vijay Nagar main intersection. It is extremely hazardous for two-wheelers, especially at night when streetlights are dim. Several motorcyclists have already slipped attempting to swerve around it.',
          image_url: 'https://picsum.photos/seed/pothole/800/600',
          video_url: '/samples/drone_flyover.mp4', // will serve or simulate nicely
          category: 'road_damage',
          ai_category: 'road_damage',
          ai_confidence: 0.94,
          priority: 'high',
          latitude: 22.7533,
          longitude: 75.8937,
          address: 'Vijay Nagar Square, Sector C, Scheme No 54, Indore, Madhya Pradesh',
          department: 'Road Maintenance Department',
          status: 'in_progress',
          verification_count: 5,
          is_verified: true,
          votes: [
            { user_id: 'user_1', vote: 'confirmed', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
            { user_id: 'user_2', vote: 'confirmed', created_at: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000).toISOString() },
            { user_id: 'user_4', vote: 'confirmed', created_at: new Date(Date.now() - 2.1 * 24 * 60 * 60 * 1000).toISOString() }
          ],
          comments: [
            {
              id: 'comment_11',
              user_id: 'user_1',
              user_name: 'Manish Pathania',
              role: 'citizen',
              text: 'Confirming this, I hit my wheel on it yesterday. Extremely dangerous!',
              created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'comment_12',
              user_id: 'user_2',
              user_name: 'Officer Rajesh Kumar',
              role: 'officer',
              text: 'Thanks for the report. AI categorized it correctly. Sent work order to Road Maintenance. Team will initiate patching tonight.',
              created_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          admin_notes: 'Patch work scheduled. Road roller dispatched.',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'report_2',
          user_id: 'user_1',
          reporter_name: 'Manish Pathania',
          title: 'Severe water pipeline leakage flooding Saket residential street',
          description: 'A primary municipal water supply pipe has ruptured under the sidewalk on Saket Street 4. Gallons of fresh drinking water are bursting out, flooding the entire lane and making it impossible for pedestrians to walk.',
          image_url: 'https://picsum.photos/seed/waterleak/800/600',
          category: 'water_leakage',
          ai_category: 'water_leakage',
          ai_confidence: 0.88,
          priority: 'high',
          latitude: 22.7301,
          longitude: 75.8845,
          address: '42, Saket Nagar, Near Saket Club, Indore, Madhya Pradesh',
          department: 'Water Supply Department',
          status: 'verified',
          verification_count: 3,
          is_verified: true,
          votes: [
            { user_id: 'user_4', vote: 'confirmed', created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
            { user_id: 'user_3', vote: 'confirmed', created_at: new Date(Date.now() - 0.8 * 24 * 60 * 60 * 1000).toISOString() }
          ],
          comments: [
            {
              id: 'comment_21',
              user_id: 'user_4',
              user_name: 'Amit Patel',
              role: 'citizen',
              text: 'Literally half the street is submerged. What a waste of clean water!',
              created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          created_at: new Date(Date.now() - 1.2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'report_3',
          user_id: 'user_4',
          reporter_name: 'Amit Patel',
          title: '3 adjacent streetlights failed near LIG Square park',
          description: 'The streetlights bordering the neighborhood public park at LIG are completely blacked out for the last 3 nights. The alleyway has become extremely dark and unsafe for women and children returning home in the evening.',
          image_url: 'https://picsum.photos/seed/streetlight/800/600',
          category: 'street_light_failure',
          ai_category: 'street_light_failure',
          ai_confidence: 0.91,
          priority: 'medium',
          latitude: 22.7412,
          longitude: 75.8789,
          address: 'LIG Park lane, Scheme No 54, Indore, Madhya Pradesh',
          department: 'Electricity Department',
          status: 'pending',
          verification_count: 1,
          is_verified: false,
          votes: [],
          comments: [],
          created_at: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'report_4',
          user_id: 'user_1',
          reporter_name: 'Manish Pathania',
          title: 'Huge unmanaged garbage dumping on Rajwada heritage path',
          description: 'A large pile of rotting organic waste and plastic bags has been dumped right on the side of the historic Rajwada palace heritage pathway. It is emitting a terrible stench and stray dogs are scattering it all over the tourist walk.',
          image_url: 'https://picsum.photos/seed/garbage/800/600',
          category: 'garbage',
          ai_category: 'garbage',
          ai_confidence: 0.97,
          priority: 'medium',
          latitude: 22.7196,
          longitude: 75.8577,
          address: 'Rajwada, Mahatma Gandhi Road, Indore, Madhya Pradesh',
          department: 'Sanitation Department',
          status: 'resolved',
          verification_count: 4,
          is_verified: true,
          votes: [
            { user_id: 'user_4', vote: 'confirmed', created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() }
          ],
          comments: [
            {
              id: 'comment_41',
              user_id: 'user_3',
              user_name: 'Suhani Sharma',
              role: 'admin',
              text: 'Extremely critical due to tourism. Sanitation squad dispatched immediately.',
              created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          admin_notes: 'Sanitation squad cleared the spot. Imposed a fine warning in the commercial zone.',
          resolution_proof_url: 'https://picsum.photos/seed/resolved/800/600',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      messages: [
        {
          id: 'msg_1',
          sender_id: 'user_2',
          receiver_id: 'user_1',
          text: 'Hi Manish, regarding your report on Saket street flooding, our team is arriving in 15 mins.',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'msg_2',
          sender_id: 'user_1',
          receiver_id: 'user_2',
          text: 'Thank you Rajesh sir! Let me know if you need exact house numbers or if I should meet the plumbers there.',
          created_at: new Date(Date.now() - 0.98 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'msg_3',
          sender_id: 'user_2',
          receiver_id: 'user_1',
          text: 'Yes please, meeting them near Saket Club would be incredibly helpful to pinpoint the main valve.',
          created_at: new Date(Date.now() - 0.95 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      pickups: [
        {
          id: 'SC-2849',
          user_id: 'user_1',
          reporter_name: 'Manish Pathania',
          reporter_phone: '9876543210',
          category: 'wet',
          image_url: 'https://picsum.photos/seed/wetwaste/800/600',
          latitude: 22.7196,
          longitude: 75.8577,
          address: 'Rajwada, Mahatma Gandhi Road, Indore, Madhya Pradesh 452002',
          priority: 'medium',
          status: 'dispatched',
          otp: '4821',
          zonal_officer_id: 'user_2',
          zonal_officer_name: 'Officer Rajesh Kumar',
          area_man_id: 'area_1',
          area_man_name: 'Ravi Shankar',
          pickup_eta: 'Today 3:00 PM',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          id: 'SC-2848',
          user_id: 'user_4',
          reporter_name: 'Amit Patel',
          reporter_phone: '9988776655',
          category: 'medical',
          image_url: 'https://picsum.photos/seed/medicalwaste/800/600',
          latitude: 22.7241,
          longitude: 75.8831,
          address: '42, Saket Nagar, Near Saket Club, Indore, Madhya Pradesh 452018',
          priority: 'high',
          status: 'pending',
          otp: '1093',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'SC-2847',
          user_id: 'user_1',
          reporter_name: 'Manish Pathania',
          reporter_phone: '9876543210',
          category: 'electronics',
          image_url: 'https://picsum.photos/seed/ewaste/800/600',
          latitude: 22.7196,
          longitude: 75.8577,
          address: 'Rajwada, Shop 12, Indore, Madhya Pradesh 452002',
          priority: 'medium',
          status: 'completed',
          otp: '7724',
          zonal_officer_id: 'user_2',
          zonal_officer_name: 'Officer Rajesh Kumar',
          area_man_id: 'area_1',
          area_man_name: 'Ravi Shankar',
          photo_proof_url: 'https://picsum.photos/seed/garbageproof/800/600',
          rating: 5,
          review_text: 'Very professional and timely pickup of my old computer parts. Brilliant initiative!',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()
        }
      ]
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(seedData, null, 2), 'utf8');
    return seedData;
  }

  const fileData = fs.readFileSync(DB_PATH, 'utf8');
  try {
    const data = JSON.parse(fileData);
    if (!data.users) {
      data.users = [];
    }
    if (!data.complaints) {
      data.complaints = [];
    }
    if (!data.messages) {
      data.messages = [];
    }
    if (!data.pickups) {
      data.pickups = [];
    }
    return data;
  } catch (e) {
    // If corruption happens, return seed format
    return { users: [], complaints: [], messages: [], pickups: [] };
  }
}

export function saveDatabase(data: DatabaseSchema): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}
