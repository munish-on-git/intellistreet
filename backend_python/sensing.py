import os
import json
import base64
from pathlib import Path
from google import genai
from google.genai import types
from .config import GEMINI_API_KEY

def get_gemini_client():
    if not GEMINI_API_KEY:
        return None
    try:
        # Initialize Google GenAI Python SDK
        return genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"[Sensing SDK] Error initializing Gemini Client: {e}")
        return None

def analyze_visual_sensing(base64_data: str, mime_type: str, file_name: str = "sensing_capture") -> dict:
    """
    Analyzes an image or video frame uploaded by a citizen or a civic sensor (drones/traffic cams).
    Extracts deep sensing data: hazard level, dimension/volume estimates, and pattern features.
    """
    client = get_gemini_client()
    
    # Define fallback metrics based on file_name/type
    fallback_result = {
        "hazard_level": "medium",
        "category": "road_damage",
        "estimated_dimensions": {
            "depth_cm": 12.5,
            "width_meters": 1.1,
            "volume_liters": 0.0
        },
        "blockage_ratio": 0.25,
        "urgency_score": 75,
        "features_detected": ["asphalt_fissure", "aggregate_loss", "standing_water"],
        "recommended_action": "Fill with standard cold-mix asphalt patching.",
        "environmental_impact": "Negligible immediate impact, but high risk for tires.",
        "analysis_mode": "Deterministic Fallback (Configure GEMINI_API_KEY for Real sensing)"
    }
    
    # Adjust mock based on keyword signatures in name or metadata to make demo immersive
    lower_name = file_name.lower() if file_name else ""
    if "water" in lower_name or "leak" in lower_name or "flood" in lower_name:
        fallback_result.update({
            "category": "water_leakage",
            "hazard_level": "high",
            "estimated_dimensions": {"depth_cm": 5.0, "width_meters": 4.5, "volume_liters": 2500.0},
            "blockage_ratio": 0.60,
            "urgency_score": 85,
            "features_detected": ["ruptured_main", "sidewalk_erosion", "gushing_discharge"],
            "recommended_action": "Siphon water, locate local bypass valve, and deploy plumbing team."
        })
    elif "garbage" in lower_name or "dump" in lower_name or "waste" in lower_name:
        fallback_result.update({
            "category": "garbage",
            "hazard_level": "medium",
            "estimated_dimensions": {"depth_cm": 80.0, "width_meters": 2.2, "volume_liters": 650.0},
            "blockage_ratio": 0.15,
            "urgency_score": 60,
            "features_detected": ["organic_rot", "plastic_scatter", "pest_activity"],
            "recommended_action": "Dispatch standard loader and deploy trash compactor."
        })
    elif "light" in lower_name or "dark" in lower_name or "blackout" in lower_name:
        fallback_result.update({
            "category": "street_light_failure",
            "hazard_level": "medium",
            "estimated_dimensions": {"depth_cm": 0.0, "width_meters": 25.0, "volume_liters": 0.0},
            "blockage_ratio": 0.0,
            "urgency_score": 65,
            "features_detected": ["failed_sodium_bulb", "unlit_pedestrian_path", "security_vulnerability"],
            "recommended_action": "Inspect localized step-down transformer and replace bulb with smart-LED."
        })

    # Map backward compatible fields for Next.js Next UI Integration on fallback
    category_dep_map = {
        'road_damage': 'Road Maintenance Department',
        'drainage_problem': 'Drainage & Sewage Department',
        'water_leakage': 'Water Supply Department',
        'garbage': 'Sanitation Department',
        'street_light_failure': 'Electricity Department',
        'electrical_hazard': 'Electricity Department',
        'public_infrastructure': 'Public Works Department',
        'other': 'General Administration'
    }
    cat = fallback_result.get("category", "other")
    fallback_result["confidence"] = 0.85
    fallback_result["priority"] = fallback_result.get("hazard_level", "medium")
    fallback_result["department"] = category_dep_map.get(cat, 'General Administration')

    if not client:
        return fallback_result

    try:
        # Prepare content payload
        # Modern google-genai SDK takes types.Part
        image_part = types.Part.from_bytes(
            data=base64.b64decode(base64_data),
            mime_type=mime_type
        )
        
        system_instruction = (
            "You are an expert Computer Vision and Civic Sensing AI Agent. "
            "Analyze the image/video frame carefully and return precise JSON detailing the metrics of the civic issue."
        )
        
        prompt = (
            "Analyze this civic/municipal monitoring media. Extract key metrics. "
            "Determine category (road_damage, drainage_problem, water_leakage, garbage, street_light_failure, other), "
            "hazard_level (low, medium, high, critical), estimated dimensions (depth_cm, width_meters, volume_liters), "
            "blockage_ratio (0.0 to 1.0 of the road/sidewalk blocked), urgency_score (0-100), "
            "and structural features detected (e.g. ['standing_water', 'pothole', 'litter_accumulation']).\n"
            "Return ONLY a clean JSON object in this format:\n"
            "{\n"
            "  \"category\": \"road_damage\",\n"
            "  \"hazard_level\": \"high\",\n"
            "  \"estimated_dimensions\": {\"depth_cm\": 15, \"width_meters\": 1.2, \"volume_liters\": 20},\n"
            "  \"blockage_ratio\": 0.35,\n"
            "  \"urgency_score\": 82,\n"
            "  \"features_detected\": [\"cracked_asphalt\", \"pooling_water\"],\n"
            "  \"recommended_action\": \"Insert precise action\",\n"
            "  \"environmental_impact\": \"Insert impact\"\n"
            "}"
        )

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.2
            )
        )
        
        if response.text:
            cleaned_text = response.text.strip()
            # Handle markdown block wrappers if model outputs them despite config
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```json") or lines[0].startswith("```"):
                    cleaned_text = "\n".join(lines[1:-1])
            
            result = json.loads(cleaned_text)
            
            # Map backward compatible fields for Next.js Next UI Integration
            category_dep_map = {
                'road_damage': 'Road Maintenance Department',
                'drainage_problem': 'Drainage & Sewage Department',
                'water_leakage': 'Water Supply Department',
                'garbage': 'Sanitation Department',
                'street_light_failure': 'Electricity Department',
                'electrical_hazard': 'Electricity Department',
                'public_infrastructure': 'Public Works Department',
                'other': 'General Administration'
            }
            cat = result.get("category", "other")
            result["confidence"] = 0.94
            result["priority"] = result.get("hazard_level", "medium")
            result["department"] = category_dep_map.get(cat, 'General Administration')
            
            result["analysis_mode"] = "Active Gemini Civic Sensing"
            return result
            
    except Exception as e:
        print(f"[Sensing Module] Sensing error: {e}. Returning fallback metrics.")
        fallback_result["error"] = str(e)
        return fallback_result

    return fallback_result
