import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase, Complaint } from '@/lib/db';
import { verifyToken } from '@/lib/token';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const complaint = db.complaints.find((c) => c.id === id);

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    return NextResponse.json(complaint);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

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

    // Merge updates
    const current = db.complaints[complaintIndex];
    const updated: Complaint = {
      ...current,
      ...body,
      updated_at: new Date().toISOString()
    };

    db.complaints[complaintIndex] = updated;
    saveDatabase(db);

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const complaintIndex = db.complaints.findIndex((c) => c.id === id);

    if (complaintIndex === -1) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    db.complaints.splice(complaintIndex, 1);
    saveDatabase(db);

    return NextResponse.json({ message: 'Complaint deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
