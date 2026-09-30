# 🌱 FoodSave - Surplus Food Rescue Platform

> **A responsive web application that eliminates food waste by connecting food providers (college canteens, restaurants, hostel messes, events, and households) with people and community organizations that can use surplus food before it expires.**

Built for college hackathons, sustainability challenges, and community food rescue initiatives.

---

## 🌟 Core Features & Implementation

### 1. Home Dashboard
- **Total Meals Rescued**: Live counter of all claimed and completed food rescues.
- **Surplus Food Available Now**: Real-time counter of edible meals awaiting pickup.
- **Food Waste Prevented (kg)**: Dynamically calculated based on standard weight-to-meal metrics (0.4 kg/meal).
- **CO₂ Emissions Avoided (kg)**: Grounded in EPA WARM standards (~2.5 kg CO₂e per kg of food diverted from landfills).
- **Clear Call-to-Action**: Prominent green "+ Donate Surplus Food" button and quick navigation to live listings.

### 2. Restaurant Operating Hours, Daily Menu & 1-Minute Auto-Dispatch (New Scenario)
- **Customizable Operating Hours**: Configure opening time (e.g. `10:00 AM`) and closing time (e.g. `10:00 PM`) for any restaurant or food center.
- **Daily Menu & Live Inventory**: Tracks prepared batches vs portions sold throughout the day across dishes (Biryani, Pasta, Bakery, Salads, Lentils).
- **Automated Closing-Time Surplus Analysis**: When closing time arrives (or when clicking `⚡ Close Store & Auto-Dispatch`), the system instantly audits remaining unsold portions, computes surplus meals (~kg) and storage status.
- **1-Minute Auto-Dispatch Countdown**: Visual 60-second countdown bar (`01:00` ➡️ `00:00`). Users can let the clock run down or click `🚀 Dispatch Now (Skip 1-Min)`.
- **Automatic Request to NGOs**: At 0 seconds, automatically packages the remaining food, publishes a live donation in FoodSave, and broadcasts priority alerts to 4 registered partner NGOs (*Campus Food Rescue Network*, *Hope Community Shelter*, *St. Jude Kitchen*, *Student Night Pantry*).
- **Simulate Partner NGO Claim**: 1-click acceptance showing real-time claim code and digital pickup pass.

### 3. Post Food (Surplus Food Listing)
- Comprehensive donation form with:
  - Food name / title
  - Quantity & number of meals (auto-calculates approximate weight in kg)
  - Food category (`Cooked Meals`, `Bakery & Bread`, `Fresh Produce`, `Dairy & Beverages`, `Packaged Groceries`)
  - Provider name & entity type (`College Canteen`, `Restaurant / Cafe`, `Hostel Mess`, `Event Catering`, `Household`)
  - Pickup address & specific pickup instructions (loading dock, doorbell, room number)
  - Expiry / Available until datetime picker
  - Contact person & phone number
  - Dietary classification (`Pure Veg`, `Vegan`, `Non-Veg`)
  - Storage & handling condition (e.g., insulated hot box at 65°C, refrigerated cooler)
  - Optional curated photo selection (8 realistic high-resolution food thumbnails + custom URL option)
  - **⚡ 1-Click Hackathon Presets**: Instant pre-fills (e.g., "Campus Lunch Buffet", "Bakery Surplus", "Hostel Dinner") to demonstrate rapid posting in under 5 seconds!

### 3. Available Food & Smart Rescue Priority
- **Smart Rescue Priority Algorithm**:
  - Automatically assesses each available food donation based on urgency and volume:
    - **HIGH Priority** (`🔥` red badge): Expires within ≤ 2 hours **OR** has > 40 meals.
    - **MEDIUM Priority** (`⚡` amber badge): Expires within ≤ 5 hours **OR** has 20–40 meals.
    - **LOW Priority** (`🟢` green badge): Otherwise.
  - Live 30-second ticker dynamically elevates priority badges as expiry timestamps approach.
  - Available food is automatically sorted by priority and nearest expiry so urgent meals get rescued first.
  - Heading notice: *"Smart Rescue Priority — Food closest to expiry is prioritized for rescue."*
  - Instant filter dropdown to filter food by priority (`HIGH`, `MEDIUM`, `LOW`).
