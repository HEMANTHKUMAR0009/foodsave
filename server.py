#!/usr/bin/env python3
"""
FoodSave - Local Server & REST API
Provides a lightweight backend with SQLite persistence and static web server.
"""

import http.server
import socketserver
import json
import sqlite3
import os
import sys
import uuid
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta, timezone

PORT = 8000
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'foodsave.db')

def init_db(force_reset=False):
    """Initializes the SQLite database with tables and realistic sample data."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    if force_reset:
        cursor.execute("DROP TABLE IF EXISTS claims")
        cursor.execute("DROP TABLE IF EXISTS food_donations")
        cursor.execute("DROP TABLE IF EXISTS users")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        organization_name TEXT,
        role TEXT NOT NULL,
        provider_type TEXT,
        phone TEXT,
        address TEXT,
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS food_donations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        food_type TEXT NOT NULL,
        quantity_meals INTEGER NOT NULL DEFAULT 1,
        quantity_weight_kg REAL DEFAULT 0.0,
        provider_id TEXT,
        provider_name TEXT NOT NULL,
        provider_type TEXT NOT NULL DEFAULT 'college_canteen',
        pickup_address TEXT NOT NULL,
        pickup_instructions TEXT,
        available_until TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'available',
        dietary_type TEXT NOT NULL DEFAULT 'vegetarian',
        storage_notes TEXT,
        image_url TEXT,
        contact_phone TEXT NOT NULL,
        contact_name TEXT,
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        donation_id TEXT NOT NULL,
        receiver_name TEXT NOT NULL,
        receiver_organization TEXT,
        receiver_phone TEXT NOT NULL,
        claim_code TEXT NOT NULL,
        estimated_pickup_time TEXT,
        claim_notes TEXT,
        status TEXT NOT NULL DEFAULT 'claimed',
        claimed_at TEXT NOT NULL,
        picked_up_at TEXT,
        FOREIGN KEY(donation_id) REFERENCES food_donations(id)
    )
    """)

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) FROM food_donations")
    count = cursor.fetchone()[0]

    if count == 0:
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat().replace('+00:00', 'Z')

        def iso_offset(hours=0, minutes=0):
            t = now + timedelta(hours=hours, minutes=minutes)
            return t.isoformat().replace('+00:00', 'Z')

        sample_users = [
            ('u-1', 'Chef Rajesh Kumar', 'Central Campus Dining Hall', 'provider', 'college_canteen', '+1 (555) 234-5678', 'Campus North Block, 2nd Floor Dining Court', iso_offset(hours=-4)),
            ('u-2', 'Elena Rostova', 'Golden Crust Bakery & Cafe', 'provider', 'bakery', '+1 (555) 345-6789', '42 University Avenue, Downtown', iso_offset(hours=-5)),
            ('u-3', 'Vikram Patel', 'Oakridge Hostel Mess (Wing B)', 'provider', 'hostel_mess', '+1 (555) 456-7890', 'Hostel Zone 4, Kitchen Loading Dock', iso_offset(hours=-3)),
            ('u-4', 'Maria Santos', 'Annual Tech Summit Catering', 'provider', 'event_catering', '+1 (555) 567-8901', 'Student Convention Center, Hall 3 Backstage', iso_offset(hours=-6)),
            ('u-5', 'Marcus Chen', 'Campus Food Rescue Network', 'receiver', 'ngo', '+1 (555) 987-6543', 'Student Union, Room 104', iso_offset(hours=-24))
        ]

        cursor.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?)", sample_users)

        sample_donations = [
            (
                'don-1',
                'Steamed Basmati Rice, Paneer Curry & Dal Fry',
                'Freshly prepared lunch surplus from university noon rush. Packed in hygienic thermal food grade containers.',
                'cooked_meals',
                35,
                14.0,
                'u-1',
                'Central Campus Dining Hall',
                'college_canteen',
                'Campus North Block, 2nd Floor Dining Court, Service Door B',
                'Ring kitchen bell. Containers can be transferred or brought back tomorrow.',
                iso_offset(hours=3, minutes=30),
                'available',
                'vegetarian',
                'Stored in insulated warming bins (65°C+). Ready to serve.',
                'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
                '+1 (555) 234-5678',
                'Chef Rajesh Kumar',
                iso_offset(minutes=-45)
            ),
            (
                'don-2',
                'Artisan Sourdough, Baguettes & Croissants',
                'Crisp day-bake artisan bread, seeded multigrain loaves, and butter croissants. Baked this morning.',
                'bakery',
                40,
                12.5,
                'u-2',
                'Golden Crust Bakery & Cafe',
                'bakery',
                '42 University Avenue, Downtown',
                'Come to front counter and mention FoodSave pickup.',
                iso_offset(hours=5),
                'available',
                'vegetarian',
                'Kept in clean dry bakery paper bags.',
                'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
                '+1 (555) 345-6789',
                'Elena Rostova',
                iso_offset(hours=-1, minutes=-15)
            ),
            (
                'don-3',
                'Mixed Vegetable Pasta & Garlic Toast (18 Meals)',
                'Creamy herb penne pasta with broccoli, zucchini, bell peppers and foil-wrapped garlic toasts.',
                'cooked_meals',
                18,
                7.2,
                'u-3',
                'Oakridge Hostel Mess (Wing B)',
                'hostel_mess',
                'Hostel Zone 4, Kitchen Loading Dock',
                'Security desk has guest visitor register; mention FoodSave.',
                iso_offset(hours=2, minutes=15),
                'available',
                'vegetarian',
                'Warm insulated trays.',
                'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80',
                '+1 (555) 456-7890',
                'Vikram Patel',
                iso_offset(minutes=-30)
            ),
            (
                'don-4',
                'Gourmet Wrap Platters & Seasonal Fruit Cups',
                'High quality wrap assortment (Grilled veggies, hummus wraps, falafel) plus diced melon fruit bowls.',
                'cooked_meals',
                28,
                11.0,
                'u-4',
                'Annual Tech Summit Catering',
                'event_catering',
                'Student Convention Center, Hall 3 Backstage Service Ramp',
                'Call Maria on arrival, door will be unlocked.',
                iso_offset(hours=1, minutes=45),
                'claimed',
                'vegan',
                'Chilled catering containers with ice packs.',
                'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
                '+1 (555) 567-8901',
                'Maria Santos',
                iso_offset(hours=-2)
            ),
            (
                'don-5',
                'Fresh Organic Apples, Bananas & Orange Crates',
                'Surplus fresh fruit crates from student farmers cooperative. Perfect condition, sweet and ripe.',
                'fresh_produce',
                50,
                22.0,
                'u-1',
                'Green Roots Campus Co-op',
                'college_canteen',
                'Agricultural Building Greenhouse B, Entry 1',
                'Wooden crates can be carried or wheeled via ramp.',
                iso_offset(hours=8),
                'available',
                'vegan',
                'Ambient room temperature, cool shaded store.',
                'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
                '+1 (555) 678-9012',
                'Samira Vance',
                iso_offset(hours=-3)
            ),
            (
                'don-6',
                'Gourmet Dinner Trays: Herb Roast & Mashed Potatoes',
                'High table faculty dinner surplus. Premium roasted vegetable medleys, garlic mash, and gravy.',
                'cooked_meals',
                30,
                13.5,
                'u-1',
                'University Faculty Club',
                'restaurant',
                'Alumni Hall, West Wing Entrance',
                'Pickup at kitchen side door.',
                iso_offset(hours=-1),
                'picked_up',
                'vegetarian',
                'Temperature controlled warming unit.',
                'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
                '+1 (555) 789-0123',
                'Chef Antoine',
                iso_offset(hours=-6)
            ),
            (
                'don-7',
                'Whole Milk, Greek Yogurt & Soy Beverage Packs',
                'Unopened commercial refrigerated dairy and plant-based milks with 4 days until best-by date.',
                'dairy_beverages',
                24,
                15.0,
                'u-3',
                'West Campus Grocers & Cafe',
                'supermarket',
                'Campus Commercial Plaza, Bay 3',
                'Staff entrance behind cafe counter.',
                iso_offset(hours=24),
                'available',
                'vegetarian',
                'Refrigerated storage at 3°C.',
                'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
                '+1 (555) 890-1234',
                'Liam Thorne',
                iso_offset(hours=-1)
            )
        ]

        cursor.executemany("INSERT INTO food_donations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", sample_donations)

        sample_claims = [
            (
                'clm-1',
                'don-4',
                'Marcus Chen',
                'Campus Food Rescue Network',
                '+1 (555) 987-6543',
                'FS-7491',
                'In 30 minutes (van pickup)',
                'Bringing insulated transport boxes for distribution at East Hall pantry.',
                'claimed',
                iso_offset(minutes=-35),
                None
            ),
            (
                'clm-2',
                'don-6',
                'Sarah Jenkins',
                'Hope Community Shelter',
                '+1 (555) 444-2222',
                'FS-3189',
                'Completed earlier',
                'Distributed directly to 30 residents.',
                'picked_up',
                iso_offset(hours=-5),
                iso_offset(hours=-3)
            )
        ]

        cursor.executemany("INSERT INTO claims VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", sample_claims)

    conn.commit()
    conn.close()


