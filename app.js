// State
const state = {
    tickets: [],
    filteredTickets: [],
    activeFilter: 'GCU FISIK',
    statusFilter: 'ALL',
    // Active View State
    activeTicketId: null,
    activeSto: null,
    role: 'korlap', // korlap, teknisi, helpdesk
    workflowState: {}
};

// Selectors
const totalDataCount = document.getElementById('totalDataCount');
const currentDateRange = document.getElementById('currentDateRange');
const countGcuFisik = document.getElementById('countGcuFisik');
const countGcuLogic = document.getElementById('countGcuLogic');
const countApprovalKorlap = document.getElementById('countApprovalKorlap');
const countCompleted = document.getElementById('countCompleted');

const emptyState = document.getElementById('emptyState');
const ticketTable = document.getElementById('ticketTable');
const ticketTableBody = document.getElementById('ticketTableBody');

const viewDashboard = document.getElementById('view-dashboard');
const viewWorkflow = document.getElementById('view-workflow');
const workflowContainer = document.getElementById('workflowContainer');
const workflowPageTitle = document.getElementById('workflowPageTitle');
const workflowSubtitle = document.getElementById('workflowSubtitle');
const dispActiveTicketId = document.getElementById('activeTicketId');
const dashboardTitle = document.getElementById('dashboardTitle');

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxcwhCudJzEE-eONd2npH6qsPjFecyaH6fg7GGHCbLFvfLEZDVZdt4gPFnPApheEk8F/exec';

function init() {
    const today = new Date();
    currentDateRange.innerText = `${today.getDate()} ${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`;
    fetchTickets();
}

function fetchTickets() {
    emptyState.style.display = 'flex';
    emptyState.innerHTML = '<ion-icon name="sync-outline" style="animation: spin 1s linear infinite;"></ion-icon><p>Memuat Data dari Spreadsheet...</p>';
    ticketTable.style.display = 'none';

    fetch(SCRIPT_URL)
        .then(res => res.json())
        .then(data => processData(data))
        .catch(err => {
            console.warn("Fetch failed, using local simulation.");
            setTimeout(() => {
                const mockData = [
                    ["", "INC52772921", "", "", "", "", "", "", "", "", "", "", "BGR", "-27.7", "2.13", "", "LOS"],
                    ["", "INC52772922", "", "", "", "", "", "", "", "", "", "", "CLS", "-15.0", "2.00", "", "ONLINE"],
                    ["", "INC52772923", "", "", "", "", "", "", "", "", "", "", "BJD", "-28.5", "1.50", "", "DYING GASP"]
                ];
                processData(mockData);
            }, 500);
        });
}

