import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase, GarbagePickup } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const VALID_CATEGORIES = [
  'dry', 'wet', 'electronics', 'medical', 'tin_metal', 
  'construction', 'hazardous', 'organic', 'textile', 'glass', 'sanitary'
];

function getMockAddress(lat: number, lon: number): string {
  if (lat > 22.74) {
    return 'Vijay Nagar Crossing, Sector B, Scheme No 54, Indore, Madhya Pradesh 452010';
  } else if (lat < 22.72) {
    return 'Rajwada Palace Circle, MG Road, Indore, Madhya Pradesh 452002';
  } else if (lon > 75.87) {
    return 'Saket Nagar Street No. 3, Near Saket Club, Indore, Madhya Pradesh 452018';
  } else {
    return 'LIG Square Park Lane, RSS Nagar, Indore, Madhya Pradesh 452011';
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');

    const db = getDatabase();
    let results = [...(db.pickups || [])];

    if (userId) {
      results = results.filter((p) => p.user_id === userId);
    }
    if (status) {
      results = results.filter((p) => p.status === status);
    }

    // Sort by newest first
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ data: results, total: results.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = formData.get('user_id') as string;
    const manualCategory = formData.get('category') as string;
    const latStr = formData.get('latitude') as string;
    const lonStr = formData.get('longitude') as string;
    const image = formData.get('image') as File | null;
    const triggerAiStr = formData.get('trigger_ai') as string; // "true" or "false"

    if (!userId || !latStr || !lonStr) {
      return NextResponse.json({ error: 'Missing required coordinates or user' }, { status: 400 });
    }

    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);
    const triggerAi = triggerAiStr === 'true';

    const db = getDatabase();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Process image storage if uploaded
    let imageUrl = '';
    let base64Image = '';
    let mimeType = 'image/jpeg';
    if (image && image.size > 0) {
      mimeType = image.type || 'image/jpeg';
      const buffer = Buffer.from(await image.arrayBuffer());
      base64Image = buffer.toString('base64');
      
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileExtension = path.extname(image.name) || '.jpg';
      const filename = `pickup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExtension}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      imageUrl = `/uploads/${filename}`;
    }

    // AI Classification using Gemini if requested
    let detectedCategory = manualCategory || 'dry';
    let aiExplanation = '';
    let aiHandlingTip = '';
    let aiPriority: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && base64Image && triggerAi) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const categoriesStr = VALID_CATEGORIES.join(', ');
        
        const prompt = `Analyze this trash or garbage image. Classify it into exactly one of these 11 categories: ${categoriesStr}.
Respond ONLY with valid JSON in this exact format:
{ 
  "category": "<one of the 11 categories>", 
  "confidence": <0.0-1.0>, 
  "priority": "<low|medium|high|critical>", 
  "explanation": "<one line explanation>",
  "handlingTip": "<safety guideline for this trash>" 
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            },
            prompt
          ],
          config: {
            responseMimeType: 'application/json'
          }
        });

        if (response.text) {
          const aiResult = JSON.parse(response.text.trim());
          if (aiResult.category && VALID_CATEGORIES.includes(aiResult.category)) {
            detectedCategory = aiResult.category;
            aiExplanation = aiResult.explanation || '';
            aiHandlingTip = aiResult.handlingTip || '';
            aiPriority = aiResult.priority || 'medium';
          }
        }
      } catch (aiErr) {
        console.error('[Garbage AI Classifier] Failed, using manual:', aiErr);
      }
    }

    // Default priorities if not analyzed
    if (!aiPriority) {
      if (['medical', 'hazardous'].includes(detectedCategory)) {
        aiPriority = 'high';
      } else if (['wet', 'sanitary'].includes(detectedCategory)) {
        aiPriority = 'medium';
      } else {
        aiPriority = 'low';
      }
    }

    // Generate a random 4-digit OTP code for secure collection
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const address = getMockAddress(latitude, longitude);

    const newPickup: GarbagePickup = {
      id: 'SC-' + Math.floor(2800 + Math.random() * 200),
      user_id: userId,
      reporter_name: user.name,
      reporter_phone: user.phone || '9876543210',
      category: detectedCategory,
      image_url: imageUrl || 'https://picsum.photos/seed/defaultwaste/800/600',
      latitude,
      longitude,
      address,
      priority: aiPriority,
      status: 'pending',
      otp: randomOtp,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!db.pickups) {
      db.pickups = [];
    }
    db.pickups.push(newPickup);
    saveDatabase(db);

    return NextResponse.json({
      pickup: newPickup,
      ai: triggerAi ? {
        category: detectedCategory,
        explanation: aiExplanation,
        handlingTip: aiHandlingTip,
        priority: aiPriority
      } : null
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