def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = dict_factory
    return conn


class FoodSaveHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def respond_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode('utf-8'))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == '/api/health':
            self.respond_json(200, {'status': 'ok', 'app': 'FoodSave', 'time': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')})
            return

        if path == '/api/donations':
            conn = get_db()
            cursor = conn.cursor()
            
            status_filter = query.get('status', [None])[0]
            type_filter = query.get('food_type', [None])[0]
            provider_filter = query.get('provider_type', [None])[0]

            sql = """
                SELECT d.*, 
                       c.id AS claim_id, c.receiver_name, c.receiver_organization, 
                       c.receiver_phone, c.claim_code, c.estimated_pickup_time,
                       c.claimed_at, c.picked_up_at
                FROM food_donations d
                LEFT JOIN claims c ON d.id = c.donation_id AND c.status != 'cancelled'
                WHERE 1=1
            """
            params = []

            if status_filter and status_filter != 'all':
                sql += " AND d.status = ?"
                params.append(status_filter)
            if type_filter and type_filter != 'all':
                sql += " AND d.food_type = ?"
                params.append(type_filter)
            if provider_filter and provider_filter != 'all':
                sql += " AND d.provider_type = ?"
                params.append(provider_filter)

            sql += " ORDER BY CASE d.status WHEN 'available' THEN 1 WHEN 'claimed' THEN 2 ELSE 3 END, d.created_at DESC"

            cursor.execute(sql, params)
            rows = cursor.fetchall()
            conn.close()
            self.respond_json(200, {'donations': rows, 'count': len(rows)})
            return

        if path.startswith('/api/donations/'):
            donation_id = path.split('/')[-1]
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT d.*, 
                       c.id AS claim_id, c.receiver_name, c.receiver_organization, 
                       c.receiver_phone, c.claim_code, c.estimated_pickup_time,
                       c.claimed_at, c.picked_up_at
                FROM food_donations d
                LEFT JOIN claims c ON d.id = c.donation_id
                WHERE d.id = ?
            """, (donation_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                self.respond_json(200, {'donation': row})
            else:
                self.respond_json(404, {'error': 'Donation not found'})
            return

        if path == '/api/stats':
            conn = get_db()
            cursor = conn.cursor()

            # Rescued meals: claimed or picked_up
            cursor.execute("SELECT COALESCE(SUM(quantity_meals), 0), COALESCE(SUM(quantity_weight_kg), 0) FROM food_donations WHERE status IN ('claimed', 'picked_up')")
            rescued_row = cursor.fetchone()
            meals_rescued = rescued_row['COALESCE(SUM(quantity_meals), 0)']
            weight_rescued_kg = rescued_row['COALESCE(SUM(quantity_weight_kg), 0)']
            if weight_rescued_kg == 0 and meals_rescued > 0:
                weight_rescued_kg = round(meals_rescued * 0.4, 1)

            # Available meals
            cursor.execute("SELECT COALESCE(SUM(quantity_meals), 0), COUNT(*) FROM food_donations WHERE status = 'available'")
            avail_row = cursor.fetchone()
            meals_available = avail_row['COALESCE(SUM(quantity_meals), 0)']
            donations_available = avail_row['COUNT(*)']

            # Total donations
            cursor.execute("SELECT COUNT(*) FROM food_donations")
            total_donations = cursor.fetchone()['COUNT(*)']

            # Picked up donations
            cursor.execute("SELECT COUNT(*), COALESCE(SUM(quantity_meals), 0) FROM food_donations WHERE status = 'picked_up'")
            pickup_row = cursor.fetchone()
            successful_pickups = pickup_row['COUNT(*)']

            # Claims count
            cursor.execute("SELECT COUNT(*) FROM claims")
            total_claims = cursor.fetchone()['COUNT(*)']

            # Categories breakdown
            cursor.execute("SELECT food_type, COUNT(*), SUM(quantity_meals) FROM food_donations GROUP BY food_type")
            categories_breakdown = cursor.fetchall()

            # Provider breakdown
            cursor.execute("SELECT provider_type, COUNT(*), SUM(quantity_meals) FROM food_donations GROUP BY provider_type")
            providers_breakdown = cursor.fetchall()

            # Environmental calculations
            # Standard metric: 0.4 kg food per average meal
            # 2.5 kg CO2 equivalent prevented per kg of food saved
            # 500 liters of water embedded per meal rescued
            co2_prevented_kg = round(weight_rescued_kg * 2.5, 1)
            water_saved_liters = int(meals_rescued * 500)

            conn.close()

            stats = {
                'meals_rescued': meals_rescued,
                'food_available_meals': meals_available,
                'food_available_count': donations_available,
                'food_waste_prevented_kg': weight_rescued_kg,
                'co2_prevented_kg': co2_prevented_kg,
                'water_saved_liters': water_saved_liters,
                'total_donations': total_donations,
                'successful_pickups': successful_pickups,
                'total_claims': total_claims,
                'categories_breakdown': categories_breakdown,
                'providers_breakdown': providers_breakdown
            }
            self.respond_json(200, stats)
            return

        # Fallback to static files
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        payload = {}
        if body:
            try:
                payload = json.loads(body.decode('utf-8'))
            except Exception:
                pass

        if path == '/api/donations':
            # Create donation
            title = payload.get('title', '').strip()
            if not title:
                self.respond_json(400, {'error': 'Food title is required'})
                return

            meals = int(payload.get('quantity_meals', 1))
            weight = float(payload.get('quantity_weight_kg', round(meals * 0.4, 2)))
            food_type = payload.get('food_type', 'cooked_meals')
            provider_name = payload.get('provider_name', 'Campus Provider').strip()
            provider_type = payload.get('provider_type', 'college_canteen')
            pickup_address = payload.get('pickup_address', '').strip() or 'Main Campus Information Desk'
            pickup_instructions = payload.get('pickup_instructions', '')
            available_until = payload.get('available_until')
            if not available_until:
                # Default 4 hours from now
                available_until = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat().replace('+00:00', 'Z')
            
            dietary_type = payload.get('dietary_type', 'vegetarian')
            storage_notes = payload.get('storage_notes', '')
            image_url = payload.get('image_url', '').strip()
            if not image_url:
                image_url = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'
            
            contact_phone = payload.get('contact_phone', '').strip() or '+1 (555) 000-0000'
            contact_name = payload.get('contact_name', provider_name)
            description = payload.get('description', '')

            donation_id = 'don-' + uuid.uuid4().hex[:8]
            now_iso = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO food_donations (
                    id, title, description, food_type, quantity_meals, quantity_weight_kg,
                    provider_name, provider_type, pickup_address, pickup_instructions,
                    available_until, status, dietary_type, storage_notes, image_url,
                    contact_phone, contact_name, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?, ?, ?, ?)
            """, (
                donation_id, title, description, food_type, meals, weight,
                provider_name, provider_type, pickup_address, pickup_instructions,
                available_until, dietary_type, storage_notes, image_url,
                contact_phone, contact_name, now_iso
            ))
            conn.commit()
            
            # Fetch created item
            cursor.execute("SELECT * FROM food_donations WHERE id = ?", (donation_id,))
            created_item = cursor.fetchone()
            conn.close()

            self.respond_json(201, {'success': True, 'donation': created_item})
            return

        if path.endswith('/claim'):
            # Claim donation: /api/donations/<id>/claim
            parts = path.strip('/').split('/')
            if len(parts) >= 3 and parts[0] == 'api' and parts[1] == 'donations':
                donation_id = parts[2]
                receiver_name = payload.get('receiver_name', 'Community Member').strip()
                receiver_org = payload.get('receiver_organization', 'Direct Receiver').strip()
                receiver_phone = payload.get('receiver_phone', '').strip() or '+1 (555) 999-8888'
                estimated_pickup = payload.get('estimated_pickup_time', 'Within 45 minutes').strip()
                notes = payload.get('claim_notes', '').strip()

                conn = get_db()
                cursor = conn.cursor()

                # Check current status
                cursor.execute("SELECT * FROM food_donations WHERE id = ?", (donation_id,))
                donation = cursor.fetchone()
                if not donation:
                    conn.close()
                    self.respond_json(404, {'error': 'Donation not found'})
                    return

                if donation['status'] != 'available':
                    conn.close()
                    self.respond_json(400, {'error': f'Item is already {donation["status"]}'})
                    return

                claim_id = 'clm-' + uuid.uuid4().hex[:8]
                claim_code = 'FS-' + str(uuid.uuid4().int)[:4]
                now_iso = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

                cursor.execute("""
                    INSERT INTO claims (
                        id, donation_id, receiver_name, receiver_organization,
                        receiver_phone, claim_code, estimated_pickup_time, claim_notes,
                        status, claimed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'claimed', ?)
                """, (
                    claim_id, donation_id, receiver_name, receiver_org,
                    receiver_phone, claim_code, estimated_pickup, notes, now_iso
                ))

                cursor.execute("UPDATE food_donations SET status = 'claimed' WHERE id = ?", (donation_id,))
                conn.commit()

                # Return full updated item
                cursor.execute("""
                    SELECT d.*, 
                           c.id AS claim_id, c.receiver_name, c.receiver_organization, 
                           c.receiver_phone, c.claim_code, c.estimated_pickup_time,
                           c.claimed_at, c.picked_up_at
                    FROM food_donations d
                    JOIN claims c ON d.id = c.donation_id
                    WHERE d.id = ?
                """, (donation_id,))
                updated_item = cursor.fetchone()
                conn.close()

                self.respond_json(200, {
                    'success': True,
                    'message': 'Food claimed successfully!',
                    'claim_code': claim_code,
                    'donation': updated_item
                })
                return

        if path.endswith('/complete') or path.endswith('/pickup'):
            # Mark as completed/picked up
            parts = path.strip('/').split('/')
            if len(parts) >= 3 and parts[0] == 'api' and parts[1] == 'donations':
                donation_id = parts[2]
                now_iso = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("UPDATE food_donations SET status = 'picked_up' WHERE id = ?", (donation_id,))
                cursor.execute("UPDATE claims SET status = 'picked_up', picked_up_at = ? WHERE donation_id = ?", (now_iso, donation_id))
                conn.commit()

                cursor.execute("""
                    SELECT d.*, 
                           c.id AS claim_id, c.receiver_name, c.receiver_organization, 
                           c.receiver_phone, c.claim_code, c.estimated_pickup_time,
                           c.claimed_at, c.picked_up_at
                    FROM food_donations d
                    LEFT JOIN claims c ON d.id = c.donation_id
                    WHERE d.id = ?
                """, (donation_id,))
                updated_item = cursor.fetchone()
                conn.close()

                self.respond_json(200, {
                    'success': True,
                    'message': 'Pickup verified! Meals rescued count updated.',
                    'donation': updated_item
                })
                return

        if path == '/api/reset':
            init_db(force_reset=True)
            self.respond_json(200, {'success': True, 'message': 'Demo database restored to default sample data'})
            return

        self.respond_json(404, {'error': 'Endpoint not found'})


def run_server():
    init_db(force_reset=False)
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), FoodSaveHandler) as httpd:
        print(f"=====================================================")
        print(f"🌱 FoodSave Server running at http://localhost:{PORT}")
        print(f"📊 REST API endpoints available under /api/*")
        print(f"🗄️ SQLite Database: {DB_FILE}")
        print(f"=====================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")


if __name__ == '__main__':
    run_server()
