import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase, ChatMessage } from '@/lib/db';
import { verifyToken } from '@/lib/token';

export async function GET(req: NextRequest) {
  try {
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

    // Group last messages exchanged with other users
    const userConversations: Record<string, { lastMessage: ChatMessage; partner: any }> = {};

    db.messages.forEach((msg) => {
      const isSender = msg.sender_id === currentUserId;
      const isReceiver = msg.receiver_id === currentUserId;

      if (!isSender && !isReceiver) return;

      const partnerId = isSender ? msg.receiver_id : msg.sender_id;
      const partner = db.users.find((u) => u.id === partnerId);

      if (!partner) return;

      const existingConv = userConversations[partnerId];
      if (!existingConv || new Date(msg.created_at).getTime() > new Date(existingConv.lastMessage.created_at).getTime()) {
        userConversations[partnerId] = {
          lastMessage: msg,
          partner: {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            role: partner.role,
            avatar_url: partner.avatar_url
          }
        };
      }
    });

    // If there are no existing threads, recommend some users to talk to (e.g., city officer or active reporters)
    const conversationList = Object.values(userConversations).sort(
      (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );

    return NextResponse.json(conversationList);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.substring(7));
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    const sender_id = decoded.id;
    const { receiver_id, text } = await req.json();

    if (!receiver_id || !text || !text.trim()) {
      return NextResponse.json({ error: 'receiver_id and text are required' }, { status: 400 });
    }

    const db = getDatabase();
    const receiver = db.users.find((u) => u.id === receiver_id);

    if (!receiver) {
      return NextResponse.json({ error: 'Receiver user not found' }, { status: 404 });
    }

    const newMessage: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      sender_id,
      receiver_id,
      text: text.trim(),
      created_at: new Date().toISOString()
    };

    db.messages.push(newMessage);
    saveDatabase(db);

    return NextResponse.json(newMessage, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