function processData(rows) {
    if (!rows || rows.length < 2) {
        showEmpty("Tidak ada data ditemukan.");
        return;
    }

    let parsedTickets = [];
    let headers = rows[0].map(h => (h || "").toString().toUpperCase().trim());

    let incIdx = -1;
    // Scan headers to find INCIDENT column
    for (let c = 0; c < headers.length; c++) {
        for (let r = 1; r < Math.min(10, rows.length); r++) {
            if (rows[r][c] && rows[r][c].toString().match(/^(INC\d{5,}|1-SV\d{5,})/)) {
                incIdx = c;
                break;
            }
        }
        if (incIdx !== -1) break;
    }

    if (incIdx === -1) incIdx = 1; // absolute fallback

    let statusAlarmIdx = headers.findIndex(h => h === "STATUS ALARM" || h === "ONU LINK STATUS");
    let workzoneIdx = headers.indexOf("WORKZONE");
    let technicianIdx = headers.findIndex(h => h === "TECHNICIAN" || h === "NAMA TEKNISI");

    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        let ticketId = row[incIdx] ? row[incIdx].toString().trim() : "-";
        if (!ticketId.match(/^(INC|1-SV)/)) continue;

        let rx = "", tx = "", status = "-", sto = "-", sNum = "-";

        // 1. Ekstrak STATUS
        if (statusAlarmIdx !== -1 && row[statusAlarmIdx]) {
            let s = row[statusAlarmIdx].toString().toUpperCase().trim();
            if (s) status = s;
        }

        // Jika dari kolom STATUS ALARM belum ada (belum discrape), fallback cari manual
        let hasStatusColumn = (statusAlarmIdx !== -1);
        if (status === "-" || status === "") {
            for (let c = 0; c < row.length; c++) {
                let val = (row[c] || "").toString().toUpperCase().trim();
                // Gunakan EXACT match agar tidak salah baca teks keluhan dari kolom SUMMARY
                if (val === "LOS") { status = "LOS"; break; }
                if (val === "DYING GASP" || val === "DYING_GASP") { status = "DYING GASP"; break; }
                if (val === "OFFLINE") { status = "OFFLINE"; break; }
                if (val === "ONLINE") { status = "ONLINE"; break; }
            }
        }

        // 2. Ekstrak STO (Paling akurat dari ODC-XXX / ODP-XXX)
        for (let c = 0; c < row.length; c++) {
            let val = (row[c] || "").toString().trim();
            let rkMatch = val.match(/OD[CP]-([A-Z]{3})-/i);
            if (rkMatch) {
                sto = rkMatch[1].toUpperCase();
                break;
            }
        }
        
        // Fallback jika tidak ada ODC/ODP, gunakan WORKZONE jika panjangnya persis 3 huruf
        if (sto === "-" && workzoneIdx !== -1 && row[workzoneIdx]) {
            let wz = row[workzoneIdx].toString().toUpperCase().trim();
            if (wz.length === 3) sto = wz;
        }

        // Fallback terakhir: cari 3 huruf kapital
        if (sto === "-") {
            for (let c = 0; c < row.length; c++) {
                let val = (row[c] || "").toString().trim();
                if (/^[A-Z]{3}$/.test(val) && !["INC", "YES", "REG", "LOS", "ONU", "OLT", "FBB", "TTR", "TIF", "ASR", "RBS", "DGS", "WIB"].includes(val)) {
                    sto = val;
                    break;
                }
            }
        }

        // 3. Ekstrak INET Number (12-13 digit angka berawalan 1)
        for (let c = 0; c < row.length; c++) {
            let val = (row[c] || "").toString().trim();
            let match = val.match(/\b1[1-9]\d{10,11}\b/);
            if (match) {
                sNum = match[0];
                break; // prioritas pertama: jika nemu langsung break
            }
        }

        // 4. Ekstrak RX dan TX (Scan dari belakang karena ditaruh di paling ujung oleh ACS Crawler)
        for (let c = row.length - 1; c >= 0; c--) {
            let val = (row[c] || "").toString().trim();
            // Hanya ekstrak jika val benar-benar terlihat seperti angka redaman (misal -20, 2.3, -15.2 dBm)
            // Hindari string seperti "3-Medium"
            let numMatch = val.match(/^-?\d+([.,]\d+)?(\s?dBm)?$/i);
            if (numMatch) {
                let num = parseFloat(val.replace(',', '.').replace(/dBm/i, '').trim());
                if (!isNaN(num)) {
                    // RX biasanya -5 s/d -40
                    if (num < -5 && num > -45 && rx === "") rx = val;
                    // TX biasanya 0.5 s/d 8.0
                    if (num >= 0.5 && num <= 8.0 && tx === "") tx = val;
                }
            }
        }

        let isGangguan = false;
        let rxNum = parseFloat(rx.replace(',', '.'));

        // Logika Redaman
        if (!isNaN(rxNum) && (rxNum < -27 || rxNum > -12)) {
            isGangguan = true;
        }
        if (status === 'LOS' || status.includes('DYING')) {
            isGangguan = true;
        }

        let technician = "-";
        if (technicianIdx !== -1 && row[technicianIdx]) {
            let tVal = row[technicianIdx].toString().trim();
            if (tVal && !tVal.toLowerCase().includes("please assign") && tVal.toLowerCase() !== "null") {
                technician = tVal;
            }
        }
        
        let rowText = row.join(" ").toUpperCase();
        
        // Tetap masukkan ke dashboard jika tiket ini masih dalam tahap penanganan
        if ((rowText.includes("EVIDENCE FISIK SUBMITTED") || rowText.includes("[WAITING APPROVAL KORLAP]")) && !rowText.includes("[COMPLETED]")) {
            isGangguan = true;
        }

        if (isGangguan) {
            let category = 'GCU FISIK';

            // JIKA tidak ada nik teknisi, auto ngalir ke GCU LOGIC
            if (technician === "-") {
                category = 'GCU LOGIC';
            }

            // Prioritas status text (override category)
            if (rowText.includes("[COMPLETED]")) {
                category = 'COMPLETED';
            } else if (rowText.includes("DIKEMBALIKAN KE GCU FISIK") || rowText.includes("[BUTUH FISIK")) {
                category = 'GCU FISIK'; // Paksa ke GCU FISIK jika dirework/butuh fisik
            } else if (rowText.includes("DIKEMBALIKAN KE GCU LOGIC")) {
                category = 'GCU LOGIC';
            } else if (rowText.includes("[WAITING APPROVAL KORLAP]")) {
                category = 'APPROVAL KORLAP';
            } else if (rowText.includes("EVIDENCE FISIK SUBMITTED")) {
                category = 'GCU LOGIC';
            }

            parsedTickets.push({
                incident: ticketId,
                serviceNumber: sNum !== "-" ? sNum : "Unknown",
                sto: sto,
                technician: technician,
                rx: rx || "-",
                tx: tx || "-",
                status: status || "-",
                category: category
            });
        }
    }

    state.tickets = parsedTickets;
    updateDashboardSummary();
}

function updateDashboardSummary() {
    totalDataCount.innerText = state.tickets.length;
    countGcuFisik.innerText = state.tickets.filter(t => t.category === 'GCU FISIK').length;
    countGcuLogic.innerText = state.tickets.filter(t => t.category === 'GCU LOGIC').length;
    countApprovalKorlap.innerText = state.tickets.filter(t => t.category === 'APPROVAL KORLAP').length;
    countCompleted.innerText = state.tickets.filter(t => t.category === 'COMPLETED').length;

    // Automatically show active dashboard
    if (state.activeTicketId == null) {
        window.showDashboard(state.activeFilter);
    }
}

