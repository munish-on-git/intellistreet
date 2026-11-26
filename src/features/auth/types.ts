export interface User {
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
