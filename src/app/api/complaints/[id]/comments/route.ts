import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase, Comment } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user_id, text } = await req.json();

    if (!user_id || !text || !text.trim()) {
      return NextResponse.json({ error: 'user_id and comment text are required' }, { status: 400 });
    }

    const db = getDatabase();
    const complaintIndex = db.complaints.findIndex((c) => c.id === id);

    if (complaintIndex === -1) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    const user = db.users.find((u) => u.id === user_id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newComment: Comment = {
      id: 'comment_' + Math.random().toString(36).substring(2, 9),
      user_id,
      user_name: user.name,
      role: user.role,
      text: text.trim(),
      created_at: new Date().toISOString()
    };

    const complaint = db.complaints[complaintIndex];
    complaint.comments.push(newComment);
    complaint.updated_at = new Date().toISOString();

    db.complaints[complaintIndex] = complaint;
    saveDatabase(db);

    return NextResponse.json(newComment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
