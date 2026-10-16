/**
 * MAINTENANCE MANAGEMENT SYSTEM (MMS)
 * Interactive Engine & Reactive State Store
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. INITIAL SEED DATABASE (Default Industrial Manufacturing Demonstration Data)
  // =========================================================================
  const INITIAL_STATE = {
    currentUser: {
      id: 'USR-01',
      name: 'Siti Humairah',
      initials: 'SH',
      role: 'Administrator',
      email: 'siti.humairah@industrialmms.com',
      department: 'Central Maintenance Engineering'
    },
    usersList: [
      {
        id: 'USR-01',
        name: 'Siti Humairah',
        initials: 'SH',
        role: 'Administrator',
        email: 'siti.humairah@industrialmms.com',
        department: 'Central Maintenance Engineering'
      },
      {
        id: 'USR-02',
        name: 'Ahmad Firdaus',
        initials: 'AF',
        role: 'Technician',
        email: 'ahmad.firdaus@industrialmms.com',
        department: 'Plant Mechanical Operations'
      },
      {
        id: 'USR-03',
        name: 'Razak bin Ismail',
        initials: 'RI',
        role: 'Technician',
        email: 'razak.ismail@industrialmms.com',
        department: 'Shift B Maintenance Crew'
      }
    ],
    technicians: [],
    breakdowns: [],
    preventiveMaintenance: [],
    spareParts: [],
    stockMovements: [],
    stockRequests: [],
    notifications: [
      {
        id: 'NT-902',
        title: 'PM Task Due Soon',
        message: 'Stamping Press Line 01 hydraulic inspection is scheduled for today shift.',
        time: '35 mins ago',
        unread: true,
        targetView: 'maintenance',
        recordId: 'PM-802'
      },
      {
        id: 'NT-903',
        title: 'Inventory Alert',
        message: 'Low stock thresholds monitored automatically via Google Sheets backend.',
        time: '1 hr ago',
        unread: true,
        targetView: 'spareparts',
        recordId: ''
      },
      {
        id: 'NT-904',
        title: 'Maintenance Completed',
        message: 'Air Filter PM on Compressor Unit 01 completed by Kumar Sanjeev with zero anomalies.',
        time: '3 hrs ago',
        unread: false,
        targetView: 'maintenance',
        recordId: 'PM-795'
      }
    ]
  };

  // State Management with LocalStorage persistence
  const STORAGE_KEY = 'mms_dashboard_state_v1';
  const KNOWN_DEMO_BD_IDS = [
    'BD-2026-098', 'BD-2026-099', 'BD-2026-100',
    'BD-2026-101', 'BD-2026-102', 'BD-2026-103',
    'BD-2026-104', 'BD-2026-105'
  ];
  const KNOWN_DEMO_SP_CODES = [
    'SP-301', 'SP-302', 'SP-303', 'SP-304', 'SP-305',
    'SP-306', 'SP-307', 'SP-308', 'SP-309'
  ];
  let state = {};

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        state = JSON.parse(stored);
        // Completely purge demo breakdown records from cached local storage
        if (Array.isArray(state.breakdowns)) {
          state.breakdowns = state.breakdowns.filter(b => !KNOWN_DEMO_BD_IDS.includes(b.id));
        } else {
          state.breakdowns = [];
        }

        // Completely purge demo PM records from cached local storage
        const KNOWN_DEMO_PM_IDS = ['PM-801', 'PM-802', 'PM-803', 'PM-804', 'PM-805', 'PM-806', 'PM-807', 'PM-808', 'PM-809', 'PM-810', 'PM-811', 'PM-812', 'PM-795', 'PM-796'];
        if (Array.isArray(state.preventiveMaintenance)) {
          state.preventiveMaintenance = state.preventiveMaintenance.filter(p => !KNOWN_DEMO_PM_IDS.includes(p.id || p.pmCode));
        } else {
          state.preventiveMaintenance = [];
        }
        // Completely purge demo technicians from cached local storage
        if (Array.isArray(state.technicians)) {
          state.technicians = state.technicians.filter(t => {
            const id = (t.technicianId || t.id || '').toUpperCase();
            return !id.startsWith('TECH-10');
          });
        } else {
          state.technicians = [];
        }

        // Completely purge demo spare parts, movements, and requests from cached local storage
        if (Array.isArray(state.spareParts)) {
          state.spareParts = state.spareParts.filter(sp => !KNOWN_DEMO_SP_CODES.includes(sp.code));
        } else {
          state.spareParts = [];
        }
        if (Array.isArray(state.stockMovements)) {
          state.stockMovements = state.stockMovements.filter(mv => !KNOWN_DEMO_SP_CODES.includes(mv.partCode));
        } else {
          state.stockMovements = [];
        }
        if (Array.isArray(state.stockRequests)) {
          state.stockRequests = state.stockRequests.filter(req => !KNOWN_DEMO_SP_CODES.includes(req.partCode));
        } else {
          state.stockRequests = [];
        }
      } else {
        state = JSON.parse(JSON.stringify(INITIAL_STATE));
        saveState();
      }
    } catch (e) {
      console.warn('Could not load localStorage, fallback to initial state', e);
      state = JSON.parse(JSON.stringify(INITIAL_STATE));
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  function resetState() {
    state = JSON.parse(JSON.stringify(INITIAL_STATE));
    saveState();
    renderAll();
    fetchBreakdownsFromBackend();
    showToast('Database reset and synced with Google Sheets BD DATABASE', 'info');
  }

  // =========================================================================
  // 2. DYNAMIC LIVE CLOCK (Updates automatically based on user local time)
  // =========================================================================
  function initDynamicClock() {
    const dateEl = document.getElementById('liveDate');
    const timeEl = document.getElementById('liveTime');

    function updateClock() {
      const now = new Date();

      // Format date e.g.: "Friday, 9 Oct 2026"
      const dateOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      };
      const formattedDate = now.toLocaleDateString('en-GB', dateOptions);

      // Format time e.g.: "11:55 AM"
      const timeOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      const formattedTime = now.toLocaleTimeString('en-US', timeOptions);

      if (dateEl) dateEl.textContent = formattedDate;
      if (timeEl) timeEl.textContent = formattedTime;
    }

    updateClock();
    setInterval(updateClock, 1000);
  }

  // =========================================================================
  // 3. KPI CALCULATION ENGINE
  // =========================================================================
  function updateKPICounters() {
    // 1. Open Breakdown = count of breakdowns where status !== 'Resolved' && status !== 'Completed'
    const openBreakdowns = state.breakdowns.filter(b => b.status !== 'Resolved' && b.status !== 'Completed').length;
    const kpiBreakdownEl = document.getElementById('kpiOpenBreakdown');
    if (kpiBreakdownEl) kpiBreakdownEl.textContent = openBreakdowns;
    const activeJobsBadge = document.getElementById('activeJobsCountBadge');
    if (activeJobsBadge) activeJobsBadge.textContent = `${openBreakdowns} Open`;

    // 2. PM Due This Week = count of preventive maintenance items where status === 'Due This Week'
    const pmDueThisWeek = state.preventiveMaintenance.filter(pm => pm.status === 'Due This Week').length;
    const kpiPmEl = document.getElementById('kpiPmDue');
    if (kpiPmEl) kpiPmEl.textContent = pmDueThisWeek;

    // 3. Low Stock Items = count of spare parts where currentStock <= minStock
    const lowStockItems = state.spareParts.filter(sp => sp.currentStock <= sp.minStock).length;
    const kpiStockEl = document.getElementById('kpiLowStock');
    if (kpiStockEl) kpiStockEl.textContent = lowStockItems;

    // 4. Total Technicians = total registered technicians
    const totalTechs = state.technicians.length;
    const kpiTechEl = document.getElementById('kpiTotalTechs');
    if (kpiTechEl) kpiTechEl.textContent = totalTechs;

    // Sidebar Notification Badge (Unread count)
    const unreadCount = state.notifications.filter(n => n.unread).length;
    const badgeEl = document.getElementById('sidebarNotifBadge');
    if (badgeEl) {
      badgeEl.textContent = unreadCount;
      if (unreadCount === 0) {
        badgeEl.classList.add('hidden');
      } else {
        badgeEl.classList.remove('hidden');
      }
    }
  }

  // =========================================================================
  // 4. USER AUTHENTICATION & ROLE SWITCHING (RBAC)
  // =========================================================================
  function renderUserAccount() {
    const user = state.currentUser;
    const avatarEl = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');
    const roleTagEl = document.getElementById('userRoleTag');
    const dropdownNameEl = document.getElementById('dropdownUserName');
    const dropdownEmailEl = document.getElementById('dropdownUserEmail');
    const dropdownStaffIdEl = document.getElementById('dropdownStaffId');
    const dropdownUserRoleEl = document.getElementById('dropdownUserRole');

    if (avatarEl) avatarEl.textContent = user.initials || 'MM';
    if (nameEl) nameEl.textContent = user.name || 'Staff User';
    if (roleTagEl) roleTagEl.textContent = user.role || 'Staff';
    if (dropdownNameEl) dropdownNameEl.textContent = user.name || 'Staff User';
    if (dropdownEmailEl) dropdownEmailEl.textContent = user.email || '';
    if (dropdownStaffIdEl) dropdownStaffIdEl.textContent = user.staffId || user.id || '';
    if (dropdownUserRoleEl) dropdownUserRoleEl.textContent = user.role || 'Staff';

    // Update Role Switcher Buttons Active State
    document.querySelectorAll('.role-switch-btn').forEach(btn => {
      const targetRole = btn.getAttribute('data-role');
      if (targetRole === user.role) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    applyRolePermissions();
  }

  function switchUserRole(roleName) {
    const match = state.usersList.find(u => u.role === roleName);
    if (match) {
      state.currentUser = JSON.parse(JSON.stringify(match));
      saveState();
      renderUserAccount();
      populateStaffIdFromProfile();
      showToast(`Switched active profile to ${match.name} (${match.role})`, 'info');

      // Close dropdown
      const wrapper = document.getElementById('userAccountWrapper');
      if (wrapper) wrapper.classList.remove('open');
    }
  }

  function applyRolePermissions() {
    const role = state.currentUser ? state.currentUser.role : '';
    const roleCode = state.currentUser ? state.currentUser.roleCode : '';
    const isAdmin = roleCode === 'ADMIN' || role === 'Administrator';

    // BD Dashboard access rules (strictly Administrator only)
    const bdDashboardTab = document.getElementById('bdDashboardTabBtn');
    if (bdDashboardTab) {
      bdDashboardTab.style.display = isAdmin ? 'inline-block' : 'none';
      if (!isAdmin && activeBreakdownTab === 'bd-dashboard') {
        switchBreakdownTab('active-jobs');
      }
    }
    const bdDashboardContent = document.getElementById('bdDashboardMainContent');
    if (bdDashboardContent) {
      bdDashboardContent.style.display = isAdmin ? 'block' : 'none';
    }

    // Admin-only badges/buttons (strictly tied to verified Admin claim)
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });

    // Supervisor & Admin actions (now strictly Admin-only: MMS only supports ADMIN and TECHNICIAN)
    document.querySelectorAll('.supervisor-admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });

    // PM Module access rules
    const addPMBtn = document.getElementById('addPMRecordBtn');
    if (addPMBtn) {
      addPMBtn.style.display = isAdmin ? 'inline-block' : 'none';
    }
    const pmDashboardTab = document.getElementById('pmDashboardTabBtn');
    if (pmDashboardTab) {
      pmDashboardTab.style.display = isAdmin ? 'inline-block' : 'none';
      if (!isAdmin && activeMaintenanceTab === 'pm-dashboard') {
        switchMaintenanceTab('pm-schedule');
      }
    }

    // Spare Parts Module access rules
    const addStockBtn = document.getElementById('addStockBtn');
    if (addStockBtn) {
      addStockBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    }
    const spStockMovementTab = document.getElementById('spTabStockMovementBtn');
    if (spStockMovementTab) {
      spStockMovementTab.style.display = isAdmin ? 'inline-block' : 'none';
      if (!isAdmin && activeSparePartsTab === 'stock-movement') {
        switchSparePartsTab('parts-list');
      }
    }
    const spStockRequestTab = document.getElementById('spTabStockRequestBtn');
    if (spStockRequestTab) {
      spStockRequestTab.style.display = 'inline-block';
    }

    // Technician Management page has been removed from UI
    if (currentView === 'technicians') {
      navigateTo('home');
    }

    if (currentView === 'spareparts') {
      renderSparePartsView();
    }
  }

  // =========================================================================
  // 5. VIEW ROUTER & NAVIGATION
  // =========================================================================
  let currentView = 'home';

  function navigateTo(viewName, filterParam) {
    // Technician Management page removed from navigation: safely redirect to home
    if (viewName === 'technicians') {
      navigateTo('home');
      return;
    }

    currentView = viewName;
    if (typeof recordUserActivityThrottled === 'function') {
      recordUserActivityThrottled();
    }

    // Hide all view containers
    document.querySelectorAll('.subview-container').forEach(el => {
      el.classList.remove('active');
    });

    // Update Sidebar Navigation Active state
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Show Target View Container
    const targetEl = document.getElementById(`view-${viewName}`);
    if (targetEl) {
      targetEl.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Close mobile sidebar if open
    closeMobileSidebar();

    // Specific sub-route triggers
    if (viewName === 'breakdown') {
      renderBreakdownView();
      if (filterParam) {
        switchBreakdownTab(filterParam);
      }
      fetchBreakdownsFromBackend();
    } else if (viewName === 'maintenance') {
      renderMaintenanceView();
      if (filterParam) {
        switchMaintenanceTab(filterParam);
      }
    } else if (viewName === 'spareparts') {
      renderSparePartsView();
      if (filterParam === 'low') {
        const filterSelect = document.getElementById('sparePartsFilter');
        if (filterSelect) {
          filterSelect.value = 'low';
          renderSparePartsTable();
        }
      }
      fetchSparePartsFromBackend(true);
    } else if (viewName === 'home') {
      updateKPICounters();
    }
  }

  // =========================================================================
  // 6. MODULE 1: BREAKDOWN RECORD RENDERING, DASHBOARD & ACTIONS
  // =========================================================================
  let activeBreakdownTab = 'active-jobs';
  let chartTrendInstance = null;
  let chartCategoryInstance = null;
  let chartDowntimeInstance = null;

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  /**
   * Helper: Parse dates in diverse formats safely (ISO, SQL, or custom)
   */
  function parseDateSafe(val) {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    const str = String(val).trim();
    let d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    d = new Date(str.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d;
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (m) {
      let hour = parseInt(m[4], 10);
      const min = parseInt(m[5], 10);
      if (m[6] && m[6].toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (m[6] && m[6].toUpperCase() === 'AM' && hour === 12) hour = 0;
      d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), hour, min);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  /**
   * Format date & time to DD/MM/YYYY HH:mm in Asia/Kuala_Lumpur timezone
   */
  function formatTimeReportedKL(dateVal) {
    if (!dateVal) return '—';
    const str = String(dateVal).trim();
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/.test(str)) return str;
    const d = parseDateSafe(dateVal);
    if (!d) return str;
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kuala_Lumpur',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return formatter.format(d).replace(',', '');
    } catch (e) {
      return str;
    }
  }

  /**
   * Format date to DD/MM/YYYY in Asia/Kuala_Lumpur timezone
   */
  function formatDateKL(dateVal) {
    if (!dateVal) return '—';
    const str = String(dateVal).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
    const d = parseDateSafe(dateVal);
    if (!d) return str;
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kuala_Lumpur',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      return formatter.format(d);
    } catch (e) {
      return str;
    }
  }

  function renderBreakdownView() {
    applyRolePermissions();
    renderBreakdownTables();
    if (activeBreakdownTab === 'bd-dashboard') {
      const role = state.currentUser ? state.currentUser.role : '';
      const roleCode = state.currentUser ? state.currentUser.roleCode : '';
      const isAdmin = roleCode === 'ADMIN' || role === 'Administrator';
      if (isAdmin) {
        updateBDDashboard();
      } else {
        switchBreakdownTab('active-jobs');
      }
    }
  }

  function switchBreakdownTab(tabName) {
    if (tabName === 'bd-dashboard') {
      const role = state.currentUser ? state.currentUser.role : '';
      const roleCode = state.currentUser ? state.currentUser.roleCode : '';
      const isAdmin = roleCode === 'ADMIN' || role === 'Administrator';
      if (!isAdmin) {
        showToast('Access Denied: BD Dashboard is restricted exclusively to Administrators.', 'error');
        switchBreakdownTab('active-jobs');
        return;
      }
    }

    activeBreakdownTab = tabName;
    document.querySelectorAll('#breakdownTabs .module-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.breakdown-tab-content').forEach(c => {
      c.style.display = 'none';
    });

    const targetTab = document.getElementById(`bd-tab-${tabName}`);
    if (targetTab) targetTab.style.display = 'block';

    applyRolePermissions();

    if (tabName === 'active-jobs') {
      renderBreakdownTables();
    } else if (tabName === 'resolved-history') {
      filterResolvedHistory();
    } else if (tabName === 'bd-dashboard') {
      updateBDDashboard();
    }
    fetchBreakdownsFromBackend(true);
  }

  /**
   * Render Active Jobs Table & Resolved History
   */
  function renderBreakdownTables() {
    // Show backend connection error banner if backend request failed
    const syncAlertEl = document.getElementById('bdBackendSyncAlert');
    if (syncAlertEl) {
      if (lastBackendFetchError) {
        syncAlertEl.style.display = 'block';
        syncAlertEl.className = 'login-alert-banner alert-danger';
        syncAlertEl.innerHTML = `<strong>Backend Sync Warning:</strong> ${escapeHtml(lastBackendFetchError)}<br><small>Unable to retrieve records from Google Sheets BD DATABASE.</small>`;
      } else {
        syncAlertEl.style.display = 'none';
        syncAlertEl.textContent = '';
      }
    }

    // 1. ACTIVE JOBS TABLE: All open / unresolved breakdowns
    // Includes statuses: Repair, Active, Pending, Awaiting Part (anything not Completed or Resolved)
    const activeList = state.breakdowns.filter(b => b.status !== 'Completed' && b.status !== 'Resolved');
    const activeTbody = document.getElementById('activeBreakdownTbody');
    const activeCountBadge = document.getElementById('activeJobsCountBadge');

    if (activeCountBadge) {
      activeCountBadge.textContent = `${activeList.length} Open`;
    }

    if (activeTbody) {
      if (activeList.length === 0) {
        activeTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">No active breakdown jobs currently in progress.</td></tr>`;
      } else {
        activeTbody.innerHTML = activeList.map(item => {
          const timeReported = formatTimeReportedKL(item.startTime || item.reportedAt || item.time);
          const machineName = item.machine || 'Unknown Machine';
          const descriptionText = item.description || item.issue || 'No description provided';

          return `
            <tr>
              <td><strong>${escapeHtml(item.id)}</strong></td>
              <td style="white-space:nowrap; font-variant-numeric:tabular-nums; font-size:12.5px;">
                ${escapeHtml(timeReported)}
              </td>
              <td>
                <div style="font-weight:700; color:var(--navy-darkest);">${escapeHtml(machineName)}</div>
              </td>
              <td>
                <div class="table-desc-cell">${escapeHtml(descriptionText)}</div>
              </td>
              <td>
                ${renderPriorityBadge(item.priority)}
              </td>
              <td>
                <button class="btn-table-action success" onclick="window.openResolveBreakdownModal('${escapeHtml(item.id)}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Resolve
                </button>
              </td>
              <td>
                <button class="btn-table-action" onclick="window.openBreakdownDetailModal('${escapeHtml(item.id)}')">
                  View
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Initialize & render Resolved History table
    filterResolvedHistory();
  }

  /**
   * Filter Resolved Breakdown History by selected Month and Year
   */
  function filterResolvedHistory() {
    const monthSelect = document.getElementById('resolvedMonthFilter');
    const yearSelect = document.getElementById('resolvedYearFilter');
    const resolvedTbody = document.getElementById('resolvedBreakdownTbody');

    if (!resolvedTbody) return;

    const now = new Date();
    const selectedMonth = monthSelect ? parseInt(monthSelect.value, 10) : now.getMonth();
    const selectedYear = yearSelect ? parseInt(yearSelect.value, 10) : now.getFullYear();

    // Filter only completed breakdown records
    const completedList = state.breakdowns.filter(b => b.status === 'Completed' || b.status === 'Resolved');

    // Filter by completion date month and year
    const filteredList = completedList.filter(item => {
      const completionDateVal = item.endTime || item.reportedAt || item.time || item.startTime;
      const d = parseDateSafe(completionDateVal);
      if (!d) return false;
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    if (filteredList.length === 0) {
      resolvedTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">No records found for ${MONTH_NAMES[selectedMonth]} ${selectedYear}.</td></tr>`;
      return;
    }

    resolvedTbody.innerHTML = filteredList.map(item => {
      const completionDateVal = item.endTime || item.reportedAt || item.time || item.startTime;
      const dateStr = formatDateKL(completionDateVal);
      const machineName = item.machine || 'Unknown Machine';
      const descriptionText = item.description || item.issue || 'No description provided';
      const assignedTech = item.assignedTech && String(item.assignedTech).trim() !== '' ? item.assignedTech : 'Unassigned';

      return `
        <tr>
          <td><strong>${escapeHtml(item.id)}</strong></td>
          <td style="white-space:nowrap; font-variant-numeric:tabular-nums; font-size:12.5px;">${escapeHtml(dateStr)}</td>
          <td><strong>${escapeHtml(machineName)}</strong></td>
          <td><div class="table-desc-cell">${escapeHtml(descriptionText)}</div></td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="width:7px; height:7px; border-radius:50%; background:${assignedTech === 'Unassigned' ? '#94A3B8' : '#0078E7'};"></span>
              <span>${escapeHtml(assignedTech)}</span>
            </div>
          </td>
          <td>
            <button class="btn-table-action" onclick="window.openResolvedDetailModal('${escapeHtml(item.id)}')">
              View
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * ACTIVE JOB DETAIL MODAL: View breakdown details & Before photo only
   */
  function openBreakdownDetailModal(bdId) {
    const item = state.breakdowns.find(b => b.id === bdId);
    if (!item) {
      showToast(`Breakdown record ${bdId} not found.`, 'error');
      return;
    }

    const modal = document.getElementById('breakdownDetailModal');
    if (!modal) return;

    // Populate metadata
    const idEl = document.getElementById('detailBreakdownId');
    const machineEl = document.getElementById('detailMachine');
    const timeEl = document.getElementById('detailTimeReported');
    const priorityEl = document.getElementById('detailPriority');
    const categoryEl = document.getElementById('detailCategory');
    const statusEl = document.getElementById('detailStatus');
    const descEl = document.getElementById('detailDescription');

    if (idEl) idEl.textContent = item.id;
    if (machineEl) machineEl.textContent = item.machine;
    if (timeEl) timeEl.textContent = formatTimeReportedKL(item.startTime || item.reportedAt || item.time);

    if (priorityEl) {
      priorityEl.innerHTML = renderPriorityBadge(item.priority);
    }

    if (categoryEl) categoryEl.textContent = item.category || 'Mechanical';

    const isResolved = item.status === 'Completed' || item.status === 'Resolved';
    if (statusEl) {
      statusEl.innerHTML = `<span class="status-badge ${isResolved ? 'status-badge-green' : 'status-badge-red'}">${escapeHtml(item.status || 'Repair')}</span>`;
    }

    if (descEl) descEl.textContent = item.description || item.issue || 'No problem description recorded.';

    const techEl = document.getElementById('detailAssignedTech');
    if (techEl) {
      techEl.textContent = (item.assignedTech && String(item.assignedTech).trim() !== '') ? item.assignedTech : 'Unassigned';
    }

    // Active Jobs show Before Photo only
    const beforeContainer = document.getElementById('detailBeforePhotoContainer');
    if (beforeContainer) {
      beforeContainer.innerHTML = renderPhotoElement(item.beforePhoto, `Before Repair - ${item.machine}`);
    }

    modal.classList.add('active');
  }

  /**
   * RESOLVED HISTORY DETAIL MODAL: View completed breakdown details & Before/After photos
   */
  function openResolvedDetailModal(bdId) {
    const item = state.breakdowns.find(b => b.id === bdId || String(b.id) === String(bdId));
    if (!item) {
      showToast(`Resolved breakdown record ${bdId} not found.`, 'error');
      return;
    }

    const modal = document.getElementById('resolvedDetailModal');
    if (!modal) return;

    // Populate metadata matching the HTML IDs
    const idEl = document.getElementById('resDetailId');
    const machineEl = document.getElementById('resDetailMachine');
    const timeEl = document.getElementById('resDetailTimeReported');
    const startEl = document.getElementById('resDetailStartTime');
    const endEl = document.getElementById('resDetailEndTime');
    const downtimeEl = document.getElementById('resDetailDowntime');
    const priorityEl = document.getElementById('resDetailPriority');
    const categoryEl = document.getElementById('resDetailCategory');
    const statusEl = document.getElementById('resDetailStatus');
    const descEl = document.getElementById('resDetailDescription');
    const techEl = document.getElementById('resDetailTech');

    if (idEl) idEl.textContent = item.id || '—';
    if (machineEl) machineEl.textContent = item.machine || '—';
    if (timeEl) timeEl.textContent = formatTimeReportedKL(item.time || item.reportedAt || item.startTime);
    if (startEl) startEl.textContent = formatTimeReportedKL(item.startTime);
    if (endEl) endEl.textContent = formatTimeReportedKL(item.endTime);

    const dtVal = item.downtime !== undefined && item.downtime !== '' && item.downtime !== null
      ? Number(item.downtime)
      : (item.downtimeMin !== undefined ? Number(item.downtimeMin) : null);
    if (downtimeEl) {
      downtimeEl.textContent = (dtVal !== null && !isNaN(dtVal)) ? `${dtVal} minutes` : '—';
    }

    if (priorityEl) {
      priorityEl.innerHTML = renderPriorityBadge(item.priority);
    }

    if (categoryEl) categoryEl.textContent = item.category || 'Mechanical';

    if (statusEl) {
      statusEl.innerHTML = `<span class="status-badge status-badge-green">${escapeHtml(item.status || 'Completed')}</span>`;
    }

    if (descEl) descEl.textContent = item.description || item.issue || 'No problem description recorded.';

    const techStr = item.assignedTech && String(item.assignedTech).trim() !== '' && item.assignedTech !== 'Unassigned'
      ? String(item.assignedTech).trim()
      : 'Unassigned';
    if (techEl) {
      techEl.textContent = techStr;
    }

    // Populate Before and After photos for resolved history
    const beforeContainer = document.getElementById('resDetailBeforePhotoContainer');
    const afterContainer = document.getElementById('resDetailAfterPhotoContainer');

    if (beforeContainer) {
      beforeContainer.innerHTML = renderPhotoElement(item.beforePhoto, `Before Repair - ${item.machine || ''}`);
    }
    if (afterContainer) {
      afterContainer.innerHTML = renderPhotoElement(item.afterPhoto, `After Repair - ${item.machine || ''}`);
    }

    modal.classList.add('active');
  }

  function closeResolvedDetailModal() {
    const modal = document.getElementById('resolvedDetailModal');
    if (modal) modal.classList.remove('active');
  }

  function renderPhotoElement(photoRef, altText) {
    if (!photoRef || String(photoRef).trim() === '') {
      return `
        <div class="no-photo-banner">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <div>No photo available</div>
        </div>
      `;
    }

    const refStr = String(photoRef).trim();
    let imgUrl = refStr;
    const driveMatch = refStr.match(/[-\w]{25,}/);
    if (refStr.includes('drive.google.com') && driveMatch) {
      const fileId = driveMatch[0];
      imgUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }

    return `
      <div class="photo-preview-wrapper">
        <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(altText)}" class="photo-preview-img" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div style="display:none;" class="no-photo-banner">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">Photo reference recorded:</div>
          <a href="${escapeHtml(refStr)}" target="_blank" rel="noopener noreferrer" class="photo-preview-link">
            Open Stored Photo &rarr;
          </a>
        </div>
        <a href="${escapeHtml(refStr)}" target="_blank" rel="noopener noreferrer" class="photo-preview-link">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          View Full Photo
        </a>
      </div>
    `;
  }

  // Cache for registered Firebase technicians loaded from secure endpoint
  let cachedFirebaseTechnicians = null;

  /**
   * Fetch registered technicians from Firebase Authentication via Netlify Function.
   * Returns only verified accounts where custom claim role === "TECHNICIAN".
   */
  async function fetchRegisteredTechnicians(forceRefresh = false) {
    if (cachedFirebaseTechnicians && !forceRefresh) {
      return { ok: true, technicians: cachedFirebaseTechnicians };
    }

    const token = getStoredAuthToken();
    if (!token) {
      return { ok: false, error: 'Authentication required to load technician directory.' };
    }

    try {
      const res = await fetch('/.netlify/functions/get-technicians', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errMsg = data.error || `Server error (${res.status})`;
        return { ok: false, error: errMsg };
      }

      cachedFirebaseTechnicians = Array.isArray(data.technicians) ? data.technicians : [];
      return { ok: true, technicians: cachedFirebaseTechnicians };
    } catch (netErr) {
      return { ok: false, error: 'Network error connecting to technician directory.' };
    }
  }

  /**
   * RESOLVE MODAL: Require Breakdown End Time and Assigned Technician from real Firebase directory
   */
  async function openResolveBreakdownModal(bdId) {
    const item = state.breakdowns.find(b => b.id === bdId);
    if (!item) {
      showToast(`Breakdown record ${bdId} not found.`, 'error');
      return;
    }

    const modal = document.getElementById('resolveBreakdownModal');
    if (!modal) return;

    // Reset alerts and validation styles
    const alertEl = document.getElementById('resolveFormAlert');
    if (alertEl) {
      alertEl.style.display = 'none';
      alertEl.textContent = '';
    }
    const techErrorEl = document.getElementById('resolveTechError');
    if (techErrorEl) techErrorEl.style.display = 'none';
    const endErrorEl = document.getElementById('resolveEndTimeError');
    if (endErrorEl) endErrorEl.style.display = 'none';

    // Populate Read-Only Identifiers
    const targetIdInput = document.getElementById('resolveTargetId');
    if (targetIdInput) targetIdInput.value = item.id;
    const bdIdDisplay = document.getElementById('resolveBdIdDisplay');
    if (bdIdDisplay) bdIdDisplay.value = item.id;

    const machineDisplay = document.getElementById('resolveMachineDisplay');
    if (machineDisplay) machineDisplay.value = item.machine;

    const summaryBd = document.getElementById('resolveModalBdId');
    if (summaryBd) summaryBd.textContent = item.id;
    const summaryMach = document.getElementById('resolveModalMachine');
    if (summaryMach) summaryMach.textContent = item.machine;
    const summaryDesc = document.getElementById('resolveModalDescription');
    if (summaryDesc) summaryDesc.textContent = item.description || item.issue || '';

    // Start Time Reference (Recorded)
    const startTimeVal = item.startTime || item.reportedAt || item.time || new Date().toISOString();
    document.getElementById('resolveStartTimeHidden').value = startTimeVal;
    document.getElementById('resolveStartTimeDisplay').value = formatTimeReportedKL(startTimeVal);

    // End Time: default to current local time (Asia/Kuala_Lumpur)
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const endInput = document.getElementById('resolveEndTimeInput');
    if (endInput) {
      endInput.value = localIso;
      endInput.classList.remove('input-error');
    }

    // Reset After Photo input preview
    const afterPhotoInput = document.getElementById('resolveAfterPhotoInput');
    const afterPhotoName = document.getElementById('resolveAfterPhotoName');
    if (afterPhotoInput) afterPhotoInput.value = '';
    if (afterPhotoName) afterPhotoName.textContent = 'Supported: JPG, JPEG, PNG';

    updateResolveDowntimePreview();

    // Role-based Assigned Technician setup
    const role = state.currentUser ? state.currentUser.role : '';
    const roleCode = state.currentUser ? state.currentUser.roleCode : '';
    const isAdmin = roleCode === 'ADMIN' || role === 'Administrator' || role === 'ADMIN';

    const techGroup = document.getElementById('resolveAssignedTechGroup');
    const techSelect = document.getElementById('resolveAssignedTechSelect');
    const submitBtn = document.getElementById('resolveSubmitBtn');

    if (!isAdmin) {
      // B. TECHNICIAN ACCOUNT:
      // 1. Completely hide the Assigned Technician dropdown and its label.
      // 2. Do not show a disabled dropdown.
      // 3. Do not require a technician selection.
      if (techGroup) techGroup.style.display = 'none';
      if (techSelect) {
        techSelect.required = false;
        techSelect.disabled = false;
        techSelect.value = '';
        techSelect.classList.remove('input-error');
      }
      if (techErrorEl) techErrorEl.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;

      modal.classList.add('active');
    } else {
      // A. ADMIN ACCOUNT:
      // 1. Show the existing Assigned Technician dropdown and label.
      // 2. Allow Admin to select a Technician.
      // 3. Assigned Technician remains required.
      if (techGroup) techGroup.style.display = 'block';
      if (techSelect) {
        techSelect.required = true;
        techSelect.classList.remove('input-error');
        techSelect.disabled = true;
        techSelect.innerHTML = '<option value="">Loading registered technicians...</option>';
        if (submitBtn) submitBtn.disabled = true;

        techSelect.onchange = () => {
          if (techSelect.value) {
            techSelect.classList.remove('input-error');
            if (techErrorEl) techErrorEl.style.display = 'none';
            if (alertEl && alertEl.textContent.includes('Technician')) {
              alertEl.style.display = 'none';
            }
          }
        };
      }

      modal.classList.add('active');

      // Fetch REAL technicians from /.netlify/functions/get-technicians
      const dirResult = await fetchRegisteredTechnicians();

      if (techSelect) {
        if (!dirResult.ok) {
          // If directory cannot be loaded, show error and disable Resolve submission
          techSelect.disabled = true;
          techSelect.classList.add('input-error');
          techSelect.innerHTML = '<option value="">Error loading technicians</option>';
          if (submitBtn) submitBtn.disabled = true;

          if (techErrorEl) {
            techErrorEl.textContent = 'Failed to load technician directory: ' + dirResult.error;
            techErrorEl.style.display = 'block';
          }
          if (alertEl) {
            alertEl.style.display = 'block';
            alertEl.className = 'login-alert-banner alert-danger';
            alertEl.innerHTML = `<strong>Technician Directory Error:</strong> ${escapeHtml(dirResult.error)}<br><small>Resolve submission is disabled until registered technicians can be retrieved.</small>`;
          }
        } else if (!dirResult.technicians || dirResult.technicians.length === 0) {
          // If no registered technicians exist, show "No registered technicians available" and disable Resolve submission
          techSelect.disabled = true;
          techSelect.classList.add('input-error');
          techSelect.innerHTML = '<option value="">No registered technicians available</option>';
          if (submitBtn) submitBtn.disabled = true;

          if (techErrorEl) {
            techErrorEl.textContent = 'No registered technicians available';
            techErrorEl.style.display = 'block';
          }
          if (alertEl) {
            alertEl.style.display = 'block';
            alertEl.className = 'login-alert-banner alert-danger';
            alertEl.innerHTML = `<strong>No Registered Technicians:</strong> No accounts with the <code>TECHNICIAN</code> role claim exist.<br><small>Resolve submission is disabled.</small>`;
          }
        } else {
          // Populate dropdown with Display Name (Staff ID) and store UID as value
          techSelect.disabled = false;
          let optionsHtml = '<option value="">Select Technician</option>';
          optionsHtml += dirResult.technicians.map(t => {
            const label = `${t.displayName} (${t.staffId})`;
            return `<option value="${escapeHtml(t.uid)}">${escapeHtml(label)}</option>`;
          }).join('');
          techSelect.innerHTML = optionsHtml;

          // Enable Resolve submission
          if (submitBtn) submitBtn.disabled = false;

          // Pre-select if already assigned to a valid technician
          if (item.assignedTech && item.assignedTech !== 'Unassigned' && item.assignedTech.trim() !== '') {
            const match = dirResult.technicians.find(t => t.uid === item.assignedTech || t.staffId === item.assignedTech);
            if (match) {
              techSelect.value = match.uid;
            } else {
              techSelect.value = '';
            }
          } else {
            techSelect.value = '';
          }
        }
      }
    }
  }

  function updateResolveDowntimePreview() {
    const startVal = document.getElementById('resolveStartTimeHidden')?.value;
    const endVal = document.getElementById('resolveEndTimeInput')?.value;
    const displayEl = document.getElementById('resolveDowntimeDisplay');

    if (!displayEl) return;

    if (!startVal || !endVal) {
      displayEl.textContent = '—';
      return;
    }

    const startDate = parseDateSafe(startVal);
    const endDate = new Date(endVal);

    if (!startDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      displayEl.textContent = 'Invalid date';
      return;
    }

    const diffMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    if (diffMin < 0) {
      displayEl.innerHTML = '<span style="color:var(--red-primary); font-size:12px;">End Time is earlier than Start Time</span>';
    } else {
      displayEl.textContent = `${diffMin.toLocaleString()} minutes`;
    }
  }

  /**
   * Submit Resolve Breakdown Action to Authorized Backend
   */
  async function submitResolveBreakdown(e) {
    if (e) e.preventDefault();

    const bdId = document.getElementById('resolveTargetId')?.value;
    const startVal = document.getElementById('resolveStartTimeHidden')?.value;
    const endInput = document.getElementById('resolveEndTimeInput');
    const endTime = endInput ? endInput.value : '';
    const techSelect = document.getElementById('resolveAssignedTechSelect');
    const selectedTechUid = techSelect ? techSelect.value.trim() : '';

    const alertEl = document.getElementById('resolveFormAlert');
    const techErrorEl = document.getElementById('resolveTechError');
    const endErrorEl = document.getElementById('resolveEndTimeError');
    const submitBtn = document.getElementById('resolveSubmitBtn');
    const spinner = document.getElementById('resolveSubmitSpinner');
    const icon = document.getElementById('resolveSubmitIcon');
    const btnText = document.getElementById('resolveSubmitText');

    if (!bdId) return;

    // Reset inline field validation states
    if (techErrorEl) techErrorEl.style.display = 'none';
    if (endErrorEl) endErrorEl.style.display = 'none';
    if (endInput) endInput.classList.remove('input-error');
    if (techSelect) techSelect.classList.remove('input-error');
    if (alertEl) alertEl.style.display = 'none';

    // 1. Validate Breakdown End Time (MANDATORY REQUIREMENT)
    if (!endTime) {
      if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.className = 'login-alert-banner alert-danger';
        alertEl.textContent = 'Breakdown End Time is strictly required before marking a breakdown as completed.';
      }
      if (endErrorEl) {
        endErrorEl.textContent = 'Breakdown End Time is strictly required.';
        endErrorEl.style.display = 'block';
      }
      if (endInput) {
        endInput.classList.add('input-error');
        endInput.focus();
      }
      return;
    }

    const startDate = parseDateSafe(startVal);
    const endDate = new Date(endTime);

    if (startDate && endDate < startDate) {
      if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.className = 'login-alert-banner alert-danger';
        alertEl.textContent = 'Breakdown End Time cannot be earlier than Breakdown Start Time.';
      }
      if (endErrorEl) {
        endErrorEl.textContent = 'End Time cannot be earlier than Start Time.';
        endErrorEl.style.display = 'block';
      }
      if (endInput) {
        endInput.classList.add('input-error');
        endInput.focus();
      }
      return;
    }

    // Check role for role-based resolve workflow
    const role = state.currentUser ? state.currentUser.role : '';
    const roleCode = state.currentUser ? state.currentUser.roleCode : '';
    const isAdmin = roleCode === 'ADMIN' || role === 'Administrator' || role === 'ADMIN';

    // 2. Validate Assigned Technician (FOR ADMIN ONLY)
    if (isAdmin) {
      if (!selectedTechUid || selectedTechUid.toLowerCase() === 'unassigned') {
        if (alertEl) {
          alertEl.style.display = 'block';
          alertEl.className = 'login-alert-banner alert-danger';
          alertEl.textContent = 'Assigned Technician is strictly required. Please select a registered technician before completing repair.';
        }
        if (techErrorEl) {
          techErrorEl.textContent = 'Please select a registered technician from the dropdown.';
          techErrorEl.style.display = 'block';
        }
        if (techSelect) {
          techSelect.classList.add('input-error');
          techSelect.focus();
        }
        return;
      }
    }

    // Set Loading State
    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    if (icon) icon.style.display = 'none';
    if (btnText) btnText.textContent = 'Updating Backend...';

    const token = getStoredAuthToken() || '';
    const reqHeaders = { 'Content-Type': 'application/json' };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

    const diffMin = startDate ? Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000)) : 0;

    // Process optional after photo
    const afterFileInput = document.getElementById('resolveAfterPhotoInput');
    let afterPhotoObj = null;
    if (afterFileInput?.files?.[0]) {
      afterPhotoObj = await fileToBase64(afterFileInput.files[0]).catch(() => null);
    }

    const targetItem = state.breakdowns.find(b => b.id === bdId);

    // Payload: For Admin, pass selected technician UID. For Technician, do NOT pass user-selected ID (resolved server-side).
    const payload = {
      id: bdId,
      machine: targetItem ? targetItem.machine : '',
      startTime: startVal,
      endTime: endTime,
      staffId: targetItem ? (targetItem.reportedBy || targetItem.staffId || '') : '',
      downtime: diffMin,
      afterPhoto: afterPhotoObj ? afterPhotoObj.name : '',
      photoFiles: afterPhotoObj ? { after: afterPhotoObj } : null
    };

    if (isAdmin && selectedTechUid) {
      payload.technicianUid = selectedTechUid;
      payload.assignedTech = selectedTechUid;
    }

    try {
      const response = await fetch('/.netlify/functions/resolve-breakdown', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);

      if (response.ok && result && result.success) {
        // Resolve display name / staff ID for UI feedback
        const matchedTech = cachedFirebaseTechnicians?.find(t => t.uid === (isAdmin ? selectedTechUid : result.technicianUid));
        const resolvedStaffId = result.assignedTech || (matchedTech ? matchedTech.staffId : (isAdmin ? selectedTechUid : (state.currentUser?.staffId || '')));
        const resolvedDisplay = matchedTech ? `${matchedTech.displayName} (${matchedTech.staffId})` : (state.currentUser?.name ? `${state.currentUser.name} (${resolvedStaffId})` : resolvedStaffId);

        // Update local state record
        const item = targetItem || state.breakdowns.find(b => b.id === bdId);
        if (item) {
          item.status = 'Completed';
          item.endTime = endTime;
          item.assignedTech = resolvedStaffId;
          item.technicianUid = isAdmin ? selectedTechUid : (result.technicianUid || state.currentUser?.uid || '');
          item.downtimeMin = (result.downtime !== undefined && result.downtime !== null) ? result.downtime : diffMin;
          item.downtime = item.downtimeMin;
          if (afterPhotoObj) {
            item.afterPhoto = afterPhotoObj.name;
          }
        }

        addNotification('Breakdown Completed', `Breakdown ${bdId} on ${item ? item.machine : 'machine'} completed by ${resolvedDisplay} (${diffMin} min downtime).`, 'breakdown', bdId);
        saveState();
        closeAllModals();
        renderAll();
        showToast(`Breakdown ${bdId} marked as Completed with ${resolvedDisplay} and saved to Google Sheets BD DATABASE!`, 'success');

        // Sync with Google Sheets to ensure state coherence
        fetchBreakdownsFromBackend();
      } else {
        const errMsg = (result && (result.error || result.message)) || `Server returned error (${response.status})`;
        if (alertEl) {
          alertEl.style.display = 'block';
          alertEl.className = 'login-alert-banner alert-danger';
          alertEl.innerHTML = `<strong>Backend Update Failed:</strong> ${escapeHtml(errMsg)}<br><small>Data was NOT changed.</small>`;
        }
        showToast('Resolve rejected: ' + errMsg, 'error');
      }
    } catch (netErr) {
      if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.className = 'login-alert-banner alert-danger';
        alertEl.innerHTML = `<strong>Connection Error:</strong> Unable to connect to backend server function (<code>resolve-breakdown</code>).<br><small>Breakdown status was NOT changed.</small>`;
      }
      showToast('Network error: Unable to update breakdown on server.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (icon) icon.style.display = 'inline-block';
      if (btnText) btnText.textContent = 'Confirm Resolve & Complete';
    }
  }

  /**
   * BD DASHBOARD: KPI Calculations & Chart Engine
   */
  async function updateBDDashboard() {
    const monthSelect = document.getElementById('bdDashboardMonth');
    const yearSelect = document.getElementById('bdDashboardYear');
    const mainContent = document.getElementById('bdDashboardMainContent');

    // Strict Client Route Protection: ADMIN Only
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';

    if (!isAdmin) {
      if (mainContent) mainContent.style.display = 'none';
      switchBreakdownTab('active-jobs');
      return;
    } else {
      if (mainContent) mainContent.style.display = 'block';
    }

    const now = new Date();
    const selectedMonth = monthSelect ? parseInt(monthSelect.value, 10) : now.getMonth();
    const selectedYear = yearSelect ? parseInt(yearSelect.value, 10) : now.getFullYear();

    // 1. Breakdowns occurring in selected period (based on Breakdown Start Time)
    const monthBreakdowns = state.breakdowns.filter(b => {
      const d = parseDateSafe(b.startTime || b.reportedAt || b.time);
      if (!d) return false;
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    // 2. Completed repairs attributed to selected period (based on completion date / End Time)
    const completedInMonth = state.breakdowns.filter(b => {
      if (b.status !== 'Completed' && b.status !== 'Resolved') return false;
      const d = parseDateSafe(b.endTime || b.reportedAt || b.time);
      if (!d) return false;
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    // KPI 1: TOTAL BREAKDOWN
    const totalBreakdowns = monthBreakdowns.length;
    const kpiTotalEl = document.getElementById('bdKpiTotalBreakdown');
    if (kpiTotalEl) kpiTotalEl.textContent = totalBreakdowns.toLocaleString();

    // KPI 2: TOTAL DOWNTIME (Minutes)
    let totalDowntimeMin = 0;
    let completedWithValidDowntimeCount = 0;

    completedInMonth.forEach(b => {
      const dtVal = b.downtime !== undefined && b.downtime !== '' && b.downtime !== null
        ? Number(b.downtime)
        : (b.downtimeMin !== undefined ? Number(b.downtimeMin) : null);

      if (dtVal !== null && !isNaN(dtVal) && dtVal >= 0) {
        totalDowntimeMin += dtVal;
        completedWithValidDowntimeCount++;
      }
    });

    const kpiDownEl = document.getElementById('bdKpiTotalDowntime');
    if (kpiDownEl) kpiDownEl.textContent = totalDowntimeMin.toLocaleString();

    // KPI 3: MTTR (Mean Time To Repair in minutes)
    // Formula: Total Repair Downtime / Number of Completed Repairs
    const kpiMttrEl = document.getElementById('bdKpiMTTR');
    if (kpiMttrEl) {
      if (completedWithValidDowntimeCount > 0) {
        const mttrVal = (totalDowntimeMin / completedWithValidDowntimeCount).toFixed(1);
        kpiMttrEl.textContent = mttrVal;
      } else {
        kpiMttrEl.textContent = 'N/A';
      }
    }

    // KPI 4: MTBF (Mean Time Between Failures)
    // Formula: Total Operating Hours / Number of Breakdowns
    // Configured Operating Schedule: 10 operating hours/day on Monday–Friday working days
    // For current month: excludes future operating days
    // When no breakdowns in period: display No Breakdowns (or N/A)
    const operatingDays = calculateOperatingDays(selectedYear, selectedMonth);
    const totalOperatingHours = operatingDays * 10;
    const kpiMtbfEl = document.getElementById('bdKpiMTBF');
    const kpiMtbfSub = document.getElementById('bdKpiMTBFSub');

    if (kpiMtbfEl) {
      if (totalBreakdowns > 0 && totalOperatingHours > 0) {
        const mtbfVal = (totalOperatingHours / totalBreakdowns).toFixed(1);
        kpiMtbfEl.textContent = `${mtbfVal} Hours`;
      } else if (totalBreakdowns === 0) {
        kpiMtbfEl.textContent = 'No Breakdowns';
      } else {
        kpiMtbfEl.textContent = 'N/A';
      }
    }
    if (kpiMtbfSub) {
      kpiMtbfSub.textContent = 'Mean Time Between Failures';
    }

    // =========================================================================
    // CHART PREPARATION (Days of Month)
    // =========================================================================
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const monthShort = MONTH_NAMES[selectedMonth].substring(0, 3);
    const dayLabels = [];
    const dailyBreakdownCounts = new Array(daysInMonth).fill(0);
    const dailyDowntimeTotals = new Array(daysInMonth).fill(0);

    for (let day = 1; day <= daysInMonth; day++) {
      dayLabels.push(`${String(day).padStart(2, '0')} ${monthShort}`);
    }

    // Populate daily breakdown counts based on Breakdown Start Time
    monthBreakdowns.forEach(b => {
      const d = parseDateSafe(b.startTime || b.reportedAt || b.time);
      if (d) {
        const dayIdx = d.getDate() - 1;
        if (dayIdx >= 0 && dayIdx < daysInMonth) {
          dailyBreakdownCounts[dayIdx]++;
        }
      }
    });

    // Populate daily downtime totals based on completion date
    completedInMonth.forEach(b => {
      const d = parseDateSafe(b.endTime || b.reportedAt || b.time);
      if (d) {
        const dayIdx = d.getDate() - 1;
        const dtVal = b.downtime !== undefined && b.downtime !== '' && b.downtime !== null
          ? Number(b.downtime)
          : (b.downtimeMin !== undefined ? Number(b.downtimeMin) : 0);
        if (dayIdx >= 0 && dayIdx < daysInMonth && dtVal > 0) {
          dailyDowntimeTotals[dayIdx] += dtVal;
        }
      }
    });

    // Populate Category Distribution from database records
    // Official categories: Mechanical, Electrical, Hydraulic, Pneumatic, Parametic
    const categoryCountsMap = {
      'Mechanical': 0,
      'Electrical': 0,
      'Hydraulic': 0,
      'Pneumatic': 0,
      'Parametic': 0
    };
    let legacyOtherCount = 0;

    monthBreakdowns.forEach(b => {
      const cat = b.category ? String(b.category).trim() : '';
      if (categoryCountsMap.hasOwnProperty(cat)) {
        categoryCountsMap[cat]++;
      } else if (cat) {
        legacyOtherCount++;
      }
    });

    const categoryLabels = ['Mechanical', 'Electrical', 'Hydraulic', 'Pneumatic', 'Parametic'];
    const categoryCounts = categoryLabels.map(cat => categoryCountsMap[cat]);
    const categoryColors = ['#0078E7', '#E50920', '#D97706', '#009E49', '#7C3AED'];

    if (legacyOtherCount > 0) {
      categoryLabels.push('Legacy / Other');
      categoryCounts.push(legacyOtherCount);
      categoryColors.push('#64748B');
    }

    // Render Charts
    renderBDCharts(dayLabels, dailyBreakdownCounts, categoryLabels, categoryCounts, dailyDowntimeTotals, categoryColors);
  }

  /**
   * Calculate operating days (Monday-Friday) for a selected reporting month and year.
   * Assumes 10 operating hours/day schedule.
   * For the current active month, excludes future calendar days.
   */
  function calculateOperatingDays(year, month) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return 0;
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const maxDay = (year === currentYear && month === currentMonth)
      ? Math.min(daysInMonth, currentDay)
      : daysInMonth;

    let operatingDays = 0;
    for (let d = 1; d <= maxDay; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        operatingDays++;
      }
    }
    return operatingDays;
  }

  /**
   * Render Chart.js interactive charts
   */
  function renderBDCharts(dayLabels, dailyBreakdownCounts, categoryLabels, categoryCounts, dailyDowntimeTotals, categoryColors) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library is not loaded. Fallback notice rendered.');
      return;
    }

    // 1. CHART 1: BREAKDOWN TREND (Line Chart)
    const trendCanvas = document.getElementById('chartBreakdownTrend');
    if (trendCanvas) {
      if (chartTrendInstance) {
        chartTrendInstance.destroy();
        chartTrendInstance = null;
      }

      const ctxTrend = trendCanvas.getContext('2d');
      const maxCount = Math.max(...dailyBreakdownCounts, 3);

      chartTrendInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: [{
            label: 'Breakdown Reports',
            data: dailyBreakdownCounts,
            borderColor: '#0078E7',
            backgroundColor: 'rgba(0, 120, 231, 0.08)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: '#0078E7',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#062641',
              titleFont: { size: 12, weight: '700' },
              bodyFont: { size: 12 },
              padding: 10,
              cornerRadius: 6,
              callbacks: {
                label: (ctx) => `Breakdowns: ${ctx.parsed.y}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 16, font: { size: 10.5 } }
            },
            y: {
              beginAtZero: true,
              suggestedMax: maxCount,
              ticks: {
                stepSize: 1,
                precision: 0,
                font: { size: 11 }
              },
              grid: { color: '#EDF2F7' }
            }
          }
        }
      });
    }

    // 2. CHART 2: BREAKDOWN PROBLEM BY CATEGORY (Pie Chart)
    const catCanvas = document.getElementById('chartBreakdownCategory');
    if (catCanvas) {
      if (chartCategoryInstance) {
        chartCategoryInstance.destroy();
        chartCategoryInstance = null;
      }

      const ctxCat = catCanvas.getContext('2d');
      const totalInCategories = categoryCounts.reduce((a, b) => a + b, 0);
      const hasData = totalInCategories > 0;

      const chartData = hasData ? categoryCounts : [1];
      const chartLabels = hasData ? categoryLabels : ['No Breakdowns'];
      const chartColors = hasData ? (categoryColors || ['#0078E7', '#E50920', '#D97706', '#009E49', '#7C3AED']) : ['#E2E8F0'];

      chartCategoryInstance = new Chart(ctxCat, {
        type: 'pie',
        data: {
          labels: chartLabels,
          datasets: [{
            data: chartData,
            backgroundColor: chartColors,
            borderColor: '#FFFFFF',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 12,
                padding: 10,
                font: { size: 11, weight: '600' }
              }
            },
            tooltip: {
              backgroundColor: '#062641',
              titleFont: { size: 12, weight: '700' },
              bodyFont: { size: 12 },
              padding: 10,
              cornerRadius: 6,
              callbacks: {
                label: (ctx) => {
                  if (!hasData) return ' No breakdowns in selected period';
                  const val = ctx.parsed || 0;
                  const pct = totalInCategories > 0 ? ((val / totalInCategories) * 100).toFixed(1) : '0.0';
                  return ` ${ctx.label}: ${val} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 3. CHART 3: DOWNTIME TREND (Line Chart)
    const downCanvas = document.getElementById('chartDowntimeTrend');
    if (downCanvas) {
      if (chartDowntimeInstance) {
        chartDowntimeInstance.destroy();
        chartDowntimeInstance = null;
      }

      const ctxDown = downCanvas.getContext('2d');

      chartDowntimeInstance = new Chart(ctxDown, {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: [{
            label: 'Downtime (Minutes)',
            data: dailyDowntimeTotals,
            borderColor: '#E50920',
            backgroundColor: 'rgba(229, 9, 32, 0.08)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: '#E50920',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#062641',
              titleFont: { size: 12, weight: '700' },
              bodyFont: { size: 12 },
              padding: 10,
              cornerRadius: 6,
              callbacks: {
                label: (ctx) => `Downtime: ${ctx.parsed.y} minutes`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 16, font: { size: 10.5 } }
            },
            y: {
              beginAtZero: true,
              ticks: {
                font: { size: 11 },
                callback: (val) => `${val}m`
              },
              grid: { color: '#EDF2F7' }
            }
          }
        }
      });
    }
  }

  let lastBackendFetchError = null;

  let isActiveJobsSyncing = false;

  /**
   * Sync Active Breakdown Jobs button handler with loading spinner, session preservation, and duplicate protection.
   */
  async function syncActiveJobs() {
    if (isActiveJobsSyncing) return;
    isActiveJobsSyncing = true;

    const btn = document.getElementById('syncActiveJobsBtn');
    const spinIcon = btn ? btn.querySelector('.sync-icon') : null;
    const textSpan = btn ? btn.querySelector('span') : null;
    const originalText = textSpan ? textSpan.textContent : 'Sync';

    if (btn) btn.disabled = true;
    if (spinIcon) spinIcon.classList.add('is-spinning');
    if (textSpan) textSpan.textContent = 'Syncing...';

    try {
      const result = await fetchBreakdownsFromBackend(false);
      if (result && result.ok) {
        showToast('Breakdown records updated successfully.', 'success');
      } else {
        const errMsg = (result && result.error) || 'Failed to update breakdown records from database.';
        showToast('Sync Failed: ' + errMsg, 'error');
      }
    } catch (err) {
      showToast('Sync Error: ' + err.message, 'error');
    } finally {
      isActiveJobsSyncing = false;
      if (spinIcon) spinIcon.classList.remove('is-spinning');
      if (textSpan) textSpan.textContent = originalText;
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Fetch live records from Google Sheets BD DATABASE via Netlify Function
   * All records originate strictly from the backend. If backend returns no records,
   * display an empty state. If request fails, show an appropriate error without fabricated data.
   */
  async function fetchBreakdownsFromBackend(silent = true) {
    const token = getStoredAuthToken() || '';
    if (!token) return { ok: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/.netlify/functions/get-breakdowns', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await res.json().catch(() => null);

      if (res.ok && result && result.success) {
        lastBackendFetchError = null;
        const remoteList = Array.isArray(result.data) ? result.data : [];

        // All records originate exclusively from Google Sheets BD DATABASE
        state.breakdowns = remoteList.map(remoteItem => ({
          id: remoteItem.id,
          machine: remoteItem.machine,
          line: 'Central Line',
          issue: remoteItem.description || '',
          description: remoteItem.description || '',
          category: remoteItem.category || 'Mechanical',
          priority: (remoteItem.priority && String(remoteItem.priority).trim()) || '',
          status: remoteItem.status || 'Repair',
          reportedBy: remoteItem.staffId || 'Staff',
          assignedTech: remoteItem.assignedTech && String(remoteItem.assignedTech).trim() !== '' ? String(remoteItem.assignedTech).trim() : 'Unassigned',
          startTime: remoteItem.startTime || '',
          endTime: remoteItem.endTime || '',
          time: remoteItem.time || '',
          reportedAt: remoteItem.startTime || remoteItem.time || '',
          downtimeMin: remoteItem.downtime !== '' && remoteItem.downtime !== null && !isNaN(remoteItem.downtime) ? Number(remoteItem.downtime) : 0,
          downtime: remoteItem.downtime !== '' && remoteItem.downtime !== null && !isNaN(remoteItem.downtime) ? Number(remoteItem.downtime) : 0,
          beforePhoto: remoteItem.beforePhoto || '',
          afterPhoto: remoteItem.afterPhoto || ''
        }));

        saveState();
        renderBreakdownTables();
        updateKPICounters();
        const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
        const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
        if (isAdmin && activeBreakdownTab === 'bd-dashboard') {
          updateBDDashboard();
        }
        return { ok: true, count: state.breakdowns.length };
      } else {
        const errMsg = (result && (result.error || result.message)) || `Server returned HTTP ${res.status}`;
        lastBackendFetchError = errMsg;
        renderBreakdownTables();
        if (!silent) {
          showToast('Database Sync Error: ' + errMsg, 'error');
        }
        return { ok: false, error: errMsg };
      }
    } catch (e) {
      const errMsg = 'Network connection failed: ' + e.message;
      lastBackendFetchError = errMsg;
      renderBreakdownTables();
      if (!silent) {
        showToast('Network error: Unable to connect to Google Sheets backend.', 'error');
      }
      return { ok: false, error: errMsg };
    }
  }

  function renderPriorityBadge(priority) {
    const p = priority ? String(priority).trim().toLowerCase() : '';
    if (p === 'critical') {
      return `<span class="priority-badge priority-badge-critical">Critical</span>`;
    }
    if (p === 'medium') {
      return `<span class="priority-badge priority-badge-medium">Medium</span>`;
    }
    if (p === 'low') {
      return `<span class="priority-badge priority-badge-low">Low</span>`;
    }
    return `<span class="priority-badge priority-badge-notset">Not Set</span>`;
  }

  function updatePrioritySelectStyle(selectEl) {
    if (!selectEl) return;
    selectEl.classList.remove('priority-select-critical', 'priority-select-medium', 'priority-select-low');
    if (selectEl.value === 'Critical') {
      selectEl.classList.add('priority-select-critical');
    } else if (selectEl.value === 'Medium') {
      selectEl.classList.add('priority-select-medium');
    } else if (selectEl.value === 'Low') {
      selectEl.classList.add('priority-select-low');
    }
  }

  function getPriorityBadgeClass(priority) {
    if (priority === 'Critical') return 'status-badge-red';
    if (priority === 'High') return 'status-badge-amber';
    if (priority === 'Medium') return 'status-badge-blue';
    return 'status-badge-grey';
  }

  // =========================================================================
  // 7. MODULE 2: MAINTENANCE RECORD (PM) — DATABASE CONNECTED WORKFLOW
  // =========================================================================
  let activeMaintenanceTab = 'pm-schedule';
  let isPMSyncing = false;
  let lastPMFetchError = null;
  let chartPMTrendInstance = null;
  let chartPMTypeInstance = null;
  let chartPMMachineInstance = null;
  let selectedPMPhotoFile = null;

  function renderMaintenanceView() {
    applyRolePermissions();
    renderOngoingPMTable();
    renderPMHistoryTable();
    if (activeMaintenanceTab === 'pm-dashboard') {
      updatePMDashboard();
    }
  }

  function switchMaintenanceTab(tabName) {
    if (tabName === 'pm-dashboard') {
      const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
      const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
      if (!isAdmin) {
        showToast('Access Denied: PM Dashboard is restricted exclusively to Administrators.', 'error');
        switchMaintenanceTab('pm-schedule');
        return;
      }
    }

    activeMaintenanceTab = tabName;
    document.querySelectorAll('#maintenanceTabs .module-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.maintenance-tab-content').forEach(c => {
      c.style.display = 'none';
    });

    const targetTab = document.getElementById(`pm-tab-${tabName}`);
    if (targetTab) targetTab.style.display = 'block';

    if (tabName === 'pm-dashboard') {
      updatePMDashboard();
    }
  }

  /**
   * Fetch live PM records from Google Sheets PM DATABASE via Netlify Function.
   * Completely preserves the user session (never reloads page).
   */
  async function fetchPMRecordsFromBackend(silent = false) {
    const token = getStoredAuthToken() || '';
    if (!token) return { ok: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/.netlify/functions/get-pm-records', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await res.json().catch(() => null);

      if (res.ok && result && result.success) {
        lastPMFetchError = null;
        const remoteList = Array.isArray(result.data) ? result.data : [];

        // Map remote records from PM DATABASE
        state.preventiveMaintenance = remoteList.map(item => ({
          id: item.pmCode,
          pmCode: item.pmCode,
          machine: item.machine || '',
          maintenanceType: item.maintenanceType || 'Scheduled',
          taskTitle: item.taskTitle || '',
          taskDescription: item.taskDescription || '',
          scheduledDate: item.scheduledDate || '',
          assignedTech: item.assignedTech || 'Unassigned',
          status: item.status || 'Pending',
          createdBy: item.createdBy || 'ADMIN',
          createdAt: item.createdAt || '',
          completionDateTime: item.completionDateTime || '',
          workDetails: item.workDetails || '',
          remarks: item.remarks || '',
          afterPhoto: item.afterPhoto || '',
          completedBy: item.completedBy || ''
        }));

        saveState();
        renderOngoingPMTable();
        renderPMHistoryTable();

        const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
        const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
        if (isAdmin && activeMaintenanceTab === 'pm-dashboard') {
          updatePMDashboard();
        }
        return { ok: true, count: state.preventiveMaintenance.length };
      } else {
        const errMsg = (result && (result.error || result.message)) || `Server returned HTTP ${res.status}`;
        lastPMFetchError = errMsg;
        renderOngoingPMTable();
        renderPMHistoryTable();
        if (!silent) {
          showToast('PM Database Sync Error: ' + errMsg, 'error');
        }
        return { ok: false, error: errMsg };
      }
    } catch (e) {
      const errMsg = 'Network connection failed: ' + e.message;
      lastPMFetchError = errMsg;
      renderOngoingPMTable();
      renderPMHistoryTable();
      if (!silent) {
        showToast('Network error: Unable to connect to Google Sheets PM backend.', 'error');
      }
      return { ok: false, error: errMsg };
    }
  }

  /**
   * Sync PM Records button handler with loading spinner, session preservation, and duplicate protection.
   */
  async function syncPMRecords(source = 'ongoing') {
    if (isPMSyncing) return;
    isPMSyncing = true;

    const btn = source === 'history' ? document.getElementById('syncPMHistoryBtn') : document.getElementById('syncPMOngoingBtn');
    const spinIcon = btn ? btn.querySelector('.sync-icon') : null;
    const originalText = btn ? btn.querySelector('span')?.textContent : 'Sync';

    if (btn) btn.disabled = true;
    if (spinIcon) spinIcon.classList.add('is-spinning');
    if (btn && btn.querySelector('span')) btn.querySelector('span').textContent = 'Syncing...';

    try {
      const result = await fetchPMRecordsFromBackend(true);
      if (result.ok) {
        showToast('Ongoing & Completed PM records synced successfully.', 'success');
      } else {
        showToast('Sync Failed: ' + (result.error || 'Unable to reach PM database.'), 'error');
      }
    } catch (err) {
      showToast('Sync Error: ' + err.message, 'error');
    } finally {
      isPMSyncing = false;
      if (spinIcon) spinIcon.classList.remove('is-spinning');
      if (btn && btn.querySelector('span')) btn.querySelector('span').textContent = originalText;
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Get current date string (YYYY-MM-DD) in Asia/Kuala_Lumpur (UTC+8)
   */
  function getTodayDateStringKL() {
    try {
      const klFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return klFormatter.format(new Date());
    } catch (e) {
      const now = new Date();
      return now.toISOString().slice(0, 10);
    }
  }

  /**
   * Calculate schedule indicator for a PM record:
   * Timezone: Asia/Kuala_Lumpur
   * Week definition: Monday through Sunday
   * - Waiting (Green): today < Monday of scheduled week
   * - On Going (Yellow): Monday <= today <= Sunday of scheduled week
   * - Overdue (Red): today > Sunday of scheduled week
   */
  function calculatePMScheduleStatus(scheduledDateStr) {
    if (!scheduledDateStr) {
      return { status: 'Waiting', badgeClass: 'status-badge-green' };
    }

    const todayKL = getTodayDateStringKL();

    const cleanDate = String(scheduledDateStr).trim().slice(0, 10);
    const parts = cleanDate.split(/[-/]/).map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return { status: 'Waiting', badgeClass: 'status-badge-green' };
    }

    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    const dt = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = dt.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    const monDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const sunDiff = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

    const monDate = new Date(Date.UTC(year, month - 1, day + monDiff));
    const sunDate = new Date(Date.UTC(year, month - 1, day + sunDiff));

    const mondayStr = monDate.toISOString().slice(0, 10);
    const sundayStr = sunDate.toISOString().slice(0, 10);

    if (todayKL < mondayStr) {
      return { status: 'Waiting', badgeClass: 'status-badge-green' };
    } else if (todayKL <= sundayStr) {
      return { status: 'On Going', badgeClass: 'status-badge-yellow' };
    } else {
      return { status: 'Overdue', badgeClass: 'status-badge-red' };
    }
  }

  // Periodic check (every 60 seconds) to recalculate schedule indicators if calendar day changes in KL
  let lastEvaluatedDayKL = getTodayDateStringKL();
  setInterval(() => {
    const currentDay = getTodayDateStringKL();
    if (currentDay !== lastEvaluatedDayKL) {
      lastEvaluatedDayKL = currentDay;
      if (activeMaintenanceTab === 'pm-schedule') {
        renderOngoingPMTable();
      }
    }
  }, 60000);

  /**
   * Render Table 1: Ongoing Preventive Maintenance
   */
  function renderOngoingPMTable() {
    const tbody = document.getElementById('pmScheduleTbody');
    if (!tbody) return;

    if (lastPMFetchError && (!state.preventiveMaintenance || state.preventiveMaintenance.length === 0)) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#E53E3E; font-weight:500;">
        <div style="margin-bottom:6px;">&#9888; Database Connection Error</div>
        <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(lastPMFetchError)}</div>
      </td></tr>`;
      return;
    }

    const ongoingList = (state.preventiveMaintenance || []).filter(p => {
      const s = String(p.status || '').trim();
      return s === 'Pending' || s === 'In Progress';
    });

    // Sort by Scheduled Date ascending
    ongoingList.sort((a, b) => String(a.scheduledDate || '').localeCompare(String(b.scheduledDate || '')));

    if (ongoingList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px 16px; color:var(--text-muted);">
        <div style="font-weight:600; color:var(--navy-darkest); margin-bottom:4px;">No ongoing preventive maintenance tasks found.</div>
        <div style="font-size:12px;">All scheduled maintenance tasks are currently up-to-date or resolved.</div>
      </td></tr>`;
      return;
    }

    const currentStaffId = (state.currentUser ? (state.currentUser.staffId || state.currentUser.id || '') : '').toUpperCase();
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';

    tbody.innerHTML = ongoingList.map(item => {
      const assignedTech = (item.assignedTech || '').toUpperCase();
      const canResolve = isAdmin || (assignedTech === currentStaffId && currentStaffId !== '');
      const typeBadgeClass = item.maintenanceType === 'Scheduled' ? 'status-badge-blue' : 'status-badge-purple';
      const schedStatus = calculatePMScheduleStatus(item.scheduledDate);

      return `
        <tr>
          <td><strong>${escapeHtml(item.pmCode || item.id)}</strong></td>
          <td>
            <div style="font-weight:600; color:var(--navy-darkest);">${escapeHtml(item.machine)}</div>
          </td>
          <td><span class="status-badge ${typeBadgeClass}">${escapeHtml(item.maintenanceType || 'Scheduled')}</span></td>
          <td>
            <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(item.taskTitle)}</div>
            ${item.taskDescription ? `<div style="font-size:11.5px; color:var(--text-muted); max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(item.taskDescription)}</div>` : ''}
          </td>
          <td><strong>${escapeHtml(item.scheduledDate)}</strong></td>
          <td>
            <span style="display:inline-flex; align-items:center; gap:6px; font-weight:500;">
              <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#0078E7;"></span>
              ${escapeHtml(item.assignedTech || 'Unassigned')}
            </span>
          </td>
          <td><span class="status-badge ${schedStatus.badgeClass}">${escapeHtml(schedStatus.status)}</span></td>
          <td>
            <div class="action-btn-group">
              ${canResolve ? `
                <button class="btn-table-action success" onclick="window.openResolvePMModal('${escapeHtml(item.pmCode || item.id)}')">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Resolve
                </button>
              ` : `
                <span style="font-size:11.5px; color:var(--text-muted); font-style:italic;" title="Only the assigned technician or an Administrator may resolve this task">
                  Assigned
                </span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Render Table 2: Maintenance History (Completed PMs only)
   */
  function renderPMHistoryTable() {
    const tbody = document.getElementById('pmHistoryTbody');
    if (!tbody) return;

    if (lastPMFetchError && (!state.preventiveMaintenance || state.preventiveMaintenance.length === 0)) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#E53E3E; font-weight:500;">
        <div style="margin-bottom:6px;">&#9888; Database Connection Error</div>
        <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(lastPMFetchError)}</div>
      </td></tr>`;
      return;
    }

    const historyList = (state.preventiveMaintenance || []).filter(p => {
      return String(p.status || '').trim() === 'Completed';
    });

    // Sort by Completion Date / Created At descending
    historyList.sort((a, b) => {
      const da = a.completionDateTime || a.createdAt || '';
      const db = b.completionDateTime || b.createdAt || '';
      return db.localeCompare(da);
    });

    if (historyList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px 16px; color:var(--text-muted);">
        No completed maintenance records found.
      </td></tr>`;
      return;
    }

    tbody.innerHTML = historyList.map(item => {
      const typeBadgeClass = item.maintenanceType === 'Scheduled' ? 'status-badge-blue' : 'status-badge-purple';
      const techDisplay = item.assignedTech || item.completedBy || 'Not recorded';
      const compDateDisplay = item.completionDateTime ? formatTimeReportedKL(item.completionDateTime) : 'Not recorded';

      return `
        <tr>
          <td><strong>${escapeHtml(item.pmCode || item.id)}</strong></td>
          <td><span style="font-weight:600; color:var(--navy-darkest);">${escapeHtml(item.machine)}</span></td>
          <td><span class="status-badge ${typeBadgeClass}">${escapeHtml(item.maintenanceType || 'Scheduled')}</span></td>
          <td>${escapeHtml(item.taskTitle)}</td>
          <td><strong>${escapeHtml(techDisplay)}</strong></td>
          <td>${escapeHtml(compDateDisplay)}</td>
          <td>
            <button class="btn-table-action info" onclick="window.openViewPMHistoryModal('${escapeHtml(item.pmCode || item.id)}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              View
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * CREATE PM RECORD MODAL (Admin Only)
   */
  async function openCreatePMModal() {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: Creating PM records is restricted to Administrators.', 'error');
      return;
    }

    const modal = document.getElementById('createPMRecordModal');
    if (!modal) return;

    // Reset form and alert
    const form = document.getElementById('createPMForm');
    if (form) form.reset();

    const alertEl = document.getElementById('createPMAlert');
    if (alertEl) alertEl.style.display = 'none';

    // Set Created By with verified staff ID
    const createdByInput = document.getElementById('createPMCreatedBy');
    if (createdByInput) {
      createdByInput.value = state.currentUser.staffId || state.currentUser.id || 'ADMIN';
    }

    // Default Scheduled Date to today (YYYY-MM-DD)
    const schedDateInput = document.getElementById('createPMScheduledDate');
    if (schedDateInput) {
      const today = new Date();
      const pad = n => String(n).padStart(2, '0');
      schedDateInput.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    }

    // Populate Technician dropdown from Firebase
    const techSelect = document.getElementById('createPMAssignedTech');
    if (techSelect) {
      techSelect.disabled = true;
      techSelect.innerHTML = '<option value="">Loading registered technicians...</option>';
    }

    modal.classList.add('active');

    // Fetch technicians from secure endpoint
    const dirResult = await fetchRegisteredTechnicians();
    if (techSelect) {
      if (!dirResult.ok || !Array.isArray(dirResult.technicians) || dirResult.technicians.length === 0) {
        techSelect.innerHTML = '<option value="">No registered technicians found</option>';
        techSelect.disabled = true;
      } else {
        techSelect.disabled = false;
        techSelect.innerHTML = '<option value="">Select Technician...</option>' +
          dirResult.technicians.map(t => `<option value="${escapeHtml(t.staffId)}">${escapeHtml(t.displayName || t.staffId)} (${escapeHtml(t.staffId)})</option>`).join('');
      }
    }
  }

  async function submitCreatePMRecord() {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: Creating PM records is restricted to Administrators.', 'error');
      return;
    }

    const alertEl = document.getElementById('createPMAlert');
    const submitBtn = document.getElementById('submitCreatePMBtn');

    const machine = (document.getElementById('createPMMachine')?.value || '').trim();
    const maintenanceType = (document.getElementById('createPMType')?.value || '').trim();
    const taskTitle = (document.getElementById('createPMTaskTitle')?.value || '').trim();
    const taskDescription = (document.getElementById('createPMTaskDescription')?.value || '').trim();
    const scheduledDate = (document.getElementById('createPMScheduledDate')?.value || '').trim();
    const assignedTech = (document.getElementById('createPMAssignedTech')?.value || '').trim();

    // Validation
    if (!machine) {
      showCreatePMAlert('Please select a valid Machine / Section.');
      return;
    }
    if (maintenanceType !== 'Scheduled' && maintenanceType !== 'Unscheduled') {
      showCreatePMAlert('Please select a valid Maintenance Type (Scheduled or Unscheduled).');
      return;
    }
    if (!taskTitle || taskTitle.length < 3) {
      showCreatePMAlert('Please enter a Task Title (at least 3 characters).');
      return;
    }
    if (!scheduledDate) {
      showCreatePMAlert('Please specify a valid Scheduled Date.');
      return;
    }
    if (!assignedTech) {
      showCreatePMAlert('Please select an Assigned Technician from the directory.');
      return;
    }

    const token = getStoredAuthToken();
    if (!token) {
      showCreatePMAlert('Authentication session expired. Please log in again.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Record...';
    }

    try {
      const res = await fetch('/.netlify/functions/create-pm-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          machine,
          maintenanceType,
          taskTitle,
          taskDescription,
          scheduledDate,
          assignedTech
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        showCreatePMAlert(data.error || 'Failed to create PM record in database.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create PM Record';
        }
        return;
      }

      // Success
      closeAllModals();
      showToast(`Preventive maintenance record ${data.pmCode} created successfully!`, 'success');
      await fetchPMRecordsFromBackend(true);

    } catch (err) {
      showCreatePMAlert('Network error connecting to backend: ' + err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create PM Record';
      }
    }
  }

  function showCreatePMAlert(msg) {
    const alertEl = document.getElementById('createPMAlert');
    if (alertEl) {
      alertEl.textContent = msg;
      alertEl.style.display = 'block';
      alertEl.style.background = '#FEE2E2';
      alertEl.style.color = '#B91C1C';
      alertEl.style.border = '1px solid #FCA5A5';
    }
  }

  /**
   * RESOLVE PM TASK MODAL
   */
  function openResolvePMModal(pmCode) {
    const item = (state.preventiveMaintenance || []).find(p => (p.pmCode || p.id) === pmCode);
    if (!item) {
      showToast(`PM record ${pmCode} not found.`, 'error');
      return;
    }

    const currentStaffId = (state.currentUser ? (state.currentUser.staffId || state.currentUser.id || '') : '').toUpperCase();
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    const assignedTech = (item.assignedTech || '').toUpperCase();

    if (!isAdmin && assignedTech !== currentStaffId) {
      showToast('Access Denied: Technicians may only resolve maintenance tasks assigned to them.', 'error');
      return;
    }

    const modal = document.getElementById('resolvePMModal');
    if (!modal) return;

    // Reset alert & inputs
    const alertEl = document.getElementById('resolvePMAlert');
    if (alertEl) alertEl.style.display = 'none';

    document.getElementById('resolvePMHiddenCode').value = pmCode;
    document.getElementById('resolvePMPmCode').textContent = pmCode;
    document.getElementById('resolvePMTitle').textContent = item.taskTitle || '';
    document.getElementById('resolvePMMachine').textContent = item.machine || '';
    document.getElementById('resolvePMSchedDate').textContent = item.scheduledDate || '';
    document.getElementById('resolvePMTech').textContent = item.assignedTech || '';

    const typeBadge = document.getElementById('resolvePMTypeBadge');
    if (typeBadge) {
      typeBadge.textContent = item.maintenanceType || 'Scheduled';
      typeBadge.className = item.maintenanceType === 'Scheduled' ? 'status-badge status-badge-blue' : 'status-badge status-badge-purple';
    }

    // Default completion time to now in local format
    const compInput = document.getElementById('resolvePMCompletionTime');
    if (compInput) compInput.value = formatInputDateTime(new Date());

    const workInput = document.getElementById('resolvePMWorkDetails');
    if (workInput) workInput.value = '';

    const remarksInput = document.getElementById('resolvePMRemarks');
    if (remarksInput) remarksInput.value = '';

    // Reset photo file selection
    selectedPMPhotoFile = null;
    const photoInput = document.getElementById('resolvePMPhotoInput');
    if (photoInput) photoInput.value = '';
    const photoName = document.getElementById('resolvePMPhotoFileName');
    if (photoName) photoName.textContent = 'Upload image (Optional)';

    modal.classList.add('active');
  }

  function handlePMPhotoSelect(e) {
    const file = e.target.files && e.target.files[0];
    const nameEl = document.getElementById('resolvePMPhotoFileName');
    if (!file) {
      selectedPMPhotoFile = null;
      if (nameEl) nameEl.textContent = 'Upload image (Optional)';
      return;
    }
    selectedPMPhotoFile = file;
    if (nameEl) nameEl.textContent = file.name;
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function submitResolvePMRecord() {
    const pmCode = (document.getElementById('resolvePMHiddenCode')?.value || '').trim();
    const completionDateTime = (document.getElementById('resolvePMCompletionTime')?.value || '').trim();
    const workDetails = (document.getElementById('resolvePMWorkDetails')?.value || '').trim();
    const remarks = (document.getElementById('resolvePMRemarks')?.value || '').trim();
    const submitBtn = document.getElementById('submitResolvePMBtn');

    if (!pmCode) {
      showResolvePMAlert('Missing PM Code reference.');
      return;
    }
    if (!completionDateTime) {
      showResolvePMAlert('Please select a Completion Date & Time.');
      return;
    }
    if (!workDetails || workDetails.length < 5) {
      showResolvePMAlert('Please provide detailed Maintenance Work Details (at least 5 characters).');
      return;
    }

    const token = getStoredAuthToken();
    if (!token) {
      showResolvePMAlert('Authentication session expired. Please log in again.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Resolving Task...';
    }

    try {
      let photoFiles = null;
      if (selectedPMPhotoFile) {
        try {
          const base64Data = await readFileAsBase64(selectedPMPhotoFile);
          photoFiles = {
            after: {
              name: selectedPMPhotoFile.name,
              type: selectedPMPhotoFile.type,
              data: base64Data
            }
          };
        } catch (photoErr) {
          console.warn('Photo conversion error:', photoErr);
        }
      }

      const res = await fetch('/.netlify/functions/resolve-pm-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pmCode,
          completionDateTime,
          workDetails,
          remarks,
          photoFiles
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        showResolvePMAlert(data.error || 'Failed to resolve PM record in database.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm Complete';
        }
        return;
      }

      // Success: Close modal, toast, refresh records
      closeAllModals();
      showToast(`Preventive maintenance ${pmCode} resolved and marked as Completed!`, 'success');
      await fetchPMRecordsFromBackend(true);

    } catch (err) {
      showResolvePMAlert('Network error connecting to backend: ' + err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Complete';
      }
    }
  }

  function showResolvePMAlert(msg) {
    const alertEl = document.getElementById('resolvePMAlert');
    if (alertEl) {
      alertEl.textContent = msg;
      alertEl.style.display = 'block';
      alertEl.style.background = '#FEE2E2';
      alertEl.style.color = '#B91C1C';
      alertEl.style.border = '1px solid #FCA5A5';
    }
  }

  /**
   * VIEW PM HISTORY MODAL
   */
  function openViewPMHistoryModal(pmCode) {
    const item = (state.preventiveMaintenance || []).find(p => (p.pmCode || p.id) === pmCode);
    if (!item) {
      showToast(`PM record ${pmCode} not found.`, 'error');
      return;
    }

    const modal = document.getElementById('viewPMHistoryModal');
    if (!modal) return;

    document.getElementById('viewPMPmCode').textContent = item.pmCode || item.id;
    document.getElementById('viewPMTitle').textContent = item.taskTitle || '-';
    document.getElementById('viewPMMachine').textContent = item.machine || '-';
    document.getElementById('viewPMSchedDate').textContent = item.scheduledDate || '-';
    document.getElementById('viewPMTech').textContent = item.assignedTech || 'Not provided';
    document.getElementById('viewPMCompletedBy').textContent = item.completedBy || 'Not provided';
    document.getElementById('viewPMCompletionTime').textContent = item.completionDateTime ? formatTimeReportedKL(item.completionDateTime) : 'Not provided';
    document.getElementById('viewPMDesc').textContent = item.taskDescription || 'Not provided';
    document.getElementById('viewPMWorkDetails').textContent = item.workDetails || 'Not provided';
    document.getElementById('viewPMRemarks').textContent = item.remarks || 'Not provided';

    const typeBadge = document.getElementById('viewPMType');
    if (typeBadge) {
      typeBadge.textContent = item.maintenanceType || 'Scheduled';
      typeBadge.className = item.maintenanceType === 'Scheduled' ? 'status-badge status-badge-blue' : 'status-badge status-badge-purple';
    }

    const photoCont = document.getElementById('viewPMPhotoContainer');
    if (photoCont) {
      if (item.afterPhoto && item.afterPhoto.trim()) {
        photoCont.innerHTML = `
          <a href="${escapeHtml(item.afterPhoto)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:8px; color:#0078E7; text-decoration:none; font-weight:600; padding:6px 12px; background:#EFF6FF; border-radius:6px; border:1px solid #BFDBFE;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            View After Maintenance Photo
          </a>
        `;
      } else {
        photoCont.textContent = 'Not provided';
      }
    }

    modal.classList.add('active');
  }

  /**
   * PM DASHBOARD: Admin-Only KPI & Chart Rendering
   */
  let isPMDashboardSyncing = false;

  /**
   * Sync PM Dashboard button handler with loading spinner, session preservation, and duplicate protection.
   */
  async function syncPMDashboard() {
    if (isPMDashboardSyncing) return;
    isPMDashboardSyncing = true;

    const btn = document.getElementById('syncPMDashboardBtn');
    const spinIcon = btn ? btn.querySelector('.sync-icon') : null;
    const textSpan = btn ? btn.querySelector('span') : null;
    const originalText = textSpan ? textSpan.textContent : 'Sync';

    if (btn) btn.disabled = true;
    if (spinIcon) spinIcon.classList.add('is-spinning');
    if (textSpan) textSpan.textContent = 'Syncing...';

    try {
      const result = await updatePMDashboard(false);
      if (result && result.ok) {
        showToast('PM Dashboard records updated successfully.', 'success');
      } else {
        const errMsg = (result && result.error) || 'Failed to update PM Dashboard records from database.';
        showToast('Sync Failed: ' + errMsg, 'error');
      }
    } catch (err) {
      showToast('Sync Error: ' + err.message, 'error');
    } finally {
      isPMDashboardSyncing = false;
      if (spinIcon) spinIcon.classList.remove('is-spinning');
      if (textSpan) textSpan.textContent = originalText;
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Update PM Dashboard KPI cards and Infographics with period filter support.
   */
  async function updatePMDashboard(silent = true) {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      switchMaintenanceTab('pm-schedule');
      return { ok: false, error: 'Access Denied: Admin only' };
    }

    const monthSelect = document.getElementById('pmDashboardMonth');
    const yearSelect = document.getElementById('pmDashboardYear');
    const todayKL = getTodayDateStringKL();
    const [currYearKL, currMonthKL] = todayKL.split('-').map(Number);

    const selectedMonth = monthSelect && monthSelect.value !== '' ? parseInt(monthSelect.value, 10) : (currMonthKL - 1);
    const selectedYear = yearSelect && yearSelect.value !== '' ? parseInt(yearSelect.value, 10) : currYearKL;

    const token = getStoredAuthToken() || '';
    if (!token) {
      if (!silent) showToast('Authentication session expired. Please log in again.', 'error');
      return { ok: false, error: 'Not authenticated' };
    }

    try {
      const res = await fetch(`/.netlify/functions/get-pm-dashboard?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          // 1. KPI Cards
          const compRateEl = document.getElementById('pmKpiComplianceRate');
          if (compRateEl) compRateEl.textContent = data.kpis.complianceRate || 'N/A';
          const compSubEl = document.getElementById('pmKpiComplianceSub');
          if (compSubEl && data.kpis.complianceRateSub) compSubEl.textContent = data.kpis.complianceRateSub;

          const compTitleEl = document.getElementById('pmKpiCompletedTitle');
          if (compTitleEl && data.kpis.completedInPeriodTitle) compTitleEl.textContent = data.kpis.completedInPeriodTitle;

          const compCount = data.kpis.completedInPeriod !== undefined ? data.kpis.completedInPeriod : data.kpis.completedPast30Days;
          const comp30El = document.getElementById('pmKpiCompleted30Days');
          if (comp30El) comp30El.textContent = `${compCount} Tasks`;

          const comp30SubEl = document.getElementById('pmKpiCompleted30DaysSub');
          if (comp30SubEl && data.kpis.completedInPeriodSub) comp30SubEl.textContent = data.kpis.completedInPeriodSub;

          const ratioEl = document.getElementById('pmKpiRatio');
          if (ratioEl) ratioEl.textContent = data.kpis.breakdownVsPmRatio || 'N/A';
          const ratioSubEl = document.getElementById('pmKpiRatioSub');
          if (ratioSubEl && data.kpis.rawRatioLabel) ratioSubEl.textContent = data.kpis.rawRatioLabel;

          const overdueEl = document.getElementById('pmKpiOverdue');
          if (overdueEl) {
            overdueEl.textContent = data.kpis.overdueTasks;
            overdueEl.style.color = data.kpis.overdueTasks > 0 ? '#E53E3E' : '#10B981';
          }
          const overdueSubEl = document.getElementById('pmKpiOverdueSub');
          if (overdueSubEl && data.kpis.overdueSub) overdueSubEl.textContent = data.kpis.overdueSub;

          // 2. Chart Subtitles
          const trendSubEl = document.getElementById('chartPMCompletionTrendSub');
          if (trendSubEl && data.charts.monthlyTrend.subtitle) trendSubEl.textContent = data.charts.monthlyTrend.subtitle;

          const typeDistSubEl = document.getElementById('chartPMTypeDistributionSub');
          if (typeDistSubEl && data.charts.typeDistribution.subtitle) typeDistSubEl.textContent = data.charts.typeDistribution.subtitle;

          const machineRankSubEl = document.getElementById('chartPMMachineRankSub');
          if (machineRankSubEl && data.charts.machineRank.subtitle) machineRankSubEl.textContent = data.charts.machineRank.subtitle;

          // 3. Render Charts
          renderPMDashboardCharts(data.charts.monthlyTrend, data.charts.typeDistribution, data.charts.machineRank);
          return { ok: true };
        }
      }

      const errMsg = `Server returned HTTP ${res.status}`;
      if (!silent) showToast('Sync Failed: ' + errMsg, 'error');
      return { ok: false, error: errMsg };
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
      if (!silent) showToast('Network Error: Unable to reach PM Dashboard service.', 'error');
      // Client-side fallback calculation if endpoint is temporarily unreachable
      calculateAndRenderPMLocalDashboard(selectedMonth, selectedYear);
      return { ok: false, error: err.message };
    }
  }

  function calculateAndRenderPMLocalDashboard(filterMonth, filterYear) {
    const pmList = state.preventiveMaintenance || [];
    const bdList = state.breakdowns || [];

    const todayKL = getTodayDateStringKL();
    const [currYearKL, currMonthKL] = todayKL.split('-').map(Number);

    const selectedMonth = filterMonth !== undefined ? filterMonth : (currMonthKL - 1);
    const selectedYear = filterYear !== undefined ? filterYear : currYearKL;

    const pad2 = n => String(n).padStart(2, '0');
    const monthNum = selectedMonth + 1;
    const monthKey = `${selectedYear}-${pad2(monthNum)}`;
    const lastDayOfMonth = new Date(Date.UTC(selectedYear, monthNum, 0)).getUTCDate();
    const periodStart = `${monthKey}-01`;
    const periodEnd = `${monthKey}-${pad2(lastDayOfMonth)}`;

    const isCurrentMonth = (selectedYear === currYearKL && monthNum === currMonthKL);
    const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const repMonthShort = MONTH_NAMES_SHORT[selectedMonth];

    // 1. Compliance Rate
    let scheduledDue = 0;
    let scheduledOnTime = 0;
    for (const r of pmList) {
      if ((r.maintenanceType || '').trim() !== 'Scheduled') continue;
      const sDate = (r.scheduledDate || '').trim().slice(0, 10);
      if (!sDate || !/^\d{4}-\d{2}-\d{2}$/.test(sDate)) continue;
      if (sDate < periodStart || sDate > periodEnd) continue;

      const isComp = (r.status || '').trim() === 'Completed';
      if (isCurrentMonth) {
        if (sDate <= todayKL || isComp) {
          scheduledDue++;
          if (isComp && r.completionDateTime) {
            const compDate = (r.completionDateTime || '').trim().slice(0, 10);
            if (compDate && compDate <= sDate) scheduledOnTime++;
          }
        }
      } else {
        scheduledDue++;
        if (isComp && r.completionDateTime) {
          const compDate = (r.completionDateTime || '').trim().slice(0, 10);
          if (compDate && compDate <= sDate) scheduledOnTime++;
        }
      }
    }
    const compRateStr = scheduledDue > 0 ? ((scheduledOnTime / scheduledDue) * 100).toFixed(1) + '%' : 'N/A';

    // 2. Completed PMs in reporting period
    let compCount = 0;
    for (const r of pmList) {
      if ((r.status || '').trim() !== 'Completed') continue;
      const compDate = (r.completionDateTime || r.scheduledDate || '').trim().slice(0, 10);
      if (compDate >= periodStart && compDate <= periodEnd) compCount++;
    }

    // 3. Ratio
    let bdInPeriod = 0;
    for (const r of bdList) {
      const d = (r.startTime || r.reportedAt || r.time || '').trim().slice(0, 10);
      if (d >= periodStart && d <= periodEnd) bdInPeriod++;
    }

    let ratioStr = 'N/A';
    if (bdInPeriod === 0 && compCount === 0) ratioStr = '0 : 0';
    else if (bdInPeriod === 0) ratioStr = `0 : ${compCount}`;
    else if (compCount === 0) ratioStr = `${bdInPeriod} : 0`;
    else ratioStr = `1 : ${(compCount / bdInPeriod).toFixed(1)}`;

    // 4. Overdue
    let overdueCount = 0;
    for (const r of pmList) {
      if ((r.maintenanceType || '').trim() !== 'Scheduled') continue;
      const sDate = (r.scheduledDate || '').trim().slice(0, 10);
      if (!sDate || !/^\d{4}-\d{2}-\d{2}$/.test(sDate)) continue;

      if (isCurrentMonth) {
        const s = (r.status || '').trim();
        if ((s === 'Pending' || s === 'In Progress') && sDate < todayKL) overdueCount++;
      } else {
        if (sDate >= periodStart && sDate <= periodEnd) {
          const isComp = (r.status || '').trim() === 'Completed';
          if (!isComp) overdueCount++;
          else if (r.completionDateTime && (r.completionDateTime || '').trim().slice(0, 10) > sDate) overdueCount++;
        }
      }
    }

    const compRateEl = document.getElementById('pmKpiComplianceRate');
    if (compRateEl) compRateEl.textContent = compRateStr;
    const compSubEl = document.getElementById('pmKpiComplianceSub');
    if (compSubEl) compSubEl.textContent = `Scheduled PMs met on deadline (${repMonthShort} ${selectedYear})`;

    const compTitleEl = document.getElementById('pmKpiCompletedTitle');
    if (compTitleEl) compTitleEl.textContent = `Completed PMs (${repMonthShort} ${selectedYear})`;
    const comp30El = document.getElementById('pmKpiCompleted30Days');
    if (comp30El) comp30El.textContent = `${compCount} Tasks`;
    const comp30SubEl = document.getElementById('pmKpiCompleted30DaysSub');
    if (comp30SubEl) comp30SubEl.textContent = `Actual closed tasks in ${repMonthShort} ${selectedYear}`;

    const ratioEl = document.getElementById('pmKpiRatio');
    if (ratioEl) ratioEl.textContent = ratioStr;
    const ratioSubEl = document.getElementById('pmKpiRatioSub');
    if (ratioSubEl) ratioSubEl.textContent = `Breakdowns : Completed PMs (${repMonthShort} ${selectedYear})`;

    const overdueEl = document.getElementById('pmKpiOverdue');
    if (overdueEl) {
      overdueEl.textContent = overdueCount;
      overdueEl.style.color = overdueCount > 0 ? '#E53E3E' : '#10B981';
    }
    const overdueSubEl = document.getElementById('pmKpiOverdueSub');
    if (overdueSubEl) overdueSubEl.textContent = isCurrentMonth ? 'Scheduled tasks past due date' : `Overdue tasks in ${repMonthShort} ${selectedYear}`;

    // Charts fallback
    const months = [];
    const mCounts = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(selectedYear, selectedMonth - i, 1));
      const yr = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const k = `${yr}-${pad2(m + 1)}`;
      months.push({ k, label: `${MONTH_NAMES_SHORT[m]} ${String(yr).slice(-2)}` });
      mCounts[k] = 0;
    }
    for (const r of pmList) {
      if ((r.status || '').trim() !== 'Completed') continue;
      const m = (r.completionDateTime || r.scheduledDate || '').slice(0, 7);
      if (mCounts[m] !== undefined) mCounts[m]++;
    }

    let schedCount = 0;
    let unschedCount = 0;
    for (const r of pmList) {
      const sDate = (r.scheduledDate || r.completionDateTime || '').trim().slice(0, 10);
      if (sDate < periodStart || sDate > periodEnd) continue;
      if ((r.maintenanceType || '').trim() === 'Scheduled') schedCount++;
      else if ((r.maintenanceType || '').trim() === 'Unscheduled') unschedCount++;
    }

    const machCounts = {};
    for (const r of pmList) {
      if ((r.status || '').trim() !== 'Completed') continue;
      const compDate = (r.completionDateTime || r.scheduledDate || '').trim().slice(0, 10);
      if (compDate < periodStart || compDate > periodEnd) continue;
      const mach = r.machine || 'Unknown';
      machCounts[mach] = (machCounts[mach] || 0) + 1;
    }
    const topMach = Object.keys(machCounts).map(m => ({ name: m, count: machCounts[m] })).sort((a,b) => b.count - a.count).slice(0, 5);

    const trendSubEl = document.getElementById('chartPMCompletionTrendSub');
    if (trendSubEl) trendSubEl.textContent = `Historical completed maintenance count (12 Months ending ${repMonthShort} ${selectedYear})`;
    const typeDistSubEl = document.getElementById('chartPMTypeDistributionSub');
    if (typeDistSubEl) typeDistSubEl.textContent = `Scheduled vs. Unscheduled PM workload ratio (${repMonthShort} ${selectedYear})`;
    const machineRankSubEl = document.getElementById('chartPMMachineRankSub');
    if (machineRankSubEl) machineRankSubEl.textContent = `Top machines ranked by completed PM volume (${repMonthShort} ${selectedYear})`;

    renderPMDashboardCharts(
      { labels: months.map(m => m.label), data: months.map(m => mCounts[m.k]) },
      { labels: ['Scheduled', 'Unscheduled'], data: [schedCount, unschedCount] },
      { labels: topMach.map(m => m.name), data: topMach.map(m => m.count) }
    );
  }

  function renderPMDashboardCharts(monthlyTrend, typeDistribution, machineRank) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library is not available.');
      return;
    }

    // 1. Chart 1: Line Chart — Monthly Completion Trend
    const trendCanvas = document.getElementById('chartPMCompletionTrend');
    if (trendCanvas) {
      if (chartPMTrendInstance) {
        chartPMTrendInstance.destroy();
        chartPMTrendInstance = null;
      }
      const ctx = trendCanvas.getContext('2d');
      chartPMTrendInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: monthlyTrend.labels,
          datasets: [{
            label: 'Completed PM Tasks',
            data: monthlyTrend.data,
            borderColor: '#0078E7',
            backgroundColor: 'rgba(0, 120, 231, 0.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#0078E7'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#062641',
              padding: 10,
              cornerRadius: 6
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0, font: { size: 11 } },
              grid: { color: '#F1F5F9' }
            },
            x: {
              ticks: { font: { size: 11 } },
              grid: { display: false }
            }
          }
        }
      });
    }

    // 2. Chart 2: Doughnut Chart — Maintenance Type Distribution
    const typeCanvas = document.getElementById('chartPMTypeDistribution');
    if (typeCanvas) {
      if (chartPMTypeInstance) {
        chartPMTypeInstance.destroy();
        chartPMTypeInstance = null;
      }
      const ctx = typeCanvas.getContext('2d');
      const hasData = (typeDistribution.data[0] + typeDistribution.data[1]) > 0;
      chartPMTypeInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: hasData ? typeDistribution.labels : ['No Records'],
          datasets: [{
            data: hasData ? typeDistribution.data : [1],
            backgroundColor: hasData ? ['#0078E7', '#8B5CF6'] : ['#E2E8F0'],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { font: { size: 12 }, padding: 14 }
            },
            tooltip: {
              enabled: hasData,
              backgroundColor: '#062641',
              padding: 10,
              cornerRadius: 6
            }
          },
          cutout: '68%'
        }
      });
    }

    // 3. Chart 3: Horizontal Bar Chart — PM Completion by Machine
    const machineCanvas = document.getElementById('chartPMMachineCompletion');
    if (machineCanvas) {
      if (chartPMMachineInstance) {
        chartPMMachineInstance.destroy();
        chartPMMachineInstance = null;
      }
      const ctx = machineCanvas.getContext('2d');
      const hasData = machineRank.data && machineRank.data.length > 0 && machineRank.data.some(c => c > 0);
      chartPMMachineInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: hasData ? machineRank.labels : ['No Completed Records'],
          datasets: [{
            label: 'Completed PMs',
            data: hasData ? machineRank.data : [0],
            backgroundColor: '#062641',
            hoverBackgroundColor: '#0078E7',
            borderRadius: 4,
            barThickness: 18
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: hasData,
              backgroundColor: '#062641',
              padding: 10,
              cornerRadius: 6
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { precision: 0, font: { size: 11 } },
              grid: { color: '#F1F5F9' }
            },
            y: {
              ticks: { font: { size: 11, weight: 'bold' } },
              grid: { display: false }
            }
          }
        }
      });
    }
  }

  // =========================================================================
  // 8. MODULE 3: SPARE PARTS INVENTORY, MOVEMENTS & REQUESTS
  // =========================================================================
  let activeSparePartsTab = 'parts-list';
  let lastSparePartsFetchError = null;

  /**
   * Fetch live Spare Parts records from backend via Netlify Function
   */
  async function fetchSparePartsFromBackend(silent = false) {
    const token = getStoredAuthToken() || '';
    if (!token) return { ok: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/.netlify/functions/get-spare-parts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await res.json().catch(() => null);

      if (res.ok && result && result.success) {
        lastSparePartsFetchError = null;
        if (Array.isArray(result.spareParts)) {
          state.spareParts = result.spareParts;
        }
        if (Array.isArray(result.stockMovements)) {
          state.stockMovements = result.stockMovements;
        }
        if (Array.isArray(result.stockRequests)) {
          state.stockRequests = result.stockRequests;
        }
        saveState();
        renderSparePartsView();
        return { ok: true, count: state.spareParts.length };
      } else {
        const errMsg = (result && (result.error || result.message)) || `Server returned HTTP ${res.status}`;
        lastSparePartsFetchError = errMsg;
        if (!silent) {
          showToast('Spare Parts Sync Error: ' + errMsg, 'error');
        }
        renderSparePartsView();
        return { ok: false, error: errMsg };
      }
    } catch (e) {
      const errMsg = 'Network connection failed: ' + e.message;
      lastSparePartsFetchError = errMsg;
      if (!silent) {
        showToast('Spare Parts Sync Error: ' + errMsg, 'error');
      }
      renderSparePartsView();
      return { ok: false, error: errMsg };
    }
  }

  /**
   * Functional sync handler for each Spare Parts tab (Task 5)
   * Fetches latest data from Google Sheets through Netlify Functions with loading indicator
   * and concurrency locking.
   */
  let isSyncingSpareParts = false;
  const isSyncingSparePartsTabs = {};

  async function syncSparePartsTab(targetTab) {
    if (isSyncingSparePartsTabs[targetTab]) return;
    isSyncingSparePartsTabs[targetTab] = true;
    isSyncingSpareParts = true;

    let btn = null;
    if (targetTab === 'parts-list') {
      btn = document.getElementById('syncSparePartsBtn');
    } else if (targetTab === 'stock-movement') {
      btn = document.getElementById('syncStockMovementsBtn');
    } else if (targetTab === 'stock-request') {
      btn = document.getElementById('syncStockRequestsBtn');
    }

    const spinIcon = btn ? btn.querySelector('.sync-icon') : null;
    const textSpan = btn ? btn.querySelector('span') : null;
    const originalText = textSpan ? textSpan.textContent : 'Sync';

    if (btn) btn.disabled = true;
    if (spinIcon) spinIcon.classList.add('is-spinning');
    if (textSpan) textSpan.textContent = 'Syncing...';

    try {
      const result = await fetchSparePartsFromBackend(true);
      if (result && result.ok) {
        if (targetTab === 'parts-list') {
          renderSparePartsTable();
          showToast('Spare Parts List synchronized with Google Sheets.', 'success');
        } else if (targetTab === 'stock-movement') {
          const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
          const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
          if (isAdmin) renderStockMovementsTable();
          showToast('Stock Movement History synchronized with Google Sheets.', 'success');
        } else if (targetTab === 'stock-request') {
          renderStockRequestsTable();
          showToast('Stock Requests synchronized with Google Sheets.', 'success');
        } else {
          renderSparePartsView();
          showToast('Inventory database synchronized successfully.', 'success');
        }
      } else {
        const msg = (result && result.error) || 'Failed to fetch latest data.';
        showToast(`Sync Failed: ${msg}`, 'error');
      }
    } catch (err) {
      console.error('[syncSparePartsTab] Error:', err);
      showToast('Sync Error: ' + err.message, 'error');
    } finally {
      if (spinIcon) spinIcon.classList.remove('is-spinning');
      if (textSpan) textSpan.textContent = originalText;
      if (btn) btn.disabled = false;
      isSyncingSparePartsTabs[targetTab] = false;
      isSyncingSpareParts = Object.values(isSyncingSparePartsTabs).some(Boolean);
    }
  }
  window.syncSparePartsTab = syncSparePartsTab;

  function renderSparePartsView() {
    renderSparePartsTable();
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (isAdmin) {
      renderStockMovementsTable();
    }
    renderStockRequestsTable();
  }

  function switchSparePartsTab(tabName) {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';

    // Technicians must not be able to access Stock Movement History through direct URL or navigation!
    if (tabName === 'stock-movement' && !isAdmin) {
      showToast('Access Denied: Stock Movement History is restricted to Administrator accounts.', 'error');
      tabName = 'parts-list';
    }

    activeSparePartsTab = tabName;
    document.querySelectorAll('#sparepartsTabs .module-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.spareparts-tab-content').forEach(c => {
      c.style.display = 'none';
    });

    const targetTab = document.getElementById(`sp-tab-${tabName}`);
    if (targetTab) targetTab.style.display = 'block';

    if (tabName === 'parts-list') renderSparePartsTable();
    else if (tabName === 'stock-movement' && isAdmin) renderStockMovementsTable();
    else if (tabName === 'stock-request') renderStockRequestsTable();
  }

  function renderSparePartsTable() {
    const searchVal = (document.getElementById('sparePartsSearch')?.value || '').toLowerCase();
    const filterVal = document.getElementById('sparePartsFilter')?.value || 'all';

    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';

    const tbody = document.getElementById('sparePartsTbody');
    if (!tbody) return;

    // Empty state requirement (Task 2 Requirement 7):
    if (!state.spareParts || state.spareParts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:45px 20px; color:var(--text-muted);">
            <div style="font-size:15px; font-weight:600; color:var(--navy-darkest); margin-bottom:4px;">No spare parts available.</div>
            <div style="font-size:13px; color:var(--text-muted);">Click Add Stock to register a new spare part.</div>
          </td>
        </tr>
      `;
      return;
    }

    let list = (state.spareParts || []).filter(part => {
      const matchSearch = (part.name || '').toLowerCase().includes(searchVal) ||
        (part.code || '').toLowerCase().includes(searchVal) ||
        (part.category || '').toLowerCase().includes(searchVal) ||
        (part.location || '').toLowerCase().includes(searchVal) ||
        (part.supplier || '').toLowerCase().includes(searchVal);

      if (!matchSearch) return false;

      const currentStock = Number(part.currentStock) || 0;
      const minStock = Number(part.minStock) || 0;

      if (filterVal === 'low') {
        return currentStock > 0 && currentStock <= minStock;
      } else if (filterVal === 'out') {
        return currentStock === 0;
      } else if (filterVal === 'ok') {
        return currentStock > minStock;
      }
      return true;
    });

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">No spare parts match your search or filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const currentStock = Number(item.currentStock) || 0;
      const minStock = Number(item.minStock) || 0;

      // Strict colour-based stock status indicators (Rule 1, 2, 3)
      let badgeHtml = '';
      if (currentStock === 0) {
        // RULE 1: Stock = 0 -> RED (Light red bg, dark red text)
        badgeHtml = `<span class="status-badge status-badge-red">OUT OF STOCK</span>`;
      } else if (currentStock <= minStock) {
        // RULE 2: Stock > 0 AND Stock <= Min Limit -> YELLOW / AMBER (Light yellow bg, amber text)
        badgeHtml = `<span class="status-badge status-badge-amber">LOW STOCK</span>`;
      } else {
        // RULE 3: Stock > Min Limit -> GREEN (Light green bg, dark green text)
        badgeHtml = `<span class="status-badge status-badge-green">IN STOCK</span>`;
      }

      // Action buttons (Tasks 3, 4 & 8):
      // ADMIN: [Manage Item] [Request] [Trash Icon]
      // TECHNICIAN: [Request] (Admin buttons completely hidden)
      let actionButtonsHtml = '';
      if (isAdmin) {
        actionButtonsHtml = `
          <div class="action-btn-group" style="display:inline-flex; align-items:center; gap:6px;">
            <button class="btn-table-action" onclick="window.openManageItemModal('${escapeHtml(item.code)}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Manage Item
            </button>
            <button class="btn-table-action" onclick="window.openRequestStockModal('${escapeHtml(item.code)}')">
              Request
            </button>
            <button class="btn-table-action btn-table-action-danger" onclick="window.openDeleteItemModal('${escapeHtml(item.code)}')" title="Delete Spare Part" style="color:#DC2626; border-color:#FECACA;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        `;
      } else {
        actionButtonsHtml = `
          <div class="action-btn-group">
            <button class="btn-table-action" onclick="window.openRequestStockModal('${escapeHtml(item.code)}')">
              Request
            </button>
          </div>
        `;
      }

      const unitPriceDisplay = typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(2) : parseFloat(item.unitPrice || 0).toFixed(2);

      // Task 8 Table Structure (9 Columns):
      // Part Code | Part Description | Category | Storage Location / Bin | Supplier | Stock Level | Status | Unit Price | Actions
      return `
        <tr>
          <td><strong>${escapeHtml(item.code)}</strong></td>
          <td><div style="font-weight:600; color:var(--navy-darkest);">${escapeHtml(item.name || '-')}</div></td>
          <td>${escapeHtml(item.category || '-')}</td>
          <td>${escapeHtml(item.location || '-')}</td>
          <td>${escapeHtml(item.supplier || '-')}</td>
          <td>
            <div style="font-size:15px; font-weight:700; color:${currentStock <= minStock ? 'var(--red-primary)' : 'var(--navy-darkest)'};">
              ${currentStock} <span style="font-size:12px; font-weight:500; color:var(--text-muted);">${escapeHtml(item.unit || 'pcs')}</span>
            </div>
            <div style="font-size:11px; color:var(--text-muted);">Min: ${minStock} ${escapeHtml(item.unit || 'pcs')}</div>
          </td>
          <td>${badgeHtml}</td>
          <td>RM ${unitPriceDisplay}</td>
          <td>${actionButtonsHtml}</td>
        </tr>
      `;
    }).join('');
  }

  function renderStockMovementsTable() {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    const tbody = document.getElementById('stockMovementTbody');
    if (!tbody) return;

    if (!isAdmin) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--red-primary);">Access Denied: Stock Movement History is restricted to Administrator accounts.</td></tr>`;
      return;
    }

    // Filter to Stock In, Stock Adjustment, Issued, and Stock Out
    const filteredMovements = (state.stockMovements || []).filter(m => {
      const typeLower = (m.type || '').toLowerCase();
      return typeLower === 'stock in' || typeLower === 'stock adjustment' || typeLower === 'received' || typeLower === 'manual adjustment' || typeLower === 'issued' || typeLower === 'stock out' || typeLower.includes('approved request') || typeLower.includes('stock out');
    });

    if (filteredMovements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">No stock movements recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = filteredMovements.map(m => {
      // Authorized Supplier retrieved from Spare Parts database linked by Part Code
      const part = (state.spareParts || []).find(p => p.code === m.partCode);
      const supplierName = (part && part.supplier) || m.supplier || 'N/A';
      const isPositive = Number(m.qty) > 0;
      let typeDisplay = m.type || 'Stock Adjustment';
      let badgeClass = 'status-badge-blue';
      const typeLower = (m.type || '').toLowerCase();
      if (typeLower === 'stock in' || typeLower === 'received') {
        typeDisplay = 'Stock In';
        badgeClass = 'status-badge-green';
      } else if (typeLower === 'issued') {
        typeDisplay = 'Issued';
        badgeClass = 'status-badge-blue';
      } else if (typeLower.includes('approved request') || typeLower.includes('stock out')) {
        typeDisplay = m.type || 'Stock Out - Approved Request';
        badgeClass = 'status-badge-amber';
      } else {
        typeDisplay = 'Stock Adjustment';
        badgeClass = 'status-badge-blue';
      }

      const prev = m.previousStock !== undefined ? m.previousStock : '—';
      const updated = m.updatedStock !== undefined ? m.updatedStock : (m.balance !== undefined ? m.balance : '—');
      const qtyDisplay = Number(m.qty) > 0 ? ('+' + m.qty) : String(m.qty);

      return `
        <tr>
          <td>${escapeHtml(m.date || '—')}</td>
          <td><strong>${escapeHtml(m.partCode)}</strong></td>
          <td>${escapeHtml(m.partName || (part && part.name) || '—')}</td>
          <td><span class="status-badge ${badgeClass}">${typeDisplay}</span></td>
          <td style="font-weight:700; color:${isPositive ? '#10B981' : 'var(--red-primary)'};">
            ${qtyDisplay}
          </td>
          <td>${prev}</td>
          <td style="font-weight:700; color:var(--navy-darkest);">${updated}</td>
          <td>${escapeHtml(supplierName)}</td>
          <td>${escapeHtml(m.updatedBy || m.handler || 'ADMIN')}</td>
        </tr>
      `;
    }).join('');
  }

  function renderStockRequestsTable() {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    const currentStaffId = (state.currentUser ? (state.currentUser.staffId || state.currentUser.id || '') : '').toUpperCase();

    const reasonTh = document.getElementById('thStockRequestReason');
    if (reasonTh) {
      reasonTh.style.display = isAdmin ? '' : 'none';
    }

    const tbody = document.getElementById('stockRequestTbody');
    if (!tbody) return;

    let requests = state.stockRequests || [];
    // Technicians view own requests only
    if (!isAdmin) {
      requests = requests.filter(r => (r.requestedByStaffId || '').toUpperCase() === currentStaffId);
    }

    const colSpan = isAdmin ? 9 : 8;
    if (requests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; padding:30px; color:var(--text-muted);">No stock requests found.</td></tr>`;
      return;
    }

    tbody.innerHTML = requests.map(r => {
      let statusBadge = '';
      const st = (r.status || 'Pending').toLowerCase();
      if (st === 'pending') {
        statusBadge = `<span class="status-badge status-badge-amber">Pending</span>`;
      } else if (st === 'approved') {
        statusBadge = `<span class="status-badge status-badge-blue">Approved</span>`;
      } else if (st === 'rejected') {
        statusBadge = `<span class="status-badge status-badge-red">Rejected</span>`;
      } else if (st === 'issued') {
        statusBadge = `<span class="status-badge status-badge-green">Issued</span>`;
      } else {
        statusBadge = `<span class="status-badge status-badge-grey">${escapeHtml(r.status)}</span>`;
      }

      let actionsHtml = '';
      if (isAdmin) {
        if (st === 'pending') {
          actionsHtml = `
            <div class="action-btn-group">
              <button class="btn-table-action" style="color:#059669; font-weight:600;" onclick="window.handleApproveStockRequest('${escapeHtml(r.requestId)}')">
                Approve
              </button>
              <button class="btn-table-action" style="color:var(--red-primary); font-weight:600;" onclick="window.handleRejectStockRequest('${escapeHtml(r.requestId)}')">
                Reject
              </button>
              <button class="btn-table-action" onclick="window.openStockRequestDetail('${escapeHtml(r.requestId)}')">
                Details
              </button>
            </div>
          `;
        } else if (st === 'approved') {
          actionsHtml = `
            <div class="action-btn-group">
              <button class="btn-table-action" style="color:#2563EB; font-weight:700;" onclick="window.handleIssueStockRequest('${escapeHtml(r.requestId)}')">
                Issue Stock
              </button>
              <button class="btn-table-action" onclick="window.openStockRequestDetail('${escapeHtml(r.requestId)}')">
                Details
              </button>
            </div>
          `;
        } else {
          actionsHtml = `
            <div class="action-btn-group">
              <button class="btn-table-action" onclick="window.openStockRequestDetail('${escapeHtml(r.requestId)}')">
                Details
              </button>
            </div>
          `;
        }
      } else {
        actionsHtml = `
          <div class="action-btn-group">
            <button class="btn-table-action" onclick="window.openStockRequestDetail('${escapeHtml(r.requestId)}')">
              Details
            </button>
          </div>
        `;
      }

      const rawReason = (r.reason !== undefined && r.reason !== null) ? String(r.reason).trim() : '';
      const displayReason = rawReason ? escapeHtml(rawReason) : '-';
      const reasonTdHtml = isAdmin ? `<td style="max-width:200px; white-space:normal; word-break:break-word;">${displayReason}</td>` : '';

      return `
        <tr>
          <td><strong>${escapeHtml(r.requestId)}</strong></td>
          <td>${escapeHtml(r.requestDate || '—')}</td>
          <td>
            <div style="font-weight:600; color:var(--navy-darkest);">${escapeHtml(r.requestedByName || r.requestedByStaffId || 'Staff')}</div>
            <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(r.requestedByStaffId || '')}</div>
          </td>
          <td><strong>${escapeHtml(r.partCode)}</strong></td>
          <td>${escapeHtml(r.partName || '—')}</td>
          <td style="font-size:14px; font-weight:700; color:var(--navy-darkest);">${r.qtyRequested}</td>
          ${reasonTdHtml}
          <td>${statusBadge}</td>
          <td>${actionsHtml}</td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // 9. TECHNICIAN MANAGEMENT MODULE (ADMIN ONLY - PHASES 5-13)
  // =========================================================================
  let technicianSearchQuery = '';
  let technicianStatusFilter = 'all';
  let currentViewingTechId = null;

  /**
   * Helper to match technician to work order assignedTech field.
   * Matches by staffId, name, technicianId, or firebaseUid.
   */
  function isWorkOrderAssignedToTech(assignedTechStr, tech) {
    if (!assignedTechStr || !tech) return false;
    const assigned = String(assignedTechStr).trim().toUpperCase();
    if (!assigned || assigned === 'UNASSIGNED' || assigned === 'NOT ASSIGNED' || assigned === 'NONE' || assigned === '—') return false;

    const staffId = String(tech.staffId || '').trim().toUpperCase();
    const name = String(tech.name || '').trim().toUpperCase();
    const techId = String(tech.technicianId || '').trim().toUpperCase();
    const uid = String(tech.firebaseUid || '').trim().toUpperCase();

    if (staffId && assigned === staffId) return true;
    if (name && assigned === name) return true;
    if (techId && assigned === techId) return true;
    if (uid && assigned === uid) return true;

    // Check substring matches (e.g. "Staff PN002" or "Ahmad Firdaus (PN002)")
    if (staffId && (assigned.includes(staffId) || assigned.replace(/\s+/g, '').includes(staffId))) return true;
    if (name && assigned.includes(name)) return true;
    if (techId && assigned.includes(techId)) return true;

    return false;
  }

  /**
   * Calculate dynamic metrics for a technician:
   * - Active Jobs (Breakdowns + PM)
   * - Completed Jobs (Breakdowns + PM)
   * - Status: Inactive, In Job, Available
   */
  function calculateTechnicianMetrics(tech) {
    const activeBreakdowns = (state.breakdowns || []).filter(b => {
      const isCompleted = String(b.status || '').trim().toLowerCase() === 'completed';
      return !isCompleted && isWorkOrderAssignedToTech(b.assignedTech, tech);
    });

    const activePMs = (state.preventiveMaintenance || []).filter(pm => {
      const isCompleted = String(pm.status || '').trim().toLowerCase() === 'completed';
      return !isCompleted && (isWorkOrderAssignedToTech(pm.assignedTech, tech) || isWorkOrderAssignedToTech(pm.assignedStaffId, tech));
    });

    const completedBreakdowns = (state.breakdowns || []).filter(b => {
      const isCompleted = String(b.status || '').trim().toLowerCase() === 'completed';
      return isCompleted && isWorkOrderAssignedToTech(b.assignedTech, tech);
    });

    const completedPMs = (state.preventiveMaintenance || []).filter(pm => {
      const isCompleted = String(pm.status || '').trim().toLowerCase() === 'completed';
      return isCompleted && (isWorkOrderAssignedToTech(pm.assignedTech, tech) || isWorkOrderAssignedToTech(pm.assignedStaffId, tech));
    });

    const activeJobCodes = [
      ...activeBreakdowns.map(b => b.id || 'BD'),
      ...activePMs.map(pm => pm.pmCode || 'PM')
    ];

    const completedCount = completedBreakdowns.length + completedPMs.length;

    // Phase 8: Technician Status calculation
    // Inactive: Technician account is disabled / Inactive
    // In Job: Technician has at least one active Breakdown or PM work order
    // Available: Technician account is active and has no active assigned work order
    let computedStatus = 'Available';
    let statusBadgeClass = 'status-badge-green';

    if (String(tech.accountStatus || '').trim().toLowerCase() === 'inactive' || tech.disabled === true) {
      computedStatus = 'Inactive';
      statusBadgeClass = 'status-badge-grey';
    } else if (activeJobCodes.length > 0) {
      computedStatus = 'In Job';
      statusBadgeClass = 'status-badge-blue';
    } else {
      computedStatus = 'Available';
      statusBadgeClass = 'status-badge-green';
    }

    // Phase 11: Current Job formatting
    let currentJobDisplay = 'None';
    if (activeJobCodes.length === 1) {
      currentJobDisplay = activeJobCodes[0];
    } else if (activeJobCodes.length > 1) {
      currentJobDisplay = `${activeJobCodes.length} Active Jobs`;
    }

    return {
      activeBreakdowns,
      activePMs,
      completedBreakdowns,
      completedPMs,
      activeJobCodes,
      completedCount,
      computedStatus,
      statusBadgeClass,
      currentJobDisplay
    };
  }

  /**
   * Fetch technicians from serverless endpoint (ADMIN ONLY)
   */
  async function fetchTechniciansFromBackend(forceNotification) {
    const token = sessionStorage.getItem('mmsAuthToken') || '';
    if (!token) return;

    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) return;

    const syncBtn = document.getElementById('btnSyncTechnicians');
    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.classList.add('syncing');
    }

    try {
      const res = await fetch('/.netlify/functions/manage-technicians', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'list' })
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data && data.success && Array.isArray(data.technicians)) {
        state.technicians = data.technicians;
        updateKPICounters();
        if (forceNotification) {
          showToast(`Synchronized ${data.technicians.length} technician records.`, 'success');
        }
      } else {
        if (forceNotification) {
          const errMsg = (data && data.error) || 'Failed to sync technicians.';
          showToast(`Sync notice: ${errMsg}`, 'error');
        }
      }
    } catch (err) {
      console.warn('[fetchTechniciansFromBackend] Request error:', err);
      if (forceNotification) {
        showToast('Network error syncing technicians.', 'error');
      }
    } finally {
      if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.classList.remove('syncing');
      }
    }
  }
  window.fetchTechniciansFromBackend = fetchTechniciansFromBackend;

  /**
   * Throttled activity updater: pings backend to update Last Active timestamp
   * at most once every 15 minutes per session.
   */
  function recordUserActivityThrottled() {
    const token = sessionStorage.getItem('mmsAuthToken') || '';
    if (!token) return;

    const LAST_PING_KEY = 'mms_last_activity_ping';
    const lastPing = parseInt(sessionStorage.getItem(LAST_PING_KEY), 10) || 0;
    const now = Date.now();
    const FIFTEEN_MINS = 15 * 60 * 1000;

    if (now - lastPing < FIFTEEN_MINS) {
      return;
    }

    sessionStorage.setItem(LAST_PING_KEY, String(now));
    fetch('/.netlify/functions/manage-technicians', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'record-activity' })
    }).catch(e => console.warn('[recordActivity] Background ping notice:', e.message));
  }
  window.recordUserActivityThrottled = recordUserActivityThrottled;

  // =========================================================================
  // 10. NOTIFICATION SYSTEM
  // =========================================================================
  function toggleNotificationsDrawer() {
    const drawer = document.getElementById('notificationDrawer');
    if (drawer) {
      drawer.classList.toggle('active');
      renderNotificationsList();
    }
  }

  function closeNotificationsDrawer() {
    const drawer = document.getElementById('notificationDrawer');
    if (drawer) drawer.classList.remove('active');
  }

  function renderNotificationsList() {
    const listEl = document.getElementById('notificationList');
    if (listEl) {
      if (state.notifications.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">No notifications.</div>`;
      } else {
        listEl.innerHTML = state.notifications.map(n => `
          <div class="notif-card ${n.unread ? 'unread' : ''}" onclick="window.handleNotificationClick('${n.id}')">
            <div class="notif-header-line">
              <span class="notif-title">${escapeHtml(n.title)}</span>
              <span class="notif-time">${n.time}</span>
            </div>
            <div class="notif-desc">${escapeHtml(n.message)}</div>
          </div>
        `).join('');
      }
    }
    updateKPICounters();
  }

  function markAllNotificationsRead() {
    state.notifications.forEach(n => n.unread = false);
    saveState();
    renderNotificationsList();
    updateKPICounters();
    showToast('All notifications marked as read', 'info');
  }

  function handleNotificationClick(notifId) {
    const notif = state.notifications.find(n => n.id === notifId);
    if (notif) {
      notif.unread = false;
      saveState();
      renderNotificationsList();
      closeNotificationsDrawer();
      if (notif.targetView) {
        navigateTo(notif.targetView);
      }
    }
  }

  function addNotification(title, message, targetView, recordId) {
    const newNotif = {
      id: 'NT-' + Math.floor(1000 + Math.random() * 9000),
      title,
      message,
      time: 'Just now',
      unread: true,
      targetView: targetView || 'home',
      recordId: recordId || ''
    };
    state.notifications.unshift(newNotif);
    saveState();
    updateKPICounters();
  }

  // =========================================================================
  // 11. MODAL FORMS & MUTATIONS (CRUD OPERATIONS)
  // =========================================================================

  // --- Breakdown Report Modal: Google Sheets (MMS DATABASE / BD DATABASE) ---

  function populateStaffIdFromProfile() {
    const staffInput = document.getElementById('rbStaffId');
    const badge = document.getElementById('rbStaffIdBadge');
    if (staffInput && state.currentUser) {
      staffInput.value = state.currentUser.staffId || state.currentUser.id || '';
    }
    if (badge && state.currentUser) {
      const sid = state.currentUser.staffId || state.currentUser.id || '';
      badge.textContent = `${sid} • ${state.currentUser.name}`;
    }
  }

  function formatInputDateTime(date = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
  }

  function formatSubmissionTime(date = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  }

  function getMonthYearString(date = new Date()) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function showBreakdownFormAlert(message, type = 'error') {
    const banner = document.getElementById('rbAlertBanner');
    if (!banner) return;
    banner.className = `form-alert-banner ${type}`;
    banner.innerHTML = message;
    banner.style.display = 'block';
  }

  function clearBreakdownFormAlert() {
    const banner = document.getElementById('rbAlertBanner');
    if (banner) {
      banner.style.display = 'none';
      banner.innerHTML = '';
      banner.className = 'form-alert-banner';
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type || 'image/jpeg',
          size: file.size,
          data: reader.result
        });
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  const ALLOWED_MACHINES = [
    'VIM 01', 'VIM 02', 'VIM 03', 'VIM 04', 'VIM 05',
    'VIM 06', 'VIM 07', 'VIM 08', 'VIM 09', 'VIM 10',
    'VIM 11', 'VIM 12', 'VIM 13', 'VIM 14', 'VIM 15',
    'Turn Table + KUKA', 'Robot Arm 1', 'Robot Arm 2',
    'Oven', 'Compressor', 'Cooling Tower', 'Crane'
  ];
  const ALLOWED_PRIORITIES = ['Critical', 'Medium', 'Low'];
  const ALLOWED_CATEGORIES = ['Mechanical', 'Electrical', 'Hydraulic', 'Pneumatic', 'Parametic'];

  function resetBreakdownForm() {
    const form = document.getElementById('reportBreakdownForm');
    if (form) form.reset();

    populateStaffIdFromProfile();

    const machineSelect = document.getElementById('rbMachine');
    if (machineSelect) machineSelect.value = '';

    const prioritySelect = document.getElementById('rbPriority');
    if (prioritySelect) {
      prioritySelect.value = '';
      updatePrioritySelectStyle(prioritySelect);
    }

    const categorySelect = document.getElementById('rbCategory');
    if (categorySelect) categorySelect.value = '';

    const startInput = document.getElementById('rbStartTime');
    if (startInput) startInput.value = formatInputDateTime(new Date());

    const beforePhotoName = document.getElementById('rbBeforePhotoName');
    if (beforePhotoName) beforePhotoName.textContent = 'Upload image (Optional)';

    document.querySelectorAll('#reportBreakdownForm .input-error').forEach(el => el.classList.remove('input-error'));
    clearBreakdownFormAlert();
  }

  function setSubmitButtonLoading(isLoading) {
    const submitBtn = document.getElementById('rbSubmitBtn');
    const cancelBtn = document.getElementById('rbCancelBtn');
    const spinner = document.getElementById('rbSubmitSpinner');
    const icon = document.getElementById('rbSubmitIcon');
    const text = document.getElementById('rbSubmitText');

    if (!submitBtn) return;
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.75';
      submitBtn.style.cursor = 'not-allowed';
      if (cancelBtn) cancelBtn.disabled = true;
      if (spinner) spinner.style.display = 'inline-block';
      if (icon) icon.style.display = 'none';
      if (text) text.textContent = 'Submitting to Database...';
    } else {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      if (cancelBtn) cancelBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (icon) icon.style.display = 'inline';
      if (text) text.textContent = 'Submit Breakdown Report';
    }
  }

  function openReportBreakdownModal() {
    clearBreakdownFormAlert();
    populateStaffIdFromProfile();

    const startInput = document.getElementById('rbStartTime');
    if (startInput && !startInput.value) {
      startInput.value = formatInputDateTime(new Date());
    }

    const modal = document.getElementById('reportBreakdownModal');
    if (modal) modal.classList.add('active');
  }

  function validateBreakdownForm() {
    const errors = [];
    const staffId = document.getElementById('rbStaffId')?.value?.trim() || (state.currentUser?.staffId || state.currentUser?.id || '');
    const machine = document.getElementById('rbMachine')?.value?.trim();
    const startTime = document.getElementById('rbStartTime')?.value?.trim();
    const priority = document.getElementById('rbPriority')?.value?.trim();
    const category = document.getElementById('rbCategory')?.value?.trim();
    const description = document.getElementById('rbDescription')?.value?.trim();
    const beforePhotoInput = document.getElementById('rbBeforePhoto');

    // Remove previous input-error marks
    document.querySelectorAll('#reportBreakdownForm .input-error').forEach(el => el.classList.remove('input-error'));

    if (!machine || !ALLOWED_MACHINES.includes(machine)) {
      errors.push('Please select a valid Machine / Equipment Name from the list.');
      document.getElementById('rbMachine')?.classList.add('input-error');
    }

    if (!startTime) {
      errors.push('Breakdown Start Time is required.');
      document.getElementById('rbStartTime')?.classList.add('input-error');
    }

    if (!priority || !ALLOWED_PRIORITIES.includes(priority)) {
      errors.push('Priority is required. Must be Critical, Medium, or Low.');
      document.getElementById('rbPriority')?.classList.add('input-error');
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      errors.push('Problem Category is required. Must be Mechanical, Electrical, Hydraulic, Pneumatic, or Parametic.');
      document.getElementById('rbCategory')?.classList.add('input-error');
    }

    if (!description) {
      errors.push('Problem Description is required.');
      document.getElementById('rbDescription')?.classList.add('input-error');
    }

    if (!staffId) {
      errors.push('Staff ID could not be identified from active authenticated session. Please log in again.');
    }

    // Photo file format validation (JPG, JPEG, PNG)
    const allowedExtensions = ['jpg', 'jpeg', 'png'];
    if (beforePhotoInput?.files?.[0]) {
      const file = beforePhotoInput.files[0];
      const ext = file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        errors.push(`Before Photo "${file.name}" is invalid. Only JPG, JPEG, and PNG are allowed.`);
        beforePhotoInput.classList.add('input-error');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      values: {
        staffId,
        machine,
        startTime,
        priority,
        category,
        description
      }
    };
  }

  async function submitReportBreakdown(e) {
    if (e) e.preventDefault();
    clearBreakdownFormAlert();

    // 1. Validate required inputs
    const validation = validateBreakdownForm();
    if (!validation.isValid) {
      showBreakdownFormAlert(
        `<strong>Please correct the following required fields:</strong>` +
        `<ul style="margin:6px 0 0 18px; padding:0;">${validation.errors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}</ul>`,
        'error'
      );
      showToast('Validation failed. Please correct the highlighted errors.', 'error');
      return;
    }

    // 2. Prepare the breakdown data object matching Google Sheets database structure
    // Database: MMS DATABASE | Worksheet: BD DATABASE (Columns A to N)
    // A newly reported breakdown is ALWAYS in 'Repair' status with no end time, downtime, or after photo.
    const now = new Date();
    const timeStr = formatSubmissionTime(now);
    const monthStr = getMonthYearString(now);

    // 3. Display loading state
    setSubmitButtonLoading(true);

    try {
      // Process before photo if attached
      const beforeFileInput = document.getElementById('rbBeforePhoto');
      const beforePhotoObj = beforeFileInput?.files?.[0] ? await fileToBase64(beforeFileInput.files[0]) : null;

      // Database Columns Mapping:
      // Column A: Time
      // Column B: Month
      // Column C: Staff ID (Authenticated)
      // Column D: Machine
      // Column E: Breakdown Start Time
      // Column F: Breakdown End Time (Enforced empty for new active breakdown)
      // Column G: Downtime (minutes) (Enforced empty for new active breakdown)
      // Column H: Problem Category
      // Column I: Before Photo
      // Column J: After Photo (Enforced empty for new active breakdown)
      // Column K: Problem Description
      // Column L: Status (Enforced 'Repair' for new active breakdown)
      // Column M: Priority (Enforced Critical, Medium, or Low)
      // Column N: Assigned Technician (Enforced empty on creation)
      const payload = {
        time: timeStr,                                           // Column A
        month: monthStr,                                         // Column B
        staffId: validation.values.staffId,                      // Column C
        machine: validation.values.machine,                      // Column D
        startTime: validation.values.startTime,                  // Column E
        endTime: '',                                             // Column F: strictly empty on creation
        downtime: '',                                            // Column G: strictly empty on creation
        category: validation.values.category,                    // Column H
        beforePhoto: beforePhotoObj ? beforePhotoObj.name : '',  // Column I
        afterPhoto: '',                                          // Column J: strictly empty on creation
        description: validation.values.description,              // Column K
        status: 'Repair',                                        // Column L: strictly Repair on creation
        priority: validation.values.priority,                    // Column M: strictly Critical, Medium, or Low
        assignedTech: '',                                        // Column N: strictly empty on creation
        photoFiles: {
          before: beforePhotoObj,
          after: null
        }
      };

      // 4. Submit to configured Netlify server function
      const API_ENDPOINT = window.MMS_BACKEND_URL || '/.netlify/functions/submit-breakdown';

      const token = sessionStorage.getItem('mmsAuthToken') || '';
      const requestHeaders = {
        'Content-Type': 'application/json'
      };
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);

      if (response.ok && result && result.success) {
        // 5. Show confirmation
        showBreakdownFormAlert(
          `<strong>Breakdown Report Recorded Successfully!</strong><br>` +
          `Saved to Google Sheets: <em>MMS DATABASE</em> &bull; Worksheet: <em>BD DATABASE</em>.` +
          (result.rowId ? `<br><small>Reference ID: ${escapeHtml(String(result.rowId))}</small>` : ''),
          'success'
        );
        showToast('Breakdown report successfully saved to Google Sheets BD DATABASE!', 'success');

        // Synchronize active record into dashboard state
        const newId = result.rowId || 'BD-' + (state.breakdowns.length + 2);
        const newRecord = {
          id: newId,
          machine: validation.values.machine,
          line: 'Central Line',
          issue: validation.values.description,
          description: validation.values.description,
          category: validation.values.category,
          priority: validation.values.priority,
          status: 'Repair',
          reportedBy: `${validation.values.staffId} (${state.currentUser ? state.currentUser.name : 'Technician'})`,
          assignedTech: 'Unassigned',
          startTime: validation.values.startTime,
          reportedAt: validation.values.startTime.replace('T', ' '),
          time: timeStr,
          endTime: '',
          downtime: 0,
          downtimeMin: 0,
          beforePhoto: beforePhotoObj ? beforePhotoObj.name : '',
          afterPhoto: ''
        };

        state.breakdowns.unshift(newRecord);
        addNotification('New Breakdown Logged', `${validation.values.machine}: ${validation.values.category} reported to BD DATABASE.`, 'breakdown', newId);
        saveState();
        renderAll();
        fetchBreakdownsFromBackend();

        // 6. Clear form after successful submission
        resetBreakdownForm();

        setTimeout(() => {
          closeAllModals();
        }, 1600);
      } else {
        const errMsg = (result && (result.error || result.message))
          || `Backend server responded with status ${response.status} (${response.statusText || 'Error'})`;

        showBreakdownFormAlert(
          `<strong>Backend Submission Failed:</strong> ${escapeHtml(errMsg)}<br>` +
          `<small style="margin-top:6px; display:block;">Target: Google Sheets (MMS DATABASE &bull; Sheet: BD DATABASE) via Netlify server function (<code>${escapeHtml(API_ENDPOINT)}</code>).<br>` +
          `<strong>Breakdown data was NOT saved.</strong> Please ensure backend function and <code>GOOGLE_APPS_SCRIPT_URL</code> are configured.</small>`,
          'error'
        );
        showToast('Submission rejected: Backend not configured. Data was not saved.', 'error');
      }
    } catch (netErr) {
      const API_ENDPOINT = window.MMS_BACKEND_URL || '/.netlify/functions/submit-breakdown';
      showBreakdownFormAlert(
        `<strong>Backend Connection Error:</strong> Unable to connect to server function at <code>${escapeHtml(API_ENDPOINT)}</code>.<br>` +
        `<small style="margin-top:6px; display:block;">The backend server function is not reachable or not running.<br>` +
        `<strong>Breakdown data was NOT saved.</strong> Please deploy or start the Netlify function with Google Sheets integration.</small>`,
        'error'
      );
      showToast('Network error: Backend unavailable. Data was not saved.', 'error');
    } finally {
      setSubmitButtonLoading(false);
    }
  }

  function initBreakdownModalHandlers() {
    const machineSelect = document.getElementById('rbMachine');
    if (machineSelect) {
      machineSelect.addEventListener('change', () => {
        machineSelect.classList.remove('input-error');
      });
    }

    const prioritySelect = document.getElementById('rbPriority');
    if (prioritySelect) {
      prioritySelect.addEventListener('change', () => {
        updatePrioritySelectStyle(prioritySelect);
        prioritySelect.classList.remove('input-error');
      });
    }

    const categorySelect = document.getElementById('rbCategory');
    if (categorySelect) {
      categorySelect.addEventListener('change', () => {
        categorySelect.classList.remove('input-error');
      });
    }

    const beforePhoto = document.getElementById('rbBeforePhoto');
    const beforePhotoName = document.getElementById('rbBeforePhotoName');
    if (beforePhoto) {
      beforePhoto.addEventListener('change', () => {
        if (beforePhoto.files && beforePhoto.files[0]) {
          const file = beforePhoto.files[0];
          const kb = Math.round(file.size / 1024);
          if (beforePhotoName) beforePhotoName.textContent = `📎 ${file.name} (${kb} KB)`;
        } else {
          if (beforePhotoName) beforePhotoName.textContent = 'Upload image (Optional)';
        }
        beforePhoto.classList.remove('input-error');
      });
    }

    // Clear input-error on typing
    const form = document.getElementById('reportBreakdownForm');
    if (form) {
      form.querySelectorAll('.form-control').forEach(ctrl => {
        ctrl.addEventListener('input', () => {
          ctrl.classList.remove('input-error');
        });
      });
    }
  }

  // Resolve Breakdown Action: opens modal requiring Breakdown End Time
  function resolveBreakdown(bdId) {
    openResolveBreakdownModal(bdId);
  }

  // Complete PM Task Action (Routes to database-backed resolve modal)
  function completePMTask(pmId) {
    openResolvePMModal(pmId);
  }

  // =========================================================================
  // SPARE PARTS & STOCK REQUEST MODAL HANDLERS
  // =========================================================================

  function formatCurrentDateTime() {
    const now = new Date();
    const pad = n => (n < 10 ? '0' + n : n);
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' +
      pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  // 1. ADD NEW SPARE PART (ADMIN ONLY)
  function openAddStockModal() {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: Adding spare parts is restricted to Administrator accounts.', 'error');
      return;
    }

    const form = document.getElementById('addStockForm');
    if (form) form.reset();

    const initialQty = document.getElementById('addStockInitialQty');
    if (initialQty) initialQty.value = '0';
    const minLimit = document.getElementById('addStockMinLimit');
    if (minLimit) minLimit.value = '5';
    const unitEl = document.getElementById('addStockUnit');
    if (unitEl) unitEl.value = 'pcs';

    const modal = document.getElementById('addStockModal');
    if (modal) modal.classList.add('active');
  }

  async function submitAddStock(e) {
    if (e) e.preventDefault();
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: Adding spare parts is restricted to Administrator accounts.', 'error');
      return;
    }

    const code = (document.getElementById('addStockPartCode')?.value || '').trim().toUpperCase();
    const name = (document.getElementById('addStockPartName')?.value || '').trim();
    const category = (document.getElementById('addStockCategory')?.value || '').trim();
    const location = (document.getElementById('addStockLocation')?.value || '').trim();
    const initialQty = parseInt(document.getElementById('addStockInitialQty')?.value, 10);
    const minLimit = parseInt(document.getElementById('addStockMinLimit')?.value, 10);
    const unit = (document.getElementById('addStockUnit')?.value || 'pcs').trim();
    const unitPrice = parseFloat(document.getElementById('addStockUnitPrice')?.value);
    const supplier = (document.getElementById('addStockSupplier')?.value || '').trim();

    if (!code || !name || !category || !location || !unit || !supplier) {
      showToast('All fields are required to add a new spare part.', 'error');
      return;
    }
    if (isNaN(initialQty) || initialQty < 0) {
      showToast('Initial Stock Quantity must be zero or a positive whole number.', 'error');
      return;
    }
    if (isNaN(minLimit) || minLimit < 0) {
      showToast('Minimum Stock Limit must be zero or a positive whole number.', 'error');
      return;
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      showToast('Unit Price must be zero or a positive number.', 'error');
      return;
    }

    // Check unique Part Code locally
    if ((state.spareParts || []).some(p => p.code.toUpperCase() === code)) {
      showToast(`Part Code "${code}" already exists in inventory. Part Code must be unique.`, 'error');
      return;
    }

    const submitBtn = document.getElementById('addStockSubmitBtn');
    const spinner = document.getElementById('addStockSpinner');
    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';

    const newPart = {
      code,
      name,
      category,
      location,
      currentStock: initialQty,
      minStock: minLimit,
      unit,
      unitPrice,
      supplier,
      createdAt: formatCurrentDateTime(),
      updatedAt: formatCurrentDateTime()
    };

    try {
      const token = getStoredAuthToken() || '';
      if (token) {
        await fetch('/.netlify/functions/manage-spare-parts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'add-stock',
            code,
            name,
            category,
            location,
            currentStock: initialQty,
            minStock: minLimit,
            unit,
            unitPrice,
            supplier
          })
        }).catch(err => console.warn('Backend sync warning:', err));
      }

      state.spareParts.unshift(newPart);

      if (initialQty > 0) {
        const mId = 'MV-' + Math.floor(1000 + Math.random() * 9000);
        state.stockMovements.unshift({
          id: mId,
          date: formatCurrentDateTime(),
          partCode: code,
          partName: name,
          type: 'Stock In',
          qty: initialQty,
          previousStock: 0,
          updatedStock: initialQty,
          balance: initialQty,
          supplier: supplier,
          updatedBy: state.currentUser.staffId || state.currentUser.name || 'ADMIN',
          reference: 'Initial Stock Setup'
        });
      }

      saveState();
      closeAllModals();
      renderSparePartsView();
      showToast(`Spare part ${code} added successfully!`, 'success');
    } catch (err) {
      showToast('Error saving new spare part: ' + err.message, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
    }
  }

  // =========================================================================
  // TASK 3: MANAGE SPARE PART (ADMIN ONLY) - Combined Metadata & Stock Control
  // =========================================================================
  let currentManagingPartCode = null;

  function openManageItemModal(partCode) {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: Managing spare parts is restricted to Administrator accounts.', 'error');
      return;
    }

    currentManagingPartCode = partCode;
    const part = (state.spareParts || []).find(p => p.code === partCode);
    if (!part) {
      showToast('Spare part record not found.', 'error');
      return;
    }

    // Populate modal inputs with existing item data
    const codeEl = document.getElementById('manageItemPartCode');
    const catEl = document.getElementById('manageItemCategory');
    const nameEl = document.getElementById('manageItemPartName');
    const locEl = document.getElementById('manageItemLocation');
    const supEl = document.getElementById('manageItemSupplier');
    const unitEl = document.getElementById('manageItemUnit');
    const priceEl = document.getElementById('manageItemUnitPrice');
    const minEl = document.getElementById('manageItemMinStock');
    const curStockDisp = document.getElementById('manageItemCurrentStockDisplay');
    const unitDisp = document.getElementById('manageItemUnitDisplay');
    const adjTypeEl = document.getElementById('manageItemAdjType');
    const adjQtyEl = document.getElementById('manageItemAdjQty');
    const reasonGroup = document.getElementById('manageItemReasonGroup');
    const adjReasonEl = document.getElementById('manageItemAdjReason');
    const alertEl = document.getElementById('manageItemAlert');
    const submitBtn = document.getElementById('manageItemSubmitBtn');

    if (codeEl) codeEl.value = part.code;
    if (catEl) catEl.value = part.category || '';
    if (nameEl) nameEl.value = part.name || '';
    if (locEl) locEl.value = part.location || '';
    if (supEl) supEl.value = part.supplier || '';
    const partUnit = part.unit || 'pcs';
    if (unitEl) unitEl.value = partUnit;
    if (priceEl) priceEl.value = part.unitPrice !== undefined ? part.unitPrice : 0;
    if (minEl) minEl.value = part.minStock !== undefined ? part.minStock : 0;

    const currentStockNum = Number(part.currentStock) || 0;
    if (curStockDisp) curStockDisp.textContent = currentStockNum;
    if (unitDisp) unitDisp.textContent = partUnit;

    if (adjTypeEl) adjTypeEl.value = 'none';
    if (adjQtyEl) {
      adjQtyEl.value = '';
      adjQtyEl.disabled = true;
      adjQtyEl.style.background = '#F1F5F9';
    }
    if (reasonGroup) reasonGroup.style.display = 'none';
    if (adjReasonEl) adjReasonEl.value = '';
    if (alertEl) {
      alertEl.style.display = 'none';
      alertEl.innerHTML = '';
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }

    updateManageItemStockCalc();

    const modal = document.getElementById('manageItemModal');
    if (modal) modal.classList.add('active');
  }
  window.openManageItemModal = openManageItemModal;

  function updateManageItemStockCalc() {
    const adjTypeEl = document.getElementById('manageItemAdjType');
    const adjQtyEl = document.getElementById('manageItemAdjQty');
    const reasonGroup = document.getElementById('manageItemReasonGroup');
    const curStockDisp = document.getElementById('manageItemCurrentStockDisplay');
    const calcCur = document.getElementById('calcCurrentStock');
    const calcAdj = document.getElementById('calcAdjustmentQty');
    const calcUpd = document.getElementById('calcUpdatedStock');
    const warningEl = document.getElementById('stockNegativeWarning');
    const submitBtn = document.getElementById('manageItemSubmitBtn');

    const currentStock = parseInt(curStockDisp ? curStockDisp.textContent : '0', 10) || 0;
    const adjType = adjTypeEl ? adjTypeEl.value : 'none';

    if (adjType === 'none') {
      if (adjQtyEl) {
        adjQtyEl.disabled = true;
        adjQtyEl.value = '';
        adjQtyEl.style.background = '#F1F5F9';
      }
      if (reasonGroup) reasonGroup.style.display = 'none';
      if (calcCur) calcCur.textContent = currentStock;
      if (calcAdj) {
        calcAdj.textContent = '± 0';
        calcAdj.style.color = 'var(--text-muted)';
      }
      if (calcUpd) {
        calcUpd.textContent = currentStock;
        calcUpd.style.color = 'var(--accent-primary)';
      }
      if (warningEl) warningEl.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    if (adjQtyEl) {
      adjQtyEl.disabled = false;
      adjQtyEl.style.background = '#FFFFFF';
    }
    if (reasonGroup) reasonGroup.style.display = 'block';

    let rawQty = parseInt(adjQtyEl ? adjQtyEl.value : '0', 10) || 0;
    if (rawQty < 0) {
      rawQty = Math.abs(rawQty);
      if (adjQtyEl) adjQtyEl.value = rawQty;
    }

    let netAdj = adjType === 'in' ? rawQty : -rawQty;
    const updatedStock = currentStock + netAdj;

    if (calcCur) calcCur.textContent = currentStock;
    if (calcAdj) {
      calcAdj.textContent = (adjType === 'in' ? '+' : '-') + ' ' + rawQty;
      calcAdj.style.color = adjType === 'in' ? '#166534' : '#DC2626';
    }
    if (calcUpd) {
      calcUpd.textContent = updatedStock;
    }

    if (updatedStock < 0) {
      if (calcUpd) calcUpd.style.color = '#DC2626';
      if (warningEl) warningEl.style.display = 'block';
      if (submitBtn) submitBtn.disabled = true;
    } else {
      if (calcUpd) calcUpd.style.color = 'var(--accent-primary)';
      if (warningEl) warningEl.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
    }
  }
  window.updateManageItemStockCalc = updateManageItemStockCalc;

  async function submitManageItem(e) {
    if (e) e.preventDefault();
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: Managing spare parts is restricted to Administrator accounts.', 'error');
      return;
    }

    if (!currentManagingPartCode) return;
    const part = (state.spareParts || []).find(p => p.code === currentManagingPartCode);
    if (!part) return;

    const alertEl = document.getElementById('manageItemAlert');
    const submitBtn = document.getElementById('manageItemSubmitBtn');

    function showError(msg) {
      if (alertEl) {
        alertEl.textContent = msg;
        alertEl.style.display = 'block';
        alertEl.style.background = '#FEE2E2';
        alertEl.style.color = '#B91C1C';
      }
      showToast(msg, 'error');
    }

    const name = (document.getElementById('manageItemPartName')?.value || '').trim();
    const category = (document.getElementById('manageItemCategory')?.value || '').trim();
    const location = (document.getElementById('manageItemLocation')?.value || '').trim();
    const supplier = (document.getElementById('manageItemSupplier')?.value || '').trim();
    const unit = (document.getElementById('manageItemUnit')?.value || 'pcs').trim();
    const unitPrice = parseFloat(document.getElementById('manageItemUnitPrice')?.value);
    const minStock = parseInt(document.getElementById('manageItemMinStock')?.value, 10);
    const adjType = document.getElementById('manageItemAdjType')?.value || 'none';
    const adjQty = parseInt(document.getElementById('manageItemAdjQty')?.value, 10) || 0;
    const adjReason = (document.getElementById('manageItemAdjReason')?.value || '').trim();

    if (!name || !category || !location || !supplier || !unit) {
      showError('All required metadata fields must be filled.');
      return;
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      showError('Unit price must be zero or a positive numeric value.');
      return;
    }
    if (isNaN(minStock) || minStock < 0) {
      showError('Minimum stock limit must be zero or a positive whole number.');
      return;
    }

    if (adjType === 'in' || adjType === 'out') {
      if (adjQty <= 0) {
        showError('Adjustment quantity must be greater than zero.');
        return;
      }
      if (!adjReason) {
        showError('Adjustment reason is required when adjusting stock.');
        return;
      }
      const curStock = Number(part.currentStock) || 0;
      if (adjType === 'out' && curStock - adjQty < 0) {
        showError('Updated stock cannot become negative. Please reduce deduction quantity.');
        return;
      }
    }

    if (alertEl) alertEl.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      const token = getStoredAuthToken() || '';
      if (!token) {
        showError('Authentication session expired. Please log in again.');
        return;
      }

      const res = await fetch('/.netlify/functions/manage-spare-parts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'manage-item',
          code: part.code,
          name,
          category,
          location,
          supplier,
          unit,
          unitPrice,
          minStock,
          adjustmentType: adjType,
          adjustmentQty: (adjType === 'in' || adjType === 'out') ? adjQty : 0,
          adjustmentReason: adjReason
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data && data.success) {
        // Apply successful updates to local state
        part.name = name;
        part.category = category;
        part.location = location;
        part.supplier = supplier;
        part.unit = unit;
        part.unitPrice = unitPrice;
        part.minStock = minStock;
        part.updatedAt = formatCurrentDateTime();

        if (data.updatedStock !== undefined) {
          part.currentStock = data.updatedStock;
        } else if (adjType === 'in') {
          part.currentStock = (Number(part.currentStock) || 0) + adjQty;
        } else if (adjType === 'out') {
          part.currentStock = Math.max(0, (Number(part.currentStock) || 0) - adjQty);
        }

        if (data.movement) {
          state.stockMovements.unshift(data.movement);
        }

        saveState();
        closeAllModals();
        renderSparePartsView();
        showToast(`Spare part ${part.code} updated successfully.`, 'success');
      } else {
        const errMsg = (data && data.error) || 'Failed to save spare part changes to database.';
        showError(errMsg);
      }
    } catch (err) {
      console.error('[submitManageItem] Error:', err);
      showError('Network error connecting to backend service.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
      }
    }
  }
  window.submitManageItem = submitManageItem;

  // =========================================================================
  // TASK 4: DELETE / ARCHIVE SPARE PART (ADMIN ONLY)
  // =========================================================================
  let currentDeletingPartCode = null;

  function openDeleteItemModal(partCode) {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: Deleting spare parts is restricted to Administrator accounts.', 'error');
      return;
    }

    const part = (state.spareParts || []).find(p => p.code === partCode);
    if (!part) {
      showToast('Spare part record not found.', 'error');
      return;
    }

    currentDeletingPartCode = partCode;

    const codeEl = document.getElementById('deleteItemPartCode');
    const nameEl = document.getElementById('deleteItemPartName');
    const stockEl = document.getElementById('deleteItemCurrentStock');
    const alertEl = document.getElementById('deleteItemAlert');
    const confirmBtn = document.getElementById('deleteItemConfirmBtn');

    if (codeEl) codeEl.textContent = part.code;
    if (nameEl) nameEl.textContent = part.name;
    if (stockEl) stockEl.textContent = `${part.currentStock} ${part.unit || 'pcs'}`;
    if (alertEl) {
      alertEl.style.display = 'none';
      alertEl.innerHTML = '';
    }
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Delete Item';
    }

    const modal = document.getElementById('deleteItemModal');
    if (modal) modal.classList.add('active');
  }
  window.openDeleteItemModal = openDeleteItemModal;

  async function confirmDeleteItem() {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: Deleting spare parts is restricted to Administrator accounts.', 'error');
      return;
    }

    if (!currentDeletingPartCode) return;

    const alertEl = document.getElementById('deleteItemAlert');
    const confirmBtn = document.getElementById('deleteItemConfirmBtn');

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Processing...';
    }

    try {
      const token = getStoredAuthToken() || '';
      if (!token) {
        showToast('Authentication required.', 'error');
        return;
      }

      const res = await fetch('/.netlify/functions/manage-spare-parts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'delete-item',
          code: currentDeletingPartCode
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data && data.success) {
        state.spareParts = (state.spareParts || []).filter(p => p.code !== currentDeletingPartCode);
        saveState();
        closeAllModals();
        renderSparePartsView();
        showToast(data.message || 'Spare part removed successfully.', 'success');
      } else {
        const errMsg = (data && data.error) || 'Failed to remove spare part.';
        if (alertEl) {
          alertEl.textContent = errMsg;
          alertEl.style.display = 'block';
          alertEl.style.background = '#FEE2E2';
          alertEl.style.color = '#B91C1C';
        }
        showToast(errMsg, 'error');
      }
    } catch (err) {
      console.error('[confirmDeleteItem] Error:', err);
      if (alertEl) {
        alertEl.textContent = 'Network error connecting to backend service.';
        alertEl.style.display = 'block';
        alertEl.style.background = '#FEE2E2';
        alertEl.style.color = '#B91C1C';
      }
      showToast('Network error during spare part removal.', 'error');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Delete Item';
      }
    }
  }
  window.confirmDeleteItem = confirmDeleteItem;

  // 4. REQUEST STOCK WORKFLOW (ADMIN & TECHNICIAN)
  function openRequestStockModal(partCode) {
    let part = null;
    if (partCode) {
      part = (state.spareParts || []).find(p => p.code === partCode);
    }
    if (!part && state.spareParts && state.spareParts.length > 0) {
      part = state.spareParts[0];
    }

    // Generate unique Request ID
    let maxNum = 1000;
    (state.stockRequests || []).forEach(r => {
      const m = (r.requestId || '').match(/REQ-(\d+)/i);
      if (m) {
        const num = parseInt(m[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextReqId = 'REQ-' + (maxNum + 1);

    const idEl = document.getElementById('reqStockId');
    if (idEl) idEl.value = nextReqId;

    const dateEl = document.getElementById('reqStockDateTime');
    if (dateEl) dateEl.value = formatCurrentDateTime();

    const user = state.currentUser || {};
    const byEl = document.getElementById('reqStockRequestedBy');
    if (byEl) byEl.value = `${user.name || 'Staff User'} (${user.staffId || user.id || 'STAFF'})`;

    const codeEl = document.getElementById('reqStockPartCode');
    if (codeEl) codeEl.value = part ? part.code : '';

    const nameEl = document.getElementById('reqStockPartName');
    if (nameEl) nameEl.value = part ? part.name : '';

    const qtyEl = document.getElementById('reqStockQty');
    if (qtyEl) qtyEl.value = '1';

    const reasonEl = document.getElementById('reqStockReason');
    if (reasonEl) reasonEl.value = '';

    const modal = document.getElementById('requestStockModal');
    if (modal) modal.classList.add('active');
  }

  async function submitRequestStock(e) {
    if (e) e.preventDefault();

    const requestId = (document.getElementById('reqStockId')?.value || '').trim();
    const partCode = (document.getElementById('reqStockPartCode')?.value || '').trim();
    const partName = (document.getElementById('reqStockPartName')?.value || '').trim();
    const reqQty = parseInt(document.getElementById('reqStockQty')?.value, 10);
    const reason = (document.getElementById('reqStockReason')?.value || '').trim();

    if (!partCode) {
      showToast('Part Code is required.', 'error');
      return;
    }
    if (isNaN(reqQty) || reqQty <= 0) {
      showToast('Requested Quantity must be at least 1 unit.', 'error');
      return;
    }
    if (!reason) {
      showToast('Please provide a reason / remarks for requisition.', 'error');
      return;
    }

    const submitBtn = document.getElementById('reqStockSubmitBtn');
    const spinner = document.getElementById('reqStockSpinner');
    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';

    const user = state.currentUser || {};
    const staffId = (user.staffId || user.id || 'STAFF').toUpperCase();
    const userName = user.name || 'Staff User';

    const newRequest = {
      requestId: requestId || ('REQ-' + Math.floor(1000 + Math.random() * 9000)),
      requestDate: formatCurrentDateTime(),
      requestedByStaffId: staffId,
      requestedByName: userName,
      partCode,
      partName,
      qtyRequested: reqQty,
      reason,
      status: 'Pending',
      approvedBy: '',
      approvedDate: '',
      issuedBy: '',
      issuedDate: '',
      notes: ''
    };

    try {
      const token = getStoredAuthToken() || '';
      if (token) {
        await fetch('/.netlify/functions/manage-spare-parts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'request-stock',
            requestId: newRequest.requestId,
            partCode,
            partDescription: partName,
            qtyRequested: reqQty,
            reason
          })
        }).catch(err => console.warn('Backend sync warning:', err));
      }

      state.stockRequests.unshift(newRequest);
      saveState();
      closeAllModals();
      renderSparePartsView();
      switchSparePartsTab('stock-request');
      showToast(`Stock request ${newRequest.requestId} submitted for approval!`, 'success');
    } catch (err) {
      showToast('Failed to submit stock request: ' + err.message, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
    }
  }

  // 5. APPROVE STOCK REQUEST (ADMIN ONLY - DEDUCTS STOCK IMMEDIATELY)
  async function handleApproveStockRequest(requestId) {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: Approving requests is restricted to Administrator accounts.', 'error');
      return;
    }

    const req = (state.stockRequests || []).find(r => (r.requestId || '').trim().toUpperCase() === String(requestId).trim().toUpperCase());
    if (!req) {
      showToast(`Stock request ${requestId} not found.`, 'error');
      return;
    }

    if (req.status === 'Approved') {
      showToast(`Duplicate Approval Prevented: Request ${requestId} has already been approved and stock was deducted.`, 'error');
      return;
    }
    if (req.status === 'Issued') {
      showToast(`Request ${requestId} has already been issued.`, 'error');
      return;
    }
    if (req.status !== 'Pending') {
      showToast(`Cannot approve request with status "${req.status}". Only Pending requests can be approved.`, 'error');
      return;
    }

    const reqPartCode = (req.partCode || '').trim().toUpperCase();
    const part = (state.spareParts || []).find(p => (p.code || '').trim().toUpperCase() === reqPartCode);
    if (!part) {
      showToast(`Part ${req.partCode} not found in inventory database.`, 'error');
      return;
    }

    const currentStock = Number(part.currentStock) || 0;
    const requestedQty = Number(req.qtyRequested) || 0;

    // Validate available stock upfront (Task 1 & Task 3: Current Stock must never become negative)
    if (currentStock < requestedQty) {
      showToast(`Insufficient stock to approve request! Available: ${currentStock} ${part.unit || 'pcs'}, Requested: ${requestedQty} ${part.unit || 'pcs'}. Stock deduction rejected.`, 'error');
      return;
    }

    // Identify button and show loading state to prevent double clicks
    const targetBtn = (typeof window.event !== 'undefined' && window.event && window.event.target) ? window.event.target.closest('button') : null;
    const originalBtnText = targetBtn ? targetBtn.textContent : '';
    if (targetBtn) {
      targetBtn.disabled = true;
      targetBtn.textContent = 'Approving...';
    }

    try {
      const token = getStoredAuthToken() || '';
      if (!token) {
        showToast('Authentication required to approve stock requests.', 'error');
        if (targetBtn) {
          targetBtn.disabled = false;
          targetBtn.textContent = originalBtnText;
        }
        return;
      }

      const res = await fetch('/.netlify/functions/manage-spare-parts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'approve-request',
          requestId: req.requestId
        })
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result || result.success === false) {
        const errMsg = (result && result.error) || `Server failed with status ${res.status}`;
        showToast(`Failed to approve request: ${errMsg}`, 'error');
        if (targetBtn) {
          targetBtn.disabled = false;
          targetBtn.textContent = originalBtnText;
        }
        return;
      }

      // Backend confirmed approval and stock deduction!
      let finalNewStock;
      if (result.newStock !== undefined && !isNaN(Number(result.newStock))) {
        finalNewStock = Number(result.newStock);
      } else {
        finalNewStock = Math.max(0, currentStock - requestedQty);
      }

      part.currentStock = finalNewStock;
      req.status = 'Approved';
      req.approvedBy = state.currentUser.staffId || state.currentUser.name || 'ADMIN';
      req.approvedDate = formatCurrentDateTime();

      // Record in audit log
      const mId = result.movementId || ('MV-' + Math.floor(1000 + Math.random() * 9000));
      state.stockMovements.unshift({
        id: mId,
        date: formatCurrentDateTime(),
        partCode: part.code,
        partName: part.name,
        type: 'Stock Out - Approved Request',
        qty: -requestedQty,
        previousStock: currentStock,
        updatedStock: finalNewStock,
        balance: finalNewStock,
        supplier: part.supplier,
        updatedBy: req.approvedBy,
        reference: req.requestId
      });

      saveState();

      // Fetch fresh verified values from Google Sheets backend (Task 6: Live update inventory, requests, movements)
      try {
        await fetchSparePartsFromBackend(true);
      } catch (fetchErr) {
        console.warn('[handleApproveStockRequest] Post-approval background sync warning:', fetchErr);
        renderSparePartsView();
      }

      showToast(`Request ${requestId} approved! Deducted ${requestedQty} ${part.unit || 'pcs'} of ${part.code}. New balance: ${finalNewStock} ${part.unit || 'pcs'}.`, 'success');
    } catch (err) {
      showToast('Failed to approve request: ' + err.message, 'error');
      if (targetBtn) {
        targetBtn.disabled = false;
        targetBtn.textContent = originalBtnText;
      }
    }
  }

  // 6. REJECT STOCK REQUEST (ADMIN ONLY - ONLY PENDING REQUESTS CAN BE REJECTED)
  async function handleRejectStockRequest(requestId) {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: Rejecting requests is restricted to Administrator accounts.', 'error');
      return;
    }

    const req = (state.stockRequests || []).find(r => (r.requestId || '').trim().toUpperCase() === String(requestId).trim().toUpperCase());
    if (!req) return;

    if (req.status === 'Approved') {
      showToast(`Cannot reject an already Approved request. Stock was deducted upon approval. Cancellation requires a controlled return process.`, 'error');
      return;
    }
    if (req.status === 'Issued') {
      showToast(`Cannot reject a request that has already been issued.`, 'error');
      return;
    }
    if (req.status === 'Rejected') {
      showToast(`Request ${requestId} is already Rejected.`, 'error');
      return;
    }
    if (req.status !== 'Pending') {
      showToast(`Cannot reject request with status "${req.status}". Only Pending requests can be rejected.`, 'error');
      return;
    }

    try {
      const token = getStoredAuthToken() || '';
      if (token) {
        const res = await fetch('/.netlify/functions/manage-spare-parts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'reject-request',
            requestId: req.requestId
          })
        });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result || result.success === false) {
          const errMsg = (result && result.error) || 'Failed to reject request.';
          showToast(errMsg, 'error');
          return;
        }
      }

      req.status = 'Rejected';
      req.approvedBy = state.currentUser.staffId || state.currentUser.name || 'ADMIN';
      req.approvedDate = formatCurrentDateTime();

      saveState();
      try {
        await fetchSparePartsFromBackend(true);
      } catch (e) {
        renderSparePartsView();
      }
      showToast(`Request ${requestId} marked as Rejected. Stock remains unchanged.`, 'info');
    } catch (err) {
      showToast('Failed to reject request: ' + err.message, 'error');
    }
  }

  // 7. ISSUE STOCK (ADMIN ONLY - MARKS AS ISSUED, DOES NOT DEDUCT STOCK)
  async function handleIssueStockRequest(requestId) {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: Issuing stock is restricted to Administrator accounts.', 'error');
      return;
    }

    const req = (state.stockRequests || []).find(r => (r.requestId || '').trim().toUpperCase() === String(requestId).trim().toUpperCase());
    if (!req) {
      showToast(`Stock request ${requestId} not found.`, 'error');
      return;
    }

    if (req.status === 'Issued') {
      showToast(`Duplicate Issue Prevented: Request ${requestId} has already been issued.`, 'error');
      return;
    }
    if (req.status !== 'Approved') {
      showToast(`Cannot issue stock for request with status "${req.status}". It must be Approved first.`, 'error');
      return;
    }

    // Identify button and show loading state to prevent double clicks
    const targetBtn = (typeof window.event !== 'undefined' && window.event && window.event.target) ? window.event.target.closest('button') : null;
    const originalBtnText = targetBtn ? targetBtn.textContent : '';
    if (targetBtn) {
      targetBtn.disabled = true;
      targetBtn.textContent = 'Issuing...';
    }

    try {
      const token = getStoredAuthToken() || '';
      if (!token) {
        showToast('Authentication required to issue spare parts.', 'error');
        if (targetBtn) {
          targetBtn.disabled = false;
          targetBtn.textContent = originalBtnText;
        }
        return;
      }

      const res = await fetch('/.netlify/functions/manage-spare-parts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'issue-stock',
          requestId: req.requestId
        })
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result || result.success === false) {
        const errMsg = (result && result.error) || `Server failed with status ${res.status}`;
        showToast(`Failed to issue stock: ${errMsg}`, 'error');
        if (targetBtn) {
          targetBtn.disabled = false;
          targetBtn.textContent = originalBtnText;
        }
        return;
      }

      // Backend confirmed status changed to Issued without deducting stock again!
      req.status = 'Issued';
      req.issuedBy = state.currentUser.staffId || state.currentUser.name || 'ADMIN';
      req.issuedDate = formatCurrentDateTime();

      // DO NOT deduct stock again.
      // DO NOT create another stock-out transaction.
      saveState();

      // Fetch fresh verified values from the real backend to ensure multi-module state coherence
      try {
        await fetchSparePartsFromBackend(true);
      } catch (fetchErr) {
        console.warn('[handleIssueStockRequest] Post-issuance background sync warning:', fetchErr);
        renderSparePartsView();
      }

      showToast(`Stock for request ${requestId} has been successfully issued to technician.`, 'success');
    } catch (err) {
      showToast('Failed to issue stock: ' + err.message, 'error');
      if (targetBtn) {
        targetBtn.disabled = false;
        targetBtn.textContent = originalBtnText;
      }
    }
  }

  // 8. VIEW STOCK REQUEST DETAILS
  function openStockRequestDetail(requestId) {
    const req = (state.stockRequests || []).find(r => r.requestId === requestId);
    if (!req) return;

    const idEl = document.getElementById('detailReqId');
    if (idEl) idEl.textContent = req.requestId;

    const stEl = document.getElementById('detailReqStatus');
    if (stEl) {
      const st = (req.status || 'Pending').toLowerCase();
      if (st === 'pending') stEl.innerHTML = `<span class="status-badge status-badge-amber">Pending</span>`;
      else if (st === 'approved') stEl.innerHTML = `<span class="status-badge status-badge-blue">Approved</span>`;
      else if (st === 'rejected') stEl.innerHTML = `<span class="status-badge status-badge-red">Rejected</span>`;
      else if (st === 'issued') stEl.innerHTML = `<span class="status-badge status-badge-green">Issued</span>`;
      else stEl.innerHTML = `<span class="status-badge status-badge-grey">${escapeHtml(req.status)}</span>`;
    }

    const dateEl = document.getElementById('detailReqDate');
    if (dateEl) dateEl.textContent = req.requestDate || '—';

    const byEl = document.getElementById('detailReqBy');
    if (byEl) byEl.textContent = `${req.requestedByName || 'Staff'} (${req.requestedByStaffId || ''})`;

    const codeEl = document.getElementById('detailReqCode');
    if (codeEl) codeEl.textContent = req.partCode;

    const qtyEl = document.getElementById('detailReqQty');
    if (qtyEl) qtyEl.textContent = req.qtyRequested;

    const nameEl = document.getElementById('detailReqName');
    if (nameEl) nameEl.textContent = req.partName || '—';

    const reasonEl = document.getElementById('detailReqReason');
    if (reasonEl) reasonEl.textContent = req.reason || '—';

    const secEl = document.getElementById('detailApprovalSection');
    if (secEl) {
      let notesHtml = '';
      if (req.notes) {
        notesHtml += `<div style="margin-bottom:6px;"><strong>Note:</strong> ${escapeHtml(req.notes)}</div>`;
      }
      if (req.approvedBy) {
        notesHtml += `<div><strong>Approved By:</strong> ${escapeHtml(req.approvedBy)} &bull; ${escapeHtml(req.approvedDate || '—')}</div>`;
      }
      if (req.issuedBy) {
        notesHtml += `<div><strong>Issued By:</strong> ${escapeHtml(req.issuedBy)} &bull; ${escapeHtml(req.issuedDate || '—')}</div>`;
      }
      if (!notesHtml) {
        notesHtml = `<em>Pending supervisor review and approval.</em>`;
      }
      secEl.innerHTML = notesHtml;
    }

    const modal = document.getElementById('stockRequestDetailModal');
    if (modal) modal.classList.add('active');
  }

  // Assign Technician Modal
  let currentAssignBdId = null;
  function openAssignTechnicianModal(bdId) {
    currentAssignBdId = bdId;
    const bd = state.breakdowns.find(b => b.id === bdId);
    if (!bd) return;

    document.getElementById('assignBdTitle').textContent = `${bd.id} - ${bd.machine}`;
    const selectEl = document.getElementById('assignTechSelect');
    if (selectEl) {
      selectEl.innerHTML = state.technicians.map(t => `
        <option value="${t.name}">${t.name} (${t.role} - Status: ${t.status})</option>
      `).join('');
    }

    const modal = document.getElementById('assignTechModal');
    if (modal) modal.classList.add('active');
  }

  function submitAssignTechnician(e) {
    if (e) e.preventDefault();
    if (!currentAssignBdId) return;

    const bd = state.breakdowns.find(b => b.id === currentAssignBdId);
    const techName = document.getElementById('assignTechSelect')?.value;

    if (bd && techName) {
      bd.assignedTech = techName;
      bd.status = 'Active';

      const tech = state.technicians.find(t => t.name === techName);
      if (tech) {
        tech.status = 'In Job';
        tech.activeJob = bd.id;
      }

      addNotification('Technician Assigned', `${techName} assigned to breakdown ${bd.id} on ${bd.machine}.`, 'breakdown', bd.id);
      saveState();
      closeAllModals();
      renderAll();
      showToast(`Assigned ${techName} to ${bd.id}`, 'success');
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.remove('active');
    });
  }

  // Mobile sidebar controls
  function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar && backdrop) {
      sidebar.classList.toggle('mobile-open');
      backdrop.classList.toggle('active');
    }
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar && backdrop) {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    }
  }

  // Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E50920" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0078E7" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Render everything based on state
  function renderAll() {
    renderUserAccount();
    applyRolePermissions();
    updateKPICounters();
    if (currentView === 'breakdown') renderBreakdownView();
    if (currentView === 'maintenance') renderMaintenanceView();
    if (currentView === 'spareparts') renderSparePartsView();
  }

  // =========================================================================
  // 12. INITIALIZATION & EVENT LISTENERS
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initDynamicClock();
    renderAll();

    // User Account Dropdown Toggle
    const userAccountBtn = document.getElementById('userAccountBtn');
    const userAccountWrapper = document.getElementById('userAccountWrapper');
    if (userAccountBtn && userAccountWrapper) {
      userAccountBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userAccountWrapper.classList.toggle('open');
      });
    }

    // Close user dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (userAccountWrapper && !userAccountWrapper.contains(e.target)) {
        userAccountWrapper.classList.remove('open');
      }
    });

    // Mobile Hamburger
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', toggleMobileSidebar);
    }
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', closeMobileSidebar);
    }

    // Spare Parts Search & Filter
    const spSearch = document.getElementById('sparePartsSearch');
    if (spSearch) spSearch.addEventListener('input', renderSparePartsTable);
    const spFilter = document.getElementById('sparePartsFilter');
    if (spFilter) spFilter.addEventListener('change', renderSparePartsTable);

    // Form Submissions
    const reportBreakdownForm = document.getElementById('reportBreakdownForm');
    if (reportBreakdownForm) {
      reportBreakdownForm.addEventListener('submit', submitReportBreakdown);
      initBreakdownModalHandlers();
      populateStaffIdFromProfile();
    }

    const manageItemForm = document.getElementById('manageItemForm');
    if (manageItemForm) manageItemForm.addEventListener('submit', submitManageItem);

    const addStockForm = document.getElementById('addStockForm');
    if (addStockForm) addStockForm.addEventListener('submit', submitAddStock);

    const requestStockForm = document.getElementById('requestStockForm');
    if (requestStockForm) requestStockForm.addEventListener('submit', submitRequestStock);

    // Spare Parts Tab Sync Buttons (Task 5)
    const syncPartsBtn = document.getElementById('syncSparePartsBtn');
    if (syncPartsBtn) syncPartsBtn.addEventListener('click', () => syncSparePartsTab('parts-list'));

    const syncMovementsBtn = document.getElementById('syncStockMovementsBtn');
    if (syncMovementsBtn) syncMovementsBtn.addEventListener('click', () => syncSparePartsTab('stock-movement'));

    const syncRequestsBtn = document.getElementById('syncStockRequestsBtn');
    if (syncRequestsBtn) syncRequestsBtn.addEventListener('click', () => syncSparePartsTab('stock-request'));

    const assignTechForm = document.getElementById('assignTechForm');
    if (assignTechForm) assignTechForm.addEventListener('submit', submitAssignTechnician);

    // Resolve Breakdown Form Submission
    const resolveBreakdownForm = document.getElementById('resolveBreakdownForm');
    if (resolveBreakdownForm) {
      resolveBreakdownForm.addEventListener('submit', submitResolveBreakdown);
    }
    const resolveEndTimeInput = document.getElementById('resolveEndTimeInput');
    if (resolveEndTimeInput) {
      resolveEndTimeInput.addEventListener('input', updateResolveDowntimePreview);
    }

    // Set Default Month & Year on Filters
    const currentMonthNum = new Date().getMonth();
    const currentYearNum = new Date().getFullYear();
    const resMonthSel = document.getElementById('resolvedMonthFilter');
    const resYearSel = document.getElementById('resolvedYearFilter');
    const bdDashMonthSel = document.getElementById('bdDashboardMonth');
    const bdDashYearSel = document.getElementById('bdDashboardYear');

    if (resMonthSel) resMonthSel.value = String(currentMonthNum);
    if (resYearSel) resYearSel.value = String(currentYearNum);
    if (bdDashMonthSel) bdDashMonthSel.value = String(currentMonthNum);
    if (bdDashYearSel) bdDashYearSel.value = String(currentYearNum);

    // Login Form Submission & Toggle
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    }
    initLoginPasswordToggle();

    // Verify Active Authentication Session on Startup
    verifyAuthSession();

    // Global Modal Closes
    document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
      btn.addEventListener('click', closeAllModals);
    });

    // Close on overlay backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeAllModals();
      });
    });

    // Keyboard Escape to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
        closeNotificationsDrawer();
        if (userAccountWrapper) userAccountWrapper.classList.remove('open');
      }
    });
  });

  // Expose global methods to window for clean HTML onclick callbacks
  window.navigateTo = navigateTo;
  window.switchUserRole = switchUserRole;
  window.switchBreakdownTab = switchBreakdownTab;
  window.switchMaintenanceTab = switchMaintenanceTab;
  window.switchSparePartsTab = switchSparePartsTab;
  window.toggleNotificationsDrawer = toggleNotificationsDrawer;
  window.closeNotificationsDrawer = closeNotificationsDrawer;
  window.markAllNotificationsRead = markAllNotificationsRead;
  window.handleNotificationClick = handleNotificationClick;
  window.openReportBreakdownModal = openReportBreakdownModal;
  window.resolveBreakdown = openResolveBreakdownModal;
  window.openResolveBreakdownModal = openResolveBreakdownModal;
  window.submitResolveBreakdown = submitResolveBreakdown;
  window.openBreakdownDetailModal = openBreakdownDetailModal;
  window.openResolvedDetailModal = openResolvedDetailModal;
  window.closeResolvedDetailModal = closeResolvedDetailModal;
  window.filterResolvedHistory = filterResolvedHistory;
  window.updateBDDashboard = updateBDDashboard;
  window.syncActiveJobs = syncActiveJobs;
  window.fetchBreakdownsFromBackend = fetchBreakdownsFromBackend;
  window.fetchPMRecordsFromBackend = fetchPMRecordsFromBackend;
  window.syncPMRecords = syncPMRecords;
  window.openCreatePMModal = openCreatePMModal;
  window.submitCreatePMRecord = submitCreatePMRecord;
  window.openResolvePMModal = openResolvePMModal;
  window.submitResolvePMRecord = submitResolvePMRecord;
  window.handlePMPhotoSelect = handlePMPhotoSelect;
  window.openViewPMHistoryModal = openViewPMHistoryModal;
  window.updatePMDashboard = updatePMDashboard;
  window.syncPMDashboard = syncPMDashboard;
  window.calculatePMScheduleStatus = calculatePMScheduleStatus;
  window.completePMTask = completePMTask;
  window.fetchSparePartsFromBackend = fetchSparePartsFromBackend;
  window.switchSparePartsTab = switchSparePartsTab;
  window.openAddStockModal = openAddStockModal;
  window.submitAddStock = submitAddStock;
  window.openManageItemModal = openManageItemModal;
  window.updateManageItemStockCalc = updateManageItemStockCalc;
  window.submitManageItem = submitManageItem;
  window.openDeleteItemModal = openDeleteItemModal;
  window.confirmDeleteItem = confirmDeleteItem;
  window.syncSparePartsTab = syncSparePartsTab;
  window.openRequestStockModal = openRequestStockModal;
  window.submitRequestStock = submitRequestStock;
  window.handleApproveStockRequest = handleApproveStockRequest;
  window.handleRejectStockRequest = handleRejectStockRequest;
  window.handleIssueStockRequest = handleIssueStockRequest;
  window.openStockRequestDetail = openStockRequestDetail;
  window.openAssignTechnicianModal = openAssignTechnicianModal;
  window.resetState = resetState;
  window.getMmsState = () => state;
  window.showToast = showToast;
  window.viewBreakdownDetails = openBreakdownDetailModal;
  window.simulateLogout = () => {
    showToast('Logged out of system. Session ended.', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  // =========================================================================
  // 13. PASSWORD POLICY & USER MANAGEMENT
  // =========================================================================

  /**
   * MMS Password Policy — applied to ALL users (ADMIN and TECHNICIAN).
   * Minimum 8 characters, at least one letter (A-Z or a-z), at least one number (0-9).
   * Special characters are optional. Uppercase is optional.
   * Plaintext passwords are never stored or logged.
   */
  const MMS_PASSWORD_POLICY_MSG =
    'Password must be at least 8 characters and contain at least one letter (A-Z or a-z) and one number (0-9).';

  function isValidPassword(password) {
    return (
      typeof password === 'string' &&
      password.length >= 8 &&
      /[A-Za-z]/.test(password) &&
      /[0-9]/.test(password)
    );
  }

  // -------------------------------------------------------------------------
  // Utility: toggle password field visibility
  // -------------------------------------------------------------------------
  function togglePasswordField(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) {
        icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
      }
    } else {
      input.type = 'password';
      if (icon) {
        icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
      }
    }
  }
  window.togglePasswordField = togglePasswordField;

  // -------------------------------------------------------------------------
  // Utility: show inline alert in a manage-users panel
  // -------------------------------------------------------------------------
  function showPanelAlert(alertId, message, type) {
    const el = document.getElementById(alertId);
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    if (type === 'error') {
      el.style.background = '#FEE2E2';
      el.style.color = '#991B1B';
      el.style.border = '1px solid #FCA5A5';
    } else if (type === 'success') {
      el.style.background = '#D1FAE5';
      el.style.color = '#065F46';
      el.style.border = '1px solid #6EE7B7';
    } else {
      el.style.background = '#EFF6FF';
      el.style.color = '#1D4ED8';
      el.style.border = '1px solid #BFDBFE';
    }
  }

  function hidePanelAlert(alertId) {
    const el = document.getElementById(alertId);
    if (el) el.style.display = 'none';
  }

  // -------------------------------------------------------------------------
  // Modal: Manage Staff Accounts (ADMIN only)
  // -------------------------------------------------------------------------
  function openManageUsersModal() {
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';
    if (!isAdmin) {
      showToast('Access Denied: User account management is restricted to Administrators only.', 'error');
      return;
    }
    const modal = document.getElementById('manageUsersModal');
    if (!modal) return;
    modal.classList.add('active');
    switchManageUsersTab('view');
    populateUserAccountsTable();
  }

  function switchManageUsersTab(tab) {
    const tabs = { view: 'muTabViewUsers', create: 'muTabCreateUser', 'change-password': 'muTabChangePassword' };
    const panels = { view: 'muPanelViewUsers', create: 'muPanelCreateUser', 'change-password': 'muPanelChangePassword' };
    const footer = document.getElementById('muPanelViewUsersFooter');

    Object.keys(tabs).forEach(key => {
      const btn = document.getElementById(tabs[key]);
      const panel = document.getElementById(panels[key]);
      if (btn) {
        if (key === tab) {
          btn.style.fontWeight = '600';
          btn.style.color = 'var(--accent-primary)';
          btn.style.borderBottom = '2px solid var(--accent-primary)';
        } else {
          btn.style.fontWeight = '500';
          btn.style.color = 'var(--text-muted)';
          btn.style.borderBottom = '2px solid transparent';
        }
      }
      if (panel) {
        panel.style.display = key === tab ? '' : 'none';
      }
    });

    // Show footer close button only on view tab
    if (footer) footer.style.display = tab === 'view' ? '' : 'none';

    // Clear alerts when switching tabs
    hidePanelAlert('muCreateUserAlert');
    hidePanelAlert('muChangePasswordAlert');
  }
  window.switchManageUsersTab = switchManageUsersTab;

  function populateUserAccountsTable() {
    const tbody = document.getElementById('userAccountsTableBody');
    if (!tbody) return;
    const domain = 'mms.internal';
    tbody.innerHTML = state.usersList.map(u => {
      const staffId = u.id || '';
      const email = `${staffId.toLowerCase()}@${domain}`;
      const roleLabel = u.role === 'Administrator' ? 'ADMIN' : (u.role === 'Technician' ? 'TECHNICIAN' : u.role);
      const badgeColor = u.role === 'Administrator' ? '#EF4444' : '#3B82F6';
      return `<tr>
        <td><code>${escapeHtml(staffId)}</code></td>
        <td>${escapeHtml(u.name)}</td>
        <td><span style="background:${badgeColor}1A; color:${badgeColor}; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700;">${escapeHtml(roleLabel)}</span></td>
        <td style="font-size:12px; color:var(--text-muted);">${escapeHtml(email)}</td>
        <td><span style="background:#D1FAE5; color:#065F46; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">Active</span></td>
      </tr>`;
    }).join('');
  }

  // -------------------------------------------------------------------------
  // Action: Create User (Admin only — frontend validation + backend call)
  // -------------------------------------------------------------------------
  function submitCreateUser() {
    hidePanelAlert('muCreateUserAlert');

    const staffIdInput = document.getElementById('newUserStaffId');
    const displayNameInput = document.getElementById('newUserDisplayName');
    const roleInput = document.getElementById('newUserRole');
    const passwordInput = document.getElementById('newUserPassword');
    const confirmPasswordInput = document.getElementById('newUserConfirmPassword');

    const staffId = (staffIdInput || {}).value || '';
    const displayName = (displayNameInput || {}).value || '';
    const role = (roleInput || {}).value || '';
    const password = (passwordInput || {}).value || '';
    const confirmPassword = (confirmPasswordInput || {}).value || '';

    // 1. Require valid Firebase ADMIN authentication
    const token = sessionStorage.getItem('mmsAuthToken') || '';
    if (!token) {
      showPanelAlert('muCreateUserAlert', 'Authentication required. Please log in as Administrator to create user accounts.', 'error');
      return;
    }

    const currentRole = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = currentRole === 'ADMIN' || currentRole === 'Administrator';
    if (!isAdmin) {
      showPanelAlert('muCreateUserAlert', 'Forbidden: User creation is restricted to Administrators only.', 'error');
      return;
    }

    // 2. Validate Staff ID
    if (!staffId.trim()) {
      showPanelAlert('muCreateUserAlert', 'Staff ID is required.', 'error');
      if (staffIdInput) staffIdInput.focus();
      return;
    }

    // 3. Validate Role: ADMIN or TECHNICIAN only
    if (role !== 'ADMIN' && role !== 'TECHNICIAN') {
      showPanelAlert('muCreateUserAlert', 'Role must strictly be Administrator (ADMIN) or Technician (TECHNICIAN).', 'error');
      if (roleInput) roleInput.focus();
      return;
    }

    // 4. Validate Password & Confirmation
    if (!password) {
      showPanelAlert('muCreateUserAlert', 'Password is required.', 'error');
      if (passwordInput) passwordInput.focus();
      return;
    }

    if (!isValidPassword(password)) {
      showPanelAlert('muCreateUserAlert', MMS_PASSWORD_POLICY_MSG, 'error');
      if (passwordInput) passwordInput.focus();
      return;
    }

    if (!confirmPassword) {
      showPanelAlert('muCreateUserAlert', 'Please confirm the password.', 'error');
      if (confirmPasswordInput) confirmPasswordInput.focus();
      return;
    }

    if (password !== confirmPassword) {
      showPanelAlert('muCreateUserAlert', 'Passwords do not match. Please re-enter.', 'error');
      if (confirmPasswordInput) confirmPasswordInput.focus();
      return;
    }

    const btn = document.getElementById('createUserSubmitBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Creating User...';
    }

    fetch('/.netlify/functions/manage-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'create',
        staffId: staffId.trim().toUpperCase(),
        displayName: displayName.trim(),
        role,
        password
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const successRole = data.role || role;
          showPanelAlert('muCreateUserAlert', `Account created successfully for Staff ID: ${data.staffId} (${data.email}) with ${successRole} role.`, 'success');
          const form = document.getElementById('createUserForm');
          if (form) form.reset();
          showToast(`User ${data.staffId} created successfully.`, 'success');

          // Update local accounts table if user list state exists
          if (Array.isArray(state.usersList)) {
            const normalizedId = (data.staffId || '').toUpperCase();
            const exists = state.usersList.some(u => (u.id || '').toUpperCase() === normalizedId);
            if (!exists) {
              state.usersList.push({
                id: normalizedId,
                name: data.displayName || displayName.trim() || `Staff ${normalizedId}`,
                role: successRole === 'ADMIN' ? 'Administrator' : 'Technician'
              });
              populateUserAccountsTable();
            }
          }
        } else if (data.partialFailure) {
          showPanelAlert('muCreateUserAlert', data.error || 'User account was created, but assigning role custom claims failed.', 'error');
          showToast(`Warning: Role assignment incomplete for ${data.staffId || staffId}.`, 'error');
        } else {
          showPanelAlert('muCreateUserAlert', data.error || 'Failed to create user account.', 'error');
        }
      })
      .catch((err) => {
        console.error('[submitCreateUser] Error:', err);
        showPanelAlert('muCreateUserAlert', 'Network error. Check your connection and try again.', 'error');
      })
      .finally(() => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Create User';
        }
      });
  }
  window.submitCreateUser = submitCreateUser;

  // -------------------------------------------------------------------------
  // Action: Change Password for another user (Admin only — validation + backend)
  // -------------------------------------------------------------------------
  function submitChangePassword() {
    hidePanelAlert('muChangePasswordAlert');

    const targetStaffId = (document.getElementById('cpTargetStaffId') || {}).value || '';
    const newPassword = (document.getElementById('cpNewPassword') || {}).value || '';
    const confirmPassword = (document.getElementById('cpConfirmPassword') || {}).value || '';

    if (!targetStaffId.trim()) {
      showPanelAlert('muChangePasswordAlert', 'Target Staff ID is required.', 'error');
      return;
    }

    // Frontend: enforce MMS password policy
    if (!isValidPassword(newPassword)) {
      showPanelAlert('muChangePasswordAlert', MMS_PASSWORD_POLICY_MSG, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showPanelAlert('muChangePasswordAlert', 'Passwords do not match. Please re-enter.', 'error');
      return;
    }

    const btn = document.getElementById('changePasswordSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Validating...'; }

    const token = sessionStorage.getItem('mmsAuthToken') || '';

    fetch('/.netlify/functions/manage-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        action: 'change-password',
        targetStaffId: targetStaffId.trim().toUpperCase(),
        newPassword
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          showPanelAlert(
            'muChangePasswordAlert',
            `Password policy validated for ${data.staffId}. ${data.note || 'Apply via Firebase Admin SDK.'}`,
            'success'
          );
          document.getElementById('changePasswordForm').reset();
          showToast(`Password change validated for ${data.staffId}. Use Admin SDK to apply.`, 'info');
        } else {
          showPanelAlert('muChangePasswordAlert', data.error || 'Password change failed.', 'error');
        }
      })
      .catch(() => {
        showPanelAlert('muChangePasswordAlert', 'Network error. Check your connection and try again.', 'error');
      })
      .finally(() => {
        if (btn) { btn.disabled = false; btn.textContent = 'Validate & Change Password'; }
      });
  }
  window.submitChangePassword = submitChangePassword;

  // -------------------------------------------------------------------------
  // Modal: Change My Password (self-service for all users)
  // -------------------------------------------------------------------------
  function openChangeMyPasswordModal() {
    const modal = document.getElementById('changeMyPasswordModal');
    if (!modal) return;
    modal.classList.add('active');
    hidePanelAlert('changeMyPasswordAlert');
    const form = document.getElementById('changeMyPasswordForm');
    if (form) form.reset();
    // Close dropdown
    const wrapper = document.getElementById('userAccountWrapper');
    if (wrapper) wrapper.classList.remove('open');
  }
  window.openChangeMyPasswordModal = openChangeMyPasswordModal;

  function submitMyPasswordChange() {
    hidePanelAlert('changeMyPasswordAlert');

    const newPassword = (document.getElementById('myNewPassword') || {}).value || '';
    const confirmPassword = (document.getElementById('myConfirmPassword') || {}).value || '';

    // Frontend: enforce MMS password policy
    if (!isValidPassword(newPassword)) {
      showPanelAlert('changeMyPasswordAlert', MMS_PASSWORD_POLICY_MSG, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showPanelAlert('changeMyPasswordAlert', 'Passwords do not match. Please re-enter.', 'error');
      return;
    }

    const btn = document.getElementById('changeMyPasswordSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }

    const token = sessionStorage.getItem('mmsAuthToken') || '';

    fetch('/.netlify/functions/manage-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        action: 'reset-password',
        newPassword
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          // Update stored token if a new one was issued
          if (data.newIdToken) {
            sessionStorage.setItem('mmsAuthToken', data.newIdToken);
          }
          showPanelAlert('changeMyPasswordAlert', 'Password updated successfully. Your session remains active.', 'success');
          document.getElementById('changeMyPasswordForm').reset();
          showToast('Password updated successfully.', 'success');
        } else {
          showPanelAlert('changeMyPasswordAlert', data.error || 'Password update failed. Please try again.', 'error');
        }
      })
      .catch(() => {
        showPanelAlert('changeMyPasswordAlert', 'Network error. Check your connection and try again.', 'error');
      })
      .finally(() => {
        if (btn) { btn.disabled = false; btn.textContent = 'Update Password'; }
      });
  }
  window.submitMyPasswordChange = submitMyPasswordChange;

  // -------------------------------------------------------------------------
  // Modal: User Profile
  // -------------------------------------------------------------------------
  function openUserProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (!modal) return;

    const user = state.currentUser;
    const isAdmin = user.role === 'Administrator' || user.roleCode === 'ADMIN';

    const avatarEl = document.getElementById('modalUserAvatar');
    if (avatarEl) avatarEl.textContent = user.initials || 'MM';

    const nameEl = document.getElementById('modalUserName');
    if (nameEl) nameEl.textContent = user.name || 'Staff User';

    const roleBadgeEl = document.getElementById('modalUserRoleBadge');
    if (roleBadgeEl) {
      roleBadgeEl.textContent = user.role || (isAdmin ? 'Administrator' : 'Technician');
      roleBadgeEl.className = 'user-profile-badge ' + (isAdmin ? 'badge-admin' : 'badge-tech');
    }

    const staffIdEl = document.getElementById('modalStaffId');
    if (staffIdEl) staffIdEl.textContent = user.staffId || user.id || '-';

    const roleNameEl = document.getElementById('modalRoleName');
    if (roleNameEl) roleNameEl.textContent = user.role || (isAdmin ? 'Administrator' : 'Technician');

    const emailEl = document.getElementById('modalUserEmail');
    if (emailEl) emailEl.textContent = user.email || '-';

    const permListEl = document.getElementById('modalPermissionsList');
    if (permListEl) {
      if (isAdmin) {
        permListEl.innerHTML = `
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Full Plant Operations Read &amp; Write Access</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Staff User &amp; Password Administration (Firebase Custom Claims)</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Spare Parts Inventory Management &amp; Approvals</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Breakdown Resolution &amp; KPI Analytics Authorization</li>
        `;
      } else {
        permListEl.innerHTML = `
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> View Breakdown &amp; Maintenance Work Orders</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Submit Machine Breakdown Reports to BD DATABASE</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Spare Parts Stock Requests</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Personal Password Management</li>
        `;
      }
    }

    modal.classList.add('active');
    const wrapper = document.getElementById('userAccountWrapper');
    if (wrapper) wrapper.classList.remove('open');
  }
  window.openUserProfileModal = openUserProfileModal;

  // -------------------------------------------------------------------------
  // Modal: Firebase Setup Guide
  // -------------------------------------------------------------------------
  function openSetupGuideModal() {
    const modal = document.getElementById('setupGuideModal');
    if (modal) modal.classList.add('active');
  }
  window.openSetupGuideModal = openSetupGuideModal;

  // -------------------------------------------------------------------------
  // Modal: Forgot Password (redirect to admin contact modal)
  // -------------------------------------------------------------------------
  function openForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.classList.add('active');
  }
  window.openForgotPasswordModal = openForgotPasswordModal;

  // -------------------------------------------------------------------------
  // Manage Users Modal expose
  // -------------------------------------------------------------------------
  window.openManageUsersModal = openManageUsersModal;

  // -------------------------------------------------------------------------
  // Logout handler
  // -------------------------------------------------------------------------
  function handleLogout() {
    clearAuthSession();
    showToast('Logged out of system. Session ended.', 'info');
    showLoginScreen();
    setTimeout(() => {
      window.location.reload();
    }, 600);
  }
  window.handleLogout = handleLogout;
  window.simulateLogout = handleLogout;

  // =========================================================================
  // 14. AUTHENTICATION & LOGIN FLOW (NETLIFY FUNCTION + FIREBASE AUTH)
  // =========================================================================

  function getStoredAuthToken() {
    return sessionStorage.getItem('mmsAuthToken') || '';
  }

  function clearAuthSession() {
    sessionStorage.removeItem('mmsAuthToken');
    sessionStorage.removeItem('mmsRefreshToken');
    sessionStorage.removeItem('mmsUserProfile');
    cachedFirebaseTechnicians = null;
  }

  function showLoginScreen(errorMessage = null) {
    const loginScreen = document.getElementById('loginScreen');
    const appShell = document.getElementById('appShell') || document.querySelector('.app-shell');
    if (loginScreen) {
      loginScreen.classList.remove('hidden');
      loginScreen.style.display = 'flex';
    }
    if (appShell) {
      appShell.classList.add('hidden');
    }
    const errBanner = document.getElementById('loginErrorBanner');
    const errMsgEl = document.getElementById('loginErrorMessage');
    if (errBanner && errMsgEl) {
      if (errorMessage) {
        errMsgEl.textContent = errorMessage;
        errBanner.style.display = 'flex';
      } else {
        errBanner.style.display = 'none';
      }
    }
  }

  function hideLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const appShell = document.getElementById('appShell') || document.querySelector('.app-shell');
    if (loginScreen) {
      loginScreen.classList.add('hidden');
      loginScreen.style.display = 'none';
    }
    if (appShell) {
      appShell.classList.remove('hidden');
    }
    const errBanner = document.getElementById('loginErrorBanner');
    if (errBanner) {
      errBanner.style.display = 'none';
    }
  }

  async function checkAuthStatus() {
    try {
      const res = await fetch('/.netlify/functions/auth-status');
      if (res.ok) {
        const data = await res.json();
        const banner = document.getElementById('loginSetupBanner');
        const desc = document.getElementById('loginSetupDesc');
        if (banner) {
          if (data && data.configured === false) {
            banner.style.display = 'flex';
            if (desc && data.message) {
              desc.textContent = data.message;
            }
          } else {
            banner.style.display = 'none';
          }
        }
      }
    } catch (err) {
      // Non-blocking status check
    }
  }

  async function verifyAuthSession() {
    const token = getStoredAuthToken();
    if (!token) {
      showLoginScreen();
      checkAuthStatus();
      return false;
    }

    try {
      const res = await fetch('/.netlify/functions/auth-verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        clearAuthSession();
        showLoginScreen(errData.error || 'Your session has expired. Please log in again.');
        checkAuthStatus();
        return false;
      }

      const data = await res.json();
      if (data && data.valid && data.user) {
        const u = data.user;
        state.currentUser = {
          id: u.staffId,
          staffId: u.staffId,
          name: u.name,
          initials: u.initials || 'MM',
          role: u.role,
          roleCode: u.roleCode,
          email: u.email,
          department: u.role === 'Administrator' ? 'Central Maintenance Engineering' : 'Plant Maintenance Crew'
        };
        sessionStorage.setItem('mmsUserProfile', JSON.stringify(u));
        hideLoginScreen();
        renderAll();
        populateStaffIdFromProfile();
        fetchBreakdownsFromBackend();
        fetchPMRecordsFromBackend();
        if (u.roleCode === 'ADMIN' || u.role === 'Administrator') {
          fetchTechniciansFromBackend(false);
        }
        recordUserActivityThrottled();
        return true;
      } else {
        clearAuthSession();
        showLoginScreen('Invalid session. Please log in again.');
        checkAuthStatus();
        return false;
      }
    } catch (netErr) {
      const storedProfile = sessionStorage.getItem('mmsUserProfile');
      if (storedProfile) {
        try {
          const u = JSON.parse(storedProfile);
          state.currentUser = {
            id: u.staffId,
            staffId: u.staffId,
            name: u.name,
            initials: u.initials || 'MM',
            role: u.role,
            roleCode: u.roleCode,
            email: u.email,
            department: u.role === 'Administrator' ? 'Central Maintenance Engineering' : 'Plant Maintenance Crew'
          };
          hideLoginScreen();
          renderAll();
          populateStaffIdFromProfile();
          fetchBreakdownsFromBackend();
          fetchPMRecordsFromBackend();
          if (u.roleCode === 'ADMIN' || u.role === 'Administrator') {
            fetchTechniciansFromBackend(false);
          }
          recordUserActivityThrottled();
          return true;
        } catch (e) {
          // parse error
        }
      }
      clearAuthSession();
      showLoginScreen('Connection error verifying session. Please log in.');
      return false;
    }
  }

  async function handleLogin(e) {
    if (e) e.preventDefault();

    const staffIdInput = document.getElementById('loginStaffId');
    const pwdInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const spinner = document.getElementById('loginBtnSpinner');
    const btnText = document.getElementById('loginBtnText');
    const errBanner = document.getElementById('loginErrorBanner');
    const errMsgEl = document.getElementById('loginErrorMessage');

    if (errBanner) errBanner.style.display = 'none';

    const rawStaffId = staffIdInput ? staffIdInput.value.trim() : '';
    const password = pwdInput ? pwdInput.value : '';

    // Frontend validation
    if (!rawStaffId) {
      if (errBanner && errMsgEl) {
        errMsgEl.textContent = 'Please enter your Staff ID (e.g. PN001).';
        errBanner.style.display = 'flex';
      }
      if (staffIdInput) staffIdInput.focus();
      return;
    }

    if (!password) {
      if (errBanner && errMsgEl) {
        errMsgEl.textContent = 'Please enter your Password.';
        errBanner.style.display = 'flex';
      }
      if (pwdInput) pwdInput.focus();
      return;
    }

    // Set Loading State
    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    if (btnText) btnText.textContent = 'AUTHENTICATING...';

    try {
      const response = await fetch('/.netlify/functions/auth-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          staffId: rawStaffId.toUpperCase(),
          password: password
        })
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data && data.success && data.token) {
        // Store session tokens securely in sessionStorage (never LocalStorage)
        sessionStorage.setItem('mmsAuthToken', data.token);
        sessionStorage.setItem('mmsRefreshToken', data.refreshToken || '');
        sessionStorage.setItem('mmsUserProfile', JSON.stringify(data.user));

        // Update state with verified server identity & role
        const u = data.user;
        state.currentUser = {
          id: u.staffId,
          staffId: u.staffId,
          name: u.name,
          initials: u.initials || 'MM',
          role: u.role,
          roleCode: u.roleCode,
          email: u.email,
          department: u.role === 'Administrator' ? 'Central Maintenance Engineering' : 'Plant Maintenance Crew'
        };

        // Clear password from memory and input field
        if (pwdInput) pwdInput.value = '';

        // Open Dashboard
        hideLoginScreen();
        renderAll();
        populateStaffIdFromProfile();
        fetchBreakdownsFromBackend();
        fetchPMRecordsFromBackend();
        if (u.roleCode === 'ADMIN' || u.role === 'Administrator') {
          fetchTechniciansFromBackend(false);
        }
        recordUserActivityThrottled();

        showToast(`Welcome back, ${u.name} (${u.role})`, 'success');
      } else {
        const errorMsg = (data && data.error) || 'Invalid Staff ID or Password. Please try again.';
        if (errBanner && errMsgEl) {
          errMsgEl.textContent = errorMsg;
          errBanner.style.display = 'flex';
        }

        if (data && data.code === 'FIREBASE_CONFIG_MISSING') {
          const setupBanner = document.getElementById('loginSetupBanner');
          if (setupBanner) setupBanner.style.display = 'flex';
        }

        if (pwdInput) {
          pwdInput.focus();
          pwdInput.select();
        }
      }
    } catch (netErr) {
      if (errBanner && errMsgEl) {
        errMsgEl.textContent = 'Network error connecting to authentication server. Please check your connection.';
        errBanner.style.display = 'flex';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (btnText) btnText.textContent = 'LOGIN';
    }
  }
  window.handleLogin = handleLogin;

  function initLoginPasswordToggle() {
    const toggleBtn = document.getElementById('loginTogglePassword');
    const pwdInput = document.getElementById('loginPassword');
    const eyeOpen = document.getElementById('eyeIconOpen');
    const eyeClosed = document.getElementById('eyeIconClosed');

    if (toggleBtn && pwdInput) {
      toggleBtn.addEventListener('click', () => {
        const isPassword = pwdInput.type === 'password';
        pwdInput.type = isPassword ? 'text' : 'password';
        if (eyeOpen && eyeClosed) {
          eyeOpen.style.display = isPassword ? 'none' : '';
          eyeClosed.style.display = isPassword ? '' : 'none';
        }
      });
    }
  }

})();
