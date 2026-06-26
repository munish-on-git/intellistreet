import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();

    const total = db.complaints.length;
    const resolved = db.complaints.filter((c) => c.status === 'resolved').length;
    const pending = db.complaints.filter((c) => c.status === 'pending').length;
    const verified = db.complaints.filter((c) => c.is_verified).length;

    // Build distributions
    const category_distribution: Record<string, number> = {};
    const status_distribution: Record<string, number> = {};

    db.complaints.forEach((c) => {
      category_distribution[c.category] = (category_distribution[c.category] || 0) + 1;
      status_distribution[c.status] = (status_distribution[c.status] || 0) + 1;
    });

    return NextResponse.json({
      total_complaints: total,
      resolved_complaints: resolved,
      pending_complaints: pending,
      verified_complaints: verified,
      average_resolution_time: 3.2,
      category_distribution,
      status_distribution
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
