import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/token';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.substring(7));
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    const currentUserId = decoded.id;
    const db = getDatabase();

    const verifications: any[] = [];

    db.complaints.forEach((c) => {
      const vote = c.votes.find((v) => v.user_id === currentUserId);
      if (vote) {
        verifications.push({
          id: `vote_${c.id}_${currentUserId}`,
          complaint_id: c.id,
          title: c.title,
          vote: vote.vote,
          address: c.address,
          created_at: vote.created_at
        });
      }
    });

    return NextResponse.json({ data: verifications, total: verifications.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
