import { NextRequest, NextResponse } from 'next/server';
import { ensurePythonServer } from '@/lib/pythonSidecar';

export async function GET(req: NextRequest) {
  try {
    // 1. Ensure Python server is active
    await ensurePythonServer();

    // 2. Query Python FastAPI learning endpoint
    const response = await fetch('http://127.0.0.1:8000/api/python/learning/patterns', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Python pattern learning failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[Next.js Python Proxy] Pattern learning proxy failed:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Python learning integration error' },
      { status: 500 }
    );
  }
}
