/**
 * FoodSave - Core Application Controller
 * Handles UI interactions, filters, modals, claim workflow, and real-time updates.
 */

// Application State
const AppState = {
  currentRole: "all", // 'all' | 'provider' | 'receiver'
  activeCategory: "all",
  activeStatus: "all",
  activeDietary: "all",
  activeProviderType: "all",
  activePriority: "all",
  searchQuery: "",
  selectedImage: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
  activeClaimingDonation: null,
  activeViewingDonation: null,
};

// Ready on DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  setupRoleSwitcher();
  setupImagePresets();
  setupFormPresets();
  startCountdownTicker();

  // Initialize DB Layer
  showToast("Initializing FoodSave...", "info");
  await window.foodSaveDB.init();

  // Initialize Restaurant Hub & Auto-Dispatch
  initRestaurantHub();

  // Subscribe to changes
  window.foodSaveDB.subscribe((donations, dataSource) => {
    updateDatabaseStatusBadge(dataSource);
    renderDashboardKPIs();
    renderDonationsGrid();
    renderImpactDashboard();
  });

  // Initial renders
  updateDatabaseStatusBadge(window.foodSaveDB.dataSource);
  renderDashboardKPIs();
  renderDonationsGrid();
  renderImpactDashboard();
});

// Setup Global Event Listeners
function setupEventListeners() {
  // Navigation scrolling
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId && targetId !== "#") {
        e.preventDefault();
        const el = document.querySelector(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  // Search input with debounce
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        AppState.searchQuery = e.target.value;
        renderDonationsGrid();
      }, 200);
    });
  }

  // Category pills
  document.querySelectorAll(".pill-btn[data-category]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".pill-btn[data-category]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      AppState.activeCategory = pill.getAttribute("data-category");
      renderDonationsGrid();
    });
  });

  // Priority Filter Select
  const priorityFilter = document.getElementById("priorityFilter");
  if (priorityFilter) {
    priorityFilter.addEventListener("change", (e) => {
      AppState.activePriority = e.target.value;
      renderDonationsGrid();
    });
  }

  // Status Filter Select
  const statusFilter = document.getElementById("statusFilter");
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      AppState.activeStatus = e.target.value;
      renderDonationsGrid();
    });
  }

  // Dietary Filter Select
  const dietaryFilter = document.getElementById("dietaryFilter");
  if (dietaryFilter) {
    dietaryFilter.addEventListener("change", (e) => {
      AppState.activeDietary = e.target.value;
      renderDonationsGrid();
    });
  }

  // Provider Type Filter Select
  const providerFilter = document.getElementById("providerFilter");
  if (providerFilter) {
    providerFilter.addEventListener("change", (e) => {
      AppState.activeProviderType = e.target.value;
      renderDonationsGrid();
    });
  }

  // Post Food Form Submit
  const postForm = document.getElementById("postFoodForm");
  if (postForm) {
    postForm.addEventListener("submit", handlePostFoodSubmit);
  }

  // Auto calculate approximate weight in form
  const quantityInput = document.getElementById("postMeals");
  const weightInput = document.getElementById("postWeight");
  if (quantityInput && weightInput) {
    quantityInput.addEventListener("input", () => {
      const meals = parseFloat(quantityInput.value) || 0;
      if (!weightInput.value || weightInput.dataset.autocalc !== "false") {
        weightInput.value = (meals * 0.4).toFixed(1);
        weightInput.dataset.autocalc = "true";
      }
    });
    weightInput.addEventListener("input", () => {
      weightInput.dataset.autocalc = "false";
    });
  }

  // Claim Food Form Submit
  const claimForm = document.getElementById("claimFoodForm");
  if (claimForm) {
    claimForm.addEventListener("submit", handleClaimFoodSubmit);
  }

  // Supabase Config Form Submit
  const supabaseForm = document.getElementById("supabaseConfigForm");
  if (supabaseForm) {
    supabaseForm.addEventListener("submit", handleSupabaseConfigSubmit);
  }
}

// Role Switcher for Hackathon Demo Presentation
function setupRoleSwitcher() {
  document.querySelectorAll(".role-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".role-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      AppState.currentRole = btn.getAttribute("data-role");

      // Give quick feedback
      if (AppState.currentRole === "provider") {
        showToast("Switched to Provider View (Canteen / Kitchen Mode)", "info");
      } else if (AppState.currentRole === "receiver") {
        showToast("Switched to Receiver View (Shelter / Student Pantry Mode)", "info");
      } else {
        showToast("Switched to All Community View", "info");
      }

      renderDonationsGrid();
    });
  });
}

// Database Badge
function updateDatabaseStatusBadge(source) {
  const badge = document.getElementById("dbStatusBadge");
  if (!badge) return;

  const info = window.foodSaveDB.getDataSourceName();
  badge.innerHTML = `
    <span class="status-indicator"></span>
    <span>${info.label}</span>
  `;
  badge.className = `demo-chip ${info.statusClass}`;
}

// Render Dashboard Hero KPIs
function renderDashboardKPIs() {
  const stats = window.foodSaveDB.getImpactStats();

  const totalMealsEl = document.getElementById("kpiTotalMeals");
  const availMealsEl = document.getElementById("kpiAvailMeals");
  const wasteSavedEl = document.getElementById("kpiWasteSaved");
  const co2AvoidedEl = document.getElementById("kpiCo2Avoided");

  if (totalMealsEl) totalMealsEl.textContent = stats.meals_rescued.toLocaleString();
  if (availMealsEl) availMealsEl.textContent = stats.food_available_meals.toLocaleString();
  if (wasteSavedEl) wasteSavedEl.textContent = stats.food_waste_prevented_kg.toLocaleString() + " kg";
  if (co2AvoidedEl) co2AvoidedEl.textContent = stats.co2_prevented_kg.toLocaleString() + " kg";

  // Update hero subtext
  const heroBadgeEl = document.getElementById("heroAvailableBadge");
  if (heroBadgeEl) {
    heroBadgeEl.textContent = `🟢 ${stats.food_available_count} surplus donations ready for pickup now`;
  }
}

