import json
import os
from datetime import datetime
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, get_db_path

# ==========================================
# Shared JSON Database Driver for Coordination
# ==========================================
def load_db() -> dict:
    db_path = get_db_path()
    if not db_path.exists():
        return {"users": [], "complaints": [], "messages": []}
    try:
        with open(db_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Agent DB] Error loading database: {e}")
        return {"users": [], "complaints": [], "messages": []}

def save_db(data: dict) -> bool:
    db_path = get_db_path()
    try:
        # Create directories if missing
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with open(db_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[Agent DB] Error saving database: {e}")
        return False

# ==========================================
# Agent Tools (Registered as Gemini Functions)
# ==========================================

def get_active_complaints() -> str:
    """
    Retrieves a list of all active or pending municipal complaints in the database.
    Use this to see what issues are unresolved, their categories, coordinates, and urgency.
    """
    db = load_db()
    unresolved = [c for c in db.get("complaints", []) if c.get("status") != "resolved"]
    
    simplified = []
    for c in unresolved:
        simplified.append({
            "id": c.get("id"),
            "title": c.get("title"),
            "category": c.get("category"),
            "status": c.get("status"),
            "priority": c.get("priority"),
            "address": c.get("address"),
            "reporter_name": c.get("reporter_name"),
            "verification_count": c.get("verification_count", 0)
        })
    return json.dumps(simplified, indent=2)

def update_complaint_status(complaint_id: str, status: str, admin_notes: str) -> str:
    """
    Updates the status and adds official administrator/officer notes for a municipal complaint.
    Valid statuses are: 'pending', 'verified', 'assigned', 'in_progress', 'resolved'.
    """
    db = load_db()
    complaints = db.get("complaints", [])
    found = False
    
    for c in complaints:
        if c.get("id") == complaint_id:
            c["status"] = status
            c["admin_notes"] = admin_notes
            c["updated_at"] = datetime.utcnow().isoformat() + "Z"
            found = True
            break
            
    if found:
        save_db(db)
        return f"Successfully updated complaint {complaint_id} to status '{status}' with notes: '{admin_notes}'"
    return f"Complaint with ID {complaint_id} was not found."

def dispatch_department_crew(complaint_id: str, crew_name: str) -> str:
    """
    Dispatches a dedicated repair squad (e.g., 'Asphalt Squad Beta', 'Sewage Taskforce 4') to
    resolve the reported issue. This changes status to 'in_progress'.
    """
    db = load_db()
    complaints = db.get("complaints", [])
    found = False
    
    for c in complaints:
        if c.get("id") == complaint_id:
            c["status"] = "in_progress"
            c["admin_notes"] = f"Squad '{crew_name}' dispatched to site. Operations initiated."
            c["updated_at"] = datetime.utcnow().isoformat() + "Z"
            found = True
            break
            
    if found:
        save_db(db)
        return f"Successfully dispatched crew '{crew_name}' to complaint {complaint_id}. Status updated to 'in_progress'."
    return f"Complaint with ID {complaint_id} was not found."

def escalate_critical_hazard(complaint_id: str, reason: str) -> str:
    """
    Escalates a civic issue (like exposed wiring or heavy flooding) to 'critical' priority,
    alerts local municipal chiefs, and assigns double contribution points to the reporter.
    """
    db = load_db()
    complaints = db.get("complaints", [])
    users = db.get("users", [])
    
    found_complaint = None
    for c in complaints:
        if c.get("id") == complaint_id:
            c["priority"] = "critical"
            c["admin_notes"] = f"CRITICAL ESCALATION: {reason}. Emergency crew notified."
            c["updated_at"] = datetime.utcnow().isoformat() + "Z"
            found_complaint = c
            break
            
    if found_complaint:
        reporter_id = found_complaint.get("user_id")
        # Reward reporter with points
        for u in users:
            if u.get("id") == reporter_id:
                u["points"] = u.get("points", 0) + 50
                break
        save_db(db)
        return f"Successfully escalated complaint {complaint_id} to CRITICAL. Reason: {reason}. Reporter rewarded with 50 bonus community points."
    
    return f"Complaint with ID {complaint_id} not found."

# ==========================================
# Agent Core Execution Engine
# ==========================================
# Define map of functions for easy callback invocation
TOOLS_MAP = {
    "get_active_complaints": get_active_complaints,
    "update_complaint_status": update_complaint_status,
    "dispatch_department_crew": dispatch_department_crew,
    "escalate_critical_hazard": escalate_critical_hazard
}

def execute_agent_turn(user_prompt: str) -> dict:
    """
    Executes an agent loop. It passes user_prompt to Gemini, registers tools, 
    detects if Gemini requested a function call, resolves the call locally against 
    the DB, feeds the outcome back, and returns the final explanation.
    """
    if not GEMINI_API_KEY:
        # Fallback if no API key
        return {
            "agent_response": (
                "Hello! I am your AI Civic Dispatch Agent. I detected that GEMINI_API_KEY is not set. "
                "In offline/simulation mode, I can analyze your request and let you know what actions I would have taken. "
                "For example, if you asked to dispatch a team to Vijay Nagar, I would execute `dispatch_department_crew` on the database."
            ),
            "tool_calls_executed": [{"tool": "simulation", "arguments": {"prompt": user_prompt}}],
            "status": "simulation"
        }

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        system_instruction = (
            "You are a helpful and intelligent municipal coordinator agent. "
            "You have direct access to tools that can list, update, and escalate civic complaints in real-time. "
            "Your goal is to assist citizens and administrators in resolving municipal issues efficiently. "
            "If someone describes a hazardous situation, escalate it immediately. If they ask about status, fetch the complaints first."
        )

        # First Call
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                # Pass function objects as tools
                tools=[get_active_complaints, update_complaint_status, dispatch_department_crew, escalate_critical_hazard],
                temperature=0.3
            )
        )

        executed_tools = []
        
        # Check for function calls
        # Loop to handle iterative multi-turn tool execution if needed (max 3 loops to avoid infinity)
        for loop_count in range(3):
            if not response.function_calls:
                break
                
            tool_responses = []
            for call in response.function_calls:
                tool_name = call.name
                tool_args = call.args or {}
                
                print(f"[Agentic Loop] Gemini requested tool: {tool_name} with args: {tool_args}")
                executed_tools.append({"tool": tool_name, "arguments": tool_args})
                
                # Execute tool
                if tool_name in TOOLS_MAP:
                    try:
                        # Call Python function using keyword arguments
                        tool_result = TOOLS_MAP[tool_name](**tool_args)
                    except Exception as ex:
                        tool_result = f"Error executing tool {tool_name}: {str(ex)}"
                else:
                    tool_result = f"Tool '{tool_name}' is not registered."
                
                # Format response for model
                tool_responses.append(
                    types.Part.from_function_response(
                        name=tool_name,
                        response={"result": tool_result}
                    )
                )
            
            # Send tool results back to the model to get final text or another tool call
            # To preserve context, we append the history or pass the response candidacies
            response = client.models.generate_content(
                model="gemini-3.5-flash",
                # The modern SDK supports multi-turn contents. We pass previous contents and tool outputs
                contents=[
                    types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)]),
                    response.candidates[0].content, # Previous assistant response containing function call
                    types.Content(role="user", parts=tool_responses) # Tool executions
                ],
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    tools=[get_active_complaints, update_complaint_status, dispatch_department_crew, escalate_critical_hazard],
                    temperature=0.3
                )
            )

        return {
            "agent_response": response.text or "Completed municipal coordination operations.",
            "tool_calls_executed": executed_tools,
            "status": "success"
        }
        
    except Exception as e:
        print(f"[Agent Module] Execution error: {e}")
        return {
            "agent_response": f"Failed to execute agent loop: {str(e)}",
            "tool_calls_executed": [],
            "status": "error"
        }
