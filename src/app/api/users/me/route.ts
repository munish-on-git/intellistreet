import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/token';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.substring(7));
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized: invalid or expired token' }, { status: 401 });
    }

    const db = getDatabase();
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.substring(7));
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const db = getDatabase();
    const userIndex = db.users.findIndex((u) => u.id === decoded.id);

    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const current = db.users[userIndex];
    const updated = {
      ...current,
      ...body,
      // Ensure key credentials aren't overwritten directly
      id: current.id,
      email: current.email,
      role: current.role
    };

    db.users[userIndex] = updated;
    saveDatabase(db);

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
