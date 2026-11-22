import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase, Vote } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ complaintId: string }> }
) {
  try {
    const { complaintId } = await params;
    const { user_id, vote } = await req.json();

    if (!user_id || !vote) {
      return NextResponse.json({ error: 'user_id and vote are required' }, { status: 400 });
    }

    const db = getDatabase();
    const complaintIndex = db.complaints.findIndex((c) => c.id === complaintId);

    if (complaintIndex === -1) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    const complaint = db.complaints[complaintIndex];

    // Prevent double voting
    const alreadyVoted = complaint.votes.some((v) => v.user_id === user_id);
    if (alreadyVoted) {
      return NextResponse.json({ error: 'You have already voted on this complaint' }, { status: 409 });
    }

    // Translate UI 'denied' or standard values if needed
    const voteType = vote === 'confirmed' ? 'confirmed' : 'denied';

    const newVote: Vote = {
      user_id,
      vote: voteType,
      created_at: new Date().toISOString()
    };

    complaint.votes.push(newVote);

    // Reward the verifier with 5 points
    const voter = db.users.find((u) => u.id === user_id);
    if (voter) {
      voter.points = (voter.points || 0) + 5;
    }

    // Count confirmation votes
    if (voteType === 'confirmed') {
      complaint.verification_count = (complaint.verification_count || 0) + 1;
    }

    // Auto-verify when 3 confirmation votes are reached
    if (complaint.verification_count >= 3 && !complaint.is_verified) {
      complaint.is_verified = true;
      complaint.status = 'verified';

      // Reward original reporter with 10 bonus points
      const reporter = db.users.find((u) => u.id === complaint.user_id);
      if (reporter) {
        reporter.points = (reporter.points || 0) + 10;
      }
    }

    complaint.updated_at = new Date().toISOString();
    db.complaints[complaintIndex] = complaint;
    saveDatabase(db);

    return NextResponse.json({
      message: 'Vote recorded successfully',
      verification_count: complaint.verification_count,
      is_verified: complaint.is_verified,
      points_earned: 5
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
