#!/usr/bin/env python3
"""
Generates FoodSave_Pitch_Deck.pptx
A professional 16:9 pitch deck for Prompt to Production Hackathon (NBKRIST x ISTE x Paytm)
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    # 16:9 Widescreen
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette
    DARK_BG = RGBColor(15, 23, 42)      # Slate 900
    SLATE_CARD = RGBColor(30, 41, 59)   # Slate 800
    PRIMARY = RGBColor(16, 185, 129)    # Emerald 500
    PRIMARY_LIGHT = RGBColor(52, 211, 153) # Emerald 400
    TEXT_WHITE = RGBColor(248, 250, 252) # White
    TEXT_MUTED = RGBColor(148, 163, 184) # Slate 400
    AMBER = RGBColor(245, 158, 11)       # Amber 500
    RED = RGBColor(239, 68, 68)          # Red 500

    def add_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = DARK_BG
        bg.line.fill.background()
        return bg

    def add_header(slide, tag_text, title_text, subtitle_text=""):
        # Tag pill
        tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(8), Inches(0.4))
        tf = tag_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = f"●  {tag_text.upper()}"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = PRIMARY_LIGHT

        # Title
        t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.5), Inches(0.8))
        tf_t = t_box.text_frame
        tf_t.word_wrap = True
        p_t = tf_t.paragraphs[0]
        p_t.text = title_text
        p_t.font.size = Pt(28)
        p_t.font.bold = True
        p_t.font.color.rgb = TEXT_WHITE

        # Subtitle
        if subtitle_text:
            s_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11.5), Inches(0.6))
            tf_s = s_box.text_frame
            tf_s.word_wrap = True
            p_s = tf_s.paragraphs[0]
            p_s.text = subtitle_text
            p_s.font.size = Pt(14)
            p_s.font.color.rgb = TEXT_MUTED

    def add_footer(slide, current_num, total=10):
        f_box = slide.shapes.add_textbox(Inches(0.8), Inches(6.9), Inches(11.733), Inches(0.4))
        tf = f_box.text_frame
        p = tf.paragraphs[0]
        p.text = "FoodSave — Prompt to Production Hackathon 2026"
        p.font.size = Pt(10)
        p.font.color.rgb = TEXT_MUTED
        
        # Slide number on right
        p2 = tf.add_paragraph()
        p2.alignment = PP_ALIGN.RIGHT
        p2.text = f"Slide {current_num} of {total}"
        p2.font.size = Pt(10)
        p2.font.color.rgb = PRIMARY_LIGHT

    def add_card(slide, left, top, width, height, title, desc, icon="", highlight_color=None):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        card.fill.solid()
        card.fill.fore_color.rgb = SLATE_CARD
        card.line.color.rgb = highlight_color if highlight_color else RGBColor(51, 65, 85)
        card.line.width = Pt(1.5)

        tb = slide.shapes.add_textbox(Inches(left + 0.25), Inches(top + 0.25), Inches(width - 0.5), Inches(height - 0.5))
        tf = tb.text_frame
        tf.word_wrap = True
        
        if icon:
            p_icon = tf.paragraphs[0]
            p_icon.text = icon
            p_icon.font.size = Pt(22)
            p_title = tf.add_paragraph()
        else:
            p_title = tf.paragraphs[0]
            
        p_title.text = title
        p_title.font.size = Pt(16)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE
        p_title.space_after = Pt(8)

        p_desc = tf.add_paragraph()
        p_desc.text = desc
        p_desc.font.size = Pt(12)
        p_desc.font.color.rgb = TEXT_MUTED
        return card

    # ==================== SLIDE 1: Title Slide ====================
    s1 = prs.slides.add_slide(blank_layout)
    add_bg(s1)
    
    t_box = s1.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(11.3), Inches(3.5))
    tf = t_box.text_frame
    tf.word_wrap = True
    
    p0 = tf.paragraphs[0]
    p0.text = "PROMPT TO PRODUCTION HACKATHON"
    p0.font.size = Pt(14)
    p0.font.bold = True
    p0.font.color.rgb = PRIMARY_LIGHT
    p0.space_after = Pt(14)

    p1 = tf.add_paragraph()
    p1.text = "FoodSave 🌱"
    p1.font.size = Pt(54)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE
    p1.space_after = Pt(12)

    p2 = tf.add_paragraph()
    p2.text = "AI-Assisted Surplus Food Rescue & NGO Auto-Dispatch Platform"
    p2.font.size = Pt(22)
    p2.font.color.rgb = PRIMARY_LIGHT
    p2.space_after = Pt(24)

    p3 = tf.add_paragraph()
    p3.text = "Presenter: Hemanth Kumar Puthuru   |   Organizers: NBKRIST × ISTE × Paytm"
    p3.font.size = Pt(14)
    p3.font.color.rgb = TEXT_MUTED

    add_footer(s1, 1)

    # ==================== SLIDE 2: Problem Statement ====================
    s2 = prs.slides.add_slide(blank_layout)
    add_bg(s2)
    add_header(s2, "The Challenge", "The Real-World Crisis: Closing-Time Food Waste", 
               "Millions of tons of edible food end up in landfills while local shelters face acute shortages.")
    
    add_card(s2, 0.8, 2.4, 3.6, 4.0, "Closing-Time Waste", 
             "College canteens, hostel messes, restaurants, and caterers prepare bulk food daily. At closing, large batches of untouched edible food are thrown out because keeping it overnight is infeasible.", 
             "🗑️")
    add_card(s2, 4.8, 2.4, 3.6, 4.0, "Coordination Bottleneck", 
             "Food providers lack an automated channel to log leftover surplus during closing rush. Community shelters and NGOs have zero real-time visibility to dispatch volunteers before food spoils.", 
             "⏳")
    add_card(s2, 8.8, 2.4, 3.6, 4.0, "Severe Carbon Footprint", 
             "Landfilled food decomposes anaerobically into methane—a greenhouse gas 28x more potent than CO2. Every 1 kg of wasted food produces ~2.5 kg of CO2 equivalent emissions.", 
             "🌍")
    add_footer(s2, 2)

    # ==================== SLIDE 3: The Solution ====================
    s3 = prs.slides.add_slide(blank_layout)
    add_bg(s3)
    add_header(s3, "Our Solution", "Introducing FoodSave", 
               "An intelligent, responsive web platform bridging surplus food providers with receivers in under 60 seconds.")
    
    add_card(s3, 0.8, 2.4, 5.6, 4.0, "Key Value Propositions",
             "• Closing-Time Auto-Dispatch: Automatically triggers partner NGO rescue requests when kitchens close.\n\n"
             "• Smart Rescue Priority Engine: Algorithmic urgency ranking (HIGH / MEDIUM / LOW) based on time-to-expiry and volume.\n\n"
             "• Zero-Friction Posting: 1-click presets for college canteens, bakery surplus, and hostels.\n\n"
             "• 100% Dynamic Impact Analytics: Verifiable carbon offset and meals rescued metrics.",
             "⚡", PRIMARY)
    
    add_card(s3, 6.8, 2.4, 5.6, 4.0, "The Closed-Loop Rescue Model",
             "1. Food Center Closes ➔ Live menu audited for remaining unsold batches.\n\n"
             "2. 60-Second Countdown ➔ Automated dispatch broadcast sent to 4 partner NGOs.\n\n"
             "3. 1-Click NGO Claim ➔ Generates cryptographic 6-digit Digital Pickup Pass.\n\n"
             "4. Physical Handover ➔ Receiver confirms pickup, updating community impact in real-time.",
             "🔄")
    add_footer(s3, 3)

    # ==================== SLIDE 4: Feature 1 ====================
    s4 = prs.slides.add_slide(blank_layout)
    add_bg(s4)
    add_header(s4, "Core Innovation", "Restaurant Closing & 60-Second Auto-Dispatch", 
               "Solving the real-world scenario: Automatic inventory audit and broadcast alerts right at closing.")
    
    add_card(s4, 0.8, 2.4, 3.6, 4.0, "1. Operating Hours & Menu",
             "Configurable operating hours (e.g., 10:00 AM – 10:00 PM). Tracks daily prepared batches against portions sold across menu items (Biryani, Pasta, Bakery, Salads).",
             "🕒")
    add_card(s4, 4.8, 2.4, 3.6, 4.0, "2. Closing Surplus Audit",
             "When closing time hits (or via 1-click test button), the engine analyzes remaining portions, calculates total surplus weight (~kg), and checks storage compliance.",
             "📊")
    add_card(s4, 8.8, 2.4, 3.6, 4.0, "3. 60-Second Countdown",
             "Visual 1-minute countdown timer. At 00:00, automated broadcast dispatch alerts are pushed to registered partner charities (Campus Food Rescue, Hope Shelter, St. Jude).",
             "🚀", PRIMARY)
    add_footer(s4, 4)

    # ==================== SLIDE 5: Feature 2 ====================
    s5 = prs.slides.add_slide(blank_layout)
    add_bg(s5)
    add_header(s5, "Algorithmic Prioritization", "Smart Rescue Priority Engine", 
               "Dynamic urgency calculation ensures food closest to expiry is prioritized for rescue.")
    
    add_card(s5, 0.8, 2.4, 3.6, 4.0, "🔥 HIGH PRIORITY",
             "Criteria: Expires in ≤ 2 hours OR has > 40 meals.\n\n"
             "Highlighted with prominent red badge (#fee2e2 / #b91c1c). Automatically sorted to the top of the feed to dispatch urgent rescue vans.",
             "", RED)
    add_card(s5, 4.8, 2.4, 3.6, 4.0, "⚡ MEDIUM PRIORITY",
             "Criteria: Expires in ≤ 5 hours OR has 20–40 meals.\n\n"
             "Highlighted with amber badge (#fef3c7 / #b45309). Queued for scheduled volunteer collection rounds.",
             "", AMBER)
    add_card(s5, 8.8, 2.4, 3.6, 4.0, "🟢 LOW PRIORITY",
             "Criteria: Standard expiry window (> 5 hours) & regular portions.\n\n"
             "Highlighted with soft green badge (#f0fdf4 / #166534). Ideal for pantry consolidation or next-morning distribution.",
             "", PRIMARY)
    add_footer(s5, 5)

    # ==================== SLIDE 6: Feature 3 ====================
    s6 = prs.slides.add_slide(blank_layout)
    add_bg(s6)
    add_header(s6, "Volunteer & Shelter UX", "Claim Food & Digital Pickup Pass", 
               "A streamlined workflow preventing confusion and establishing chain of custody.")
    
    add_card(s6, 0.8, 2.4, 5.6, 4.0, "Frictionless Claim Flow",
             "• 2-Click Claiming: Receivers enter organization name and estimated arrival time.\n\n"
             "• Instant Status Flip: Updates listing status from Available to Claimed instantly.\n\n"
             "• One-Click Direct Calling: Tapping 'Call Provider' opens native phone dialer to reach kitchen manager directly.\n\n"
             "• Copy Pickup Instructions: 1-click copy formatted address, loading dock gate, and contact info for WhatsApp/SMS dispatch.",
             "🎫")
    add_card(s6, 6.8, 2.4, 5.6, 4.0, "Digital Pass Verification",
             "• Cryptographic 6-Digit Code: Generates verified pass token (e.g. FS-8291) to prevent double claims.\n\n"
             "• Physical Handover Loop: Receiver clicks 'Confirm Food Picked Up' upon arrival.\n\n"
             "• Immediate Metric Attribution: Instantly closes the rescue loop and feeds data into the community impact dashboard.",
             "🔒", PRIMARY)
    add_footer(s6, 6)

    # ==================== SLIDE 7: Feature 4 ====================
    s7 = prs.slides.add_slide(blank_layout)
    add_bg(s7)
    add_header(s7, "Verifiable Analytics", "Dynamic Impact & Carbon Dashboard", 
               "100% dynamically calculated metrics using official EPA WARM emissions algorithms.")
    
    # 4 Stat Cards
    add_card(s7, 0.8, 2.4, 2.7, 1.8, "Meals Rescued", "Live sum of all claimed & picked-up meals.", "🍲")
    add_card(s7, 3.8, 2.4, 2.7, 1.8, "Meals Available", "Real-time count of active available surplus.", "🟢")
    add_card(s7, 6.8, 2.4, 2.7, 1.8, "Waste Diverted", "Calculated as 0.4 kg per meal or logged kg.", "⚖️")
    add_card(s7, 9.8, 2.4, 2.7, 1.8, "CO2 Emissions Saved", "EPA WARM standard: 2.5 kg CO2e per kg food.", "🌱")

    # Lower Explanation Card
    add_card(s7, 0.8, 4.5, 11.7, 1.9, "Environmental Equivalency Translators",
             "• 🚗 Gasoline Passenger Vehicle Miles: Translates diverted CO2 into equivalent vehicle miles prevented.\n"
             "• 🚿 Clean Water Conserved: Tracks agricultural water embedded in rescued produce, grains, and dairy.\n"
             "• 👨‍👩‍👧‍👦 Family Days Nourished: Converts rescued meal counts into daily nutritional stability units.",
             "📈")
    add_footer(s7, 7)

    # ==================== SLIDE 8: Architecture ====================
    s8 = prs.slides.add_slide(blank_layout)
    add_bg(s8)
    add_header(s8, "Under The Hood", "Technical Architecture & Dual-Database", 
               "Engineered for zero-setup local hackathon demos with seamless cloud production scaling.")
    
    add_card(s8, 0.8, 2.4, 3.6, 4.0, "Frontend Stack",
             "• Responsive Semantic HTML5 & CSS3\n\n"
             "• Vanilla Modern JavaScript (ES6+)\n\n"
             "• Zero Heavy Framework Overheads\n\n"
             "• Fast Mobile & Desktop Rendering\n\n"
             "• 30-Second Dynamic Live Countdown Tickers",
             "💻")
    add_card(s8, 4.8, 2.4, 3.6, 4.0, "Python REST Backend",
             "• Python 3 lightweight HTTP server\n\n"
             "• SQLite persistent storage (foodsave.db)\n\n"
             "• Fast REST API endpoints (/api/donations, /api/claims, /api/stats)\n\n"
             "• Automatic database migration & seed logic",
             "⚙️")
    add_card(s8, 8.8, 2.4, 3.6, 4.0, "Cloud Scalability (Supabase)",
             "• Full PostgreSQL cloud migration schema\n\n"
             "• Row-Level Security (RLS) policies\n\n"
             "• 1-Click UI toggle between local & Supabase\n\n"
             "• LocalStorage offline client fallback",
             "☁️", PRIMARY)
    add_footer(s8, 8)

    # ==================== SLIDE 9: AI & Prompts ====================
    s9 = prs.slides.add_slide(blank_layout)
    add_bg(s9)
    add_header(s9, "Prompt to Production", "Prompt Architecture & AI Strategy", 
               "Structured prompt engineering powering automated food classification and partner dispatches.")
    
    add_card(s9, 0.8, 2.4, 5.6, 4.0, "Prompt Engineering Pipelines",
             "1. Surplus Extraction Pipeline:\n"
             "Ingests kitchen inventory logs and extracts dish names, dietary flags (Veg/Vegan/Non-Veg), and meal counts using strict JSON schemas.\n\n"
             "2. Food Safety & Temperature Advisor:\n"
             "Applies safety prompts to append temperature guidance (e.g. 'Maintain hot hold >65°C' or 'Refrigerate at <4°C').\n\n"
             "3. Automated NGO Broadcast Generation:\n"
             "Generates concise, actionable dispatch alerts with pickup time windows, vehicle recommendations, and direct contact buttons.",
             "🤖", PRIMARY)
    
    add_card(s9, 6.8, 2.4, 5.6, 4.0, "Prompt Architecture Sample",
             "SYSTEM: 'You are the FoodSave AI Dispatch Engine. Given closing inventory deltas, audit edible surplus, calculate rescue priority, and formulate structured dispatch alerts.'\n\n"
             "INPUT: { dish: 'Campus Vegetable Biryani', remaining: 45, closed_at: '22:00' }\n\n"
             "OUTPUT: {\n"
             "  priority: 'HIGH',\n"
             "  meals: 45,\n"
             "  temp_guideline: 'Insulated hot box >65°C',\n"
             "  recipient: 'Hope Community Shelter',\n"
             "  dispatch_in_seconds: 60\n"
             "}",
             "📝")
    add_footer(s9, 9)

    # ==================== SLIDE 10: Conclusion ====================
    s10 = prs.slides.add_slide(blank_layout)
    add_bg(s10)
    
    t_box = s10.shapes.add_textbox(Inches(1.0), Inches(1.5), Inches(11.3), Inches(4.5))
    tf = t_box.text_frame
    tf.word_wrap = True
    
    p0 = tf.paragraphs[0]
    p0.text = "MISSION & VISION"
    p0.font.size = Pt(13)
    p0.font.bold = True
    p0.font.color.rgb = PRIMARY_LIGHT
    p0.space_after = Pt(12)

    p1 = tf.add_paragraph()
    p1.text = "Saving Food. Nourishing Lives. Protecting the Planet."
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE
    p1.space_after = Pt(18)

    p2 = tf.add_paragraph()
    p2.text = (
        "FoodSave turns unavoidable closing-time leftovers into an automated community lifeline.\n"
        "By combining automated inventory auditing, algorithmic priority ranking, and verified digital pickup passes,\n"
        "we make zero food waste achievable for campuses, canteens, and communities."
    )
    p2.font.size = Pt(16)
    p2.font.color.rgb = TEXT_MUTED
    p2.space_after = Pt(28)

    p3 = tf.add_paragraph()
    p3.text = "🚀 GitHub: github.com/HEMANTHKUMAR0009/FoodSave   |   Live Demo Available"
    p3.font.size = Pt(16)
    p3.font.bold = True
    p3.font.color.rgb = PRIMARY_LIGHT

    add_footer(s10, 10)

    # Save
    output_path = "FoodSave_Pitch_Deck.pptx"
    prs.save(output_path)
    print(f"Successfully generated {output_path}")

if __name__ == "__main__":
    create_deck()
