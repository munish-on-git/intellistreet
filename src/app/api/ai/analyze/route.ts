import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;

    if (!image || image.size === 0) {
      return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64Image = buffer.toString('base64');

    let category = 'other';
    let confidence = 0.80;
    let priority = 'medium';
    let department = 'General Administration';

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
                mimeType: image.type || 'image/jpeg',
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
            category = aiResult.category;
            confidence = parseFloat(aiResult.confidence) || 0.85;
            priority = aiResult.priority || CATEGORY_PRIORITY_MAP[category] || 'medium';
            department = CATEGORY_DEPARTMENT_MAP[category];
          }
        }
      } catch (aiErr) {
        console.error('[AI Analyze API] Gemini error, using fallback:', aiErr);
      }
    } else {
      // Deterministic Mock based on file size
      const sizeIndex = image.size % Object.keys(CATEGORY_DEPARTMENT_MAP).length;
      category = Object.keys(CATEGORY_DEPARTMENT_MAP)[sizeIndex];
      confidence = 0.85;
      priority = CATEGORY_PRIORITY_MAP[category] || 'medium';
      department = CATEGORY_DEPARTMENT_MAP[category];
    }

    return NextResponse.json({
      category,
      confidence,
      priority,
      department
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