// NAVIGATION
window.showDashboard = function (filterStatus) {
    state.activeFilter = filterStatus;
    dashboardTitle.innerText = `Dashboard - ${filterStatus}`;

    // UI Toggle
    viewDashboard.style.display = 'block';
    viewWorkflow.style.display = 'none';

    // Sidebar Active state
    document.querySelectorAll('.nav-links .nav-item').forEach(el => el.classList.remove('active'));
    if (filterStatus === 'GCU FISIK') document.getElementById('menuGcuFisik').classList.add('active');
    else if (filterStatus === 'GCU LOGIC') document.getElementById('menuGcuLogic').classList.add('active');
    else if (filterStatus === 'APPROVAL KORLAP') document.getElementById('menuApprovalKorlap').classList.add('active');
    else if (filterStatus === 'COMPLETED') document.getElementById('menuCompleted').classList.add('active');

    // Reset status filter
    state.statusFilter = 'ALL';
    const sfEl = document.getElementById('statusFilter');
    if (sfEl) sfEl.value = 'ALL';

    state.filteredTickets = state.tickets.filter(t => t.category === filterStatus);
    renderTable();
};

window.showWorkflow = function (role) {
    state.role = role;

    // UI Toggle
    viewDashboard.style.display = 'none';
    viewWorkflow.style.display = 'block';

    // Sidebar Active state
    document.querySelectorAll('.nav-links .nav-item').forEach(el => el.classList.remove('active'));
    if (role === 'korlap') document.getElementById('menuKorlap').classList.add('active');
    else if (role === 'teknisi') document.getElementById('menuTeknisi').classList.add('active');
    else if (role === 'helpdesk') document.getElementById('menuHelpdesk').classList.add('active');

    renderWorkflow();
};

window.selectTicket = function (ticketId, sto) {
    state.activeTicketId = ticketId;
    state.activeSto = sto;
    state.workflowState = {}; // reset progress
    dispActiveTicketId.innerText = ticketId;

    const ticket = state.tickets.find(t => t.incident === ticketId);
    let targetRole = 'korlap';
    
    if (ticket) {
        if (ticket.category === 'GCU LOGIC') {
            targetRole = 'helpdesk';
        } else if (ticket.category === 'GCU FISIK') {
            // Jika belum di-assign, arahkan ke Korlap. Jika sudah, arahkan ke Teknisi.
            if (!ticket.technician || ticket.technician === '-') {
                targetRole = 'korlap';
            } else {
                targetRole = 'teknisi';
            }
        } else if (ticket.category === 'APPROVAL KORLAP') {
            targetRole = 'korlap';
        }
    }
    
    showWorkflow(targetRole);
};

window.applyStatusFilter = function () {
    const filterVal = document.getElementById('statusFilter').value;
    state.statusFilter = filterVal;
    renderTable();
};

