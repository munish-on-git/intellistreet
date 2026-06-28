# IntelliStreet: Smart Civic AI & GIS Engagement Platform

IntelliStreet is a high-performance, full-stack smart-city civic engagement platform. It empowers citizens to report, track, and verify municipal issues (e.g., streetlights, potholes, flooding) while providing municipal authorities with an AI-driven, spatially aware GIS dispatch dashboard.

---

## 📖 The Problem Statement

Traditional citizen-reporting applications suffer from three critical bottlenecks:
1. **Inefficient Categorization & Routing**: Citizen reports are often misclassified or assigned to incorrect departments, delaying resolution times.
2. **Lack of Ground-Truth Verification**: Municipal bodies lack low-cost, decentralized mechanisms to verify reports, leading to spam or double-allocated resources.
3. **Disjointed Geospatial Visualization**: Static lists do not convey real-time density patterns, leaving dispatchers blind to localized gridlocks.

### How IntelliStreet Solves This:
- **AI-Powered Multi-Modal Sensing**: Auto-categorizes citizen photo reports with a high-confidence computer vision engine.
- **Dynamic GIS Mesh Grid**: Visualizes all issues simultaneously on a high-density active map.
- **Gamified Citizen Verification**: Enables peer-to-peer validation via cryptographic status voting (Confirmed vs. Denied).
- **Cinematic Google Earth Telemetry**: Equips authorities with virtual drone zoom sweeps to inspect street-level ground truth from orbit before dispatching physical crews.

---

## 🛠️ Technology Stack & Architecture

IntelliStreet utilizes a dual-engine full-stack architecture that splits UI and heavy-compute workflows.

```
                  ┌─────────────────────────────────────┐
                  │          Citizen Browser            │
                  └──────────────────┬──────────────────┘
                                     │ (HTTP / JSON)
                                     ▼
                  ┌─────────────────────────────────────┐
                  │      Next.js Web Server (Port 3000) │
                  │      - React 19 Frontend            │
                  │      - GIS Mesh Engine (Leaflet)    │
                  │      - Local JSON DB Persistence    │
                  └──────────────────┬──────────────────┘
                                     │
                                     │ (Proxy API Requests)
                                     ▼
                  ┌─────────────────────────────────────┐
                  │   FastAPI Python Sidecar (Port 8000)│
                  │   - Gemini AI Multi-Modal Sensing   │
                  │   - Predictive Pattern Mining       │
                  │   - Civic Agentic Orchestration     │
                  └─────────────────────────────────────┘
```

### 1. Frontend & Web Core (Next.js 15+ & React 19)
- **Framework**: Next.js App Router providing high-speed SSR, server components, and API routes.
- **Mapping**: **Mappls (MapmyIndia) Advanced v3.0 JS SDK** (fully geocoded and styled when `NEXT_PUBLIC_MAPPLS_API_KEY` is present) with an automatic graceful fallback to **Leaflet OpenStreetMap & CartoDB Dark** rendering.
- **Styling**: Tailwind CSS for responsive desktop-first layout, off-black space theme, and high-contrast emerald/slate accents.
- **Animations**: Framer Motion (`motion/react`) for smooth dashboard panels, custom modal transitions, and slide-ins.

### 2. High-Compute Engine (FastAPI & Google GenAI)
- **FastAPI**: Runs a Python-based microservice inside the container on Port 8000.
- **GenAI SDK**: Implements `google-genai` for vision-sensing categorization, parsing base64 citizen uploads, and running municipal predictive model analysis.
- **Pattern Learning**: Unsupervised clustering of regional municipal complaints to identify high-density warning zones.

### 3. Database & Local Storage
- **File Database**: `/data/intellistreet_db.json` serves as the single source of truth, persisting:
  - Reports (coordinates, categories, image URLs, upvotes/downvotes, status tags).
  - Social Discussions (citizen comments, roles, timestamps).
  - Administrative Action logs and dispatch notes.

---

## 🧭 Application Workflows & Features

### 1. The Unified Map & GIS Flow (Dashboard-First)
- **Global Overview**: Clicking the "Dashboard/Map" tab loads the full Active Municipal GIS Mesh. The map displays **all reported issues and markers simultaneously** without focusing on any single report.
- **Issue Details**: Clicking any marker or circle on the map opens a floating details panel/photo overlay displaying the reporter's metadata, status, verification votes, and description.
- **Inspect Live Telemetry**: Inside the details panel, clicking **"Inspect Live Telemetry"** triggers an immersive space-to-ground transition:
  - **Leaflet Fallback**: Smoothly triggers a native continuous `flyTo` zoom down to the street level (Zoom level 18) over 4.5 seconds with cubic orbital easing.
  - **Mappls Mode**: Leverages high-precision satellite tiles animated via a customized `RequestAnimationFrame` cubic ease-in-out curve to provide a cinematic, non-blocking Google Earth style swoop.
  - **Altitude Tracking**: Calculations automatically translate the real-time map zoom level into visual telemetry metrics (e.g., `350,000m` down to `100m`).

