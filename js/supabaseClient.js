/**
 * FoodSave - Supabase Integration Client
 * Native fetch-based PostgREST client that connects directly to Supabase tables:
 * - food_donations
 * - users
 * - claims
 *
 * If credentials are not supplied, seamlessly signals fallback to local database.
 */

class SupabaseService {
  constructor() {
    this.storageKeyUrl = "foodsave_supabase_url";
    this.storageKeyAnonKey = "foodsave_supabase_key";
    this.url = localStorage.getItem(this.storageKeyUrl) || "";
    this.key = localStorage.getItem(this.storageKeyAnonKey) || "";
    this.isConnected = false;
  }

  isConfigured() {
    return Boolean(this.url && this.key && this.url.startsWith("http"));
  }

  saveCredentials(url, key) {
    this.url = (url || "").trim().replace(/\/$/, "");
    this.key = (key || "").trim();
    localStorage.setItem(this.storageKeyUrl, this.url);
    localStorage.setItem(this.storageKeyAnonKey, this.key);
  }

  clearCredentials() {
    this.url = "";
    this.key = "";
    localStorage.removeItem(this.storageKeyUrl);
    localStorage.removeItem(this.storageKeyAnonKey);
    this.isConnected = false;
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, message: "Supabase URL and API Key are required." };
    }
    try {
      const response = await fetch(`${this.url}/rest/v1/food_donations?select=count`, {
        method: "HEAD",
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          Prefer: "count=exact",
        },
      });
      if (response.ok) {
        this.isConnected = true;
        return { success: true, message: "Successfully connected to Supabase!" };
      } else {
        const errorText = await response.text();
        return { success: false, message: `Supabase returned status ${response.status}: ${errorText || response.statusText}` };
      }
    } catch (err) {
      return { success: false, message: `Connection failed: ${err.message}` };
    }
  }

  async fetchDonations() {
    if (!this.isConfigured()) return null;
    try {
      const response = await fetch(
        `${this.url}/rest/v1/food_donations?select=*,claims(*)&order=created_at.desc`,
        {
          headers: {
            apikey: this.key,
            Authorization: `Bearer ${this.key}`,
          },
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.map((d) => {
        const activeClaim = d.claims && d.claims.length > 0 ? d.claims[0] : null;
        return {
          ...d,
          claim_id: activeClaim?.id,
          receiver_name: activeClaim?.receiver_name,
          receiver_organization: activeClaim?.receiver_organization,
          receiver_phone: activeClaim?.receiver_phone,
          claim_code: activeClaim?.claim_code,
          estimated_pickup_time: activeClaim?.estimated_pickup_time,
          claimed_at: activeClaim?.claimed_at,
          picked_up_at: activeClaim?.picked_up_at,
        };
      });
    } catch (err) {
      console.warn("Supabase fetch error, will fallback to local store:", err);
      return null;
    }
  }

  async insertDonation(donation) {
    if (!this.isConfigured()) return null;
    try {
      const payload = { ...donation };
      delete payload.claim_id;
      delete payload.receiver_name;
      delete payload.receiver_organization;
      delete payload.receiver_phone;
      delete payload.claim_code;
      delete payload.estimated_pickup_time;

      const response = await fetch(`${this.url}/rest/v1/food_donations`, {
        method: "POST",
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: jsonSafeStringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      return rows[0];
    } catch (err) {
      console.warn("Supabase insert error:", err);
      return null;
    }
  }

  async insertClaim(claim) {
    if (!this.isConfigured()) return null;
    try {
      const response = await fetch(`${this.url}/rest/v1/claims`, {
        method: "POST",
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: jsonSafeStringify(claim),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // Update food_donations status to 'claimed'
      await fetch(
        `${this.url}/rest/v1/food_donations?id=eq.${claim.donation_id}`,
        {
          method: "PATCH",
          headers: {
            apikey: this.key,
            Authorization: `Bearer ${this.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "claimed" }),
        }
      );

      const rows = await response.json();
      return rows[0];
    } catch (err) {
      console.warn("Supabase claim insert error:", err);
      return null;
    }
  }

  async markPickedUp(donationId) {
    if (!this.isConfigured()) return null;
    try {
      const nowIso = new Date().toISOString();
      await fetch(`${this.url}/rest/v1/food_donations?id=eq.${donationId}`, {
        method: "PATCH",
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "picked_up" }),
      });

      await fetch(`${this.url}/rest/v1/claims?donation_id=eq.${donationId}`, {
        method: "PATCH",
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "picked_up", picked_up_at: nowIso }),
      });
      return true;
    } catch (err) {
      console.warn("Supabase mark picked up error:", err);
      return false;
    }
  }
}

function jsonSafeStringify(obj) {
  return JSON.stringify(obj, (key, value) => {
    if (value === undefined) return null;
    return value;
  });
}

// Global instance
window.supabaseService = new SupabaseService();