function renderTable() {
    emptyState.style.display = 'none';
    ticketTable.style.display = 'table';
    ticketTableBody.innerHTML = '';

    let displayTickets = state.filteredTickets;
    if (state.statusFilter && state.statusFilter !== 'ALL') {
        displayTickets = state.filteredTickets.filter(ticket => {
            let badgeText = '';
            if (ticket.status === 'LOS' || ticket.status.includes('DYING')) badgeText = ticket.status;
            else if (parseFloat(ticket.rx) < -27) badgeText = 'REDAMAN TINGGI';
            else badgeText = ticket.status || 'OK';

            if (state.statusFilter === 'REDAMAN TINGGI') return badgeText === 'REDAMAN TINGGI';
            if (state.statusFilter === 'LOS') return badgeText === 'LOS';
            // if (state.statusFilter === 'DYING GASP') return badgeText.includes('DYING');
            return badgeText === state.statusFilter;
        });
    }

    const badgeEl = document.getElementById('filteredCountBadge');
    if (badgeEl) {
        if (state.statusFilter && state.statusFilter !== 'ALL') {
            badgeEl.style.display = 'inline-block';
            badgeEl.innerText = displayTickets.length;
        } else {
            badgeEl.style.display = 'none';
        }
    }

    if (displayTickets.length === 0) {
        showEmpty(`Tidak ada tiket di antrean ${state.activeFilter} ${state.statusFilter !== 'ALL' ? 'dengan status ' + state.statusFilter : ''}`);
        const footerEl = document.getElementById('dashboardStats');
        if (footerEl) footerEl.style.display = 'none';
        return;
    }

    let countOnline = 0;
    let countLos = 0;
    // let countDying = 0;

    displayTickets.forEach(ticket => {
        let st = (ticket.status || "").toUpperCase();
        if (st === 'ONLINE' || st.match(/\bONLINE\b/)) countOnline++;
        else if (st === 'LOS' || st.match(/\bLOS\b/)) countLos++;
        // else if (st.match(/\bDYING\b/)) countDying++;

        let statusBadge = '';
        if (ticket.status === 'LOS' || ticket.status.includes('DYING')) statusBadge = `<span class="badge danger">${ticket.status}</span>`;
        else if (parseFloat(ticket.rx) < -27) statusBadge = `<span class="badge warning">REDAMAN TINGGI</span>`;
        else statusBadge = `<span class="badge success">${ticket.status || 'OK'}</span>`;

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${ticket.incident}</strong></td>
            <td>${ticket.serviceNumber}</td>
            <td>${ticket.sto}</td>
            <td>${ticket.technician !== "-" ? `<span style="background:#e0f2fe;color:#0284c7;padding:2px 6px;border-radius:4px;font-size:12px;font-weight:bold;">${ticket.technician}</span>` : `<span style="color:#9ca3af;font-size:12px;">-</span>`}</td>
            <td>${ticket.rx}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn-action" onclick="selectTicket('${ticket.incident}', '${ticket.sto}')">Checklist / Assign</button>
            </td>
        `;
        ticketTableBody.appendChild(tr);
    });

    const footerEl = document.getElementById('dashboardStats');
    if (footerEl) {
        footerEl.style.display = 'flex';
        document.getElementById('statOnline').innerText = countOnline;
        document.getElementById('statLos').innerText = countLos;
        // document.getElementById('statDying').innerText = countDying;
    }
}

function showEmpty(msg) {
    emptyState.style.display = 'flex';
    emptyState.innerHTML = `<ion-icon name="document-text-outline"></ion-icon><p>${msg}</p>`;
    ticketTable.style.display = 'none';
}

// --- WORKFLOW LOGIC ---
window.updateTicketCategory = function (ticketId, newCategory) {
    const ticket = state.tickets.find(t => t.incident === ticketId);
    if (ticket) {
        ticket.category = newCategory;
        // Re-filter
        state.filteredTickets = state.tickets.filter(t => t.category === state.activeFilter);
        updateDashboardSummary();
        renderTable();
    }
};

function renderWorkflow() {
    if (!state.activeTicketId) {
        workflowPageTitle.innerText = "Tidak Ada Tiket Terpilih";
        workflowSubtitle.innerText = "Silakan kembali ke Inbox dan pilih tiket terlebih dahulu.";
        workflowContainer.innerHTML = `
            <div class="empty-state">
                <ion-icon name="alert-circle-outline"></ion-icon>
                <p>Pilih tiket dari antrean Dashboard untuk mulai Checklist.</p>
                <button class="btn btn-primary" onclick="showDashboard('GCU FISIK')" style="margin-top: 15px;">Ke Dashboard</button>
            </div>
        `;
        return;
    }

    workflowPageTitle.innerText = `Panel ${state.role.charAt(0).toUpperCase() + state.role.slice(1)}`;
    workflowSubtitle.innerText = `Mengelola Tiket: ${state.activeTicketId} | STO: ${state.activeSto}`;
    workflowContainer.innerHTML = '';

    if (state.role === 'korlap') renderKorlapFlow();
    else if (state.role === 'teknisi') renderTeknisiFlow();
    else if (state.role === 'helpdesk') renderHelpdeskFlow();
}

function createStep(id, title, content) {
    const step = document.createElement('div');
    step.className = 'wizard-step';
    step.id = id;
    step.innerHTML = `
        <h3 style="font-size: 15px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span class="step-num">${document.querySelectorAll('.wizard-step').length + 1}</span> ${title}
        </h3>
        <div style="margin-left: 32px;">${content}</div>
    `;
    return step;
}

window.updateState = function (key, value) {
    state.workflowState[key] = value;
    renderWorkflow();
};

// 1. KORLAP FLOW
function renderKorlapFlow() {
    const ticket = state.tickets.find(t => t.incident === state.activeTicketId);
    if (!ticket) return;

    if (ticket.category === 'COMPLETED') {
        workflowContainer.innerHTML = `<div style="padding: 20px; background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px;"><p style="color: #10b981; font-weight: bold; margin:0;"><ion-icon name="checkmark-circle" style="vertical-align: middle; font-size: 20px; margin-right: 5px;"></ion-icon> Tiket ini sudah Selesai (COMPLETED).</p></div>`;
        return;
    }

    if (ticket.category === 'APPROVAL KORLAP') {
        let contentApprove = `
            <p class="info-text" style="margin-bottom: 15px;">Validasi perbaikan sebelum melakukan GCU Closed.</p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
                <h4 style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">🛠️ Cek Evidence Teknisi (Fisik)</h4>
                <div class="btn-group" style="display: flex; gap: 10px;">
                    <button class="btn ${state.workflowState.fisikAman ? 'btn-success' : 'btn-outline'}" onclick="updateState('fisikAman', true)">Fisik Aman ✅</button>
                    <button class="btn btn-outline" style="border-color: var(--danger); color: var(--danger);" onclick="window.reworkTicket('GCU FISIK')">Rework Fisik ❌</button>
                </div>
            </div>

            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
                <h4 style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">💻 Cek Checklist HD (Logic)</h4>
                <div class="btn-group" style="display: flex; gap: 10px;">
                    <button class="btn ${state.workflowState.logicAman ? 'btn-success' : 'btn-outline'}" onclick="updateState('logicAman', true)">Logik Aman ✅</button>
                    <button class="btn btn-outline" style="border-color: var(--danger); color: var(--danger);" onclick="window.reworkTicket('GCU LOGIC')">Rework Logic ❌</button>
                </div>
            </div>
        `;

        if (state.workflowState.fisikAman && state.workflowState.logicAman) {
            contentApprove += `
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                    <button class="btn btn-success" style="width: 100%; background: #10b981; border: none; padding: 12px; color: white; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;" onclick="approveTicketFinal()">GCU Closed (Approve & Selesaikan)</button>
                </div>
            `;
        }
        
        workflowContainer.appendChild(createStep('step-k2', 'Validasi Korlap', contentApprove));
        return;
    }

    let contentAssign = `
        <p class="info-text">Masukkan NIK Teknisi lapangan dan ID Telegram untuk ditugaskan menangani tiket <strong>${state.activeTicketId}</strong>.</p>
        <div class="btn-group" style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
            <input type="text" id="tekSelect" placeholder="Masukkan NIK Teknisi" value="${ticket.technician !== '-' ? ticket.technician : ''}" style="padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); width: 100%; max-width: 250px;">
            <input type="text" id="teleSelect" placeholder="Masukkan ID Telegram (Chat ID)" style="padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); width: 100%; max-width: 250px;">
        </div>
        <button class="btn btn-primary" onclick="assignTicketToTelegram(this)">Assign Ticket</button>
    `;

    if (ticket.category === 'GCU LOGIC') {
        contentAssign = `<p style="color: var(--success); font-weight: 500;">✅ Tiket berada di antrean GCU LOGIC.</p>
        <p class="info-text" style="margin-top: 10px;">Status: Menunggu Helpdesk mengeksekusi pengecekan Logic.</p>
        <button class="btn btn-outline" style="margin-top: 10px;" onclick="showWorkflow('helpdesk')">Simulasikan View Helpdesk ➡️</button>`;
    } else if (state.workflowState.assigned || ticket.technician !== "-") {
        let assignedTo = state.workflowState.assigned || ticket.technician;
        contentAssign = `<p style="color: var(--success); font-weight: 500;">✅ Tiket telah di-assign ke NIK: <strong>${assignedTo}</strong>.</p>
        <p class="info-text" style="margin-top: 10px;">Status: Menunggu Teknisi submit evidence fisik.</p>
        <button class="btn btn-outline" style="margin-top: 10px;" onclick="showWorkflow('teknisi')">Simulasikan View Teknisi ➡️</button>`;
    }

    workflowContainer.appendChild(createStep('step-k1', 'Assign Tiket ke Teknisi', contentAssign));
}

window.approveTicketFinal = function () {
    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;

    const payload = {
        action: 'approve_completed',
        ticketId: state.activeTicketId
    };

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
    }).then(() => {
        updateTicketCategory(state.activeTicketId, 'COMPLETED');
        alert(`Tiket ${state.activeTicketId} berhasil di-Approve dan berstatus COMPLETED!`);
        showDashboard('COMPLETED');
    }).catch(err => {
        console.error(err);
        updateTicketCategory(state.activeTicketId, 'COMPLETED');
        alert(`Tiket ${state.activeTicketId} berhasil di-Approve secara lokal (offline)`);
        showDashboard('COMPLETED');
    });
};

window.reworkTicket = function (targetCategory) {
    const confirmRework = confirm(`Apakah Anda yakin ingin melakukan rework dan mengembalikan tiket ini ke antrean ${targetCategory}?`);
    if (!confirmRework) return;

    const payload = {
        action: 'rework_ticket',
        ticketId: state.activeTicketId,
        targetCategory: targetCategory,
        summaryText: `[REWORK - DIKEMBALIKAN KE ${targetCategory}]`
    };

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
    }).then(() => {
        updateTicketCategory(state.activeTicketId, targetCategory);
        alert(`Tiket dikembalikan ke ${targetCategory}!`);
        showDashboard(targetCategory);
    }).catch(err => {
        console.error(err);
        alert("Gagal koneksi ke server!");
    });
};

window.assignTicketToTelegram = function (btn) {
    const tekSelect = document.getElementById('tekSelect');
    const teleSelect = document.getElementById('teleSelect');
    const teknisi = tekSelect.value.trim();
    const idTele = teleSelect.value.trim();
    if (!teknisi || !idTele) {
        alert("Masukkan NIK Teknisi dan ID Telegram terlebih dahulu!");
        return;
    }

    btn.innerText = "Mengirim Tugas...";
    btn.disabled = true;

    const ticket = state.tickets.find(t => t.incident === state.activeTicketId);

    const payload = {
        action: 'assign_ticket',
        ticketId: state.activeTicketId,
        teknisi: teknisi,
        idTele: idTele,
        sto: ticket ? ticket.sto : '-',
        rx: ticket ? ticket.rx : '-',
        tx: ticket ? ticket.tx : '-',
        serviceNumber: ticket ? ticket.serviceNumber : '-'
    };

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
    }).then(() => {
        updateState('assigned', teknisi);
        updateTicketCategory(state.activeTicketId, 'GCU LOGIC');
        alert("Tugas berhasil dikirim ke Telegram Teknisi! Tiket berpindah ke antrean GCU LOGIC.");
    }).catch(err => {
        console.error(err);
        updateState('assigned', teknisi);
        updateTicketCategory(state.activeTicketId, 'GCU LOGIC');
    });
};

// 2. TEKNISI FLOW
function renderTeknisiFlow() {
    const ticket = state.tickets.find(t => t.incident === state.activeTicketId);

    if (ticket && ticket.category === 'GCU FISIK' && !state.workflowState.assigned) {
        workflowContainer.innerHTML = `<p style="color: var(--danger); font-weight: 500;">❌ Tiket belum di-assign oleh Korlap.</p>`;
        return;
    }

    if (ticket && (ticket.category === 'APPROVAL KORLAP' || ticket.category === 'COMPLETED')) {
        workflowContainer.innerHTML = `<p style="color: var(--success); font-weight: 500;">✅ Pekerjaan fisik telah selesai disubmit.</p>`;
        return;
    }

    let contentEvidence = `
        <p class="info-text">Anda ditugaskan menangani tiket ini. Silakan periksa redaman optik dan status perangkat ODP/ONT Pelanggan sesuai flowchart.</p>
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <label style="display: flex; align-items: center; gap: 5px;"><input type="checkbox" ${state.workflowState.cekOdp ? 'checked' : ''} onclick="updateState('cekOdp', this.checked)"> Cek Redaman ODP</label>
            <label style="display: flex; align-items: center; gap: 5px;"><input type="checkbox" ${state.workflowState.cekOnt ? 'checked' : ''} onclick="updateState('cekOnt', this.checked)"> Cek Redaman ONT</label>
            <label style="display: flex; align-items: center; gap: 5px;"><input type="checkbox" ${state.workflowState.gantiKabel ? 'checked' : ''} onclick="updateState('gantiKabel', this.checked)"> Patching/Ganti Kabel</label>
        </div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Upload Foto Evidence (Dari Galeri/Kamera)</label>
        <input type="file" id="tekPhoto" accept="image/*" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 10px; background: white;">
        <textarea id="tekNotes" placeholder="Tulis catatan perbaikan tambahan di sini..." rows="3" style="width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 10px;">${state.workflowState.evidence || ''}</textarea>
        <button class="btn btn-primary" onclick="window.submitTeknisiEvidence(event)">Submit Evidence Fisik</button>
    `;

    if (state.workflowState.evidence === 'submitted') {
        contentEvidence = `
            <p style="color: var(--success); font-weight: 500;">✅ Evidence berhasil di-submit.</p>
            <p class="info-text" style="margin-top: 10px;">Pekerjaan fisik selesai. Menunggu validasi dari Helpdesk (Cek Logic).</p>
            <button class="btn btn-outline" style="margin-top: 10px;" onclick="showWorkflow('helpdesk')">Simulasikan View Helpdesk ➡️</button>
        `;
    }

    workflowContainer.appendChild(createStep('step-t1', 'Submit Evidence Lapangan', contentEvidence));
}

// 3. HELPDESK FLOW
function renderHelpdeskFlow() {
    const ticket = state.tickets.find(t => t.incident === state.activeTicketId);

    if (ticket && (ticket.category === 'APPROVAL KORLAP' || ticket.category === 'COMPLETED')) {
        workflowContainer.innerHTML = `<p style="color: var(--success); font-weight: 500;">✅ Pengecekan logic selesai, tiket sudah diajukan ke Korlap.</p>`;
        return;
    }

    if (state.workflowState.evidence !== 'submitted' && ticket.technician !== "-") {
        workflowContainer.innerHTML = `<p style="color: var(--danger); font-weight: 500;">❌ Teknisi belum mensubmit evidence perbaikan fisik.</p>`;
        return;
    }

    let contentLogic = `
        <p class="info-text" style="margin-bottom:15px;">Silakan jalankan eksekusi pengecekan Logic sesuai flowchart berikut. Centang langkah yang sudah dilakukan:</p>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
            <h4 style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">🌐 Layanan Internet</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-left: 5px;">
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_int1" ${state.workflowState.chk_int1 ? 'checked' : ''} onchange="updateState('chk_int1', this.checked)"> Cek Interferensi Sinyal / Pindah Channel Frekuensi</label>
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_int2" ${state.workflowState.chk_int2 ? 'checked' : ''} onchange="updateState('chk_int2', this.checked)"> Checklist NAT</label>
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_int3" ${state.workflowState.chk_int3 ? 'checked' : ''} onchange="updateState('chk_int3', this.checked)"> Enable IPV6</label>
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_int4" ${state.workflowState.chk_int4 ? 'checked' : ''} onchange="updateState('chk_int4', this.checked)"> Set Firewall ke Medium</label>
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_int5" ${state.workflowState.chk_int5 ? 'checked' : ''} onchange="updateState('chk_int5', this.checked)"> Cek CPU/RAM & Versi ONT (Restart/Ganti jika Obsolete)</label>
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_int6" ${state.workflowState.chk_int6 ? 'checked' : ''} onchange="updateState('chk_int6', this.checked)"> Cek FPP (Client, RSSL, Ping, Traceroute)</label>
            </div>
        </div>

        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
            <h4 style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">📺 Layanan IPTV</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-left: 5px;">
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_iptv1" ${state.workflowState.chk_iptv1 ? 'checked' : ''} onchange="updateState('chk_iptv1', this.checked)"> Cek ACS Connection</label>
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_iptv2" ${state.workflowState.chk_iptv2 ? 'checked' : ''} onchange="updateState('chk_iptv2', this.checked)"> Cek Last Information & Channel connect</label>
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_iptv3" ${state.workflowState.chk_iptv3 ? 'checked' : ''} onchange="updateState('chk_iptv3', this.checked)"> Cek Status Isolir</label>
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_iptv4" ${state.workflowState.chk_iptv4 ? 'checked' : ''} onchange="updateState('chk_iptv4', this.checked)"> Cek Adv STB Information</label>
            </div>
        </div>

        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
            <h4 style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">📞 Layanan Voice</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-left: 5px;">
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_voice1" ${state.workflowState.chk_voice1 ? 'checked' : ''} onchange="updateState('chk_voice1', this.checked)"> Cek Voice Service (Connected, Normal)</label>
            </div>
        </div>

        <div style="margin-top: 15px; margin-bottom: 15px;">
            <label class="block text-sm font-medium text-gray-700 mb-1">Upload Foto Evidence Logic (Opsional)</label>
            <input type="file" id="hdPhoto" accept="image/*" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 10px; background: white;">
            <textarea id="hdNotes" placeholder="Tulis catatan logic / link evidence foto tambahan di sini..." rows="2" style="width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px;"></textarea>
        </div>

        <div class="btn-group" style="margin-bottom: 15px;">
            <button class="btn ${state.workflowState.logicOk ? 'btn-success' : 'btn-outline'}" onclick="updateState('logicOk', true)">Logic Selesai & Layanan Normal ✅</button>
            <button class="btn btn-outline" style="border-color: var(--danger); color: var(--danger);" onclick="window.returnToFisikFromHelpdesk()">Masih Gangguan (Butuh Fisik) ❌</button>
        </div>
    `;

    workflowContainer.appendChild(createStep('step-h1', 'Eksekusi Logic Flowchart', contentLogic));

    if (state.workflowState.logicOk) {
        let contentClose = `
            <p style="color: var(--success); font-weight: 500;">🎉 Logic sudah OK! Tiket siap diserahkan kembali ke Korlap untuk persetujuan akhir.</p>
            <button class="btn btn-primary" onclick="window.requestApprovalBackend(event)">Ajukan Approval Korlap</button>
        `;
        workflowContainer.appendChild(createStep('step-h2', 'Selesaikan Pengecekan Logic', contentClose));
    }
}

// Boot
init();


window.requestApprovalBackend = async function (event) {
    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "Mempersiapkan...";
    btn.disabled = true;

    // Format summary checklist
    let checkedItems = [];
    if(state.workflowState.chk_int1) checkedItems.push("Pindah Channel");
    if(state.workflowState.chk_int2) checkedItems.push("Checklist NAT");
    if(state.workflowState.chk_int3) checkedItems.push("Enable IPV6");
    if(state.workflowState.chk_int4) checkedItems.push("Firewall Medium");
    if(state.workflowState.chk_int5) checkedItems.push("Cek ONT");
    if(state.workflowState.chk_int6) checkedItems.push("Cek FPP");
    if(state.workflowState.chk_iptv1) checkedItems.push("Cek ACS");
    if(state.workflowState.chk_iptv2) checkedItems.push("Cek Channel");
    if(state.workflowState.chk_iptv3) checkedItems.push("Cek Isolir");
    if(state.workflowState.chk_iptv4) checkedItems.push("Cek STB");
    if(state.workflowState.chk_voice1) checkedItems.push("Cek Voice");
    
    let notes = document.getElementById('hdNotes') ? document.getElementById('hdNotes').value : "";
    let summaryText = "[WAITING APPROVAL KORLAP] - Eksekusi Logic: " + (checkedItems.length > 0 ? checkedItems.join(", ") : "OK") + (notes ? " | Catatan: " + notes : "");

    const payload = {
        action: 'request_approval',
        ticketId: state.activeTicketId,
        summaryText: summaryText
    };

    // Proses Foto Jika Ada
    const photoInput = document.getElementById('hdPhoto');
    if (photoInput && photoInput.files.length > 0) {
        btn.innerText = "Mengupload Foto...";
        const file = photoInput.files[0];
        try {
            const base64String = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
            payload.photoBase64 = base64String;
            payload.photoMimeType = file.type;
            payload.photoName = "Evidence_Logic_" + state.activeTicketId + "_" + file.name;
        } catch (e) {
            console.error(e);
            alert("Gagal memproses foto.");
            btn.innerText = oldText;
            btn.disabled = false;
            return;
        }
    }

    btn.innerText = "Mengirim...";
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
    }).then(() => {
        updateTicketCategory(state.activeTicketId, 'APPROVAL KORLAP');
        alert("Tiket dikirim ke Korlap!");
        showDashboard('APPROVAL KORLAP');
    }).catch(err => {
        alert("Gagal koneksi ke server!");
        btn.innerText = oldText;
        btn.disabled = false;
    });
};

window.submitTeknisiEvidence = async function (event) {
    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "Mengirim...";
    btn.disabled = true;

    // Kumpulkan data checklist
    let checkedItems = [];
    if(state.workflowState.cekOdp) checkedItems.push("Cek Redaman ODP");
    if(state.workflowState.cekOnt) checkedItems.push("Cek Redaman ONT");
    if(state.workflowState.gantiKabel) checkedItems.push("Patching/Ganti Kabel");
    
    let notes = document.getElementById('tekNotes') ? document.getElementById('tekNotes').value : "";
    let summaryText = "[GCU LOGIC] - EVIDENCE FISIK SUBMITTED: " + (checkedItems.length > 0 ? checkedItems.join(", ") : "Selesai") + (notes ? " | Catatan: " + notes : "");

    const payload = {
        action: 'submit_evidence_fisik',
        ticketId: state.activeTicketId,
        summaryText: summaryText
    };

    // Proses Foto Jika Ada
    const photoInput = document.getElementById('tekPhoto');
    if (photoInput && photoInput.files.length > 0) {
        btn.innerText = "Mengupload Foto...";
        const file = photoInput.files[0];
        
        try {
            const base64String = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
            
            payload.photoBase64 = base64String;
            payload.photoMimeType = file.type;
            payload.photoName = "Evidence_" + state.activeTicketId + "_" + file.name;
        } catch (e) {
            console.error("Gagal membaca file foto:", e);
            alert("Gagal memproses foto. Pastikan format file benar.");
            btn.innerText = oldText;
            btn.disabled = false;
            return;
        }
    }

    btn.innerText = "Mengirim Data...";
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
    }).then(() => {
        updateState('evidence', 'submitted');
        updateTicketCategory(state.activeTicketId, 'GCU LOGIC');
        alert("Evidence fisik & foto berhasil dikirim ke Google Sheet!");
        showDashboard('GCU LOGIC');
    }).catch(err => {
        console.error(err);
        alert("Gagal menghubungi server!");
        btn.innerText = oldText;
        btn.disabled = false;
    });
};

window.returnToFisikFromHelpdesk = async function () {
    const confirmMove = confirm("Apakah tiket ini masih butuh perbaikan fisik oleh Teknisi? Tiket akan dipindah ke antrean GCU FISIK.");
    if (!confirmMove) return;
    
    // Kumpulkan data checklist yang sudah dilakukan helpdesk
    let checkedItems = [];
    if(state.workflowState.chk_int1) checkedItems.push("Pindah Channel");
    if(state.workflowState.chk_int2) checkedItems.push("Checklist NAT");
    if(state.workflowState.chk_int3) checkedItems.push("Enable IPV6");
    if(state.workflowState.chk_int4) checkedItems.push("Firewall Medium");
    if(state.workflowState.chk_int5) checkedItems.push("Cek ONT");
    if(state.workflowState.chk_int6) checkedItems.push("Cek FPP");
    if(state.workflowState.chk_iptv1) checkedItems.push("Cek ACS");
    if(state.workflowState.chk_iptv2) checkedItems.push("Cek Channel");
    if(state.workflowState.chk_iptv3) checkedItems.push("Cek Isolir");
    if(state.workflowState.chk_iptv4) checkedItems.push("Cek STB");
    if(state.workflowState.chk_voice1) checkedItems.push("Cek Voice");

    let hdNotes = document.getElementById('hdNotes') ? document.getElementById('hdNotes').value : "";
    let notes = (checkedItems.length > 0 ? "Sudah dicoba Helpdesk: " + checkedItems.join(", ") : "Logic tidak mempan");
    if (hdNotes) notes += " | Catatan Tambahan: " + hdNotes;

    const payload = {
        action: 'rework_ticket',
        ticketId: state.activeTicketId,
        targetCategory: 'GCU FISIK',
        summaryText: `[BUTUH FISIK - DIKEMBALIKAN KE GCU FISIK] | ${notes}`
    };
    
    // Proses Foto Jika Ada
    const photoInput = document.getElementById('hdPhoto');
    if (photoInput && photoInput.files.length > 0) {
        const file = photoInput.files[0];
        try {
            const base64String = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
            payload.photoBase64 = base64String;
            payload.photoMimeType = file.type;
            payload.photoName = "Evidence_LogicRework_" + state.activeTicketId + "_" + file.name;
        } catch (e) {
            console.error(e);
            alert("Gagal memproses foto.");
            return;
        }
    }

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
    }).then(() => {
        updateTicketCategory(state.activeTicketId, 'GCU FISIK');
        alert("Tiket dikembalikan ke GCU FISIK untuk perbaikan lapangan!");
        showDashboard('GCU FISIK');
    }).catch(err => {
        console.error(err);
        alert("Gagal koneksi ke server!");
    });
};