### 2. Citizen Engagement Feed
- **Report Submission**: Citizens can upload photo captures, set geolocations, and automatically trigger AI categorization.
- **P2P Verification**: Citizens can upvote (confirm) or downvote (deny) active issues. The system updates `verification_count` in real-time, elevating reports to a "verified" status when consensus is met.
- **Community Forum**: Real-time comments enable municipal field workers to coordinate directly with local citizens.

### 3. Admin Command Center (Dispatch Console)
- **Incident Matrix**: Filters issues by active state, priority, and category.
- **SLA Tracking**: Displays live timers indicating how long an issue has been pending.
- **One-Click Dispatch**: Admins can coordinate crews directly. Inside the dispatch modal, clicking **"Inspect GIS Telemetry"** automatically switches views back to the active GIS map and launches the high-fidelity orbital zoom sequence directly on the target coordinates.

### 4. Swachh Connect Portal (Role-Isolated Waste Collection Loop)
The **Swachh Connect** tab implements a complete, end-to-end door-to-door waste collection pipeline. Crucially, the interface is governed by strict **Role-Based Access Control (RBAC)** and advanced client-side features to ensure that municipal operations are secure, efficient, and user-friendly:
- **👤 Citizen App (Citizen-Only)**: Only visible to logged-in users with the `citizen` role. It lets residents select from 11 specialized waste categories (e.g., Dry, Wet, E-waste, Sanitary), log their precise coordinates, submit pickups, view live requests, and access their unique 4-digit security OTP.
- **⚡ Client-Side Image Compression**: Integrated a high-performance HTML5 Canvas compression pipeline. When citizens upload high-resolution images, they are dynamically scaled down to a maximum of 1024x1024 pixels and compressed to JPEG formats on-the-fly. This guarantees lightning-fast uploads and prevents server-side `Payload Too Large (413)` errors, offering a flawless user experience.
- **🏛️ Admin Dashboard (Admin-Only)**: Only visible to users with the `admin` role. It serves as the municipal oversight board to approve pending requests, assign them to regional Zonal Officers, and track live SLAs.
- **📍 Zonal Officer Terminal (Officer-Only)**: Only visible to municipal officers. It allows them to dispatch field personnel (Area Crews) and set estimated collection windows (ETAs). It dynamically filters active pickups to display only those assigned to the logged-in officer's jurisdiction, ensuring clear and isolated regional oversight.
- **🚛 Area Crew App & Identity Simulator (Officer-Only)**: Only visible to field crews (`officer` role). It enables physical workers on the ground to input the citizen's secure 4-digit OTP, upload photo proof of successful collection, and close the loop. Features a built-in **Field Crew Identity Simulator** allowing officers and admins to test different active crew members (e.g., Ravi Shankar/Crew Alpha, Mohan Kumar/Crew Beta, Deepak Singh/Crew Gamma) and view only their specific active dispatches.
- **🔐 Automatic Role Synchronization**: A background React `useEffect` dynamically monitors the authenticated session state. If a user's role shifts or a different user logs in, the active Swachh Connect portal automatically synchronizes with their approved clearance level, rendering unauthorized simulator tabs invisible to citizens.

---

## 💻 Local Setup & Installation

Follow these steps to run the IntelliStreet repository on your local workstation.

### Prerequisites
1. **Node.js**: v18 or newer
2. **Python**: v3.10 or newer (for the compute engine)
3. **Mappls API Credentials**: (Optional but recommended) Sign up on MapmyIndia's portal to retrieve an API key.

### Step 1: Clone the Repository
```bash
git clone <your-github-repo-url>
cd <your-repo-folder>
```

### Step 2: Configure Environment Variables
Create a `.env` file in the root of the project:
```env
# Next.js Public Configuration
NEXT_PUBLIC_MAPPLS_API_KEY=your_mappls_api_key_here

# Backend secret key for vision analyses (e.g., Gemini)
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Install and Run the Next.js Frontend
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the production app:
   ```bash
   npm run build
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
The frontend is now accessible at `http://localhost:3000`.

### Step 4: Install and Run the Python Backend (Optional)
The Next.js frontend has built-in API routes that can proxy calls, but for full Python computational clustering:
1. Navigate to the Python directory:
   ```bash
   cd backend_python
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI development server:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
The Python API docs will be active at `http://127.0.0.1:8000/docs`.

---

## 🎨 Design System Choices
- **Theme**: Dark Space slate canvas (`#070a13` background, `#0f172a` cards).
- **Accents**: High-contrast emerald greens (`#10b981`) for verification states and telemetry actions; bright teal and indigo accents for status indicators.
- **Typography**: Paired "Inter" (for legible, high-density data sheets) and "JetBrains Mono" (for GIS coordinates and system indicators).