- High-polish, responsive cards featuring:
  - Category, dietary badges (`Pure Veg`, `Vegan`, `Non-Veg`), and provider type
  - Real-time countdown clock (e.g., `⏰ 2h 45m left` with urgency states: normal, warning `<2h`, and urgent `<45m`)
  - Quantity in meals and kilograms
  - Verified provider information and contact person
  - Address and pickup instructions
  - Storage conditions
  - Status badge (`🟢 Available`, `🟠 Claimed`, `✅ Picked Up / Rescued`)
  - Interactive search bar + filters by category, status, provider type, dietary preference, and priority

### 4. Claim Food & Digital Pickup Pass
- **Verification Flow**: Clicking "Claim Food" opens a claim modal capturing receiver name, organization (pantry, shelter, or student), contact phone, and estimated arrival time.
- **Instant Status Transition**: Updates status from `Available` to `Claimed`.
- **Digital Pickup Pass**:
  - Generates a unique 6-digit claim verification code (e.g., `FS-7491`).
  - Displays provider contact with a 1-click `Call Provider` button.
  - "Copy Pickup Instructions" button for easy sharing via SMS or WhatsApp.
  - **Confirm Food Picked Up** button: simulates the physical pickup, marks the item as `picked_up`, and immediately updates the community impact counters.

### 5. Dynamic Impact Dashboard & Statistics Audit
- **100% Dynamically Calculated (Zero hardcoded metrics)**:
  - **Meals Rescued**: Real-time sum of `quantity_meals` across all `claimed` and `picked_up` items.
  - **Meals Available Now**: Real-time sum of `quantity_meals` for active `available` listings.
  - **Food Waste Prevented**: Derived dynamically as `meals_rescued * 0.4 kg` (or logged weight in kg).
  - **CO₂ Emissions Avoided**: Dynamically calculated as `food_waste_prevented_kg * 2.5 kg CO₂e`.
  - **Successful Pickups**: Count of completed rescues.
  - **Total Donations**: Total posted donations in database.
- **Environmental Equivalencies**:
  - 🚗 Vehicle emissions offset (gasoline miles)
  - 🚿 Showers of clean water conserved (based on agricultural embedded water footprint)
  - 👨‍👩‍👧‍👦 Daily family meals provided
- **Visual Progress Breakdown**:
  - Food rescued by category (Cooked meals, bakery, produce, etc.)
  - Contribution by provider source (College canteens, restaurants, hostel messes, events)

### 6. Sustainability UI & Responsive Design
- Clean, modern green-and-white visual styling associated with environmental sustainability (`#064e3b`, `#059669`, `#10b981`, `#ecfdf5`, `#ffffff`).
- 100% responsive layout that works smoothly across mobile phones, tablets, and desktops.
- Demo Control Bar with a **Role Switcher** (`All Community`, `Canteen / Provider Mode`, `Shelter / Receiver Mode`) and a `Reset Demo` button to restore initial state during live judging.

### 7. Dual Database & Storage Architecture
- **Supabase Cloud Ready**:
  - Complete SQL migration script in [`supabase/schema.sql`](supabase/schema.sql) creating `users`, `food_donations`, and `claims` tables with Row Level Security (RLS) policies and seed data.
  - Connect your Supabase project in 1-click via the "Supabase Config" button in the top bar.
- **Zero-Setup Local SQLite & LocalStorage Fallback**:
  - Automatically runs out of the box with zero external configuration!
  - When served via `python3 server.py`, it connects to a local SQLite database (`foodsave.db`) with full REST API endpoints.
  - When opened as a static file (`index.html`), it uses `localStorage` with pre-loaded realistic campus demo donations.

---

## 🚀 How to Run the Application