// Render Food Donations Grid
async function renderDonationsGrid() {
  const container = document.getElementById("donationsGrid");
  if (!container) return;

  const items = await window.foodSaveDB.getDonations({
    status: AppState.activeStatus,
    food_type: AppState.activeCategory,
    provider_type: AppState.activeProviderType,
    dietary: AppState.activeDietary,
    priority: AppState.activePriority,
    search: AppState.searchQuery,
  });

  const countBadge = document.getElementById("resultsCountBadge");
  if (countBadge) {
    countBadge.textContent = `${items.length} donation${items.length === 1 ? "" : "s"}`;
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        </div>
        <h3 class="empty-title">No Food Donations Found</h3>
        <p class="empty-desc">No surplus food listings match your current filters. Try changing filters or post a new donation!</p>
        <button class="btn-primary" onclick="openModal('postFoodModal')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Donate Surplus Food
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item) => createDonationCardHTML(item)).join("");
}

// Calculate Smart Rescue Priority
function calculateRescuePriority(item) {
  const meals = Number(item.quantity_meals) || 0;
  let diffMs = Infinity;

  if (item.available_until) {
    const target = new Date(item.available_until).getTime();
    diffMs = target - Date.now();
  }

  const hoursRemaining = diffMs / (1000 * 60 * 60);

  // Criteria specified:
  // - Expires within 2 hours OR has more than 40 meals → HIGH
  // - Expires within 5 hours OR has 20–40 meals → MEDIUM
  // - Otherwise → LOW
  if (hoursRemaining <= 2 || meals > 40) {
    return {
      level: "HIGH",
      label: "🔥 HIGH PRIORITY",
      className: "priority-high",
      badgeStyle: "background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-weight: 700;",
      score: 3
    };
  } else if (hoursRemaining <= 5 || (meals >= 20 && meals <= 40)) {
    return {
      level: "MEDIUM",
      label: "⚡ MEDIUM PRIORITY",
      className: "priority-medium",
      badgeStyle: "background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-weight: 700;",
      score: 2
    };
  } else {
    return {
      level: "LOW",
      label: "🟢 LOW PRIORITY",
      className: "priority-low",
      badgeStyle: "background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-weight: 600;",
      score: 1
    };
  }
}

// Generate Card HTML
function createDonationCardHTML(item) {
  const expiryInfo = formatCountdown(item.available_until);
  const dietaryBadge = getDietaryBadgeHTML(item.dietary_type);
  const providerTypeLabel = formatProviderType(item.provider_type);
  const categoryIcon = getCategoryIcon(item.food_type);
  const priority = calculateRescuePriority(item);

  // Status Badge
  let statusBadge = "";
  if (item.status === "available") {
    statusBadge = `
      <div class="card-status-badge status-available">
        <span class="status-dot"></span> Available
      </div>`;
  } else if (item.status === "claimed") {
    statusBadge = `
      <div class="card-status-badge status-claimed">
        🟠 Claimed (${item.claim_code || "Pending"})
      </div>`;
  } else if (item.status === "picked_up") {
    statusBadge = `
      <div class="card-status-badge status-picked_up">
        ✅ Rescued & Picked Up
      </div>`;
  }

  // Action Button Logic
  let actionButton = "";
  if (item.status === "available") {
    actionButton = `
      <button class="btn-card-action btn-claim" onclick="openClaimModal('${item.id}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>
        Claim Food Now
      </button>
    `;
  } else if (item.status === "claimed") {
    actionButton = `
      <button class="btn-card-action btn-view-pass" onclick="openPickupPassModal('${item.id}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="11" y2="16"></line></svg>
        View Pickup Pass (${item.claim_code || "Code"})
      </button>
    `;
  } else {
    actionButton = `
      <button class="btn-card-action btn-completed" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Rescue Complete (${item.quantity_meals} meals saved)
      </button>
    `;
  }

  // Claimed Receiver notice if claimed
  let claimedNotice = "";
  if (item.status === "claimed" && item.receiver_name) {
    claimedNotice = `
      <div class="card-claimed-info">
        <strong>Claimed by:</strong> ${escapeHTML(item.receiver_name)} 
        ${item.receiver_organization ? `(${escapeHTML(item.receiver_organization)})` : ""}
        <br><small>Arrival: ${escapeHTML(item.estimated_pickup_time || "Pending")}</small>
      </div>
    `;
  }

  return `
    <article class="food-card" data-id="${item.id}" data-status="${item.status}">
      <div class="card-media-wrapper">
        <img src="${escapeHTML(item.image_url)}" alt="${escapeHTML(item.title)}" class="card-image" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'">
        ${statusBadge}
        <div class="card-quantity-tag">
          ${item.quantity_meals} Meals (${item.quantity_weight_kg || (item.quantity_meals * 0.4).toFixed(1)} kg)
        </div>
        <div class="card-expiry-badge ${expiryInfo.isUrgent ? "card-expiry-urgent" : ""}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          ${expiryInfo.label}
        </div>
      </div>

      <div class="card-body">
        <div class="card-type-row">
          <span class="tag-badge ${priority.className}" style="${priority.badgeStyle}" title="Smart Rescue Priority based on expiry urgency and meal volume">${priority.label}</span>
          <span class="tag-badge tag-provider-type">${providerTypeLabel}</span>
          ${dietaryBadge}
          <span class="tag-badge" style="background:#f1f5f9; color:#475569;">${categoryIcon} ${formatFoodType(item.food_type)}</span>
        </div>

        <h3 class="card-title">${escapeHTML(item.title)}</h3>
        <p class="card-description">${escapeHTML(item.description || "Fresh surplus edible food available for immediate pickup.")}</p>

        ${claimedNotice}

        <div class="card-info-list">
          <div class="card-info-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <div>
              <strong>${escapeHTML(item.provider_name)}</strong>
              ${item.contact_name && item.contact_name !== item.provider_name ? `<span style="color:#64748b;"> (${escapeHTML(item.contact_name)})</span>` : ""}
            </div>
          </div>
          <div class="card-info-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <div>${escapeHTML(item.pickup_address)}</div>
          </div>
          <div class="card-info-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <div>Available until: <strong>${formatDateTime(item.available_until)}</strong></div>
          </div>
          ${item.storage_notes ? `
          <div class="card-info-item" style="color:#059669;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <div>${escapeHTML(item.storage_notes)}</div>
          </div>` : ""}
        </div>

        <div class="card-footer">
          ${actionButton}
        </div>
      </div>
    </article>
  `;
}

