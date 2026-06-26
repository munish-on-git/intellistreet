import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase, Vote } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user_id, vote } = await req.json();

    if (!user_id || !vote) {
      return NextResponse.json({ error: 'Missing user_id or vote type' }, { status: 400 });
    }

    if (vote !== 'confirmed' && vote !== 'denied') {
      return NextResponse.json({ error: 'Vote must be either confirmed or denied' }, { status: 400 });
    }

    const db = getDatabase();
    const complaintIndex = db.complaints.findIndex((c) => c.id === id);

    if (complaintIndex === -1) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    const complaint = db.complaints[complaintIndex];

    // Check for double voting
    const alreadyVoted = complaint.votes.some((v) => v.user_id === user_id);
    if (alreadyVoted) {
      return NextResponse.json({ error: 'You have already voted on this complaint' }, { status: 409 });
    }

    // Record vote
    const newVote: Vote = {
      user_id,
      vote,
      created_at: new Date().toISOString()
    };

    complaint.votes.push(newVote);

    // Award +5 points to the verifying citizen
    const voter = db.users.find((u) => u.id === user_id);
    if (voter) {
      voter.points = (voter.points || 0) + 5;
    }

    // Increment confirmation counts and check threshold
    if (vote === 'confirmed') {
      complaint.verification_count = (complaint.verification_count || 0) + 1;
    }

    // Threshold of 3 confirmations flags issue as verified
    if (complaint.verification_count >= 3 && !complaint.is_verified) {
      complaint.is_verified = true;
      complaint.status = 'verified';

      // Award +10 bonus points to the original reporter for a validated report
      const reporter = db.users.find((u) => u.id === complaint.user_id);
      if (reporter) {
        reporter.points = (reporter.points || 0) + 10;
      }
    }

    complaint.updated_at = new Date().toISOString();
    db.complaints[complaintIndex] = complaint;
    saveDatabase(db);

    return NextResponse.json({
      message: 'Vote cast successfully',
      verification_count: complaint.verification_count,
      is_verified: complaint.is_verified,
      points_earned: 5
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
