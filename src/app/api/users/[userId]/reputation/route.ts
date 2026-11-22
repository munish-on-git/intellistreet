import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const db = getDatabase();
    const user = db.users.find((u) => u.id === userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate reputation stats based on database reports and votes
    const userComplaints = db.complaints.filter((c) => c.user_id === userId);
    const verifiedReportsCount = userComplaints.filter((c) => c.is_verified).length;

    // Filter votes that match user's verifications
    let verificationsCount = 0;
    db.complaints.forEach((c) => {
      if (c.votes.some((v) => v.user_id === userId)) {
        verificationsCount++;
      }
    });

    const contributionScore = (user.points || 0) * 2 + verificationsCount * 5 + verifiedReportsCount * 15;

    // Simple gamified badges based on points and contributions
    const badges = [
      {
        id: 'badge_1',
        name: 'Vigilant Citizen',
        description: 'Joined the platform and committed to helping the neighborhood.',
        icon_url: 'https://picsum.photos/seed/badge1/100/100',
        earned_at: user.created_at
      }
    ];

    if (user.points >= 50) {
      badges.push({
        id: 'badge_2',
        name: 'Neighborhood Guard',
        description: 'Earned 50 reputation points by actively verifying issues.',
        icon_url: 'https://picsum.photos/seed/badge2/100/100',
        earned_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    if (verifiedReportsCount >= 1) {
      badges.push({
        id: 'badge_3',
        name: 'Eagle Eye',
        description: 'Successfully reported an issue that was community-verified.',
        icon_url: 'https://picsum.photos/seed/badge3/100/100',
        earned_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return NextResponse.json({
      user_id: userId,
      points: user.points || 0,
      verification_count: verificationsCount,
      confirmed_count: verifiedReportsCount,
      contribution_score: contributionScore,
      badges
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
