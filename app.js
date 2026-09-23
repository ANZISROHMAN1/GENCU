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

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyz4bDNVEtjazRYRSvs2lXk_40Ee6qhxR64r9UCBXjaWPn6Q9urV8LFSymXXqWHxQs3/exec'; 

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
    
    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        let ticketId = row[incIdx] ? row[incIdx].toString().trim() : "-";
        if (!ticketId.match(/^(INC|1-SV)/)) continue;
        
        let rx = "", tx = "", status = "-", sto = "-", sNum = "-";
        
        // 1. Ekstrak STATUS
        for(let c=0; c<row.length; c++) {
            let val = (row[c]||"").toString().toUpperCase().trim();
            if (val.includes("LOS")) { status = "LOS"; break; }
            if (val.includes("DYING GASP") || val.includes("DYING_GASP")) { status = "DYING GASP"; break; }
            if (val.includes("OFFLINE")) { status = "OFFLINE"; break; }
            if (val.includes("ONLINE")) { status = "ONLINE"; break; }
        }
        
        // 2. Ekstrak STO (3 Huruf Kapital)
        for(let c=0; c<row.length; c++) {
            let val = (row[c]||"").toString().trim();
            if (/^[A-Z]{3}$/.test(val) && !["INC","YES","REG","LOS","ONU","OLT","FBB","TTR","TIF","ASR"].includes(val)) {
                sto = val;
                break;
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
        for(let c=row.length-1; c>=0; c--) {
            let val = (row[c]||"").toString().trim();
            // Hanya ekstrak jika val benar-benar terlihat seperti angka redaman (misal -20, 2.3, -15.2 dBm)
            // Hindari string seperti "3-Medium"
            let numMatch = val.match(/^-?\d+(\.\d+)?(\s?dBm)?$/i);
            if (numMatch) {
                let num = parseFloat(val);
                if (!isNaN(num)) {
                    // RX biasanya -5 s/d -40
                    if (num < -5 && num > -45 && rx === "") rx = val;
                    // TX biasanya 0.5 s/d 8.0
                    if (num >= 0.5 && num <= 8.0 && tx === "") tx = val;
                }
            }
        }

        let isGangguan = false;
        let rxNum = parseFloat(rx);
        
        // Logika Redaman
        if (!isNaN(rxNum) && (rxNum < -27 || rxNum > -12)) {
            isGangguan = true;
        }
        if (status === 'LOS' || status.includes('DYING')) {
            isGangguan = true;
        }

        if (isGangguan) { 
            parsedTickets.push({
                incident: ticketId,
                serviceNumber: sNum !== "-" ? sNum : "Unknown",
                sto: sto,
                rx: rx || "-",
                tx: tx || "-",
                status: status || "-",
                category: 'GCU FISIK'
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
    if(state.activeTicketId == null) {
        window.showDashboard(state.activeFilter);
    }
}

// NAVIGATION
window.showDashboard = function(filterStatus) {
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

window.showWorkflow = function(role) {
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

window.selectTicket = function(ticketId, sto) {
    state.activeTicketId = ticketId;
    state.activeSto = sto;
    state.workflowState = {}; // reset progress
    dispActiveTicketId.innerText = ticketId;
    
    // Default flow starts at Korlap
    showWorkflow('korlap');
};

window.applyStatusFilter = function() {
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
            if (state.statusFilter === 'DYING GASP') return badgeText.includes('DYING');
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
    let countDying = 0;

    displayTickets.forEach(ticket => {
        let st = (ticket.status || "").toUpperCase();
        if (st.includes('ONLINE')) countOnline++;
        else if (st.includes('LOS')) countLos++;
        else if (st.includes('DYING')) countDying++;

        let statusBadge = '';
        if (ticket.status === 'LOS' || ticket.status.includes('DYING')) statusBadge = `<span class="badge danger">${ticket.status}</span>`;
        else if (parseFloat(ticket.rx) < -27) statusBadge = `<span class="badge warning">REDAMAN TINGGI</span>`;
        else statusBadge = `<span class="badge success">${ticket.status || 'OK'}</span>`;

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${ticket.incident}</strong></td>
            <td>${ticket.serviceNumber}</td>
            <td>${ticket.sto}</td>
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
        document.getElementById('statDying').innerText = countDying;
    }
}

function showEmpty(msg) {
    emptyState.style.display = 'flex';
    emptyState.innerHTML = `<ion-icon name="document-text-outline"></ion-icon><p>${msg}</p>`;
    ticketTable.style.display = 'none';
}

// --- WORKFLOW LOGIC ---
window.updateTicketCategory = function(ticketId, newCategory) {
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

window.updateState = function(key, value) {
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
            <p class="info-text">Teknisi dan Helpdesk telah menyelesaikan perbaikan fisik dan logic untuk tiket <strong>${state.activeTicketId}</strong>.</p>
            <p class="info-text">Silakan validasi hasil akhirnya sebelum Close tiket.</p>
            <button class="btn btn-success" style="background: #10b981; border: none; padding: 10px 20px; color: white; border-radius: 6px; font-weight: bold; margin-top: 10px; cursor: pointer;" onclick="approveTicketFinal()">Approve & Selesaikan Tiket</button>
        `;
        workflowContainer.appendChild(createStep('step-k2', 'Final Approval Korlap', contentApprove));
        return;
    }

    let contentAssign = `
        <p class="info-text">Masukkan NIK Teknisi lapangan yang hadir untuk ditugaskan menangani tiket <strong>${state.activeTicketId}</strong>.</p>
        <div class="btn-group" style="margin-bottom: 15px;">
            <input type="text" id="tekSelect" placeholder="Masukkan NIK Teknisi" style="padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); width: 100%; max-width: 300px;">
        </div>
        <button class="btn btn-primary" onclick="assignTicketToTelegram(this)">Assign Ticket</button>
    `;
    
    if (state.workflowState.assigned || ticket.category === 'GCU LOGIC') {
        let assignedTo = state.workflowState.assigned || "Teknisi";
        contentAssign = `<p style="color: var(--success); font-weight: 500;">✅ Tiket telah di-assign ke NIK: <strong>${assignedTo}</strong>.</p>
        <p class="info-text" style="margin-top: 10px;">Status: Menunggu Teknisi submit evidence di menu GCU LOGIC.</p>
        <button class="btn btn-outline" style="margin-top: 10px;" onclick="showWorkflow('teknisi')">Simulasikan View Teknisi ➡️</button>`;
    }
    
    workflowContainer.appendChild(createStep('step-k1', 'Assign Tiket ke Teknisi', contentAssign));
}

window.approveTicketFinal = function() {
    updateTicketCategory(state.activeTicketId, 'COMPLETED');
    alert(`Tiket ${state.activeTicketId} berhasil di-Approve dan berstatus COMPLETED!`);
    showDashboard('COMPLETED');
};

window.assignTicketToTelegram = function(btn) {
    const tekSelect = document.getElementById('tekSelect');
    const teknisi = tekSelect.value;
    if (!teknisi) {
        alert("Masukkan NIK Teknisi terlebih dahulu!");
        return;
    }
    
    btn.innerText = "Mengirim Tugas...";
    btn.disabled = true;
    
    const ticket = state.tickets.find(t => t.incident === state.activeTicketId);
    
    const payload = {
        action: 'assign_ticket',
        ticketId: state.activeTicketId,
        teknisi: teknisi,
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
        <textarea placeholder="Tulis catatan perbaikan / link evidence foto di sini..." rows="3" style="width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 10px;">${state.workflowState.evidence || ''}</textarea>
        <button class="btn btn-primary" onclick="updateState('evidence', 'submitted')">Submit Evidence</button>
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

    if (state.workflowState.evidence !== 'submitted') {
        workflowContainer.innerHTML = `<p style="color: var(--danger); font-weight: 500;">❌ Teknisi belum mensubmit evidence perbaikan fisik.</p>`;
        return;
    }

    let contentLogic = `
        <p class="info-text">Teknisi telah menyelesaikan perbaikan fisik. Silakan cek *Logic* (koneksi PPPoE, IP, dan Layanan iBooster).</p>
        <div class="btn-group" style="margin-bottom: 15px;">
            <button class="btn ${state.workflowState.logicOk ? 'btn-success' : 'btn-outline'}" onclick="updateState('logicOk', true)">Logic OK & Layanan UP ✅</button>
            <button class="btn ${state.workflowState.logicFail ? 'btn-danger' : 'btn-outline'}" onclick="updateState('logicFail', true)" style="border-color: var(--danger); color: ${state.workflowState.logicFail ? 'white' : 'var(--danger)'}; background: ${state.workflowState.logicFail ? 'var(--danger)' : 'transparent'}">Masih Gangguan (Reject) ❌</button>
        </div>
    `;

    workflowContainer.appendChild(createStep('step-h1', 'Verifikasi Logic & Layanan', contentLogic));

    if (state.workflowState.logicOk) {
        let contentClose = `
            <p style="color: var(--success); font-weight: 500;">🎉 Logic sudah OK! Tiket siap diserahkan kembali ke Korlap untuk persetujuan akhir.</p>
            <button class="btn btn-primary" onclick="alert('Tiket dikirim ke Korlap!'); updateTicketCategory(state.activeTicketId, 'APPROVAL KORLAP'); showDashboard('APPROVAL KORLAP');">Ajukan Approval Korlap</button>
        `;
        workflowContainer.appendChild(createStep('step-h2', 'Selesaikan Pengecekan Logic', contentClose));
    }
}

// Boot
init();

