import json
from datetime import datetime
from collections import Counter
from google import genai
from google.genai import types
from .config import GEMINI_API_KEY
from .agent import load_db

def analyze_municipal_patterns() -> dict:
    """
    Performs pattern analysis on the database records.
    Clusters complaints by category, computes resolution metrics,
    and queries Gemini to extract high-level predictive maintenance insights.
    """
    db = load_db()
    complaints = db.get("complaints", [])
    
    if not complaints:
        return {
            "total_complaints": 0,
            "category_distribution": {},
            "unresolved_ratio": 0.0,
            "insights": ["No complaint records found in the database. Seed the database to view patterns."],
            "predictive_maintenance_recommendations": []
        }
        
    total = len(complaints)
    categories = [c.get("category", "other") for c in complaints]
    category_counts = dict(Counter(categories))
    
    statuses = [c.get("status", "pending") for c in complaints]
    status_counts = dict(Counter(statuses))
    
    unresolved_statuses = {"pending", "verified", "assigned", "in_progress"}
    unresolved_count = sum(status_counts.get(s, 0) for s in unresolved_statuses)
    unresolved_ratio = unresolved_count / total if total > 0 else 0.0
    
    # Extract geolocations for hotspot clustering description
    hotspots = []
    for c in complaints:
        if c.get("latitude") and c.get("longitude"):
            hotspots.append({
                "id": c.get("id"),
                "category": c.get("category"),
                "priority": c.get("priority"),
                "lat": c.get("latitude"),
                "lng": c.get("longitude"),
                "address": c.get("address", "")
            })

    # Prepare historical data log summary for Gemini learning
    data_summary = {
        "metrics": {
            "total_complaints": total,
            "unresolved_count": unresolved_count,
            "unresolved_ratio": round(unresolved_ratio, 2),
            "category_distribution": category_counts,
            "status_distribution": status_counts
        },
        "records": [
            {
                "id": c.get("id"),
                "title": c.get("title"),
                "category": c.get("category"),
                "address": c.get("address"),
                "created_at": c.get("created_at")
            }
            for c in complaints[:10]  # pass last 10 for context
        ]
    }

    insights_fallback = [
        "Water leakages occur frequently around Saket Nagar; recommend inspecting main pipeline nodes.",
        "Potholes dominate Vijay Nagar crossing traffic, requiring resilient composite-mix sealing rather than cold-mix patching.",
        "Public lighting failures are cluster-grouped near LIG Square, indicating a possible transformer overload or phase imbalance."
    ]
    
    recommendations_fallback = [
        {
            "target_zone": "Saket Nagar Corridor",
            "action": "Ultrasound Pipe Wall Thickness Audit",
            "estimated_interval_months": 3,
            "priority": "high",
            "justification": f"Frequent water leakage reports ({category_counts.get('water_leakage', 0)} active)."
        },
        {
            "target_zone": "LIG Square Public Parks",
            "action": "Install Mesh-Connected IoT Smart LEDs",
            "estimated_interval_months": 6,
            "priority": "medium",
            "justification": "Frequent night blackouts reported by citizens."
        }
    ]

    if not GEMINI_API_KEY:
        return {
            "total_complaints": total,
            "category_distribution": category_counts,
            "status_distribution": status_counts,
            "unresolved_ratio": round(unresolved_ratio, 2),
            "hotspots": hotspots,
            "insights": insights_fallback,
            "predictive_recommendations": recommendations_fallback,
            "learning_engine_mode": "Deterministic Analytics (Simulation)"
        }

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        system_instruction = (
            "You are an advanced Urban Analytics and Predictive Learning Engine. "
            "Analyze municipal logs and extract deep insights regarding infrastructural decay patterns, "
            "seasonal recurrence risk, and predictive maintenance schedules."
        )
        
        prompt = (
            "Analyze the following municipal database summary and records. "
            "Identify the 3 most significant structural patterns or infrastructural anomalies. "
            "Provide 2 predictive maintenance recommendations with zones, actions, intervals (in months), priority, and justification. "
            f"Database summary: {json.dumps(data_summary, indent=2)}\n"
            "Respond ONLY with a clean JSON object in this format:\n"
            "{\n"
            "  \"insights\": [\"insight line 1\", \"insight line 2\"],\n"
            "  \"predictive_recommendations\": [\n"
            "    {\"target_zone\": \"zone\", \"action\": \"action\", \"estimated_interval_months\": 6, \"priority\": \"high\", \"justification\": \"reason\"}\n"
            "  ]\n"
            "}"
        )

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.2
            )
        )
        
        if response.text:
            cleaned_text = response.text.strip()
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```json") or lines[0].startswith("```"):
                    cleaned_text = "\n".join(lines[1:-1])
            
            ai_patterns = json.loads(cleaned_text)
            
            return {
                "total_complaints": total,
                "category_distribution": category_counts,
                "status_distribution": status_counts,
                "unresolved_ratio": round(unresolved_ratio, 2),
                "hotspots": hotspots,
                "insights": ai_patterns.get("insights", insights_fallback),
                "predictive_recommendations": ai_patterns.get("predictive_recommendations", recommendations_fallback),
                "learning_engine_mode": "Active Gemini Urban Analytics"
            }
            
    except Exception as e:
        print(f"[Learning Module] Analytics error: {e}. Using deterministic analytical fallback.")
        
    return {
        "total_complaints": total,
        "category_distribution": category_counts,
        "status_distribution": status_counts,
        "unresolved_ratio": round(unresolved_ratio, 2),
        "hotspots": hotspots,
        "insights": insights_fallback,
        "predictive_recommendations": recommendations_fallback,
        "learning_engine_mode": "Fallback Analytics (AI Analysis Interrupted)"
    }
