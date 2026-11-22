import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase, Complaint } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const db = getDatabase();
    const complaintIndex = db.complaints.findIndex((c) => c.id === id);

    if (complaintIndex === -1) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    const current = db.complaints[complaintIndex];
    const updated: Complaint = {
      ...current,
      ...body,
      updated_at: new Date().toISOString()
    };

    // If marked as resolved, ensure is_verified is true as well
    if (updated.status === 'resolved') {
      updated.is_verified = true;
    }

    db.complaints[complaintIndex] = updated;
    saveDatabase(db);

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
