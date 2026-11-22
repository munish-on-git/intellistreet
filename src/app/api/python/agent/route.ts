import { NextRequest, NextResponse } from 'next/server';
import { ensurePythonServer } from '@/lib/pythonSidecar';

export async function POST(req: NextRequest) {
  try {
    // 1. Ensure the Python FastAPI server is active
    await ensurePythonServer();

    // 2. Parse request body
    const body = await req.json();

    // 3. Proxy to FastAPI local port
    const response = await fetch('http://127.0.0.1:8000/api/python/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Python sidecar returned error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[Next.js Python Proxy] Agent proxy failed:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Python integration server error' },
      { status: 500 }
    );
  }
}
