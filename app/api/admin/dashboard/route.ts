import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();

    const total = db.complaints.length;
    const resolved = db.complaints.filter((c) => c.status === 'resolved').length;
    const pending = db.complaints.filter((c) => c.status === 'pending').length;
    const verified = db.complaints.filter((c) => c.is_verified).length;

    // Calculate category distribution
    const category_dist: Record<string, number> = {};
    db.complaints.forEach((c) => {
      category_dist[c.category] = (category_dist[c.category] || 0) + 1;
    });

    // Calculate status distribution
    const status_dist: Record<string, number> = {};
    db.complaints.forEach((c) => {
      status_dist[c.status] = (status_dist[c.status] || 0) + 1;
    });

    return NextResponse.json({
      total_complaints: total,
      resolved_complaints: resolved,
      pending_complaints: pending,
      verified_complaints: verified,
      average_resolution_time: 3.2, // mock average in days
      category_distribution: category_dist,
      status_distribution: status_dist
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