// Render Impact Dashboard
function renderImpactDashboard() {
  const stats = window.foodSaveDB.getImpactStats();

  const impactMealsRescued = document.getElementById("impactMealsRescued");
  const impactWastePrevented = document.getElementById("impactWastePrevented");
  const impactCo2Prevented = document.getElementById("impactCo2Prevented");
  const impactWaterSaved = document.getElementById("impactWaterSaved");
  const impactSuccessfulPickups = document.getElementById("impactSuccessfulPickups");
  const impactTotalDonations = document.getElementById("impactTotalDonations");

  if (impactMealsRescued) impactMealsRescued.textContent = stats.meals_rescued.toLocaleString();
  if (impactWastePrevented) impactWastePrevented.textContent = stats.food_waste_prevented_kg.toLocaleString() + " kg";
  if (impactCo2Prevented) impactCo2Prevented.textContent = stats.co2_prevented_kg.toLocaleString() + " kg";
  if (impactWaterSaved) impactWaterSaved.textContent = stats.water_saved_liters.toLocaleString() + " L";
  if (impactSuccessfulPickups) impactSuccessfulPickups.textContent = stats.successful_pickups.toLocaleString();
  if (impactTotalDonations) impactTotalDonations.textContent = stats.total_donations.toLocaleString();

  // Equivalencies
  const carMiles = Math.round(stats.co2_prevented_kg * 2.4); // ~2.4 miles of gasoline driving avoided per kg CO2e
  const showersSaved = Math.round(stats.water_saved_liters / 65); // ~65 liters per standard shower
  const familiesFed = Math.round(stats.meals_rescued / 4); // ~4 meals per family/day

  const equivCarEl = document.getElementById("equivCarMiles");
  const equivShowersEl = document.getElementById("equivShowers");
  const equivFamiliesEl = document.getElementById("equivFamilies");

  if (equivCarEl) equivCarEl.textContent = `${carMiles.toLocaleString()} miles`;
  if (equivShowersEl) equivShowersEl.textContent = `${showersSaved.toLocaleString()} showers`;
  if (equivFamiliesEl) equivFamiliesEl.textContent = `${familiesFed.toLocaleString()} families`;

  // Render Category Breakdown Bars
  renderCategoryBars(stats.categories_breakdown, stats.meals_rescued + stats.food_available_meals);

  // Render Provider Breakdown Bars
  renderProviderBars(stats.providers_breakdown, stats.meals_rescued + stats.food_available_meals);
}

