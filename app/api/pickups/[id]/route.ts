import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase, GarbagePickup } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const pickup = (db.pickups || []).find((p) => p.id === id);

    if (!pickup) {
      return NextResponse.json({ error: 'Pickup request not found' }, { status: 404 });
    }

    return NextResponse.json(pickup);
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
    if (!db.pickups) {
      db.pickups = [];
    }
    const pickupIndex = db.pickups.findIndex((p) => p.id === id);

    if (pickupIndex === -1) {
      return NextResponse.json({ error: 'Pickup request not found' }, { status: 404 });
    }

    const current = db.pickups[pickupIndex];
    const updated: GarbagePickup = {
      ...current,
      ...body,
      updated_at: new Date().toISOString()
    };

    db.pickups[pickupIndex] = updated;
    saveDatabase(db);

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, ...payload } = await req.json();

    const db = getDatabase();
    if (!db.pickups) {
      db.pickups = [];
    }
    const pickupIndex = db.pickups.findIndex((p) => p.id === id);

    if (pickupIndex === -1) {
      return NextResponse.json({ error: 'Pickup request not found' }, { status: 404 });
    }

    const current = db.pickups[pickupIndex];
    let updated = { ...current };

    if (action === 'assign_zonal') {
      // Admin assigns Zonal Officer and starts flow
      updated.status = 'zonal_assigned';
      updated.zonal_officer_id = payload.zonal_officer_id;
      updated.zonal_officer_name = payload.zonal_officer_name;
    } else if (action === 'dispatch') {
      // Zonal officer assigns Area Man and sets ETA
      updated.status = 'dispatched';
      updated.area_man_id = payload.area_man_id;
      updated.area_man_name = payload.area_man_name;
      updated.pickup_eta = payload.pickup_eta || 'Today 4:00 PM';
    } else if (action === 'collect') {
      // Area man completes pickup with 4-digit OTP code & image proof
      const { otp, photo_proof_url } = payload;
      if (otp !== current.otp) {
        return NextResponse.json({ error: 'Incorrect 4-digit verification code. Please ask citizen for the correct OTP.' }, { status: 400 });
      }
      updated.status = 'completed';
      updated.photo_proof_url = photo_proof_url || 'https://picsum.photos/seed/collected/800/600';
    } else if (action === 'review') {
      // User reviews the completed pickup
      updated.rating = payload.rating;
      updated.review_text = payload.review_text;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    updated.updated_at = new Date().toISOString();
    db.pickups[pickupIndex] = updated;
    saveDatabase(db);

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
