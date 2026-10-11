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
        role: 'Supervisor / Engineer',
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
        status: 'In Job',
        activeJob: 'BD-2026-102 (CNC 04)',
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
        status: 'In Job',
        activeJob: 'BD-2026-101 (Press 02)',
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
        status: 'In Job',
        activeJob: 'BD-2026-105 (Molding 03)',
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
    breakdowns: [
      {
        id: 'BD-2026-101',
        machine: 'Stamping Press Line 02',
        line: 'Press Shop Line 2',
        issue: 'Hydraulic main cylinder pressure loss below 180 bar.',
        priority: 'High',
        status: 'Active', // Active / Pending / Resolved
        reportedBy: 'Zainal (Line Supervisor)',
        assignedTech: 'Razak bin Ismail',
        reportedAt: '2026-10-09 08:45 AM',
        downtimeMin: 185
      },
      {
        id: 'BD-2026-102',
        machine: 'CNC Milling Center 04',
        line: 'Machining Line 1',
        issue: 'High-speed spindle bearing overheating (>85°C alarm).',
        priority: 'Critical',
        status: 'Active',
        reportedBy: 'Kavitha (Operator)',
        assignedTech: 'Ahmad Firdaus',
        reportedAt: '2026-10-09 09:30 AM',
        downtimeMin: 140
      },
      {
        id: 'BD-2026-103',
        machine: 'Robotic Welding Station A',
        line: 'Chassis Assembly',
        issue: 'Wire feeder jam and servo drive error code E-402.',
        priority: 'Medium',
        status: 'Pending',
        reportedBy: 'Wong (Assembly Lead)',
        assignedTech: 'Unassigned',
        reportedAt: '2026-10-09 10:15 AM',
        downtimeMin: 95
      },
      {
        id: 'BD-2026-104',
        machine: 'Conveyor Line C Drive Motor',
        line: 'Body Transfer Line',
        issue: 'Abnormal high vibration and excessive rattling noise.',
        priority: 'High',
        status: 'Pending',
        reportedBy: 'Arumugam (Material Handler)',
        assignedTech: 'Unassigned',
        reportedAt: '2026-10-09 10:50 AM',
        downtimeMin: 60
      },
      {
        id: 'BD-2026-105',
        machine: 'Injection Molding Machine 03',
        line: 'Plastics Molding',
        issue: 'Zone 4 barrel heater band circuit open, temperature dipping.',
        priority: 'Medium',
        status: 'Active',
        reportedBy: 'Hafiz (Molding Tech)',
        assignedTech: 'Nurul Huda',
        reportedAt: '2026-10-09 11:20 AM',
        downtimeMin: 35
      },
      // Resolved Breakdowns for history
      {
        id: 'BD-2026-098',
        machine: 'Air Compressor Unit 01',
        line: 'Utility Plant Room',
        issue: 'Inlet air filter clogged causing differential pressure trip.',
        priority: 'Medium',
        status: 'Resolved',
        reportedBy: 'Lim (Facilities)',
        assignedTech: 'Kumar Sanjeev',
        reportedAt: '2026-10-08 07:15 AM',
        downtimeMin: 45
      },
      {
        id: 'BD-2026-099',
        machine: 'Coolant Chiller Pump 2',
        line: 'Central Coolant System',
        issue: 'Flow switch intermittent trip due to impeller debris.',
        priority: 'Low',
        status: 'Resolved',
        reportedBy: 'Daniel Tan',
        assignedTech: 'Daniel Tan',
        reportedAt: '2026-10-08 14:00 PM',
        downtimeMin: 30
      },
      {
        id: 'BD-2026-100',
        machine: 'Automated Packaging Line',
        line: 'Final End-of-Line',
        issue: 'Carton sealer optical photo-eye sensor misaligned.',
        priority: 'Low',
        status: 'Resolved',
        reportedBy: 'Suria (QC Lead)',
        assignedTech: 'Farhan Azman',
        reportedAt: '2026-10-08 20:30 PM',
        downtimeMin: 20
      }
    ],
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
        reference: 'BD-2026-101',
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
        reference: 'BD-2026-098',
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
        id: 'NT-901',
        title: 'New Breakdown Reported',
        message: 'CNC Milling Center 04 spindle temperature alarm exceeded 85°C. High urgency reported by Kavitha.',
        time: '10 mins ago',
        unread: true,
        targetView: 'breakdown',
        recordId: 'BD-2026-102'
      },
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
  let state = {};

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        state = JSON.parse(stored);
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
    showToast('Database reset to demonstration state', 'info');
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
    // 1. Open Breakdown = count of breakdowns where status !== 'Resolved'
    const openBreakdowns = state.breakdowns.filter(b => b.status !== 'Resolved').length;
    const kpiBreakdownEl = document.getElementById('kpiOpenBreakdown');
    if (kpiBreakdownEl) kpiBreakdownEl.textContent = openBreakdowns;

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
    const role = state.currentUser.role;
    const roleCode = state.currentUser.roleCode;
    const isTech = role === 'Technician' || roleCode === 'TECHNICIAN';
    const isSupervisor = role === 'Supervisor / Engineer';
    const isAdmin = role === 'Administrator' || roleCode === 'ADMIN';

    // BD Dashboard restricted indicator
    const bdDashboardLock = document.getElementById('bdDashboardLockNotice');
    const bdDashboardContent = document.getElementById('bdDashboardMainContent');
    if (bdDashboardLock && bdDashboardContent) {
      if (isTech) {
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

    // Supervisor & Admin actions
    document.querySelectorAll('.supervisor-admin-only').forEach(el => {
      el.style.display = (isAdmin || isSupervisor) ? '' : 'none';
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
  // 6. MODULE 1: BREAKDOWN RECORD RENDERING & ACTIONS
  // =========================================================================
  let activeBreakdownTab = 'active-jobs';

  function renderBreakdownView() {
    renderBreakdownTables();
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
  }

  function renderBreakdownTables() {
    // 1. Active Jobs Table
    const activeList = state.breakdowns.filter(b => b.status === 'Active');
    const activeTbody = document.getElementById('activeBreakdownTbody');
    if (activeTbody) {
      if (activeList.length === 0) {
        activeTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No active breakdown jobs currently in progress.</td></tr>`;
      } else {
        activeTbody.innerHTML = activeList.map(item => `
          <tr>
            <td><strong>${item.id}</strong></td>
            <td>
              <div style="font-weight:600; color:var(--navy-darkest);">${escapeHtml(item.machine)}</div>
              <div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(item.line)}</div>
            </td>
            <td>${escapeHtml(item.issue)}</td>
            <td>
              <span class="status-badge ${getPriorityBadgeClass(item.priority)}">
                ${item.priority}
              </span>
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="width:7px; height:7px; border-radius:50%; background:#0078E7;"></span>
                <span>${escapeHtml(item.assignedTech)}</span>
              </div>
            </td>
            <td><strong style="color:var(--red-primary);">${item.downtimeMin} min</strong></td>
            <td>
              <div class="action-btn-group">
                <button class="btn-table-action success" onclick="window.resolveBreakdown('${item.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Resolve
                </button>
                <button class="btn-table-action" onclick="window.viewBreakdownDetails('${item.id}')">
                  Details
                </button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    // 2. Pending Jobs Table
    const pendingList = state.breakdowns.filter(b => b.status === 'Pending');
    const pendingTbody = document.getElementById('pendingBreakdownTbody');
    if (pendingTbody) {
      if (pendingList.length === 0) {
        pendingTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No pending breakdowns waiting for technician assignment.</td></tr>`;
      } else {
        pendingTbody.innerHTML = pendingList.map(item => `
          <tr>
            <td><strong>${item.id}</strong></td>
            <td>
              <div style="font-weight:600; color:var(--navy-darkest);">${escapeHtml(item.machine)}</div>
              <div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(item.line)}</div>
            </td>
            <td>${escapeHtml(item.issue)}</td>
            <td>
              <span class="status-badge ${getPriorityBadgeClass(item.priority)}">
                ${item.priority}
              </span>
            </td>
            <td><span class="status-badge status-badge-amber">Awaiting Assignment</span></td>
            <td>${escapeHtml(item.reportedBy)}</td>
            <td>
              <button class="btn-table-action" onclick="window.openAssignTechnicianModal('${item.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                Assign Tech
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    // 3. Resolved Breakdown History
    const resolvedList = state.breakdowns.filter(b => b.status === 'Resolved');
    const resolvedTbody = document.getElementById('resolvedBreakdownTbody');
    if (resolvedTbody) {
      resolvedTbody.innerHTML = resolvedList.map(item => `
        <tr>
          <td><strong>${item.id}</strong></td>
          <td>${escapeHtml(item.machine)}</td>
          <td>${escapeHtml(item.issue)}</td>
          <td><span class="status-badge status-badge-green">Resolved</span></td>
          <td>${escapeHtml(item.assignedTech)}</td>
          <td>${item.downtimeMin} min</td>
          <td>${item.reportedAt}</td>
        </tr>
      `).join('');
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

  function updateDowntimeAndMonthPreview() {
    const startVal = document.getElementById('rbStartTime')?.value;
    const endVal = document.getElementById('rbEndTime')?.value;
    const downtimeEl = document.getElementById('rbDowntimePreview');
    const monthEl = document.getElementById('rbMonthPreview');

    // Month calculation
    const refDate = startVal ? new Date(startVal) : new Date();
    const monthStr = getMonthYearString(isNaN(refDate.getTime()) ? new Date() : refDate);
    if (monthEl) monthEl.textContent = monthStr;

    if (!downtimeEl) return;

    if (!startVal || !endVal) {
      downtimeEl.innerHTML = '&mdash;';
      return;
    }

    const startMs = new Date(startVal).getTime();
    const endMs = new Date(endVal).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      downtimeEl.innerHTML = '&mdash;';
      return;
    }

    const diffMin = Math.round((endMs - startMs) / 60000);
    if (diffMin < 0) {
      downtimeEl.innerHTML = '<span style="color:var(--red-primary); font-weight:600;">Invalid (End earlier than Start)</span>';
    } else {
      downtimeEl.innerHTML = `<span style="color:var(--navy-darkest); font-weight:700;">${diffMin} min</span>`;
    }
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

  function resetBreakdownForm() {
    const form = document.getElementById('reportBreakdownForm');
    if (form) form.reset();

    populateStaffIdFromProfile();

    const machineSelect = document.getElementById('rbMachine');
    if (machineSelect) machineSelect.value = '';

    const customMachine = document.getElementById('rbMachineCustom');
    if (customMachine) {
      customMachine.value = '';
      customMachine.style.display = 'none';
    }

    const startInput = document.getElementById('rbStartTime');
    if (startInput) startInput.value = formatInputDateTime(new Date());

    const endInput = document.getElementById('rbEndTime');
    if (endInput) endInput.value = '';

    const statusSelect = document.getElementById('rbStatus');
    if (statusSelect) statusSelect.value = 'Repair';

    const beforePhotoName = document.getElementById('rbBeforePhotoName');
    if (beforePhotoName) beforePhotoName.textContent = 'Supported: JPG, JPEG, PNG';

    const afterPhotoName = document.getElementById('rbAfterPhotoName');
    if (afterPhotoName) afterPhotoName.textContent = 'Supported: JPG, JPEG, PNG';

    document.querySelectorAll('#reportBreakdownForm .input-error').forEach(el => el.classList.remove('input-error'));
    clearBreakdownFormAlert();
    updateDowntimeAndMonthPreview();
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

    const endInput = document.getElementById('rbEndTime');
    if (endInput && !endInput.value) {
      endInput.value = '';
    }

    const statusSelect = document.getElementById('rbStatus');
    if (statusSelect && !statusSelect.value) {
      statusSelect.value = 'Repair';
    }

    updateDowntimeAndMonthPreview();

    const modal = document.getElementById('reportBreakdownModal');
    if (modal) modal.classList.add('active');
  }

  function validateBreakdownForm() {
    const errors = [];
    const staffId = document.getElementById('rbStaffId')?.value?.trim();
    const machineSelect = document.getElementById('rbMachine')?.value;
    const machineCustom = document.getElementById('rbMachineCustom')?.value?.trim();
    const machine = (machineSelect === '__OTHER__') ? machineCustom : machineSelect;
    const startTime = document.getElementById('rbStartTime')?.value;
    const endTime = document.getElementById('rbEndTime')?.value;
    const category = document.getElementById('rbCategory')?.value;
    const status = document.getElementById('rbStatus')?.value || 'Repair';
    const description = document.getElementById('rbDescription')?.value?.trim();
    const beforePhotoInput = document.getElementById('rbBeforePhoto');
    const afterPhotoInput = document.getElementById('rbAfterPhoto');

    // Remove previous input-error marks
    document.querySelectorAll('#reportBreakdownForm .input-error').forEach(el => el.classList.remove('input-error'));

    if (!staffId) {
      errors.push('Staff ID is required (must be populated from profile or entered).');
      document.getElementById('rbStaffId')?.classList.add('input-error');
    }

    if (!machine) {
      errors.push('Machine / Equipment Name is required.');
      if (machineSelect === '__OTHER__') {
        document.getElementById('rbMachineCustom')?.classList.add('input-error');
      } else {
        document.getElementById('rbMachine')?.classList.add('input-error');
      }
    }

    if (!startTime) {
      errors.push('Breakdown Start Time is required.');
      document.getElementById('rbStartTime')?.classList.add('input-error');
    }

    if (!category) {
      errors.push('Problem Category is required.');
      document.getElementById('rbCategory')?.classList.add('input-error');
    }

    if (!description) {
      errors.push('Problem Description is required.');
      document.getElementById('rbDescription')?.classList.add('input-error');
    }

    // Required completion validation for status 'Completed':
    // "Do not allow technicians to arbitrarily mark a repair as completed without recording the required completion information."
    if (status === 'Completed') {
      if (!endTime) {
        errors.push('Breakdown End Time is required to mark the status as Completed.');
        document.getElementById('rbEndTime')?.classList.add('input-error');
      }
    }

    // Breakdown End Time comparison
    if (startTime && endTime) {
      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();
      if (endMs < startMs) {
        errors.push('Breakdown End Time cannot be earlier than Breakdown Start Time.');
        document.getElementById('rbEndTime')?.classList.add('input-error');
      }
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

    if (afterPhotoInput?.files?.[0]) {
      const file = afterPhotoInput.files[0];
      const ext = file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        errors.push(`After Photo "${file.name}" is invalid. Only JPG, JPEG, and PNG are allowed.`);
        afterPhotoInput.classList.add('input-error');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      values: {
        staffId,
        machine,
        startTime,
        endTime,
        category,
        status,
        description
      }
    };
  }

  async function submitReportBreakdown(e) {
    if (e) e.preventDefault();
    clearBreakdownFormAlert();

    // 1. Validate all required inputs
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
    // Database: MMS DATABASE | Worksheet: BD DATABASE (Columns A to L)
    const now = new Date();
    const timeStr = formatSubmissionTime(now);
    const monthStr = getMonthYearString(now);

    let downtimeVal = '';
    if (validation.values.endTime) {
      const startMs = new Date(validation.values.startTime).getTime();
      const endMs = new Date(validation.values.endTime).getTime();
      if (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs) {
        downtimeVal = Math.round((endMs - startMs) / 60000);
      }
    }

    // 3. Display loading state
    setSubmitButtonLoading(true);

    try {
      // Process photos if attached
      const beforeFileInput = document.getElementById('rbBeforePhoto');
      const afterFileInput = document.getElementById('rbAfterPhoto');

      const beforePhotoObj = beforeFileInput?.files?.[0] ? await fileToBase64(beforeFileInput.files[0]) : null;
      const afterPhotoObj = afterFileInput?.files?.[0] ? await fileToBase64(afterFileInput.files[0]) : null;

      // Database Columns Mapping:
      // A - Time
      // B - Month
      // C - Staff ID
      // D - Machine
      // E - Breakdown Start Time
      // F - Breakdown End Time
      // G - Downtime (minutes)
      // H - Problem Category
      // I - Before Photo
      // J - After Photo
      // K - Problem Description
      // L - Status
      const payload = {
        time: timeStr,                                           // Column A
        month: monthStr,                                         // Column B
        staffId: validation.values.staffId,                      // Column C
        machine: validation.values.machine,                      // Column D
        startTime: validation.values.startTime,                  // Column E
        endTime: validation.values.endTime || '',                // Column F
        downtime: downtimeVal !== '' ? downtimeVal : '',         // Column G
        category: validation.values.category,                    // Column H
        beforePhoto: beforePhotoObj ? beforePhotoObj.name : '',  // Column I
        afterPhoto: afterPhotoObj ? afterPhotoObj.name : '',     // Column J
        description: validation.values.description,              // Column K
        status: validation.values.status,                        // Column L
        // Secure file payloads forwarded to server function for storage
        photoFiles: {
          before: beforePhotoObj,
          after: afterPhotoObj
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
        // 5. Show a success message only after receiving confirmation from the backend
        showBreakdownFormAlert(
          `<strong>Breakdown Report Recorded Successfully!</strong><br>` +
          `Saved to Google Sheets: <em>MMS DATABASE</em> &bull; Worksheet: <em>BD DATABASE</em>.` +
          (result.rowId ? `<br><small>Reference ID: ${escapeHtml(String(result.rowId))}</small>` : ''),
          'success'
        );
        showToast('Breakdown report successfully saved to Google Sheets BD DATABASE!', 'success');

        // Synchronize record into dashboard state
        const newId = result.rowId || 'BD-2026-' + (100 + state.breakdowns.length + 1);
        const newRecord = {
          id: newId,
          machine: validation.values.machine,
          line: 'Central Line',
          issue: validation.values.description,
          category: validation.values.category,
          priority: validation.values.status === 'Completed' ? 'Low' : 'High',
          status: validation.values.status === 'Completed' ? 'Resolved' : (validation.values.status === 'Awaiting Part' ? 'Pending' : 'Active'),
          reportedBy: `${validation.values.staffId} (${state.currentUser ? state.currentUser.name : 'Technician'})`,
          assignedTech: 'Unassigned',
          reportedAt: validation.values.startTime.replace('T', ' '),
          downtimeMin: downtimeVal !== '' ? downtimeVal : 0
        };

        state.breakdowns.unshift(newRecord);
        addNotification('New Breakdown Logged', `${validation.values.machine}: ${validation.values.category} reported to BD DATABASE.`, 'breakdown', newId);
        saveState();
        renderAll();

        // 6. Clear the form after successful submission
        resetBreakdownForm();

        setTimeout(() => {
          closeAllModals();
        }, 1600);
      } else {
        // If the backend is not configured / returns error:
        // Show clear error message. Do not pretend that data was saved.
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
      // Unreachable endpoint or network failure
      // Show clear error message. Do not pretend that data was saved.
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
    const startInput = document.getElementById('rbStartTime');
    const endInput = document.getElementById('rbEndTime');
    if (startInput) startInput.addEventListener('input', updateDowntimeAndMonthPreview);
    if (endInput) endInput.addEventListener('input', updateDowntimeAndMonthPreview);

    const machineSelect = document.getElementById('rbMachine');
    const machineCustom = document.getElementById('rbMachineCustom');
    if (machineSelect) {
      machineSelect.addEventListener('change', () => {
        if (machineSelect.value === '__OTHER__') {
          if (machineCustom) {
            machineCustom.style.display = 'block';
            machineCustom.focus();
          }
        } else {
          if (machineCustom) {
            machineCustom.style.display = 'none';
            machineCustom.value = '';
          }
        }
        machineSelect.classList.remove('input-error');
      });
    }

    const statusSelect = document.getElementById('rbStatus');
    const statusHint = document.getElementById('rbStatusHint');
    if (statusSelect) {
      statusSelect.addEventListener('change', () => {
        if (statusSelect.value === 'Completed') {
          if (statusHint) {
            statusHint.innerHTML = '<span style="color:var(--amber-warning); font-weight:600;">Breakdown End Time is required for Completed status.</span>';
          }
          if (endInput && !endInput.value) {
            endInput.focus();
          }
        } else {
          if (statusHint) {
            statusHint.textContent = "Default: Repair. 'Completed' requires End Time.";
          }
        }
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
          if (beforePhotoName) beforePhotoName.textContent = 'Supported: JPG, JPEG, PNG';
        }
        beforePhoto.classList.remove('input-error');
      });
    }

    const afterPhoto = document.getElementById('rbAfterPhoto');
    const afterPhotoName = document.getElementById('rbAfterPhotoName');
    if (afterPhoto) {
      afterPhoto.addEventListener('change', () => {
        if (afterPhoto.files && afterPhoto.files[0]) {
          const file = afterPhoto.files[0];
          const kb = Math.round(file.size / 1024);
          if (afterPhotoName) afterPhotoName.textContent = `📎 ${file.name} (${kb} KB)`;
        } else {
          if (afterPhotoName) afterPhotoName.textContent = 'Supported: JPG, JPEG, PNG';
        }
        afterPhoto.classList.remove('input-error');
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

  // Resolve Breakdown Action
  function resolveBreakdown(bdId) {
    const item = state.breakdowns.find(b => b.id === bdId);
    if (item) {
      item.status = 'Resolved';
      addNotification('Breakdown Resolved', `Machine ${item.machine} has returned to operation.`, 'breakdown', bdId);
      saveState();
      renderAll();
      showToast(`Breakdown ${bdId} marked as Resolved!`, 'success');
    }
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
  window.resolveBreakdown = resolveBreakdown;
  window.completePMTask = completePMTask;
  window.openEditStockModal = openEditStockModal;
  window.openRequestStockModal = openRequestStockModal;
  window.openAssignTechnicianModal = openAssignTechnicianModal;
  window.resetState = resetState;
  window.showToast = showToast;
  window.viewBreakdownDetails = (id) => {
    showToast(`Breakdown record ${id} details inspected`, 'info');
  };
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

    const staffId = (document.getElementById('newUserStaffId') || {}).value || '';
    const displayName = (document.getElementById('newUserDisplayName') || {}).value || '';
    const role = (document.getElementById('newUserRole') || {}).value || 'TECHNICIAN';
    const password = (document.getElementById('newUserPassword') || {}).value || '';
    const confirmPassword = (document.getElementById('newUserConfirmPassword') || {}).value || '';

    if (!staffId.trim()) {
      showPanelAlert('muCreateUserAlert', 'Staff ID is required.', 'error');
      return;
    }

    // Frontend: enforce MMS password policy
    if (!isValidPassword(password)) {
      showPanelAlert('muCreateUserAlert', MMS_PASSWORD_POLICY_MSG, 'error');
      return;
    }

    if (password !== confirmPassword) {
      showPanelAlert('muCreateUserAlert', 'Passwords do not match. Please re-enter.', 'error');
      return;
    }

    const btn = document.getElementById('createUserSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

    const token = sessionStorage.getItem('mmsAuthToken') || '';

    fetch('/.netlify/functions/manage-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
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
          showPanelAlert('muCreateUserAlert', `Account created for ${data.staffId} (${data.email}). ${data.note || ''}`, 'success');
          document.getElementById('createUserForm').reset();
          showToast(`User ${data.staffId} created successfully.`, 'success');
        } else {
          showPanelAlert('muCreateUserAlert', data.error || 'Failed to create user account.', 'error');
        }
      })
      .catch(() => {
        showPanelAlert('muCreateUserAlert', 'Network error. Check your connection and try again.', 'error');
      })
      .finally(() => {
        if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
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
