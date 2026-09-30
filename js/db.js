/**
 * FoodSave - Unified Database Layer
 * Intelligently switches between:
 *  1. Supabase (if user configured)
 *  2. Local Python Server REST API (/api/* backed by SQLite)
 *  3. LocalStorage persistence (instant fallback if running standalone)
 */

class FoodSaveDB {
  constructor() {
    this.storageKey = "foodsave_local_donations_v1";
    this.dataSource = "detecting"; // 'supabase' | 'sqlite_api' | 'local_storage'
    this.donations = [];
    this.listeners = [];
  }

  async init() {
    // 1. Try Supabase if configured
    if (window.supabaseService && window.supabaseService.isConfigured()) {
      const sbItems = await window.supabaseService.fetchDonations();
      if (sbItems) {
        this.dataSource = "supabase";
        this.donations = sbItems;
        this.notify();
        return;
      }
    }

    // 2. Try Python SQLite REST API
    try {
      const res = await fetch("/api/donations", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.donations)) {
          this.dataSource = "sqlite_api";
          this.donations = data.donations;
          this.notify();
          return;
        }
      }
    } catch (e) {
      // Local API not responding (e.g. opened directly as file:// or offline)
    }

    // 3. Fallback to LocalStorage + Mock Data
    this.dataSource = "local_storage";
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.donations = JSON.parse(stored);
      } catch (err) {
        this.donations = this.getSeedData();
        this.saveLocalStorage();
      }
    } else {
      this.donations = this.getSeedData();
      this.saveLocalStorage();
    }
    this.notify();
  }

  getSeedData() {
    if (window.FoodSaveMockData && Array.isArray(window.FoodSaveMockData.SAMPLE_DONATIONS)) {
      return JSON.parse(JSON.stringify(window.FoodSaveMockData.SAMPLE_DONATIONS));
    }
    return [];
  }

  saveLocalStorage() {
    if (this.dataSource === "local_storage") {
      localStorage.setItem(this.storageKey, JSON.stringify(this.donations));
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.donations, this.dataSource);
      } catch (e) {
        console.error("Listener error:", e);
      }
    });
  }

  getDataSourceName() {
    switch (this.dataSource) {
      case "supabase":
        return { label: "Supabase Cloud DB", statusClass: "badge-supabase", icon: "cloud" };
      case "sqlite_api":
        return { label: "Local SQLite API", statusClass: "badge-sqlite", icon: "database" };
      default:
        return { label: "Local Demo Storage", statusClass: "badge-local", icon: "hard-drive" };
    }
  }

  async getDonations(filters = {}) {
    let list = [...this.donations];

    if (filters.status && filters.status !== "all") {
      list = list.filter((item) => item.status === filters.status);
    }

    if (filters.food_type && filters.food_type !== "all") {
      list = list.filter((item) => item.food_type === filters.food_type);
    }

    if (filters.provider_type && filters.provider_type !== "all") {
      list = list.filter((item) => item.provider_type === filters.provider_type);
    }

    if (filters.dietary && filters.dietary !== "all") {
      list = list.filter((item) => item.dietary_type === filters.dietary);
    }

    if (filters.priority && filters.priority !== "all") {
      list = list.filter((item) => {
        const meals = Number(item.quantity_meals) || 0;
        let diffMs = Infinity;
        if (item.available_until) {
          diffMs = new Date(item.available_until).getTime() - Date.now();
        }
        const hours = diffMs / (1000 * 60 * 60);
        let prio = "LOW";
        if (hours <= 2 || meals > 40) prio = "HIGH";
        else if (hours <= 5 || (meals >= 20 && meals <= 40)) prio = "MEDIUM";
        return prio === filters.priority;
      });
    }

    if (filters.search && filters.search.trim()) {
      const query = filters.search.toLowerCase().trim();
      list = list.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.provider_name && item.provider_name.toLowerCase().includes(query)) ||
          (item.pickup_address && item.pickup_address.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query))
      );
    }

    // Sort order:
    // 1. Available first, then claimed, then completed/picked_up
    // 2. For available items: Smart Rescue Priority (High -> Medium -> Low), then closest to expiry!
    // 3. For claimed/picked_up: newer first
    list.sort((a, b) => {
      const score = (s) => (s === "available" ? 0 : s === "claimed" ? 1 : 2);
      if (score(a.status) !== score(b.status)) {
        return score(a.status) - score(b.status);
      }

      if (a.status === "available" && b.status === "available") {
        const getPrioScore = (item) => {
          const meals = Number(item.quantity_meals) || 0;
          let diffMs = Infinity;
          if (item.available_until) {
            diffMs = new Date(item.available_until).getTime() - Date.now();
          }
          const hours = diffMs / (1000 * 60 * 60);
          if (hours <= 2 || meals > 40) return 3;
          if (hours <= 5 || (meals >= 20 && meals <= 40)) return 2;
          return 1;
        };

        const prioA = getPrioScore(a);
        const prioB = getPrioScore(b);
        if (prioB !== prioA) {
          return prioB - prioA; // Higher priority (HIGH = 3) first
        }

        // Closest to expiry first
        const expA = a.available_until ? new Date(a.available_until).getTime() : Infinity;
        const expB = b.available_until ? new Date(b.available_until).getTime() : Infinity;
        if (expA !== expB) {
          return expA - expB;
        }
      }

      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return list;
  }

  async getDonationById(id) {
    return this.donations.find((d) => d.id === id) || null;
  }

  async createDonation(data) {
    const newDonation = {
      id: "don-" + Math.random().toString(36).substring(2, 9),
      title: data.title,
      description: data.description || "",
      food_type: data.food_type || "cooked_meals",
      quantity_meals: Number(data.quantity_meals) || 1,
      quantity_weight_kg: Number(data.quantity_weight_kg) || Number((data.quantity_meals * 0.4).toFixed(1)),
      provider_name: data.provider_name || "Campus Provider",
      provider_type: data.provider_type || "college_canteen",
      pickup_address: data.pickup_address || "Main Campus Entrance",
      pickup_instructions: data.pickup_instructions || "",
      available_until: data.available_until || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      status: "available",
      dietary_type: data.dietary_type || "vegetarian",
      storage_notes: data.storage_notes || "Insulated container",
      image_url:
        data.image_url ||
        "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
      contact_phone: data.contact_phone || "+1 (555) 000-0000",
      contact_name: data.contact_name || data.provider_name,
      created_at: new Date().toISOString(),
    };

    // 1. Supabase
    if (this.dataSource === "supabase" && window.supabaseService) {
      const created = await window.supabaseService.insertDonation(newDonation);
      if (created) {
        this.donations.unshift(created);
        this.notify();
        return created;
      }
    }

    // 2. Python REST API
    if (this.dataSource === "sqlite_api") {
      try {
        const res = await fetch("/api/donations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newDonation),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.donation) {
            this.donations.unshift(result.donation);
            this.notify();
            return result.donation;
          }
        }
      } catch (e) {
        console.warn("API write failed, using local memory:", e);
      }
    }

    // 3. Local state fallback
    this.donations.unshift(newDonation);
    this.saveLocalStorage();
    this.notify();
    return newDonation;
  }

  async claimDonation(donationId, claimData) {
    const claimCode = "FS-" + Math.floor(1000 + Math.random() * 9000);
    const nowIso = new Date().toISOString();

    const claimRecord = {
      id: "clm-" + Math.random().toString(36).substring(2, 9),
      donation_id: donationId,
      receiver_name: claimData.receiver_name || "Community Member",
      receiver_organization: claimData.receiver_organization || "Direct Receiver",
      receiver_phone: claimData.receiver_phone || "+1 (555) 000-0000",
      claim_code: claimCode,
      estimated_pickup_time: claimData.estimated_pickup_time || "Within 45 minutes",
      claim_notes: claimData.claim_notes || "",
      status: "claimed",
      claimed_at: nowIso,
    };

    // 1. Supabase
    if (this.dataSource === "supabase" && window.supabaseService) {
      await window.supabaseService.insertClaim(claimRecord);
      const target = this.donations.find((d) => d.id === donationId);
      if (target) {
        Object.assign(target, claimRecord, { status: "claimed" });
        this.notify();
      }
      return { success: true, claim_code: claimCode, donation: target };
    }

    // 2. Python API
    if (this.dataSource === "sqlite_api") {
      try {
        const res = await fetch(`/api/donations/${donationId}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(claimRecord),
        });
        if (res.ok) {
          const result = await res.json();
          const idx = this.donations.findIndex((d) => d.id === donationId);
          if (idx !== -1 && result.donation) {
            this.donations[idx] = result.donation;
          }
          this.notify();
          return { success: true, claim_code: result.claim_code, donation: result.donation };
        }
      } catch (e) {
        console.warn("API claim error, fallback to local:", e);
      }
    }

    // 3. Local fallback
    const target = this.donations.find((d) => d.id === donationId);
    if (!target) throw new Error("Donation not found");
    if (target.status !== "available") throw new Error("Donation is no longer available");

    Object.assign(target, claimRecord, { status: "claimed" });
    this.saveLocalStorage();
    this.notify();
    return { success: true, claim_code: claimCode, donation: target };
  }

  async completePickup(donationId) {
    const nowIso = new Date().toISOString();

    // 1. Supabase
    if (this.dataSource === "supabase" && window.supabaseService) {
      await window.supabaseService.markPickedUp(donationId);
      const target = this.donations.find((d) => d.id === donationId);
      if (target) {
        target.status = "picked_up";
        target.picked_up_at = nowIso;
        this.notify();
      }
      return true;
    }

    // 2. Python API
    if (this.dataSource === "sqlite_api") {
      try {
        const res = await fetch(`/api/donations/${donationId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const result = await res.json();
          const idx = this.donations.findIndex((d) => d.id === donationId);
          if (idx !== -1 && result.donation) {
            this.donations[idx] = result.donation;
          }
          this.notify();
          return true;
        }
      } catch (e) {
        console.warn("API complete error:", e);
      }
    }

    // 3. Local fallback
    const target = this.donations.find((d) => d.id === donationId);
    if (target) {
      target.status = "picked_up";
      target.picked_up_at = nowIso;
      this.saveLocalStorage();
      this.notify();
      return true;
    }
    return false;
  }

  getImpactStats() {
    let mealsRescued = 0;
    let mealsAvailable = 0;
    let donationsAvailable = 0;
    let successfulPickups = 0;
    let totalDonations = this.donations.length;
    let totalWeightKg = 0;

    const categoriesCount = {};
    const providersCount = {};

    this.donations.forEach((d) => {
      const meals = Number(d.quantity_meals) || 0;
      const weight = Number(d.quantity_weight_kg) || Number((meals * 0.4).toFixed(1));

      // Category breakdown
      const cat = d.food_type || "other";
      categoriesCount[cat] = (categoriesCount[cat] || 0) + meals;

      // Provider breakdown
      const prov = d.provider_type || "other";
      providersCount[prov] = (providersCount[prov] || 0) + meals;

      if (d.status === "available") {
        mealsAvailable += meals;
        donationsAvailable += 1;
      } else if (d.status === "claimed" || d.status === "picked_up") {
        mealsRescued += meals;
        totalWeightKg += weight;
        if (d.status === "picked_up") {
          successfulPickups += 1;
        }
      }
    });

    if (totalWeightKg === 0 && mealsRescued > 0) {
      totalWeightKg = Number((mealsRescued * 0.4).toFixed(1));
    }

    // Formulas:
    // Food waste prevented in kg
    const wastePreventedKg = Number(totalWeightKg.toFixed(1));
    // CO2 avoided: ~2.5 kg CO2e per kg food waste avoided
    const co2PreventedKg = Number((wastePreventedKg * 2.5).toFixed(1));
    // Water saved: ~500 liters per meal
    const waterSavedLiters = Math.round(mealsRescued * 500);

    return {
      meals_rescued: mealsRescued,
      food_available_meals: mealsAvailable,
      food_available_count: donationsAvailable,
      food_waste_prevented_kg: wastePreventedKg,
      co2_prevented_kg: co2PreventedKg,
      water_saved_liters: waterSavedLiters,
      total_donations: totalDonations,
      successful_pickups: successfulPickups,
      categories_breakdown: categoriesCount,
      providers_breakdown: providersCount,
    };
  }

  async resetToDemoData() {
    if (this.dataSource === "sqlite_api") {
      try {
        await fetch("/api/reset", { method: "POST" });
        await this.init();
        return;
      } catch (e) {
        console.warn("API reset error:", e);
      }
    }

    this.donations = this.getSeedData();
    this.saveLocalStorage();
    this.notify();
  }
}

// Global instance
window.foodSaveDB = new FoodSaveDB();
