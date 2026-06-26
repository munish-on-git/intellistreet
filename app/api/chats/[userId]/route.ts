import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/token';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.substring(7));
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    const currentUserId = decoded.id;
    const db = getDatabase();

    // Filter messages exchanged between currentUserId and the path parameter userId
    const thread = db.messages.filter(
      (m) =>
        (m.sender_id === currentUserId && m.receiver_id === userId) ||
        (m.sender_id === userId && m.receiver_id === currentUserId)
    );

    // Sort chronologically (oldest to newest)
    thread.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json(thread);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
