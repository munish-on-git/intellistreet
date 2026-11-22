import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase, Complaint, User } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Pre-defined departments and categories matching the system design
const CATEGORY_DEPARTMENT_MAP: Record<string, string> = {
  road_damage: 'Road Maintenance Department',
  drainage_problem: 'Drainage & Sewage Department',
  water_leakage: 'Water Supply Department',
  garbage: 'Sanitation Department',
  street_light_failure: 'Electricity Department',
  electrical_hazard: 'Electricity Department',
  public_infrastructure: 'Public Works Department',
  other: 'General Administration'
};

const CATEGORY_PRIORITY_MAP: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  road_damage: 'high',
  drainage_problem: 'high',
  water_leakage: 'medium',
  garbage: 'medium',
  street_light_failure: 'medium',
  electrical_hazard: 'critical',
  public_infrastructure: 'low',
  other: 'low'
};

// Seed geocoding reference for Indore area to provide gorgeous addresses out of the box
function getMockAddress(lat: number, lon: number): string {
  // Approximate coordinate mapping to rich Indore addresses
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
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const userId = searchParams.get('user_id');

    const db = getDatabase();
    let results = [...db.complaints];

    // Filter logic
    if (status) {
      results = results.filter((c) => c.status === status);
    }
    if (category) {
      results = results.filter((c) => c.category === category);
    }
    if (userId) {
      results = results.filter((c) => c.user_id === userId);
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
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const manualCategory = formData.get('category') as string;
    const latStr = formData.get('latitude') as string;
    const lonStr = formData.get('longitude') as string;
    const image = formData.get('image') as File | null;
    const video = formData.get('video') as File | null; // 360 street view video if uploaded

    if (!userId || !title || !description || !latStr || !lonStr) {
      return NextResponse.json({ error: 'Missing required report fields' }, { status: 400 });
    }

    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);

    const db = getDatabase();
    const user = db.users.find((u) => u.id === userId);

    if (!user) {
      return NextResponse.json({ error: 'Reporter user not found' }, { status: 404 });
    }

    // Process image storage if uploaded
    let imageUrl = '';
    let base64Image = '';
    if (image && image.size > 0) {
      const buffer = Buffer.from(await image.arrayBuffer());
      base64Image = buffer.toString('base64');
      
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileExtension = path.extname(image.name) || '.jpg';
      const filename = `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExtension}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      imageUrl = `/uploads/${filename}`;
    }

    // Process 360-video storage if uploaded
    let videoUrl = '';
    if (video && video.size > 0) {
      const buffer = Buffer.from(await video.arrayBuffer());
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileExtension = path.extname(video.name) || '.mp4';
      const filename = `360video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExtension}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      videoUrl = `/uploads/${filename}`;
    }

    // AI Classification using Gemini
    let aiCategory = manualCategory || 'other';
    let aiConfidence = 1.0;
    let aiPriority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let aiDepartment = 'General Administration';

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && base64Image) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const categoriesStr = Object.keys(CATEGORY_DEPARTMENT_MAP).join(', ');
        
        const prompt = `Analyze this civic complaint image. Classify it into exactly one of these categories: ${categoriesStr}. 
Respond ONLY with valid JSON in this format: 
{ "category": "<category>", "confidence": <0.0-1.0>, "priority": "<low|medium|high|critical>", "explanation": "<short explanation>" }`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                mimeType: image?.type || 'image/jpeg',
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
          if (aiResult.category && CATEGORY_DEPARTMENT_MAP[aiResult.category]) {
            aiCategory = aiResult.category;
            aiConfidence = parseFloat(aiResult.confidence) || 0.85;
            aiPriority = aiResult.priority || CATEGORY_PRIORITY_MAP[aiCategory] || 'medium';
            aiDepartment = CATEGORY_DEPARTMENT_MAP[aiCategory];
          }
        }
      } catch (aiErr) {
        console.error('[AI Classifier] Failed, using fallback:', aiErr);
        // Fallback to manual category or deterministic mapping on API failure
        aiCategory = manualCategory || 'other';
        aiConfidence = 0.75;
        aiPriority = CATEGORY_PRIORITY_MAP[aiCategory] || 'medium';
        aiDepartment = CATEGORY_DEPARTMENT_MAP[aiCategory];
      }
    } else {
      // Deterministic Mock AI if key is missing or no image
      aiCategory = manualCategory || 'other';
      aiConfidence = 0.80;
      aiPriority = CATEGORY_PRIORITY_MAP[aiCategory] || 'medium';
      aiDepartment = CATEGORY_DEPARTMENT_MAP[aiCategory];
    }

    // Compute address via our smart coordinate matching
    const address = getMockAddress(latitude, longitude);

    const newComplaint: Complaint = {
      id: 'report_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      reporter_name: user.name,
      title,
      description,
      image_url: imageUrl || 'https://picsum.photos/seed/default/800/600',
      video_url: videoUrl || undefined,
      category: manualCategory || aiCategory,
      ai_category: aiCategory,
      ai_confidence: aiConfidence,
      priority: aiPriority,
      latitude,
      longitude,
      address,
      department: aiDepartment,
      status: 'pending',
      verification_count: 0,
      is_verified: false,
      comments: [],
      votes: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.complaints.push(newComplaint);
    saveDatabase(db);

    return NextResponse.json(newComplaint, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
