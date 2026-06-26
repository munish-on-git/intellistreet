import { NextRequest, NextResponse } from 'next/server';
import { ensurePythonServer } from '@/lib/pythonSidecar';

export async function POST(req: NextRequest) {
  try {
    // 1. Ensure Python server is active
    await ensurePythonServer();

    const formData = await req.formData();
    const image = formData.get('image') as File | null;

    if (!image || image.size === 0) {
      return NextResponse.json({ error: 'Missing media file (image/video)' }, { status: 400 });
    }

    // Convert file to Base64
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64Image = buffer.toString('base64');

    // 2. Call Python FastAPI sensing endpoint
    const response = await fetch('http://127.0.0.1:8000/api/python/sensing/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: base64Image,
        mime_type: image.type || 'image/jpeg',
        file_name: image.name || 'sensing_capture'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Python visual sensing failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[Next.js Python Proxy] Visual sensing proxy failed:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Python sensing integration error' },
      { status: 500 }
    );
  }
}
