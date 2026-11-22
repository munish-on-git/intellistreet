import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase, User } from '@/lib/db';
import { signToken } from '@/lib/token';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password, role, latitude, longitude } = await req.json();

    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'Name, email, phone, and password are required' }, { status: 400 });
    }

    const db = getDatabase();
    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const newUser: User = {
      id: 'user_' + Math.random().toString(36).substring(2, 9),
      name,
      email: email.trim(),
      phone,
      role: role || 'citizen',
      latitude: latitude || 22.7196,
      longitude: longitude || 75.8577,
      points: 0,
      created_at: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDatabase(db);

    const token = signToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    return NextResponse.json({
      access_token: token,
      user: newUser,
      message: 'Registration successful'
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