function renderCategoryBars(breakdown, totalMeals) {
  const container = document.getElementById("categoryBreakdownContainer");
  if (!container) return;

  const categories = [
    { key: "cooked_meals", label: "🍲 Cooked Meals / Curries / Rice" },
    { key: "bakery", label: "🥖 Artisan Bread & Pastries" },
    { key: "fresh_produce", label: "🍎 Fresh Fruits & Vegetables" },
    { key: "dairy_beverages", label: "🥛 Dairy & Plant Drinks" },
    { key: "packaged_groceries", label: "📦 Packaged Goods" },
  ];

  const total = totalMeals > 0 ? totalMeals : 1;

  container.innerHTML = categories
    .map((cat) => {
      const count = breakdown[cat.key] || 0;
      const pct = Math.min(100, Math.round((count / total) * 100));
      return `
      <div class="bar-progress-item">
        <div class="bar-labels">
          <span>${cat.label}</span>
          <span><strong>${count} meals</strong> (${pct}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderProviderBars(breakdown, totalMeals) {
  const container = document.getElementById("providerBreakdownContainer");
  if (!container) return;

  const providers = [
    { key: "college_canteen", label: "🏫 College Dining Halls & Canteens" },
    { key: "restaurant", label: "🍽️ Restaurants & Cafeterias" },
    { key: "hostel_mess", label: "🏢 Student Hostel Messes" },
    { key: "event_catering", label: "🎉 Event & Summit Caterers" },
    { key: "supermarket", label: "🛒 Campus Grocers & Markets" },
  ];

  const total = totalMeals > 0 ? totalMeals : 1;

  container.innerHTML = providers
    .map((prov) => {
      const count = breakdown[prov.key] || 0;
      const pct = Math.min(100, Math.round((count / total) * 100));
      return `
      <div class="bar-progress-item">
        <div class="bar-labels">
          <span>${prov.label}</span>
          <span><strong>${count} meals</strong> (${pct}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, #10b981, #047857);"></div>
        </div>
      </div>
    `;
    })
    .join("");
}

// Modal Handlers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    if (modalId === "postFoodModal") {
      const availInput = document.getElementById("postAvailableUntil");
      if (availInput && !availInput.value) {
        const defaultExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000);
        const localIso = new Date(defaultExpiry.getTime() - defaultExpiry.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        availInput.value = localIso;
      }
    }
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// Close modal on clicking backdrop
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("active");
    document.body.style.overflow = "";
  }
});

// Setup Image Presets Picker in Post Food Form
function setupImagePresets() {
  const thumbs = document.querySelectorAll(".image-preset-thumb");
  const customInput = document.getElementById("postCustomImage");

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      thumbs.forEach((t) => t.classList.remove("selected"));
      thumb.classList.add("selected");
      AppState.selectedImage = thumb.getAttribute("data-img");
      if (customInput) customInput.value = "";
    });
  });

  if (customInput) {
    customInput.addEventListener("input", () => {
      if (customInput.value.trim()) {
        thumbs.forEach((t) => t.classList.remove("selected"));
        AppState.selectedImage = customInput.value.trim();
      }
    });
  }
}

// Setup Hackathon Demo 1-Click Form Presets
function setupFormPresets() {
  const container = document.getElementById("formPresetsContainer");
  if (!container || !window.FoodSaveMockData?.PRESET_DONATIONS_FOR_DEMO) return;

  const presets = window.FoodSaveMockData.PRESET_DONATIONS_FOR_DEMO;
  container.innerHTML = presets
    .map(
      (p, i) => `
      <button type="button" class="preset-chip-btn" onclick="applyFormPreset(${i})">
        ⚡ Demo: ${escapeHTML(p.title.split(":")[0])}
      </button>
    `
    )
    .join("");
}

function applyFormPreset(index) {
  const presets = window.FoodSaveMockData?.PRESET_DONATIONS_FOR_DEMO;
  if (!presets || !presets[index]) return;

  const p = presets[index];
  document.getElementById("postTitle").value = p.title;
  document.getElementById("postDescription").value = p.description;
  document.getElementById("postFoodType").value = p.food_type;
  document.getElementById("postMeals").value = p.quantity_meals;
  document.getElementById("postWeight").value = p.quantity_weight_kg;
  document.getElementById("postProviderName").value = p.provider_name;
  document.getElementById("postProviderType").value = p.provider_type;
  document.getElementById("postPickupAddress").value = p.pickup_address;
  document.getElementById("postInstructions").value = p.pickup_instructions;
  document.getElementById("postDietary").value = p.dietary_type;
  document.getElementById("postStorage").value = p.storage_notes;
  document.getElementById("postContactName").value = p.contact_name;
  document.getElementById("postContactPhone").value = p.contact_phone;

  // Set default available until 4 hours from now
  const expiryDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const localIso = new Date(expiryDate.getTime() - expiryDate.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  document.getElementById("postAvailableUntil").value = localIso;

  AppState.selectedImage = p.image_url;

  showToast(`Applied preset: ${p.title}`, "info");
}

// Handle Post Surplus Food Submission
async function handlePostFoodSubmit(e) {
  e.preventDefault();

  const title = document.getElementById("postTitle").value.trim();
  const meals = parseInt(document.getElementById("postMeals").value, 10);
  const weight = parseFloat(document.getElementById("postWeight").value) || parseFloat((meals * 0.4).toFixed(1));
  const foodType = document.getElementById("postFoodType").value;
  const providerName = document.getElementById("postProviderName").value.trim();
  const providerType = document.getElementById("postProviderType").value;
  const pickupAddress = document.getElementById("postPickupAddress").value.trim();
  const pickupInstructions = document.getElementById("postInstructions").value.trim();
  const availableUntilValue = document.getElementById("postAvailableUntil").value;
  const dietaryType = document.getElementById("postDietary").value;
  const storageNotes = document.getElementById("postStorage").value.trim();
  const contactName = document.getElementById("postContactName").value.trim() || providerName;
  const contactPhone = document.getElementById("postContactPhone").value.trim();
  const description = document.getElementById("postDescription").value.trim();

  if (!title || !meals || !providerName || !pickupAddress || !contactPhone) {
    showToast("Please fill in all required fields marked with *", "error");
    return;
  }

  const availableUntil = availableUntilValue
    ? new Date(availableUntilValue).toISOString()
    : new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

  const submitBtn = document.getElementById("postSubmitBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Saving Donation...</span>`;
  }

  try {
    const created = await window.foodSaveDB.createDonation({
      title,
      description,
      food_type: foodType,
      quantity_meals: meals,
      quantity_weight_kg: weight,
      provider_name: providerName,
      provider_type: providerType,
      pickup_address: pickupAddress,
      pickup_instructions: pickupInstructions,
      available_until: availableUntil,
      dietary_type: dietaryType,
      storage_notes: storageNotes,
      image_url: AppState.selectedImage,
      contact_phone: contactPhone,
      contact_name: contactName,
    });

    closeModal("postFoodModal");
    e.target.reset();
    showToast(`🎉 Surplus food listed! Rescued ${meals} potential meals.`, "success");

    // Scroll to available food list
    const foodListEl = document.getElementById("availableFoodSection");
    if (foodListEl) {
      foodListEl.scrollIntoView({ behavior: "smooth" });
    }
  } catch (err) {
    showToast("Failed to post food: " + err.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
        Post Surplus Food
      `;
    }
  }
}

// Open Claim Food Modal
async function openClaimModal(donationId) {
  const item = await window.foodSaveDB.getDonationById(donationId);
  if (!item) return;

  AppState.activeClaimingDonation = item;

  document.getElementById("claimFoodTitle").textContent = item.title;
  document.getElementById("claimProviderName").textContent = item.provider_name;
  document.getElementById("claimAddress").textContent = item.pickup_address;
  document.getElementById("claimQuantity").textContent = `${item.quantity_meals} meals (~${item.quantity_weight_kg || (item.quantity_meals * 0.4).toFixed(1)} kg)`;
  document.getElementById("claimExpiry").textContent = formatDateTime(item.available_until);

  openModal("claimFoodModal");
}

// Handle Claim Food Submission
async function handleClaimFoodSubmit(e) {
  e.preventDefault();

  if (!AppState.activeClaimingDonation) return;

  const receiverName = document.getElementById("claimReceiverName").value.trim();
  const receiverOrg = document.getElementById("claimReceiverOrg").value.trim();
  const receiverPhone = document.getElementById("claimReceiverPhone").value.trim();
  const estimatedTime = document.getElementById("claimEstimatedTime").value.trim();
  const notes = document.getElementById("claimNotes").value.trim();

  if (!receiverName || !receiverPhone) {
    showToast("Please provide your name and phone number for pickup verification.", "error");
    return;
  }

  const claimBtn = document.getElementById("confirmClaimBtn");
  if (claimBtn) {
    claimBtn.disabled = true;
    claimBtn.textContent = "Generating Pickup Pass...";
  }

  try {
    const res = await window.foodSaveDB.claimDonation(AppState.activeClaimingDonation.id, {
      receiver_name: receiverName,
      receiver_organization: receiverOrg,
      receiver_phone: receiverPhone,
      estimated_pickup_time: estimatedTime,
      claim_notes: notes,
    });

    closeModal("claimFoodModal");
    e.target.reset();
    showToast(`Claim confirmed! Claim Code: ${res.claim_code}`, "success");

    // Open Digital Pickup Pass Modal
    openPickupPassModal(AppState.activeClaimingDonation.id);
  } catch (err) {
    showToast("Claim error: " + err.message, "error");
  } finally {
    if (claimBtn) {
      claimBtn.disabled = false;
      claimBtn.textContent = "Confirm & Claim Surplus Food";
    }
  }
}

// Open Digital Pickup Pass Modal
async function openPickupPassModal(donationId) {
  const item = await window.foodSaveDB.getDonationById(donationId);
  if (!item) return;

  AppState.activeViewingDonation = item;

  document.getElementById("passClaimCode").textContent = item.claim_code || "FS-7491";
  document.getElementById("passFoodTitle").textContent = item.title;
  document.getElementById("passMeals").textContent = `${item.quantity_meals} Meals (${item.quantity_weight_kg || (item.quantity_meals * 0.4).toFixed(1)} kg)`;
  document.getElementById("passProvider").textContent = item.provider_name;
  document.getElementById("passPhone").textContent = item.contact_phone;
  document.getElementById("passAddress").textContent = item.pickup_address;
  document.getElementById("passInstructions").textContent = item.pickup_instructions || "Present claim code at pickup desk.";
  document.getElementById("passReceiver").textContent = `${item.receiver_name || "Community Member"} (${item.receiver_organization || "Receiver"})`;
  document.getElementById("passDeadline").textContent = formatDateTime(item.available_until);

  // Setup Call button
  const callBtn = document.getElementById("passCallProviderBtn");
  if (callBtn && item.contact_phone) {
    callBtn.href = `tel:${item.contact_phone.replace(/[^0-9+]/g, "")}`;
  }

  // Setup Mark as Complete Pickup button
  const completeBtn = document.getElementById("passMarkCompleteBtn");
  if (completeBtn) {
    if (item.status === "picked_up") {
      completeBtn.disabled = true;
      completeBtn.innerHTML = `✅ Food Successfully Picked Up & Rescued`;
      completeBtn.style.background = "#059669";
    } else {
      completeBtn.disabled = false;
      completeBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Confirm Food Picked Up (Complete Rescue)
      `;
      completeBtn.style.background = "var(--primary-600)";
      completeBtn.onclick = async () => {
        completeBtn.disabled = true;
        completeBtn.textContent = "Updating status...";
        await window.foodSaveDB.completePickup(item.id);
        showToast("🌟 Rescue complete! Total rescued count and waste prevention updated.", "success");
        closeModal("pickupPassModal");
      };
    }
  }

  openModal("pickupPassModal");
}

// Copy pickup pass instructions to clipboard
function copyPickupDetails() {
  if (!AppState.activeViewingDonation) return;
  const d = AppState.activeViewingDonation;
  const text = `🌱 FoodSave Pickup Pass
Claim Code: ${d.claim_code || "N/A"}
Food: ${d.title} (${d.quantity_meals} meals)
Provider: ${d.provider_name}
Phone: ${d.contact_phone}
Address: ${d.pickup_address}
Instructions: ${d.pickup_instructions || "None"}
Expires: ${formatDateTime(d.available_until)}`;

  navigator.clipboard.writeText(text).then(() => {
    showToast("📋 Pickup details copied to clipboard!", "success");
  });
}

// Reset Demo Data
async function resetDemoData() {
  if (confirm("Reset demo data back to initial hackathon sample state?")) {
    await window.foodSaveDB.resetToDemoData();
    showToast("Demo data restored to initial state.", "info");
  }
}

// Supabase Configuration Modal Logic
function openSupabaseModal() {
  const urlInput = document.getElementById("supabaseUrlInput");
  const keyInput = document.getElementById("supabaseKeyInput");

  if (urlInput) urlInput.value = window.supabaseService.url || "";
  if (keyInput) keyInput.value = window.supabaseService.key || "";

  openModal("supabaseModal");
}

async function handleSupabaseConfigSubmit(e) {
  e.preventDefault();
  const url = document.getElementById("supabaseUrlInput").value.trim();
  const key = document.getElementById("supabaseKeyInput").value.trim();

  const testBtn = document.getElementById("supabaseTestBtn");
  if (testBtn) testBtn.textContent = "Testing Connection...";

  window.supabaseService.saveCredentials(url, key);
  const testResult = await window.supabaseService.testConnection();

  if (testResult.success) {
    showToast("Connected to Supabase successfully!", "success");
    await window.foodSaveDB.init();
    closeModal("supabaseModal");
  } else {
    showToast(testResult.message, "error");
  }

  if (testBtn) testBtn.textContent = "Save & Connect Supabase";
}

function disconnectSupabase() {
  window.supabaseService.clearCredentials();
  window.foodSaveDB.init();
  closeModal("supabaseModal");
  showToast("Disconnected Supabase. Switched to local database.", "info");
}

// Format Countdown Timer
function formatCountdown(isoString) {
  if (!isoString) return { label: "Fresh", isUrgent: false };
  const target = new Date(isoString).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { label: "Expired", isUrgent: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0 && minutes < 45) {
    return { label: `Urgent: ${minutes}m left`, isUrgent: true };
  }
  if (hours === 0) {
    return { label: `${minutes}m left`, isUrgent: false };
  }
  if (hours < 24) {
    return { label: `${hours}h ${minutes}m left`, isUrgent: hours < 2 };
  }
  const days = Math.floor(hours / 24);
  return { label: `${days}d left`, isUrgent: false };
}

function startCountdownTicker() {
  setInterval(() => {
    // Re-render donation countdown badges every 30 seconds
    const cards = document.querySelectorAll(".food-card");
    cards.forEach((card) => {
      const id = card.getAttribute("data-id");
      const item = window.foodSaveDB.donations.find((d) => d.id === id);
      if (item && item.status === "available") {
        const badge = card.querySelector(".card-expiry-badge");
        if (badge) {
          const info = formatCountdown(item.available_until);
          badge.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${info.label}
          `;
          if (info.isUrgent) {
            badge.classList.add("card-expiry-urgent");
          } else {
            badge.classList.remove("card-expiry-urgent");
          }
        }

        // Live recalculate priority badge
        const prioBadge = card.querySelector(".tag-badge.priority-high, .tag-badge.priority-medium, .tag-badge.priority-low");
        if (prioBadge) {
          const prio = calculateRescuePriority(item);
          prioBadge.className = `tag-badge ${prio.className}`;
          prioBadge.style.cssText = prio.badgeStyle;
          prioBadge.textContent = prio.label;
        }
      }
    });
  }, 30000);
}

// Helpers
function formatFoodType(type) {
  const map = {
    cooked_meals: "Cooked Meals",
    bakery: "Bakery & Breads",
    fresh_produce: "Fresh Produce",
    dairy_beverages: "Dairy & Beverages",
    packaged_groceries: "Packaged Groceries",
  };
  return map[type] || "Food Surplus";
}

function getCategoryIcon(type) {
  const map = {
    cooked_meals: "🍲",
    bakery: "🥖",
    fresh_produce: "🍎",
    dairy_beverages: "🥛",
    packaged_groceries: "📦",
  };
  return map[type] || "🥗";
}

function formatProviderType(type) {
  const map = {
    college_canteen: "🏫 Campus Canteen",
    restaurant: "🍽️ Restaurant / Cafe",
    hostel_mess: "🏢 Hostel Mess",
    event_catering: "🎉 Event Catering",
    supermarket: "🛒 Grocer / Supermarket",
    household: "🏡 Household",
  };
  return map[type] || "🏢 Provider";
}

function getDietaryBadgeHTML(dietary) {
  if (dietary === "vegan") {
    return `<span class="tag-badge tag-dietary-vegan">🌿 Vegan</span>`;
  }
  if (dietary === "non_veg") {
    return `<span class="tag-badge tag-dietary-nonveg">🥩 Non-Veg</span>`;
  }
  return `<span class="tag-badge tag-dietary-veg">🟢 Pure Veg</span>`;
}

function formatDateTime(isoString) {
  if (!isoString) return "Today";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " (" + d.toLocaleDateString([], { month: "short", day: "numeric" }) + ")";
  } catch (e) {
    return isoString;
  }
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Toast System
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type === "success" ? "toast-success" : type === "error" ? "toast-error" : ""}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ====================================================================
   RESTAURANT OPERATING HOURS, DAILY MENU & 1-MIN AUTO-DISPATCH SYSTEM
   Scenario: Restaurant has open/close hours (e.g. 10:00 AM - 10:00 PM),
   tracks its daily menu inventory, and at closing time audits remaining
   food and automatically sends priority rescue requests to NGOs after 1 min.
   ==================================================================== */

const RestaurantState = {
  name: "Bistro Verde & Campus Dining",
  openTime: "10:00",
  closeTime: "22:00",
  isOpen: true,
  menu: [
    { id: "m1", name: "Herb Basmati Rice & Paneer Butter Curry", category: "cooked_meals", prepared: 40, sold: 26, unit: "portions", dietary: "vegetarian" },
    { id: "m2", name: "Creamy Sun-Dried Tomato Penne Pasta", category: "cooked_meals", prepared: 30, sold: 21, unit: "portions", dietary: "vegetarian" },
    { id: "m3", name: "Artisan Sourdough Loaves & Croissants", category: "bakery", prepared: 35, sold: 20, unit: "items", dietary: "vegetarian" },
    { id: "m4", name: "Crisp Garden Salad Bowls with Chickpeas", category: "fresh_produce", prepared: 20, sold: 14, unit: "bowls", dietary: "vegan" },
    { id: "m5", name: "Lentil Dal Fry & Warm Roti Packs", category: "cooked_meals", prepared: 25, sold: 16, unit: "meals", dietary: "vegetarian" }
  ],
  countdownSeconds: 60,
  countdownInterval: null,
  dispatchedDonationId: null,
  partnerNGOs: [
    { id: "ngo-1", name: "Campus Food Rescue Network", type: "Student Food Pantry", eta: "15-20 mins", vehicle: "Pantry Van #2", phone: "+1 (555) 987-6543", channel: "Push Alert & SMS", status: "pending" },
    { id: "ngo-2", name: "Hope Community Shelter & Pantry", type: "Night Shelter", eta: "25 mins", vehicle: "Transit Van", phone: "+1 (555) 444-2222", channel: "Automated API & Email", status: "pending" },
    { id: "ngo-3", name: "St. Jude Community Kitchen", type: "Soup Kitchen", eta: "35 mins", vehicle: "Volunteer Pickup", phone: "+1 (555) 333-8888", channel: "WhatsApp Alert", status: "pending" },
    { id: "ngo-4", name: "Student Union Night Pantry", type: "Emergency Food Box", eta: "10 mins", vehicle: "Trolley Volunteer", phone: "+1 (555) 123-7777", channel: "SMS Broadcast", status: "pending" }
  ]
};

function initRestaurantHub() {
  const openInput = document.getElementById("restOpenTime");
  const closeInput = document.getElementById("restCloseTime");
  if (openInput) openInput.value = RestaurantState.openTime;
  if (closeInput) closeInput.value = RestaurantState.closeTime;

  renderMenuInventoryTable();
  updateOperatingHoursLabels();

  // Check store status on clock tick
  setInterval(checkOperatingHoursTime, 30000);
}

function updateOperatingHoursLabels() {
  const lblOpen = document.getElementById("lblOpenTime");
  const lblClose = document.getElementById("lblCloseTime");
  if (lblOpen) lblOpen.textContent = formatTimeToAMPM(RestaurantState.openTime);
  if (lblClose) lblClose.textContent = formatTimeToAMPM(RestaurantState.closeTime);
}

function onOperatingHoursChanged() {
  const openInput = document.getElementById("restOpenTime");
  const closeInput = document.getElementById("restCloseTime");
  if (openInput && openInput.value) RestaurantState.openTime = openInput.value;
  if (closeInput && closeInput.value) RestaurantState.closeTime = closeInput.value;

  updateOperatingHoursLabels();
  checkOperatingHoursTime();
  showToast(`Updated hours: ${formatTimeToAMPM(RestaurantState.openTime)} – ${formatTimeToAMPM(RestaurantState.closeTime)}`, "info");
}

function checkOperatingHoursTime() {
  if (!RestaurantState.isOpen) return; // Already closed / audit in progress

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [closeH, closeM] = RestaurantState.closeTime.split(":").map(Number);
  const closeMinutes = closeH * 60 + closeM;

  const [openH, openM] = RestaurantState.openTime.split(":").map(Number);
  const openMinutes = openH * 60 + openM;

  // If past closing time
  if (currentMinutes >= closeMinutes || currentMinutes < openMinutes) {
    triggerStoreClosing(true);
  }
}

function renderMenuInventoryTable() {
  const tbody = document.getElementById("menuInventoryTableBody");
  if (!tbody) return;

  let totalPrep = 0;
  let totalSold = 0;
  let totalSurplus = 0;

  tbody.innerHTML = RestaurantState.menu.map((item) => {
    const surplus = Math.max(0, item.prepared - item.sold);
    totalPrep += item.prepared;
    totalSold += item.sold;
    totalSurplus += surplus;

    return `
      <tr>
        <td>
          <strong>${escapeHTML(item.name)}</strong>
          <span style="display:block; font-size: 0.75rem; color: #64748b;">${getDietaryBadgeHTML(item.dietary)}</span>
        </td>
        <td><span class="tag-badge" style="background:#f1f5f9; color:#475569;">${formatFoodType(item.category)}</span></td>
        <td><span class="qty-pill">${item.prepared} ${item.unit}</span></td>
        <td><span class="qty-pill" style="color: #2563eb;">${item.sold} ${item.unit}</span></td>
        <td>
          <span class="qty-surplus-pill">
            <strong>${surplus}</strong> ${item.unit} surplus
          </span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 4px;">
            <button type="button" class="btn-qty-mini" onclick="adjustMenuSold('${item.id}', -1)" title="Decrease sold (increase surplus)">−</button>
            <button type="button" class="btn-qty-mini" onclick="adjustMenuSold('${item.id}', 1)" title="Increase sold (decrease surplus)">+</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  const prepEl = document.getElementById("menuTotalPrepared");
  const soldEl = document.getElementById("menuTotalSold");
  const surplusEl = document.getElementById("menuTotalSurplusPill");

  const approxWeight = (totalSurplus * 0.4).toFixed(1);

  if (prepEl) prepEl.textContent = `${totalPrep} portions`;
  if (soldEl) soldEl.textContent = `${totalSold} portions`;
  if (surplusEl) surplusEl.textContent = `${totalSurplus} Meals (~${approxWeight} kg)`;
}

function adjustMenuSold(itemId, delta) {
  const item = RestaurantState.menu.find((m) => m.id === itemId);
  if (!item) return;

  const newSold = item.sold + delta;
  if (newSold >= 0 && newSold <= item.prepared) {
    item.sold = newSold;
    renderMenuInventoryTable();
  }
}

// Trigger Closing Time & 1-Minute Auto-Dispatch
function triggerStoreClosing(isAutoTime = false) {
  RestaurantState.isOpen = false;

  // Update UI Pills and buttons
  const pill = document.getElementById("storeStatusPill");
  const statusText = document.getElementById("storeStatusText");
  const btnClose = document.getElementById("btnSimulateClose");
  const btnReopen = document.getElementById("btnReopenStore");

  if (pill) {
    pill.className = "store-status-pill status-closed";
  }
  if (statusText) {
    statusText.textContent = `CLOSED (${formatTimeToAMPM(RestaurantState.closeTime)}) - SURPLUS AUDIT ACTIVE`;
  }
  if (btnClose) btnClose.style.display = "none";
  if (btnReopen) btnReopen.style.display = "inline-flex";

  // Calculate surplus
  let totalSurplus = 0;
  RestaurantState.menu.forEach((m) => {
    totalSurplus += Math.max(0, m.prepared - m.sold);
  });

  const dispatchSummaryEl = document.getElementById("dispatchSurplusSummary");
  if (dispatchSummaryEl) {
    dispatchSummaryEl.textContent = `${totalSurplus} Meals (~${(totalSurplus * 0.4).toFixed(1)} kg)`;
  }

  // Show countdown card
  const countdownCard = document.getElementById("dispatchCountdownCard");
  const completedCard = document.getElementById("dispatchCompletedCard");
  if (countdownCard) countdownCard.style.display = "block";
  if (completedCard) completedCard.style.display = "none";

  showToast(
    `🔴 Store closed! Remaining food analyzed: ${totalSurplus} surplus meals. 1-minute auto-dispatch to NGOs initiated.`,
    "info"
  );

  // Start 1-Minute (60-second) Countdown
  startOneMinuteAutoDispatch();
}

function startOneMinuteAutoDispatch() {
  if (RestaurantState.countdownInterval) {
    clearInterval(RestaurantState.countdownInterval);
  }

  RestaurantState.countdownSeconds = 60;
  updateCountdownUI();

  RestaurantState.countdownInterval = setInterval(() => {
    RestaurantState.countdownSeconds -= 1;
    updateCountdownUI();

    if (RestaurantState.countdownSeconds <= 0) {
      clearInterval(RestaurantState.countdownInterval);
      RestaurantState.countdownInterval = null;
      completeAutoDispatchToNGOs();
    }
  }, 1000);
}

function updateCountdownUI() {
  const digitsEl = document.getElementById("dispatchCountdownDigits");
  const barEl = document.getElementById("dispatchCountdownBar");

  const s = Math.max(0, RestaurantState.countdownSeconds);
  const minutes = Math.floor(s / 60);
  const remainder = s % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;

  if (digitsEl) digitsEl.textContent = formatted;

  const pct = Math.max(0, Math.min(100, (s / 60) * 100));
  if (barEl) barEl.style.width = `${pct}%`;
}

function fastForwardDispatch() {
  if (RestaurantState.countdownInterval) {
    clearInterval(RestaurantState.countdownInterval);
    RestaurantState.countdownInterval = null;
  }
  completeAutoDispatchToNGOs();
}

// Complete 1-Minute Auto-Dispatch to Partner NGOs
async function completeAutoDispatchToNGOs() {
  // Hide countdown, show sent card
  const countdownCard = document.getElementById("dispatchCountdownCard");
  const completedCard = document.getElementById("dispatchCompletedCard");
  if (countdownCard) countdownCard.style.display = "none";
  if (completedCard) completedCard.style.display = "block";

  // Calculate surplus details
  let totalSurplus = 0;
  const itemDescriptions = [];
  RestaurantState.menu.forEach((m) => {
    const s = Math.max(0, m.prepared - m.sold);
    if (s > 0) {
      totalSurplus += s;
      itemDescriptions.push(`${s}x ${m.name}`);
    }
  });

  const weightKg = Number((totalSurplus * 0.4).toFixed(1));
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sentMealsEl = document.getElementById("sentSurplusMeals");
  const sentTimeEl = document.getElementById("sentTimestamp");
  if (sentMealsEl) sentMealsEl.textContent = `${totalSurplus} meals (~${weightKg} kg)`;
  if (sentTimeEl) sentTimeEl.textContent = `Today at ${timeStr} (1 min after closing)`;

  // Render Partner NGOs Dispatch Grid with Sent Status
  renderNgoDispatchGrid();

  // Create a live donation entry in FoodSave
  const autoDonation = await window.foodSaveDB.createDonation({
    title: `Closing Surplus Buffet: ${itemDescriptions.slice(0, 2).join(", ")} + ${itemDescriptions.length > 2 ? itemDescriptions.length - 2 + " more" : ""}`,
    description: `Automated closing-time recovery from ${RestaurantState.name}. Audited surplus includes: ${itemDescriptions.join(", ")}. Cooked fresh today; stored in commercial warming cabinets.`,
    food_type: "cooked_meals",
    quantity_meals: totalSurplus,
    quantity_weight_kg: weightKg,
    provider_name: RestaurantState.name,
    provider_type: "restaurant",
    pickup_address: "University Boulevard, Dining Pavilion Block C, Kitchen Loading Bay",
    pickup_instructions: "Rear service entrance. Ring buzzer labeled 'Night Surplus'. Food is packed in insulated thermal bins ready for pickup.",
    available_until: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    dietary_type: "vegetarian",
    storage_notes: "Insulated hot warming cabinets (65°C)",
    image_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80",
    contact_phone: "+1 (555) 777-8899",
    contact_name: "Manager Sofia",
  });

  RestaurantState.dispatchedDonationId = autoDonation.id;

  showToast(
    `⚡ Auto-dispatch complete! Sent priority requests to 4 partner NGOs for ${totalSurplus} meals.`,
    "success"
  );
}

function renderNgoDispatchGrid() {
  const grid = document.getElementById("ngoDispatchGrid");
  if (!grid) return;

  grid.innerHTML = RestaurantState.partnerNGOs.map((ngo) => `
    <div class="ngo-card notified" id="card-${ngo.id}">
      <div class="ngo-name">
        <span>🤝</span>
        <span>${escapeHTML(ngo.name)}</span>
      </div>
      <div style="font-size: 0.8125rem; color: #475569;">${escapeHTML(ngo.type)} • ETA: <strong>${escapeHTML(ngo.eta)}</strong></div>
      <div style="font-size: 0.75rem; color: #64748b;">Vehicle: ${escapeHTML(ngo.vehicle)}</div>
      <div style="margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
        <span class="ngo-status-tag tag-notified">
          <span>✓</span> Alert Sent (${escapeHTML(ngo.channel)})
        </span>
        <a href="tel:${ngo.phone.replace(/[^0-9+]/g, "")}" style="font-size: 0.75rem; color: #047857; text-decoration: none; font-weight: 600;">Call NGO</a>
      </div>
    </div>
  `).join("");
}

// Simulate NGO Acceptance & Claim
async function simulateNgoClaim() {
  if (!RestaurantState.dispatchedDonationId) {
    showToast("No active dispatched donation to claim.", "error");
    return;
  }

  const ngo = RestaurantState.partnerNGOs[0]; // Campus Food Rescue Network
  const res = await window.foodSaveDB.claimDonation(RestaurantState.dispatchedDonationId, {
    receiver_name: "Marcus Chen",
    receiver_organization: ngo.name,
    receiver_phone: ngo.phone,
    estimated_pickup_time: `Arriving in ${ngo.eta} (${ngo.vehicle})`,
    claim_notes: "Automated closing-time dispatch response accepted.",
  });

  // Update NGO card badge
  const firstCard = document.getElementById(`card-${ngo.id}`);
  if (firstCard) {
    firstCard.style.borderColor = "#059669";
    firstCard.style.background = "#f0fdf4";
    const tag = firstCard.querySelector(".ngo-status-tag");
    if (tag) {
      tag.innerHTML = `<span>🎉</span> <strong>Accepted & Claimed (${res.claim_code})</strong>`;
      tag.style.background = "#bbf7d0";
      tag.style.color = "#14532d";
    }
  }

  showToast(`🎉 ${ngo.name} accepted the request and claimed the surplus food!`, "success");

  // Open the Digital Pickup Pass
  openPickupPassModal(RestaurantState.dispatchedDonationId);
}

// Reopen Restaurant & Reset Shift
function reopenRestaurant() {
  if (RestaurantState.countdownInterval) {
    clearInterval(RestaurantState.countdownInterval);
    RestaurantState.countdownInterval = null;
  }

  RestaurantState.isOpen = true;

  const pill = document.getElementById("storeStatusPill");
  const statusText = document.getElementById("storeStatusText");
  const btnClose = document.getElementById("btnSimulateClose");
  const btnReopen = document.getElementById("btnReopenStore");

  if (pill) {
    pill.className = "store-status-pill status-open";
  }
  if (statusText) {
    statusText.textContent = `OPEN (${formatTimeToAMPM(RestaurantState.openTime)} - ${formatTimeToAMPM(RestaurantState.closeTime)})`;
  }
  if (btnClose) btnClose.style.display = "inline-flex";
  if (btnReopen) btnReopen.style.display = "none";

  const countdownCard = document.getElementById("dispatchCountdownCard");
  const completedCard = document.getElementById("dispatchCompletedCard");
  if (countdownCard) countdownCard.style.display = "none";
  if (completedCard) completedCard.style.display = "none";

  showToast("Store reopened! Daily menu inventory ready for service.", "info");
}

function scrollToRestaurantHub() {
  const el = document.getElementById("restaurantHubSection");
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

function formatTimeToAMPM(timeStr) {
  if (!timeStr) return "10:00 PM";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}
