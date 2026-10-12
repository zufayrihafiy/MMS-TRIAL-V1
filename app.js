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
    technicians: [
      {
        id: 'TECH-101',
        name: 'Siti Humairah',
        initials: 'SH',
        role: 'Lead Automation Engineer',
        skills: 'PLC, SCADA, Robotics',
        shift: 'Shift A (07:00 - 15:30)',
        status: 'On Duty',
        activeJob: 'Supervision & Plant Audit',
        completedJobs: 48,
        contact: '+60 12-882 1920'
      },
      {
        id: 'TECH-102',
        name: 'Ahmad Firdaus',
        initials: 'AF',
        role: 'Senior Mechanical Engineer',
        skills: 'Hydraulics, CNC Spindles, Turbines',
        shift: 'Shift A (07:00 - 15:30)',
        status: 'Available',
        activeJob: 'None (Standby)',
        completedJobs: 62,
        contact: '+60 13-441 5521'
      },
      {
        id: 'TECH-103',
        name: 'Razak bin Ismail',
        initials: 'RI',
        role: 'Hydraulics Specialist',
        skills: 'Pneumatics, Press Hydraulics, Seals',
        shift: 'Shift B (15:00 - 23:30)',
        status: 'Available',
        activeJob: 'None (Standby)',
        completedJobs: 89,
        contact: '+60 19-332 7789'
      },
      {
        id: 'TECH-104',
        name: 'Chen Wei Liang',
        initials: 'CW',
        role: 'Robotics & Control Tech',
        skills: 'Fanuc, Kuka, Laser Sensors',
        shift: 'Shift A (07:00 - 15:30)',
        status: 'In Job',
        activeJob: 'PM-803 (Robot Calibration)',
        completedJobs: 54,
        contact: '+60 17-220 9012'
      },
      {
        id: 'TECH-105',
        name: 'Kumar Sanjeev',
        initials: 'KS',
        role: 'Mechanical Overhaul Tech',
        skills: 'Gearboxes, Alignments, Bearings',
        shift: 'Shift A (07:00 - 15:30)',
        status: 'Available',
        activeJob: 'None (Standby)',
        completedJobs: 73,
        contact: '+60 16-554 3310'
      },
      {
        id: 'TECH-106',
        name: 'Daniel Tan',
        initials: 'DT',
        role: 'Condition Monitoring Analyst',
        skills: 'Vibration Analysis, Thermography',
        shift: 'Shift B (15:00 - 23:30)',
        status: 'Available',
        activeJob: 'None (Standby)',
        completedJobs: 39,
        contact: '+60 14-883 2291'
      },
      {
        id: 'TECH-107',
        name: 'Nurul Huda',
        initials: 'NH',
        role: 'Instrumentation Engineer',
        skills: 'PID Tuning, Calibrators, Flow Meters',
        shift: 'Shift A (07:00 - 15:30)',
        status: 'Available',
        activeJob: 'None (Standby)',
        completedJobs: 51,
        contact: '+60 18-991 4402'
      },
      {
        id: 'TECH-108',
        name: 'Farhan Azman',
        initials: 'FA',
        role: 'Electrical Maintenance Tech',
        skills: 'Switchgears, Motors, Inverters',
        shift: 'Shift C (23:00 - 07:30)',
        status: 'Available',
        activeJob: 'Night Shift Roster',
        completedJobs: 66,
        contact: '+60 11-209 8831'
      }
    ],
    breakdowns: [],
    preventiveMaintenance: [
      {
        id: 'PM-801',
        machine: 'CNC Milling Center 01',
        taskTitle: 'Weekly Way Lube & Axis Backlash Verification',
        frequency: 'Weekly',
        scheduledDate: '2026-10-09 (Friday)',
        status: 'Due This Week', // Due This Week / Completed / Overdue
        assignedTech: 'Kumar Sanjeev',
        department: 'Machining Line 1'
      },
      {
        id: 'PM-802',
        machine: 'Stamping Press Line 01',
        taskTitle: 'Hydraulic Fluid Sampling & Filter Cartridge Check',
        frequency: 'Bi-Weekly',
        scheduledDate: '2026-10-09 (Friday)',
        status: 'Due This Week',
        assignedTech: 'Razak bin Ismail',
        department: 'Press Shop'
      },
      {
        id: 'PM-803',
        machine: 'Robotic Welder 01',
        taskTitle: '6-Axis Arm Calibration & Cable Harness Inspection',
        frequency: 'Weekly',
        scheduledDate: '2026-10-10 (Saturday)',
        status: 'Due This Week',
        assignedTech: 'Chen Wei Liang',
        department: 'Chassis Assembly'
      },
      {
        id: 'PM-804',
        machine: 'Main Air Compressor A',
        taskTitle: 'Intercooler Condensate Drain & V-Belt Tensioning',
        frequency: 'Weekly',
        scheduledDate: '2026-10-10 (Saturday)',
        status: 'Due This Week',
        assignedTech: 'Farhan Azman',
        department: 'Utility'
      },
      {
        id: 'PM-805',
        machine: 'Paint Booth Air Handling Unit',
        taskTitle: 'Primary Pleated Filter Stage 1 Replacement',
        frequency: 'Weekly',
        scheduledDate: '2026-10-10 (Saturday)',
        status: 'Due This Week',
        assignedTech: 'Kumar Sanjeev',
        department: 'Paint Shop'
      },
      {
        id: 'PM-806',
        machine: 'Chiller System Line 1',
        taskTitle: 'Suction/Discharge Refrigerant Pressure Logging',
        frequency: 'Weekly',
        scheduledDate: '2026-10-11 (Sunday)',
        status: 'Due This Week',
        assignedTech: 'Daniel Tan',
        department: 'Central Plant'
      },
      {
        id: 'PM-807',
        machine: 'Overhead Crane 10-Ton',
        taskTitle: 'Wire Rope Lubrication & Upper Limit Safety Switch',
        frequency: 'Monthly',
        scheduledDate: '2026-10-11 (Sunday)',
        status: 'Due This Week',
        assignedTech: 'Ahmad Firdaus',
        department: 'Heavy Stamping'
      },
      {
        id: 'PM-808',
        machine: 'Laser Cutting Machine 02',
        taskTitle: 'Optics Lens Clean & Assist Gas Regulator Inspection',
        frequency: 'Weekly',
        scheduledDate: '2026-10-12 (Monday)',
        status: 'Due This Week',
        assignedTech: 'Chen Wei Liang',
        department: 'Sheet Metal'
      },
      {
        id: 'PM-809',
        machine: 'Forklift Fleet Unit 04',
        taskTitle: 'Traction Battery Equalization & Mast Chain Greasing',
        frequency: 'Weekly',
        scheduledDate: '2026-10-12 (Monday)',
        status: 'Due This Week',
        assignedTech: 'Farhan Azman',
        department: 'Logistics'
      },
      {
        id: 'PM-810',
        machine: 'Conveyor Line B',
        taskTitle: 'Roller Bearing Grease Refill & Belt Tracking Inspection',
        frequency: 'Bi-Weekly',
        scheduledDate: '2026-10-13 (Tuesday)',
        status: 'Due This Week',
        assignedTech: 'Razak bin Ismail',
        department: 'Assembly Line B'
      },
      {
        id: 'PM-811',
        machine: 'Substation Transformer 01',
        taskTitle: 'Infrared Thermographic Scan on High-Voltage Bushings',
        frequency: 'Monthly',
        scheduledDate: '2026-10-14 (Wednesday)',
        status: 'Due This Week',
        assignedTech: 'Daniel Tan',
        department: 'Electrical Main'
      },
      {
        id: 'PM-812',
        machine: 'Cooling Tower Pump 3',
        taskTitle: 'Dynamic Vibration Analysis & Mechanical Seal Check',
        frequency: 'Monthly',
        scheduledDate: '2026-10-15 (Thursday)',
        status: 'Due This Week',
        assignedTech: 'Nurul Huda',
        department: 'Utility'
      },
      // Completed PM tasks for history
      {
        id: 'PM-795',
        machine: 'Hydraulic Bending Machine',
        taskTitle: 'Proportional Valve Spool Clean & Zero Offset',
        frequency: 'Monthly',
        scheduledDate: '2026-10-05',
        status: 'Completed',
        assignedTech: 'Razak bin Ismail',
        department: 'Sheet Metal'
      },
      {
        id: 'PM-796',
        machine: 'Automated Guided Vehicle AGV-03',
        taskTitle: 'Li-Ion Battery Health & LiDAR Sensor Wipe',
        frequency: 'Weekly',
        scheduledDate: '2026-10-06',
        status: 'Completed',
        assignedTech: 'Chen Wei Liang',
        department: 'Warehouse'
      }
    ],
    spareParts: [
      {
        code: 'SP-301',
        name: 'Proximity Sensor M18 PNP (Omron)',
        category: 'Electrical & Sensors',
        currentStock: 2,
        minStock: 5,
        unit: 'pcs',
        location: 'Bin A-12',
        unitPrice: 125.00,
        supplier: 'Omron Industrial Automation'
      },
      {
        code: 'SP-302',
        name: 'High Pressure Hydraulic Seal Kit 80mm',
        category: 'Hydraulics & Seals',
        currentStock: 1,
        minStock: 4,
        unit: 'kits',
        location: 'Bin H-04',
        unitPrice: 380.00,
        supplier: 'Parker Hannifin Malaysia'
      },
      {
        code: 'SP-303',
        name: 'Timing Belt 8M-1200 Heavy Duty',
        category: 'Mechanical Transmission',
        currentStock: 0,
        minStock: 3,
        unit: 'pcs',
        location: 'Bin M-22',
        unitPrice: 95.00,
        supplier: 'Gates Power Transmission'
      },
      {
        code: 'SP-304',
        name: 'Solid State Relay 40A 24VDC',
        category: 'Electrical & Controls',
        currentStock: 15,
        minStock: 5,
        unit: 'pcs',
        location: 'Bin E-09',
        unitPrice: 75.00,
        supplier: 'Schneider Electric'
      },
      {
        code: 'SP-305',
        name: 'Pneumatic Solenoid Valve 5/2 Way',
        category: 'Pneumatics',
        currentStock: 8,
        minStock: 4,
        unit: 'pcs',
        location: 'Bin P-15',
        unitPrice: 160.00,
        supplier: 'SMC Pneumatics'
      },
      {
        code: 'SP-306',
        name: 'Deep Groove Ball Bearing 6205-2RS',
        category: 'Bearings & Bushings',
        currentStock: 22,
        minStock: 10,
        unit: 'pcs',
        location: 'Bin B-01',
        unitPrice: 42.00,
        supplier: 'SKF Industrial'
      },
      {
        code: 'SP-307',
        name: 'Industrial PLC Digital Input Module 16-ch',
        category: 'Automation & PLC',
        currentStock: 6,
        minStock: 2,
        unit: 'pcs',
        location: 'Bin PLC-03',
        unitPrice: 540.00,
        supplier: 'Siemens Industrial'
      },
      {
        code: 'SP-308',
        name: 'Synthetic Gear Oil ISO VG 220 (20L Drum)',
        category: 'Lubricants & Fluids',
        currentStock: 12,
        minStock: 4,
        unit: 'drums',
        location: 'Bay Lube-D',
        unitPrice: 420.00,
        supplier: 'Mobil Industrial Lubricants'
      },
      {
        code: 'SP-309',
        name: 'Viton High-Temp O-Ring Assortment Box',
        category: 'Hydraulics & Seals',
        currentStock: 7,
        minStock: 3,
        unit: 'boxes',
        location: 'Bin H-08',
        unitPrice: 110.00,
        supplier: 'Freudenberg Sealing'
      }
    ],
    stockMovements: [
      {
        id: 'MV-501',
        date: '2026-10-09 09:15 AM',
        partCode: 'SP-301',
        partName: 'Proximity Sensor M18 PNP',
        type: 'Issued',
        qty: -2,
        balance: 2,
        reference: 'WO-2026-101',
        handler: 'Razak bin Ismail'
      },
      {
        id: 'MV-502',
        date: '2026-10-08 16:30 PM',
        partCode: 'SP-303',
        partName: 'Timing Belt 8M-1200 Heavy Duty',
        type: 'Issued',
        qty: -1,
        balance: 0,
        reference: 'WO-2026-098',
        handler: 'Kumar Sanjeev'
      },
      {
        id: 'MV-503',
        date: '2026-10-07 11:00 AM',
        partCode: 'SP-306',
        partName: 'Deep Groove Ball Bearing 6205-2RS',
        type: 'Received',
        qty: +10,
        balance: 22,
        reference: 'PO-2026-0449',
        handler: 'Siti Humairah'
      }
    ],
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
        title: 'Low Spare Parts Alert',
        message: 'Timing Belt 8M-1200 has reached 0 units. Stock re-order required immediately.',
        time: '1 hr ago',
        unread: true,
        targetView: 'spareparts',
        recordId: 'SP-303'
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
        // Clean any demo activeJobs in technicians list
        if (Array.isArray(state.technicians)) {
          state.technicians.forEach(t => {
            if (t.activeJob && KNOWN_DEMO_BD_IDS.some(id => t.activeJob.includes(id))) {
              t.activeJob = 'None (Standby)';
              t.status = 'Available';
            }
          });
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

    // BD Dashboard restricted indicator (strictly Administrator only)
    const bdDashboardLock = document.getElementById('bdDashboardLockNotice');
    const bdDashboardContent = document.getElementById('bdDashboardMainContent');
    if (bdDashboardLock && bdDashboardContent) {
      if (!isAdmin) {
        bdDashboardLock.style.display = 'block';
        bdDashboardContent.style.display = 'none';
      } else {
        bdDashboardLock.style.display = 'none';
        bdDashboardContent.style.display = 'block';
      }
    }

    // Admin-only badges/buttons (strictly tied to verified Admin claim)
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });

    // Supervisor & Admin actions (now strictly Admin-only: MMS only supports ADMIN and TECHNICIAN)
    document.querySelectorAll('.supervisor-admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });
  }

  // =========================================================================
  // 5. VIEW ROUTER & NAVIGATION
  // =========================================================================
  let currentView = 'home';

  function navigateTo(viewName, filterParam) {
    currentView = viewName;

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
    } else if (viewName === 'technicians') {
      renderTechniciansView();
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
    renderBreakdownTables();
    if (activeBreakdownTab === 'bd-dashboard') {
      updateBDDashboard();
    }
  }

  function switchBreakdownTab(tabName) {
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
    fetchBreakdownsFromBackend();
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

    // Prepare Assigned Technician dropdown in loading state
    const techSelect = document.getElementById('resolveAssignedTechSelect');
    const submitBtn = document.getElementById('resolveSubmitBtn');

    if (techSelect) {
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

    // 2. Validate Assigned Technician (MANDATORY REQUIREMENT: Must be a selected Firebase technician UID)
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

    // Payload passes technician UID to be verified server-side via Firebase Admin SDK
    const payload = {
      id: bdId,
      machine: targetItem ? targetItem.machine : '',
      startTime: startVal,
      endTime: endTime,
      technicianUid: selectedTechUid,
      assignedTech: selectedTechUid,
      staffId: targetItem ? (targetItem.reportedBy || targetItem.staffId || '') : '',
      downtime: diffMin,
      afterPhoto: afterPhotoObj ? afterPhotoObj.name : '',
      photoFiles: afterPhotoObj ? { after: afterPhotoObj } : null
    };

    try {
      const response = await fetch('/.netlify/functions/resolve-breakdown', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);

      if (response.ok && result && result.success) {
        // Resolve display name / staff ID for UI feedback
        const matchedTech = cachedFirebaseTechnicians?.find(t => t.uid === selectedTechUid);
        const resolvedStaffId = result.assignedTech || (matchedTech ? matchedTech.staffId : selectedTechUid);
        const resolvedDisplay = matchedTech ? `${matchedTech.displayName} (${matchedTech.staffId})` : resolvedStaffId;

        // Update local state record
        const item = targetItem || state.breakdowns.find(b => b.id === bdId);
        if (item) {
          item.status = 'Completed';
          item.endTime = endTime;
          item.assignedTech = resolvedStaffId;
          item.technicianUid = selectedTechUid;
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
    const lockNotice = document.getElementById('bdDashboardLockNotice');
    const mainContent = document.getElementById('bdDashboardMainContent');

    const now = new Date();
    const selectedMonth = monthSelect ? parseInt(monthSelect.value, 10) : now.getMonth();
    const selectedYear = yearSelect ? parseInt(yearSelect.value, 10) : now.getFullYear();

    // Verify Server-Side Authorization for Admin
    const roleCode = state.currentUser ? (state.currentUser.roleCode || state.currentUser.role) : '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'Administrator';

    if (!isAdmin) {
      if (lockNotice) lockNotice.style.display = 'block';
      if (mainContent) mainContent.style.display = 'none';
      return;
    } else {
      if (lockNotice) lockNotice.style.display = 'none';
      if (mainContent) mainContent.style.display = 'block';
    }

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

  /**
   * Fetch live records from Google Sheets BD DATABASE via Netlify Function
   * All records originate strictly from the backend. If backend returns no records,
   * display an empty state. If request fails, show an appropriate error without fabricated data.
   */
  async function fetchBreakdownsFromBackend() {
    const token = getStoredAuthToken() || '';
    if (!token) return;

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
        if (activeBreakdownTab === 'bd-dashboard') {
          updateBDDashboard();
        }
      } else {
        const errMsg = (result && (result.error || result.message)) || `Server returned HTTP ${res.status}`;
        lastBackendFetchError = errMsg;
        renderBreakdownTables();
        if (activeBreakdownTab === 'bd-dashboard') {
          updateBDDashboard();
        }
        showToast('Database Sync Error: ' + errMsg, 'error');
      }
    } catch (e) {
      lastBackendFetchError = 'Network connection failed: ' + e.message;
      renderBreakdownTables();
      if (activeBreakdownTab === 'bd-dashboard') {
        updateBDDashboard();
      }
      showToast('Network error: Unable to connect to Google Sheets backend.', 'error');
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
  // 7. MODULE 2: MAINTENANCE RECORD (PM)
  // =========================================================================
  let activeMaintenanceTab = 'pm-schedule';

  function renderMaintenanceView() {
    renderMaintenanceTables();
  }

  function switchMaintenanceTab(tabName) {
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
  }

  function renderMaintenanceTables() {
    // 1. PM Schedule (Due This Week)
    const dueList = state.preventiveMaintenance.filter(p => p.status === 'Due This Week');
    const pmScheduleTbody = document.getElementById('pmScheduleTbody');
    if (pmScheduleTbody) {
      if (dueList.length === 0) {
        pmScheduleTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">All PM schedules for this week have been completed!</td></tr>`;
      } else {
        pmScheduleTbody.innerHTML = dueList.map(item => `
          <tr>
            <td><strong>${item.id}</strong></td>
            <td>
              <div style="font-weight:600; color:var(--navy-darkest);">${escapeHtml(item.machine)}</div>
              <div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(item.department)}</div>
            </td>
            <td>${escapeHtml(item.taskTitle)}</td>
            <td><span class="status-badge status-badge-blue">${item.frequency}</span></td>
            <td><strong>${escapeHtml(item.scheduledDate)}</strong></td>
            <td>
              <div class="action-btn-group">
                <button class="btn-table-action success" onclick="window.completePMTask('${item.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Mark Complete
                </button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    // 2. PM History
    const historyList = state.preventiveMaintenance.filter(p => p.status === 'Completed');
    const pmHistoryTbody = document.getElementById('pmHistoryTbody');
    if (pmHistoryTbody) {
      pmHistoryTbody.innerHTML = historyList.map(item => `
        <tr>
          <td><strong>${item.id}</strong></td>
          <td>${escapeHtml(item.machine)}</td>
          <td>${escapeHtml(item.taskTitle)}</td>
          <td><span class="status-badge status-badge-green">Completed</span></td>
          <td>${escapeHtml(item.assignedTech)}</td>
          <td>${escapeHtml(item.scheduledDate)}</td>
        </tr>
      `).join('');
    }
  }

  // =========================================================================
  // 8. MODULE 3: SPARE PARTS INVENTORY
  // =========================================================================
  let activeSparePartsTab = 'parts-list';

  function renderSparePartsView() {
    renderSparePartsTable();
    renderStockMovementsTable();
  }

  function switchSparePartsTab(tabName) {
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
  }

  function renderSparePartsTable() {
    const searchVal = (document.getElementById('sparePartsSearch')?.value || '').toLowerCase();
    const filterVal = document.getElementById('sparePartsFilter')?.value || 'all';

    let list = state.spareParts.filter(part => {
      const matchSearch = part.name.toLowerCase().includes(searchVal) ||
        part.code.toLowerCase().includes(searchVal) ||
        part.category.toLowerCase().includes(searchVal) ||
        part.location.toLowerCase().includes(searchVal);

      if (!matchSearch) return false;

      if (filterVal === 'low') {
        return part.currentStock <= part.minStock;
      } else if (filterVal === 'out') {
        return part.currentStock === 0;
      } else if (filterVal === 'ok') {
        return part.currentStock > part.minStock;
      }
      return true;
    });

    const tbody = document.getElementById('sparePartsTbody');
    if (tbody) {
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No spare parts match your search or filter.</td></tr>`;
      } else {
        tbody.innerHTML = list.map(item => {
          let badgeHtml = '';
          if (item.currentStock === 0) {
            badgeHtml = `<span class="status-badge status-badge-red">OUT OF STOCK</span>`;
          } else if (item.currentStock <= item.minStock) {
            badgeHtml = `<span class="status-badge status-badge-amber">LOW STOCK</span>`;
          } else {
            badgeHtml = `<span class="status-badge status-badge-green">IN STOCK</span>`;
          }

          return `
            <tr>
              <td><strong>${item.code}</strong></td>
              <td>
                <div style="font-weight:600; color:var(--navy-darkest);">${escapeHtml(item.name)}</div>
                <div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(item.category)} • Loc: ${item.location}</div>
              </td>
              <td>
                <div style="font-size:15px; font-weight:700; color:${item.currentStock <= item.minStock ? 'var(--red-primary)' : 'var(--navy-darkest)'};">
                  ${item.currentStock} <span style="font-size:12px; font-weight:500; color:var(--text-muted);">${item.unit}</span>
                </div>
                <div style="font-size:11px; color:var(--text-muted);">Min: ${item.minStock} ${item.unit}</div>
              </td>
              <td>${badgeHtml}</td>
              <td>RM ${item.unitPrice.toFixed(2)}</td>
              <td>${escapeHtml(item.supplier)}</td>
              <td>
                <div class="action-btn-group">
                  <button class="btn-table-action" onclick="window.openEditStockModal('${item.code}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    Adjust Stock
                  </button>
                  <button class="btn-table-action" onclick="window.openRequestStockModal('${item.code}')">
                    Request
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  function renderStockMovementsTable() {
    const tbody = document.getElementById('stockMovementTbody');
    if (tbody) {
      tbody.innerHTML = state.stockMovements.map(m => `
        <tr>
          <td><strong>${m.id}</strong></td>
          <td>${m.date}</td>
          <td>
            <strong>${m.partCode}</strong> - ${escapeHtml(m.partName)}
          </td>
          <td>
            <span class="status-badge ${m.type === 'Received' ? 'status-badge-green' : 'status-badge-blue'}">
              ${m.type}
            </span>
          </td>
          <td style="font-weight:700; color:${m.qty > 0 ? '#10B981' : 'var(--red-primary)'};">
            ${m.qty > 0 ? '+' + m.qty : m.qty}
          </td>
          <td>${m.balance}</td>
          <td>${escapeHtml(m.reference)}</td>
          <td>${escapeHtml(m.handler)}</td>
        </tr>
      `).join('');
    }
  }

  // =========================================================================
  // 9. TECHNICIANS DIRECTORY VIEW (KPI 4 Link)
  // =========================================================================
  function renderTechniciansView() {
    const gridEl = document.getElementById('techniciansGrid');
    if (gridEl) {
      gridEl.innerHTML = state.technicians.map(t => {
        let statusBadge = 'status-badge-green';
        if (t.status === 'In Job') statusBadge = 'status-badge-blue';
        if (t.status === 'On Duty') statusBadge = 'status-badge-amber';

        return `
          <div class="technician-card">
            <div class="tech-avatar">${t.initials}</div>
            <div class="tech-name">${escapeHtml(t.name)}</div>
            <div class="tech-skill">${escapeHtml(t.role)}</div>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">${escapeHtml(t.skills)}</div>
            <span class="status-badge ${statusBadge}" style="margin-top:10px;">
              ${t.status}
            </span>
            <div class="tech-shift-badge">${escapeHtml(t.shift)}</div>
            <div class="tech-footer">
              <span>Active: ${escapeHtml(t.activeJob)}</span>
              <span>Jobs: ${t.completedJobs}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

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

  // Complete PM Task Action
  function completePMTask(pmId) {
    const item = state.preventiveMaintenance.find(p => p.id === pmId);
    if (item) {
      item.status = 'Completed';
      addNotification('PM Task Completed', `${item.taskTitle} on ${item.machine} completed.`, 'maintenance', pmId);
      saveState();
      renderAll();
      showToast(`Preventive maintenance ${pmId} marked as Completed!`, 'success');
    }
  }

  // Edit Stock Modal
  let currentEditingPartCode = null;
  function openEditStockModal(partCode) {
    currentEditingPartCode = partCode;
    const part = state.spareParts.find(p => p.code === partCode);
    if (!part) return;

    document.getElementById('editStockPartCode').value = part.code;
    document.getElementById('editStockPartName').value = part.name;
    document.getElementById('editStockCurrentQty').value = part.currentStock;
    document.getElementById('editStockMinQty').value = part.minStock;
    document.getElementById('editStockAdjustment').value = 0;

    const modal = document.getElementById('editStockModal');
    if (modal) modal.classList.add('active');
  }

  function submitStockAdjustment(e) {
    if (e) e.preventDefault();
    if (!currentEditingPartCode) return;

    const part = state.spareParts.find(p => p.code === currentEditingPartCode);
    if (!part) return;

    const adjustment = parseInt(document.getElementById('editStockAdjustment')?.value, 10) || 0;
    const newMin = parseInt(document.getElementById('editStockMinQty')?.value, 10) || part.minStock;

    if (adjustment === 0 && newMin === part.minStock) {
      closeAllModals();
      return;
    }

    const previousStock = part.currentStock;
    part.currentStock = Math.max(0, part.currentStock + adjustment);
    part.minStock = newMin;

    if (adjustment !== 0) {
      state.stockMovements.unshift({
        id: 'MV-' + Math.floor(500 + Math.random() * 500),
        date: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        partCode: part.code,
        partName: part.name,
        type: adjustment > 0 ? 'Received' : 'Manual Adjustment',
        qty: adjustment,
        balance: part.currentStock,
        reference: 'Manual Adjustment',
        handler: state.currentUser.name
      });
    }

    if (part.currentStock <= part.minStock && previousStock > part.minStock) {
      addNotification('Low Stock Alert', `Spare part ${part.name} fell below threshold (${part.currentStock} left).`, 'spareparts', part.code);
    }

    saveState();
    closeAllModals();
    renderAll();
    showToast(`Stock updated for ${part.code} (New balance: ${part.currentStock} ${part.unit})`, 'success');
  }

  // Request Stock Modal
  function openRequestStockModal(partCode) {
    const part = state.spareParts.find(p => p.code === partCode);
    if (part) {
      document.getElementById('reqStockPartCode').value = part.code;
      document.getElementById('reqStockPartName').value = part.name;
    }
    const modal = document.getElementById('requestStockModal');
    if (modal) modal.classList.add('active');
  }

  function submitRequestStock(e) {
    if (e) e.preventDefault();
    const partCode = document.getElementById('reqStockPartCode')?.value;
    const reqQty = document.getElementById('reqStockQty')?.value;
    const reason = document.getElementById('reqStockReason')?.value;

    addNotification('Spare Part Requested', `Requisition for ${reqQty} units of ${partCode} submitted by ${state.currentUser.name}. Reason: ${reason || 'Buffer restock'}`, 'spareparts', partCode);
    saveState();
    closeAllModals();
    renderAll();
    showToast(`Stock request for ${partCode} sent to supervisor approval!`, 'success');
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
    updateKPICounters();
    if (currentView === 'breakdown') renderBreakdownView();
    if (currentView === 'maintenance') renderMaintenanceView();
    if (currentView === 'spareparts') renderSparePartsView();
    if (currentView === 'technicians') renderTechniciansView();
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

    const editStockForm = document.getElementById('editStockForm');
    if (editStockForm) editStockForm.addEventListener('submit', submitStockAdjustment);

    const requestStockForm = document.getElementById('requestStockForm');
    if (requestStockForm) requestStockForm.addEventListener('submit', submitRequestStock);

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
  window.fetchBreakdownsFromBackend = fetchBreakdownsFromBackend;
  window.completePMTask = completePMTask;
  window.openEditStockModal = openEditStockModal;
  window.openRequestStockModal = openRequestStockModal;
  window.openAssignTechnicianModal = openAssignTechnicianModal;
  window.resetState = resetState;
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