### Method 1: Using the Python Backend (Recommended)
This runs the local Python server with SQLite database persistence and REST API:

```bash
# In the project directory:
python3 server.py
```

Then open your browser to:
👉 **`http://localhost:8000`**

### Method 2: Direct Browser Open (Standalone / Offline)
No server required! Double click `index.html` or run:

```bash
open index.html
```

The app will automatically use the browser's persistent `localStorage` with realistic sample data.

---

## 🗄️ Setting Up Supabase (Optional)

If you'd like to demonstrate live cloud sync with Supabase:

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
4. In the FoodSave web app, click **"Supabase Config"** in the top bar.
5. Paste your **Project URL** and **Anon Public Key**, then click **Save & Connect**.
6. The top badge will turn to `🟢 Supabase Cloud DB` and all changes will sync directly with Supabase!

---

## 📋 File Structure

```
project/
├── index.html               # Main responsive Single Page Application
├── presentation.html        # Interactive 16:9 Pitch Deck (Fullscreen & PDF export)
├── FoodSave_Pitch_Deck.pptx # Native PowerPoint Pitch Deck (10 slides)
├── generate_pitch_deck.py   # Automated PPTX slide generator
├── css/
│   └── styles.css           # Clean sustainability CSS design system
├── js/
│   ├── app.js               # UI controller, event listeners, modals & renderers
│   ├── db.js                # Unified data abstraction (Supabase / SQLite / localStorage)
│   ├── mockData.js          # Realistic sample donations & hackathon presets
│   └── supabaseClient.js    # Native PostgREST client for Supabase
├── server.py                # Python 3 SQLite backend + REST API + static server
├── foodsave.db              # SQLite database file
├── supabase/
│   └── schema.sql           # Supabase SQL migration script & RLS policies
└── README.md                # Documentation & presentation guide
```

---

## 📊 Presentation & Pitch Deck

FoodSave includes both a native PowerPoint file and a web-based interactive presentation deck:

1. **PowerPoint Presentation (`FoodSave_Pitch_Deck.pptx`)**:
   - Ready to upload to Google Drive, Google Slides, Canva, or Microsoft PowerPoint.
   - 10 professionally formatted 16:9 widescreen slides covering the problem statement, closing-time auto-dispatch, smart priority engine, EPA carbon calculations, and technical architecture.
2. **Interactive Web Deck (`presentation.html`)**:
   - View in browser: [`presentation.html`](presentation.html)
   - Features keyboard navigation (`←` `→` `Space`), fullscreen mode (`F`), and instant **"Print / Save PDF"** capability.

---

## 🎤 3-Minute Hackathon Demo Script for Judges

1. **The Hook (30s)**:
   - *"Every day, campus canteens and hostel messes throw away trays of perfectly good food, while food-insecure students or local shelters could use them. We built FoodSave to bridge this gap in under 60 seconds."*
2. **Post Surplus Food (45s)**:
   - Click **"Donate Surplus Food"**.
   - Click the **⚡ Demo: Fresh Biryani & Curry** quick-preset.
   - Show how quantity auto-calculates weight in kg and estimated expiry.
   - Click **"Post Surplus Food"** — show the toast notification and the new listing appearing instantly at the top of the feed!
3. **Claiming as a Receiver (45s)**:
   - Switch role to **"Shelter/Receiver"** in the top bar.
   - Click **"Claim Food Now"** on any available card.
   - Enter your name and pickup window, then confirm.
   - Show the **Digital Pickup Pass** with the unique claim code, map details, and one-click provider call button.
4. **Closing the Loop & Showing Impact (45s)**:
   - On the Pickup Pass, click **"Confirm Food Picked Up"**.
   - Scroll to the **Impact Dashboard** — point out how the **Meals Rescued**, **Food Waste Prevented (kg)**, **CO₂ Emissions Avoided**, and **Equivalencies** immediately increase in real-time.
   - Click **"Supabase Config"** to highlight that the architecture supports both local SQLite and cloud Supabase with RLS.
