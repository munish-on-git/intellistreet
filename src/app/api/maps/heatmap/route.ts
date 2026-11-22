import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    
    // Group coordinates loosely into grids to calculate intensity weights
    const grid: Record<string, { lat: number; lng: number; intensity: number }> = {};

    db.complaints.forEach((c) => {
      const latGrid = Math.round(c.latitude * 100) / 100;
      const lonGrid = Math.round(c.longitude * 100) / 100;
      const key = `${latGrid}_${lonGrid}`;

      if (!grid[key]) {
        grid[key] = { lat: latGrid, lng: lonGrid, intensity: 0 };
      }
      grid[key].intensity += c.priority === 'critical' ? 3 : c.priority === 'high' ? 2 : 1;
    });

    const results = Object.values(grid);

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
