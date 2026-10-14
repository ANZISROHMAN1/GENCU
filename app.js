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
    workflowState: {},
    // User Identity
    userRole: null,
    userNik: null,
    userName: null,
    userTelegram: null
};

// Theme Management
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateThemeBtn(isLight);
}

function updateThemeBtn(isLight) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.innerHTML = isLight ? '<ion-icon name="moon-outline"></ion-icon> Dark Mode' : '<ion-icon name="sunny-outline"></ion-icon> Light Mode';
    }
}

// Check saved theme on load
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
}

// Selectors
const totalDataCount = document.getElementById('totalDataCount');
const currentDateRange = document.getElementById('currentDateRange');
const countGcuFisik = document.getElementById('countGcuFisik');
const countGcuLogic = document.getElementById('countGcuLogic');
const countApprovalKorlap = document.getElementById('countApprovalKorlap');
const countPending = document.getElementById('countPending');
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
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwgkZAduwo1EKvp-MZgE9c0Auhfpz7aiNEi5TSer0gqHJDMjUvTcxJL3FpFfKWece2Z/exec';

function showRegister() {
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('registerCard').style.display = 'block';
}

function showLogin() {
    document.getElementById('registerCard').style.display = 'none';
    document.getElementById('loginCard').style.display = 'block';
}

async function handleRegister() {
    const role = document.getElementById('regRole').value;
    const nik = document.getElementById('regNik').value;
    const name = document.getElementById('regName').value;
    const telegram = document.getElementById('regTelegram').value;
    const password = document.getElementById('regPassword').value;
    
    if (role === 'helpdesk' || role === 'korlap') {
        if (!telegram || telegram.trim() === '') {
            alert("Harap masukkan Username Telegram untuk role Helpdesk dan Korlap!");
            return;
        }
    }
    
    if (nik && name && password) {
        const btn = document.querySelector('#registerForm button[type="submit"]');
        const oldText = btn.innerText;
        btn.innerText = "Mendaftarkan...";
        btn.disabled = true;
        
        try {
            const params = new URLSearchParams({
                action: 'register_user',
                role: role,
                nik: nik,
                name: name,
                telegram: telegram,
                password: password
            });
            
            const res = await fetch(SCRIPT_URL + '?' + params.toString());
            const data = await res.json();
            
            if (data.success) {
                alert("Pendaftaran berhasil! Silakan login.");
                document.getElementById('loginRole').value = role;
                document.getElementById('loginNik').value = nik;
                showLogin();
            } else {
                alert(data.message || "Gagal mendaftar.");
            }
        } catch (e) {
            alert("Terjadi kesalahan jaringan atau server.");
            console.error(e);
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    } else {
        alert("Harap lengkapi semua data pendaftaran!");
    }
}

async function handleLogin() {
    const role = document.getElementById('loginRole').value;
    const nik = document.getElementById('loginNik').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!nik || !password) {
        alert("Harap isi NIK dan Password.");
        return;
    }

    const btn = document.querySelector('#loginForm button[type="submit"]');
    const oldText = btn.innerText;
    btn.innerText = "Memverifikasi...";
    btn.disabled = true;

    try {
        const params = new URLSearchParams({
            action: 'login_user',
            role: role,
            nik: nik,
            password: password
        });
        
        const res = await fetch(SCRIPT_URL + '?' + params.toString());
        const data = await res.json();
        
        let isPasswordValid = false;
        let userName = nik;
        let userTelegram = "";
        
        if (data.success) {
            isPasswordValid = true;
            userName = data.user.name;
            userTelegram = data.user.telegram || "";
        } else {
            // Fallback validasi sederhana
            if (role === 'helpdesk' && password === 'helpdesk123') {
                isPasswordValid = true;
            } else if (role === 'korlap' && password === 'korlap123') {
                isPasswordValid = true;
            } else if (role === 'tif' && password === 'tifadmin123') {
                isPasswordValid = true;
            }
        }
        
        if (isPasswordValid) {
            localStorage.setItem('userRole', role);
            localStorage.setItem('userNik', nik);
            localStorage.setItem('userName', userName); 
            if (userTelegram) localStorage.setItem('userTelegram', userTelegram);
            
            applyUserRole();
            document.getElementById('loginOverlay').style.display = 'none';
            initAfterLogin();
        } else {
            alert(data.message || "Password salah atau NIK belum terdaftar!\nDefault Password:\nHelp Desk = helpdesk123\nKorlap = korlap123\nTIF = tifadmin123");
        }
    } catch (e) {
        alert("Terjadi kesalahan jaringan atau server.");
        console.error(e);
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
}

function applyUserRole() {
    state.userRole = localStorage.getItem('userRole');
    state.userNik = localStorage.getItem('userNik');
    state.userName = localStorage.getItem('userName');
    state.userTelegram = localStorage.getItem('userTelegram');
    
    // Tampilkan informasi login di sidebar
    const userInfoBlock = document.getElementById('userInfoBlock');
    if (userInfoBlock && state.userRole) {
        userInfoBlock.style.display = 'block';
        let displayRoleStr = 'Help Desk';
        if (state.userRole === 'korlap') displayRoleStr = 'Korlap';
        else if (state.userRole === 'tif') displayRoleStr = 'TIF (Master)';
        document.getElementById('displayRole').innerText = displayRoleStr;
        let displayNameText = state.userNik;
        if (state.userName && state.userName !== state.userNik) {
            displayNameText = `${state.userName} - ${state.userNik}`;
        }
        document.getElementById('displayNama').innerText = displayNameText;
    }
    
    // Helpdesk tidak bisa lihat menu Approval Korlap
    const menuApprovalKorlap = document.getElementById('menuApprovalKorlap');
    const cardApprovalKorlap = countApprovalKorlap ? countApprovalKorlap.closest('.card') : null;
    
    const menuPending = document.getElementById('menuPending');
    const cardPending = countPending ? countPending.closest('.card') : null;

    if (state.userRole === 'helpdesk') {
        if (menuApprovalKorlap) menuApprovalKorlap.style.display = 'none';
        if (cardApprovalKorlap) cardApprovalKorlap.style.display = 'none';
        if (menuPending) menuPending.style.display = 'none';
        if (cardPending) cardPending.style.display = 'none';
        // Auto-redirect jika sedang di Approval Korlap / Pending
        if (state.activeFilter === 'APPROVAL KORLAP' || state.activeFilter === 'PENDING') {
            state.activeFilter = 'GCU FISIK';
        }
    } else {
        if (menuApprovalKorlap) menuApprovalKorlap.style.display = 'block';
        if (cardApprovalKorlap) cardApprovalKorlap.style.display = 'flex';
        if (menuPending) menuPending.style.display = 'block';
        if (cardPending) cardPending.style.display = 'flex';
    }
}

function handleLogout() {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userNik');
    localStorage.removeItem('userName');
    localStorage.removeItem('userTelegram');
    location.reload();
}

function init() {
    initTableDragScroll();
    // Check if user is logged in
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) {
        document.getElementById('loginOverlay').style.display = 'none';
        applyUserRole();
        initAfterLogin();
    } else {
        document.getElementById('loginOverlay').style.display = 'flex';
    }
}

function initAfterLogin() {
    const today = new Date();
    currentDateRange.innerText = `${today.getDate()} ${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`;
    updateThemeBtn(document.body.classList.contains('light-mode'));
    fetchTickets();
    initTableDragScroll();
    
    // Auto refresh every 1 minute
    setInterval(() => {
        fetchTickets(true);
    }, 60000);
}

// === DRAG TO SCROLL TABLE FEATURE & COPY UTILITIES ===
function initTableDragScroll() {
    const slider = document.getElementById('ticketTableContainer');
    if (!slider || slider.dataset.dragInit) return;
    slider.dataset.dragInit = "true";

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    slider.addEventListener('mousedown', (e) => {
        // Jangan aktifkan drag jika user mengklik pada cell tabel (td/th) atau elemen interaktif
        // Ini memastikan teks tabel bisa diseleksi/diblok secara normal untuk di-copas
        if (e.target.closest('td') || e.target.closest('th') || e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('select') || e.target.closest('.copy-badge')) {
            return;
        }
        isDown = true;
        slider.classList.add('is-dragging');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('is-dragging');
    });

    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('is-dragging');
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 1.5;
        if (Math.abs(walk) > 4) {
            e.preventDefault();
            slider.scrollLeft = scrollLeft - walk;
        }
    });
}

// Global Copy to Clipboard & Toast Helper
window.showToast = function(msg, isSuccess = true) {
    let oldToast = document.getElementById('app-global-toast');
    if (oldToast) oldToast.remove();

    let toast = document.createElement('div');
    toast.id = 'app-global-toast';
    toast.innerHTML = msg;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${isSuccess ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        z-index: 99999;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35);
        font-weight: 600;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.style.animation = 'toastOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 2500);
};

window.copyToClipboard = function(text, label = "Teks", event = null) {
    if (event) {
        event.stopPropagation();
    }
    if (!text || text === "-" || text === "Unknown") {
        return;
    }
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`📋 ${label} disalin: <strong>${text}</strong>`);
        }).catch(() => {
            fallbackCopyText(text, label);
        });
    } else {
        fallbackCopyText(text, label);
    }
};

function fallbackCopyText(text, label) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        document.execCommand('copy');
        showToast(`📋 ${label} disalin: <strong>${text}</strong>`);
    } catch (e) {
        console.error('Gagal menyalin:', e);
    }
    document.body.removeChild(textarea);
}

function fetchTickets(isBackground = false) {
    if (!isBackground) {
        emptyState.style.display = 'flex';
        emptyState.innerHTML = '<ion-icon name="sync-outline" style="animation: spin 1s linear infinite;"></ion-icon><p>Memuat Data dari Spreadsheet...</p>';
        ticketTable.style.display = 'none';
    } else {
        // Optional: you can show a subtle loading indicator on the reload button
        const reloadIcon = document.querySelector('.btn-reload ion-icon');
        if (reloadIcon) {
            reloadIcon.style.animation = 'spin 1s linear infinite';
        }
    }

    fetch(SCRIPT_URL + "?t=" + new Date().getTime())
        .then(res => res.json())
        .then(data => {
            processData(data);
            if (isBackground) stopReloadAnimation();
        })
        .catch(err => {
            console.warn("Fetch failed, using local simulation.");
            if (isBackground) stopReloadAnimation();
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

function stopReloadAnimation() {
    const reloadIcon = document.querySelector('.btn-reload ion-icon');
    if (reloadIcon) {
        reloadIcon.style.animation = 'none';
    }
}

function processData(rows) {
    if (!rows || rows.length < 2) {
        showEmpty("Tidak ada data ditemukan.");
        return;
    }

    let parsedTickets = [];
    
    // Cari baris mana yang merupakan header asli (mengandung INCIDENT)
    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(5, rows.length); r++) {
        let rStr = rows[r].join(" ").toUpperCase();
        if (rStr.includes("INCIDENT") && (rStr.includes("STATUS") || rStr.includes("DATE") || rStr.includes("CUSTOMER") || rStr.includes("SUMMARY") || rStr.includes("TTR"))) {
            headerRowIdx = r;
            break;
        }
    }
    // Gabungkan header dari baris 0 sampai headerRowIdx agar kolom tambahan (ACTION, EVIDENCE FISIK, FOTO, dll) tidak hilang
    let maxCols = 0;
    for (let r = 0; r <= headerRowIdx; r++) {
        if (rows[r] && rows[r].length > maxCols) maxCols = rows[r].length;
    }
    let headers = [];
    for (let c = 0; c < maxCols; c++) {
        let hName = "";
        if (rows[headerRowIdx] && rows[headerRowIdx][c]) {
            hName = rows[headerRowIdx][c].toString().trim();
        }
        if (!hName) {
            for (let r = 0; r < headerRowIdx; r++) {
                if (rows[r] && rows[r][c]) {
                    hName = rows[r][c].toString().trim();
                    break;
                }
            }
        }
        headers.push(hName.toUpperCase());
    }

    let incIdx = -1;
    // Scan headers to find INCIDENT column
    for (let c = 0; c < headers.length; c++) {
        if (headers[c] === "INCIDENT" || headers[c] === "TICKET" || (headers[c].includes("INCIDENT") && !headers[c].includes("PARENT"))) {
            incIdx = c;
            break;
        }
    }
    if (incIdx === -1) {
        for (let c = 0; c < headers.length; c++) {
            for (let r = headerRowIdx + 1; r < Math.min(headerRowIdx + 10, rows.length); r++) {
                if (rows[r][c] && rows[r][c].toString().match(/^(INC\d{5,}|1-SV\d{5,})/)) {
                    incIdx = c;
                    break;
                }
            }
            if (incIdx !== -1) break;
        }
    }

    if (incIdx === -1) incIdx = 1; // absolute fallback

    let statusAlarmIdx = headers.findIndex(h => h === "STATUS ALARM" || h === "ONU LINK STATUS");
    let workzoneIdx = headers.findIndex(h => h === "WORKZONE" || h === "WORK ZONE" || h === "STO" || (h.includes("STO") && !h.includes("CUSTOMER")));
    let witelIdx = headers.indexOf("WITEL");
    let technicianIdx = headers.findIndex(h => h === "TECHNICIAN" || h === "NAMA TEKNISI" || h.includes("TEKNISI") || h.includes("ASSIGNEE"));
    let actionIdx = headers.findIndex(h => h === "ACTION" || h === "ACTION HISTORY" || h.includes("ACTION"));
    let evLogicIdx = headers.findIndex(h => h === "EVIDENCE LOGIC" || h === "EVIDENCE_LOGIC" || h === "EV LOGIC" || (h.includes("EVIDENCE") && h.includes("LOGIC")));
    let evFisikIdx = headers.findIndex(h => h === "EVIDENCE FISIK" || h === "EVIDENCE_FISIK" || h === "EV FISIK" || (h.includes("EVIDENCE") && h.includes("FISIK")));
    let customerNameIdx = headers.findIndex(h => h === "CUSTOMER NAME" || h === "NAMA PELANGGAN" || h === "CUSTOMER");
    if (customerNameIdx === -1) customerNameIdx = headers.findIndex(h => h === "CONTACT NAME" || h.includes("CUSTOMER NAM"));
    let statusDateIdx = headers.findIndex(h => h === "STATUS DATE" || h === "REPORTED DATE");
    let onuRxIdx = headers.findIndex(h => h === "ONU RX" || h === "RX POWER" || (h.includes("RX") && !h.includes("DESCRIPTION")));
    // Prioritaskan kolom AH "SERVICE NO" secara presisi (hindari mengambil "SERVICE ID" di kolom AG)
    let serviceNoIdx = headers.findIndex(h => {
        let clean = (h || "").toUpperCase().replace(/[^A-Z0-9]/g, '');
        return clean === "SERVICENO" || clean === "NOINET" || clean === "NOINTERNET" || clean === "NOLAYANAN";
    });
    // Fallback jika tidak ditemukan nama kolom persis SERVICENO
    if (serviceNoIdx === -1) {
        serviceNoIdx = headers.findIndex(h => {
            let clean = (h || "").toUpperCase().replace(/[^A-Z0-9]/g, '');
            return (clean === "SERVICENUMBER" || clean === "ND" || clean === "NOSPEEDY" || clean === "NDSPEEDY" || clean === "NDTELEPON" ||
                   (clean.includes("SERVICE") && (clean.includes("NO") || clean.includes("NUM")))) && !clean.includes("ID");
        });
    }
    // Fallback terakhir jika hanya ada SERVICEID
    if (serviceNoIdx === -1) {
        serviceNoIdx = headers.findIndex(h => {
            let clean = (h || "").toUpperCase().replace(/[^A-Z0-9]/g, '');
            return clean === "SERVICEID" || clean === "CIRCUITID";
        });
    }
    let serviceTypeIdx = headers.findIndex(h => h === "SERVICE TYPE" || h === "KODE PRODUK" || (h.includes("SERVICE") && !h.includes("NO") && !h.includes("NUMBER") && !h.includes("ID")));
    let ticketStatusIdx = headers.findIndex(h => h === "STATUS" || h === "TICKET STATUS" || (h.includes("STATUS") && !h.includes("ALARM") && !h.includes("GUARANTE") && !h.includes("DATE") && !h.includes("LINK") && !h.includes("INFO")));

    let photoColumns = {};
    headers.forEach((h, idx) => {
        if (h.startsWith("FOTO ") || h.startsWith("FOTO_") || (h.includes("FOTO") && !h.includes("KODE"))) {
            photoColumns[h] = idx;
        }
    });

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
        let row = rows[i];
        let ticketId = row[incIdx] ? row[incIdx].toString().trim() : "-";
        if (ticketId === "-" || ticketId === "" || ticketId.toUpperCase() === "INCIDENT") continue;

        let rx = "", tx = "", status = "-", sto = "-", witel = "-", sNum = "-", customerName = "-", statusDate = "-", serviceType = "-", ticketStatus = "-";
        if (statusDateIdx !== -1 && row[statusDateIdx]) {
            let val = row[statusDateIdx].toString().trim();
            if (val) {
                try {
                    let d = new Date(val);
                    if (!isNaN(d.getTime())) {
                        let y = d.getFullYear();
                        let m = String(d.getMonth() + 1).padStart(2, '0');
                        let dt = String(d.getDate()).padStart(2, '0');
                        let hh = String(d.getHours()).padStart(2, '0');
                        let mm = String(d.getMinutes()).padStart(2, '0');
                        statusDate = `${y}-${m}-${dt} ${hh}:${mm}`;
                    } else {
                        statusDate = val;
                    }
                } catch(e) {
                    statusDate = val;
                }
            }
        }

        if (customerNameIdx !== -1 && row[customerNameIdx]) {
            let val = row[customerNameIdx].toString().trim();
            if (val) customerName = val;
        }

        if (witelIdx !== -1 && row[witelIdx]) {
            let val = row[witelIdx].toString().trim();
            if (val) witel = val;
        }

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

        // 2. Ekstrak STO (Paling akurat dari ODC-XXX / ODP-XXX atau WORKZONE)
        if (workzoneIdx !== -1 && row[workzoneIdx]) {
            let wz = row[workzoneIdx].toString().toUpperCase().trim();
            if (wz.length === 3 && !["INC", "REG", "LOS", "ONU", "OLT", "FBB", "DBS", "RBS"].includes(wz) && !wz.includes("BISNIS")) {
                sto = wz;
            }
        }
        
        for (let c = 0; c < row.length; c++) {
            let val = (row[c] || "").toString().trim();
            let rkMatch = val.match(/OD[CP]-([A-Z]{3})-/i);
            if (rkMatch) {
                sto = rkMatch[1].toUpperCase();
                break;
            }
        }
        
        // Safeguard STO tidak boleh berisi kategori pelanggan
        if (sto && (sto.includes("Bisnis") || sto.includes("Residensial") || sto.includes("CUSTOMER") || sto.length > 5)) {
            sto = "-";
        }

        // Fallback terakhir: cari 3 huruf kapital jika STO masih '-'
        if (sto === "-") {
            for (let c = 0; c < row.length; c++) {
                let val = (row[c] || "").toString().trim();
                if (/^[A-Z]{3}$/.test(val) && !["INC", "YES", "REG", "LOS", "ONU", "OLT", "FBB", "TTR", "TIF", "ASR", "RBS", "DGS", "WIB"].includes(val)) {
                    sto = val;
                    break;
                }
            }
        }

        // 3. Ekstrak INET Number / Service No (nomor murni dari kolom AH SERVICE NO)
        if (serviceNoIdx !== -1 && row[serviceNoIdx]) {
            let val = row[serviceNoIdx].toString().trim();
            if (val && val !== "-" && val !== "Unknown") {
                sNum = val;
            }
        }
        // Jika sNum masih berupa gabungan/composite (misal 68927522_131626183833_INTERNET), ekstrak nomor layanan murninya
        if (sNum && sNum.includes("_")) {
            let parts = sNum.split("_");
            let inetPart = parts.find(p => /^\d{9,13}$/.test(p));
            if (inetPart) sNum = inetPart;
        }
        if (sNum === "-" || sNum === "Unknown") {
            for (let c = 0; c < row.length; c++) {
                if (c === incIdx) continue;
                let val = (row[c] || "").toString().trim();
                let match = val.match(/\b(1\d{11,12}|2\d{9,11}|0\d{9,11}|3\d{8,11}-\d+)\b/);
                if (match) {
                    sNum = match[0];
                    break; // jika nemu langsung break
                }
            }
        }

        // 4. Ekstrak RX
        if (onuRxIdx !== -1 && row[onuRxIdx]) {
            let val = row[onuRxIdx].toString().trim();
            if (val.toUpperCase().includes("LOS") || val.includes("-503") || val.includes("-504")) {
                rx = "LOS";
            } else {
                let nums = val.match(/-?\d+(\.\d+)?/g);
                if (nums) {
                    for (let n of nums) {
                        let num = parseFloat(n);
                        if (num <= -8 && num >= -45) {
                            rx = num.toString() + " dBm";
                        }
                    }
                }
            }
        }

        // Ekstrak RX dan TX fallback (Scan dari belakang)
        for (let c = row.length - 1; c >= 0; c--) {
            let val = (row[c] || "").toString().trim();
            let numMatch = val.match(/^-?\d+([.,]\d+)?(\s?dBm)?$/i);
            if (numMatch) {
                let num = parseFloat(val.replace(',', '.').replace(/dBm/i, '').trim());
                if (!isNaN(num)) {
                    if (num < -5 && num > -45 && rx === "") rx = val;
                    if (num >= 0.5 && num <= 8.0 && tx === "") tx = val;
                }
            }
        }

        if (serviceTypeIdx !== -1 && row[serviceTypeIdx]) {
            let val = row[serviceTypeIdx].toString().trim();
            if (val) serviceType = val;
        }

        // Normalisasi: jika serviceType berisi nomor layanan/internet 10-14 digit
        if (serviceType && serviceType.match(/^\d{10,14}$/)) {
            if (sNum === "-" || sNum === "Unknown") sNum = serviceType;
            serviceType = "INTERNET";
        }
        if (sNum !== "-" && sNum !== "Unknown" && (serviceType === "-" || !serviceType)) {
            serviceType = "INTERNET";
        }

        if (ticketStatusIdx !== -1 && row[ticketStatusIdx]) {
            let val = row[ticketStatusIdx].toString().trim();
            if (val && !val.toUpperCase().includes("GUARANTE")) ticketStatus = val;
        }

        let isGangguan = true; // SEMUA tiket masuk GENCU, apapun redamannya
        let rxNum = parseFloat(rx.replace(',', '.'));

        let technician = "-";
        if (technicianIdx !== -1 && row[technicianIdx]) {
            let tVal = row[technicianIdx].toString().trim();
            // Ekstrak angka saja sebagai NIK Teknisi (kata kunci NIK adalah angka)
            let nikMatch = tVal.match(/\d+/);
            if (nikMatch && !tVal.toLowerCase().includes("please assign")) {
                technician = nikMatch[0];
            }
        }
        
        let rowText = row.join(" ").toUpperCase();
        
        // Ambil ACTION history terlebih dahulu untuk state machine
        let actionHistory = "";
        if (actionIdx !== -1 && row[actionIdx]) {
            actionHistory = row[actionIdx].toString().trim();
        }
        let evLogic = "";
        if (evLogicIdx !== -1 && row[evLogicIdx]) {
            evLogic = row[evLogicIdx].toString().trim();
        }
        let evFisik = "";
        if (evFisikIdx !== -1 && row[evFisikIdx]) {
            evFisik = row[evFisikIdx].toString().trim();
        }
        
        let activeEvidenceForParsing = [actionHistory, evLogic, evFisik].filter(Boolean).join("\n\n=== SEBELUMNYA ===\n");

        // Coba ekstrak teknisi dari ACTION history jika sudah di-assign manual lewat Web
        let assignMatch = rowText.match(/\[ASSIGNED\] TEKNISI:\s*([A-Z0-9_]+)/i);
        if (assignMatch && assignMatch[1]) {
            technician = assignMatch[1];
        }

        if (isGangguan) {
            let category = 'GCU FISIK';

            // JIKA tidak ada nik teknisi, auto ngalir ke GCU LOGIC
            if (technician === "-") {
                category = 'GCU LOGIC';
            }

            // Dapatkan block aksi TERAKHIR untuk penentuan state yang akurat
            let latestAction = "";
            if (activeEvidenceForParsing) {
                // Semua input (dari Web maupun Telegram) sekarang menaruh aksi terbaru di PALING ATAS (prepend)
                // Pisahkan berdasarkan divider === SEBELUMNYA === atau double newline fallback
                let blocks = activeEvidenceForParsing.split(/=== SEBELUMNYA ===/);
                
                // Cari block pertama yang BUKAN sekadar action "PICKED UP BY" agar state tidak berubah/mundur
                for (let i = 0; i < blocks.length; i++) {
                    let blk = blocks[i].toUpperCase();
                    // Jika block ini punya state riil (bukan cuma pickup), gunakan ini
                    if (blk.includes("EVIDENCE") || blk.includes("[COMPLETED]") || blk.includes("[PENDING]") || 
                        blk.includes("GCU LOGIC") || blk.includes("GCU FISIK") || blk.includes("APPROVAL KORLAP") || 
                        blk.includes("WAITING") || blk.includes("DIKEMBALIKAN")) {
                        latestAction = blk;
                        break;
                    }
                }
                
                // Fallback jika tidak ketemu state spesifik
                if (!latestAction) {
                    latestAction = blocks[0].toUpperCase();
                }
            }

            // Evaluasi berdasarkan aksi TERAKHIR (mencegah history lama menimpa history baru)
            if (latestAction.includes("[COMPLETED]") || rowText.includes("[COMPLETED]")) {
                category = 'COMPLETED';
            } else if (latestAction.includes("[PENDING]")) {
                category = 'PENDING';
            } else if (latestAction.includes("MENUNGGU APPROVAL KORLAP") || latestAction.includes("[WAITING APPROVAL KORLAP]")) {
                category = 'APPROVAL KORLAP';
            } else if (latestAction.includes("DIKEMBALIKAN KE GCU LOGIC") || latestAction.includes("EVIDENCE FISIK SUBMITTED") || latestAction.includes("SOLVED VIA GCU LOGIC")) {
                category = 'GCU LOGIC';
            } else if (latestAction.includes("DIKEMBALIKAN KE GCU FISIK") || latestAction.includes("[BUTUH FISIK") || latestAction.includes("[ASSIGNED]")) {
                category = 'GCU FISIK';
            } else if (technician !== "-") {
                // Sesuai permintaan user: Jika ada NIK TEKNISI dan belum ada aksi lanjutan, tetapkan di GCU FISIK
                category = 'GCU FISIK';
            }

            // Ekstrak Helpdesk Assignee dari Action History
            let helpdeskAssignee = "-";
            let pickupMatch = actionHistory.match(/\[PICKED UP BY\]\s*([^\n\r]+)/i);
            if (pickupMatch && pickupMatch[1]) {
                helpdeskAssignee = pickupMatch[1].split('===')[0].trim();
            }

            let photos = {};
            for (let pKey in photoColumns) {
                let pVal = row[photoColumns[pKey]];
                if (pVal && pVal.toString().trim().startsWith("http")) {
                    photos[pKey] = pVal.toString().trim();
                }
            }

            parsedTickets.push({
                incident: ticketId,
                serviceNumber: sNum !== "-" ? sNum : "Unknown",
                sto: sto,
                witel: witel,
                technician: technician,
                rx: rx || "-",
                tx: tx || "-",
                serviceType: serviceType || "-",
                ticketStatus: ticketStatus || "-",
                status: status || "-",
                category: category,
                customerName: customerName,
                actionHistory: actionHistory,
                evLogic: evLogic,
                evFisik: evFisik,
                helpdeskAssignee: helpdeskAssignee,
                photos: photos,
                statusDate: statusDate
            });
        }
    }

    parsedTickets.reverse(); // Balik array agar tiket terbaru (dari baris paling bawah di Sheet) muncul paling atas
    state.tickets = parsedTickets;
    updateDashboardSummary();
}

function updateDashboardSummary() {
    totalDataCount.innerText = state.tickets.length;
    countGcuFisik.innerText = state.tickets.filter(t => t.category === 'GCU FISIK').length;
    countGcuLogic.innerText = state.tickets.filter(t => t.category === 'GCU LOGIC').length;
    countApprovalKorlap.innerText = state.tickets.filter(t => t.category === 'APPROVAL KORLAP').length;
    if (countPending) countPending.innerText = state.tickets.filter(t => t.category === 'PENDING').length;
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
    else if (filterStatus === 'PENDING') document.getElementById('menuPending').classList.add('active');
    else if (filterStatus === 'COMPLETED') document.getElementById('menuCompleted').classList.add('active');

    // Reset status filter
    state.statusFilter = 'ALL';
    const sfEl = document.getElementById('statusFilter');
    if (sfEl) sfEl.value = 'ALL';

    state.filteredTickets = state.tickets.filter(t => t.category === filterStatus);
    
    // Update WITEL filter options
    const witelEl = document.getElementById('witelFilter');
    if (witelEl) {
        let uniqueWITELs = [...new Set(state.filteredTickets.map(t => t.witel).filter(w => w && w !== "-"))];
        uniqueWITELs.sort();
        witelEl.innerHTML = '<option value="ALL">Semua Witel</option>';
        uniqueWITELs.forEach(w => {
            let opt = document.createElement('option');
            opt.value = w;
            opt.innerText = w;
            witelEl.appendChild(opt);
        });
        state.witelFilter = 'ALL';
        witelEl.value = 'ALL';
    }

    // Update STO filter options
    const stoEl = document.getElementById('stoFilter');
    if (stoEl) {
        let uniqueSTOs = [...new Set(state.filteredTickets.map(t => t.sto).filter(s => s && s !== "-"))];
        uniqueSTOs.sort();
        stoEl.innerHTML = '<option value="ALL">Semua STO</option>';
        uniqueSTOs.forEach(sto => {
            let opt = document.createElement('option');
            opt.value = sto;
            opt.innerText = sto;
            stoEl.appendChild(opt);
        });
        state.stoFilter = 'ALL';
        stoEl.value = 'ALL';
    }

    renderTable();
};

window.showWorkflow = function (role) {
    state.role = role;

    // UI Toggle
    viewDashboard.style.display = 'none';
    viewWorkflow.style.display = 'block';

    // Sidebar Active state
    document.querySelectorAll('.nav-links .nav-item').forEach(el => el.classList.remove('active'));
    let korlapEl = document.getElementById('menuKorlap');
    if (role === 'korlap' && korlapEl) korlapEl.classList.add('active');
    let tekEl = document.getElementById('menuTeknisi');
    if (role === 'teknisi' && tekEl) tekEl.classList.add('active');
    let helpdeskEl = document.getElementById('menuHelpdesk');
    if (role === 'helpdesk' && helpdeskEl) helpdeskEl.classList.add('active');

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
            // Selalu arahkan ke Korlap terlebih dahulu agar Korlap bisa melihat status assignment
            targetRole = 'korlap';
        } else if (ticket.category === 'APPROVAL KORLAP' || ticket.category === 'PENDING') {
            targetRole = 'korlap';
        }
    }
    
    showWorkflow(targetRole);
};

window.applyStatusFilter = function () {
    const filterVal = document.getElementById('statusFilter').value;
    const searchVal = document.getElementById('searchTicketInput') ? document.getElementById('searchTicketInput').value.trim().toUpperCase() : "";
    const witelVal = document.getElementById('witelFilter') ? document.getElementById('witelFilter').value : "ALL";
    const stoVal = document.getElementById('stoFilter') ? document.getElementById('stoFilter').value : "ALL";
    
    state.statusFilter = filterVal;
    state.searchFilter = searchVal;
    state.witelFilter = witelVal;
    state.stoFilter = stoVal;
    
    // Opsional: Perbarui opsi STO berdasarkan Witel yang dipilih (untuk UX yang lebih baik)
    const stoEl = document.getElementById('stoFilter');
    if (stoEl && state.witelFilter !== 'ALL') {
        let validSTOs = [...new Set(state.filteredTickets.filter(t => t.witel === state.witelFilter).map(t => t.sto).filter(s => s && s !== "-"))];
        validSTOs.sort();
        // Hanya update opsinya, jaga value saat ini jika masih valid
        let currentSto = stoEl.value;
        stoEl.innerHTML = '<option value="ALL">Semua STO</option>';
        validSTOs.forEach(sto => {
            let opt = document.createElement('option');
            opt.value = sto;
            opt.innerText = sto;
            stoEl.appendChild(opt);
        });
        if (validSTOs.includes(currentSto)) stoEl.value = currentSto;
        else { stoEl.value = 'ALL'; state.stoFilter = 'ALL'; }
    } else if (stoEl && state.witelFilter === 'ALL') {
        let allSTOs = [...new Set(state.filteredTickets.map(t => t.sto).filter(s => s && s !== "-"))];
        allSTOs.sort();
        let currentSto = stoEl.value;
        stoEl.innerHTML = '<option value="ALL">Semua STO</option>';
        allSTOs.forEach(sto => {
            let opt = document.createElement('option');
            opt.value = sto;
            opt.innerText = sto;
            stoEl.appendChild(opt);
        });
        if (allSTOs.includes(currentSto)) stoEl.value = currentSto;
        else { stoEl.value = 'ALL'; state.stoFilter = 'ALL'; }
    }
    
    renderTable();
};

function renderTable() {
    emptyState.style.display = 'none';
    ticketTable.style.display = 'table';
    ticketTableBody.innerHTML = '';

    let displayTickets = state.filteredTickets;
    
    // 1. Terapkan Filter Pencarian (Text)
    if (state.searchFilter) {
        displayTickets = displayTickets.filter(ticket => {
            let inc = (ticket.incident || "").toUpperCase();
            let sn = (ticket.serviceNumber || "").toUpperCase();
            return inc.includes(state.searchFilter) || sn.includes(state.searchFilter);
        });
    }

    // 2. Terapkan Filter Witel
    if (state.witelFilter && state.witelFilter !== 'ALL') {
        displayTickets = displayTickets.filter(ticket => ticket.witel === state.witelFilter);
    }

    // 3. Terapkan Filter STO
    if (state.stoFilter && state.stoFilter !== 'ALL') {
        displayTickets = displayTickets.filter(ticket => ticket.sto === state.stoFilter);
    }

    // 4. Terapkan Filter Status
    if (state.statusFilter && state.statusFilter !== 'ALL') {
        displayTickets = displayTickets.filter(ticket => {
            let badgeText = '';
            if (ticket.status === 'LOS' || ticket.status.includes('DYING')) badgeText = ticket.status;
            else if (parseFloat(ticket.rx) < -27) badgeText = 'REDAMAN TINGGI';
            else badgeText = ticket.status || 'OK';

            if (state.statusFilter === 'REDAMAN TINGGI') return badgeText === 'REDAMAN TINGGI';
            if (state.statusFilter === 'LOS') return badgeText === 'LOS';
            return badgeText === state.statusFilter;
        });
    }

    const badgeEl = document.getElementById('filteredCountBadge');
    if (badgeEl) {
        if ((state.statusFilter && state.statusFilter !== 'ALL') || state.searchFilter) {
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
        if (ticket.status === 'LOS' || ticket.status.includes('DYING')) statusBadge = `<span class="status-dot" style="background: #ef4444; box-shadow: 0 0 10px #ef4444;"></span>`;
        else if (parseFloat(ticket.rx) < -27) statusBadge = `<span class="status-dot" style="background: #f59e0b; box-shadow: 0 0 10px #f59e0b;"></span>`;
        else statusBadge = `<span class="status-dot"></span>`;

        let actionText = "Checklist / Assign";
        let onClickAction = `selectTicket('${ticket.incident}', '${ticket.sto}')`;
        let btnStyle = "";
        let btnDisabled = "";

        if (ticket.category === 'GCU LOGIC') {
            if (ticket.helpdeskAssignee !== "-") {
                let isMyTicket = (ticket.helpdeskAssignee === state.userName) || (state.userNik && ticket.helpdeskAssignee.includes(state.userNik));
                if (isMyTicket) {
                    actionText = "Proses Logic";
                } else {
                    actionText = "Picked: " + ticket.helpdeskAssignee;
                    btnStyle = "background: #cbd5e1; cursor: not-allowed; color: #475569;";
                    btnDisabled = "disabled";
                    onClickAction = "";
                }
            } else {
                if (state.userRole === 'helpdesk') {
                    actionText = "Pick Up";
                    btnStyle = "background: #10b981; color: white;"; // Green for pick up
                    onClickAction = `pickUpTicket('${ticket.incident}')`;
                } else {
                    actionText = "Belum Pick Up";
                    btnStyle = "background: #cbd5e1; cursor: not-allowed; color: #475569;";
                    btnDisabled = "disabled";
                    onClickAction = "";
                }
            }
        } else if (ticket.category === 'APPROVAL KORLAP') {
            actionText = "Validasi Korlap";
        } else if (ticket.category === 'PENDING') {
            actionText = "Lihat / Proses Pending";
        } else if (ticket.category === 'COMPLETED') {
            actionText = "Lihat Detail";
        }

        let tr = document.createElement('tr');
        if (ticket.category === 'PENDING') {
            tr.classList.add('row-pending');
        } else if (ticket.category === 'COMPLETED') {
            tr.classList.add('row-completed');
        } else if (ticket.category === 'GCU LOGIC') {
            tr.classList.add('row-gcu-logic');
        } else if (ticket.category === 'APPROVAL KORLAP') {
            tr.classList.add('row-approval');
        }
        tr.innerHTML = `
            <td style="white-space: nowrap; font-size: 13px; color: var(--text-secondary);">${ticket.statusDate || "-"}</td>
            <td>
                <span class="copy-badge" onclick="copyToClipboard('${ticket.incident}', 'Nomor Tiket', event)" title="Klik untuk copy nomor tiket">
                    <strong>${ticket.incident}</strong>
                    <ion-icon name="copy-outline"></ion-icon>
                </span>
            </td>
            <td>
                <div class="ticket-info">
                    <span class="ticket-title ${ticket.serviceNumber && ticket.serviceNumber !== 'Unknown' ? 'copy-badge' : ''}" 
                          ${ticket.serviceNumber && ticket.serviceNumber !== 'Unknown' ? `onclick="copyToClipboard('${ticket.serviceNumber}', 'Nomor Layanan', event)" title="Klik untuk copy nomor layanan"` : ''}>
                        ${ticket.serviceNumber || "Unknown"}
                        ${ticket.serviceNumber && ticket.serviceNumber !== 'Unknown' ? '<ion-icon name="copy-outline"></ion-icon>' : ''}
                    </span>
                    <span class="ticket-sub">${ticket.customerName || "-"}</span>
                </div>
            </td>
            <td>
                <span style="background: #e2e8f0; color: #475569; padding: 4px 8px; border-radius: 4px; font-size: 11px; white-space: nowrap; font-weight: 600;">${ticket.serviceType !== "-" ? ticket.serviceType : "N/A"}</span>
            </td>
            <td>
                <span style="background: #e0e7ff; color: #4338ca; padding: 4px 8px; border-radius: 4px; font-size: 11px; white-space: nowrap; font-weight: 600;">${ticket.ticketStatus !== "-" ? ticket.ticketStatus : "N/A"}</span>
            </td>
            <td>${ticket.sto}</td>
            <td style="font-size: 13px;">${ticket.witel !== "-" ? ticket.witel : "-"}</td>
            <td style="color: var(--text-secondary);">${ticket.technician !== "-" ? ticket.technician : "-"}</td>
            <td>${ticket.rx || "-"}</td>
            <td style="text-align: center;">${statusBadge}</td>
            <td>
                <button class="btn-action" style="${btnStyle}" ${btnDisabled} onclick="${onClickAction}">${actionText}</button>
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
        if (newCategory === 'COMPLETED') {
            ticket.ticketStatus = 'CLOSED';
        } else if (newCategory === 'PENDING') {
            ticket.ticketStatus = 'PENDING';
        }
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

// --- COMPREHENSIVE EVIDENCE PARSER & FORMATTER ---
window.getParsedEvidence = function(ticket) {
    if (!ticket) return { evidenceFisik: '', evidenceLogic: '', hasFisik: false, hasLogic: false };
    
    let allSources = [];
    if (ticket.evLogic) allSources.push(ticket.evLogic);
    if (ticket.evFisik) allSources.push(ticket.evFisik);
    if (ticket.actionHistory) allSources.push(ticket.actionHistory);
    let actionText = allSources.join("\n\n=== SEBELUMNYA ===\n");
    if (!actionText) actionText = '';
    
    // Pisahkan history block berdasarkan separator baru atau lama
    let blocks = actionText.split(/\n*=== SEBELUMNYA ===\n*/);
    if (blocks.length === 1 && !actionText.includes("===")) {
        blocks = actionText.split(/\n\n(?=\[)/); // Fallback format lama
    }
    
    // Deduplikasi block yang sama
    let seenBlocks = new Set();
    blocks = blocks.filter(b => {
        let trimmed = b.trim();
        if (!trimmed || seenBlocks.has(trimmed)) return false;
        seenBlocks.add(trimmed);
        return true;
    });

    function renderFisikFormGroups(props) {
        let propKeys = Object.keys(props);
        if (propKeys.length === 0) return '';
        
        let html = '<div style="margin-bottom: 12px;">';
        
        let groups = [
            {
                title: "🛠️ Laporan Kerusakan",
                pattern: /^(Penyebab|Perbaikan|Segmen|Material|Kerusakan)/i
            },
            {
                title: "🔍 Validasi GCU",
                pattern: /^(GCU|Voice|IPTV|Perangkat|Layanan)/i
            },
            {
                title: "🚀 Pengetesan Akhir",
                pattern: /^(SCC|TSC|Redaman|Keterangan|Note|Catatan)/i
            }
        ];
        
        let handledKeys = new Set();
        
        groups.forEach(g => {
            let matchingKeys = propKeys.filter(k => !handledKeys.has(k) && g.pattern.test(k));
            if (matchingKeys.length > 0) {
                let itemsHtml = '';
                matchingKeys.forEach(k => {
                    handledKeys.add(k);
                    itemsHtml += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 9px 14px; border-bottom: 1px solid var(--border); font-size: 13px;">
                            <span style="color: var(--text-secondary); font-weight: 500;">${k}</span>
                            <span style="color: var(--text-primary); font-weight: 600; text-align: right; max-width: 65%;">${props[k]}</span>
                        </div>
                    `;
                });
                html += `
                    <div style="background: white; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 10px;">
                        <div style="background: #f8fafc; padding: 9px 14px; font-size: 12px; font-weight: bold; color: var(--text-secondary); border-bottom: 1px solid var(--border);">${g.title}</div>
                        ${itemsHtml}
                    </div>
                `;
            }
        });
        
        let unmappedKeys = propKeys.filter(k => !handledKeys.has(k));
        if (unmappedKeys.length > 0) {
            let itemsHtml = '';
            unmappedKeys.forEach(k => {
                itemsHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 9px 14px; border-bottom: 1px solid var(--border); font-size: 13px;">
                        <span style="color: var(--text-secondary); font-weight: 500;">${k}</span>
                        <span style="color: var(--text-primary); font-weight: 600; text-align: right; max-width: 65%;">${props[k]}</span>
                    </div>
                `;
            });
            html += `
                <div style="background: white; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 10px;">
                    <div style="background: #f8fafc; padding: 9px 14px; font-size: 12px; font-weight: bold; color: var(--text-secondary); border-bottom: 1px solid var(--border);">📝 Data Lainnya</div>
                    ${itemsHtml}
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    function formatEvidenceBlock(text) {
        if (!text) return '';
        let lines = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        let html = '';
        let fisikProps = {};
        let isParsingFisik = false;

        lines.forEach(line => {
            let trimmed = line.trim();
            if (!trimmed) return;
            
            let bulletMatch = trimmed.match(/^[-•*]\s*(.+)$/);
            let contentLine = bulletMatch ? bulletMatch[1].trim() : trimmed;
            
            let isFisikField = false;
            let key = "";
            let val = "";
            
            if (contentLine.includes(':')) {
                let colonIdx = contentLine.indexOf(':');
                let candidateKey = contentLine.substring(0, colonIdx).trim();
                let candidateVal = contentLine.substring(colonIdx + 1).trim();
                let isFormKey = /^(Penyebab|Perbaikan|Segmen|Material|GCU\s+Jalur|GCU\s+ONT|GCU\s+DC.*|SCC\/TSC|Redaman\s+ODP|Note\s+Kendala|Catatan|VOICE.*|IPTV.*|PERANGKAT.*|Layanan.*|Keterangan)/i.test(candidateKey);
                
                if (bulletMatch || isFormKey) {
                    isFisikField = true;
                    key = candidateKey;
                    val = candidateVal;
                }
            } else if (/^GCU\s+DC(\s*\(\d+\))?/i.test(contentLine)) {
                isFisikField = true;
                key = contentLine;
                val = "Selesai";
            }
            
            if (isFisikField) {
                isParsingFisik = true;
                let valUpper = val.toUpperCase();
                if (valUpper === 'AMAN' || valUpper === 'SUKSES' || valUpper === 'OK' || valUpper === 'NORMAL' || valUpper === 'SELESAI') {
                    val = `<span style="color: var(--success); font-weight: 600;">${val} ✅</span>`;
                } else if (valUpper === 'TIDAK AMAN' || valUpper === 'GAGAL' || valUpper === 'TIDAK NORMAL' || valUpper === 'RUSAK') {
                    val = `<span style="color: var(--danger); font-weight: 600;">${val} ❌</span>`;
                }
                fisikProps[key] = val || '<span style="color: var(--success); font-weight: 600;">OK ✅</span>';
            } else {
                if (isParsingFisik) {
                    isParsingFisik = false;
                    html += renderFisikFormGroups(fisikProps);
                    fisikProps = {};
                }
                
                if (trimmed.includes('Eksekusi Logic:')) {
                    let parts = trimmed.split('Eksekusi Logic:');
                    let prefix = parts[0].trim();
                    let logicStr = parts[1].trim();
                    
                    if (prefix) {
                        html += `<div style="font-weight: 600; color: var(--text-primary); margin-bottom: 10px;">${prefix}</div>`;
                    }
                    
                    let logicPhoto = null;
                    if (logicStr.includes('| Foto:')) {
                        let photoParts = logicStr.split('| Foto:');
                        logicStr = photoParts[0].trim();
                        logicPhoto = photoParts[1].trim();
                    }
                    
                    let logicNotes = null;
                    if (logicStr.includes('| Catatan:')) {
                        let logicParts = logicStr.split('| Catatan:');
                        logicStr = logicParts[0].trim();
                        logicNotes = logicParts[1].trim();
                    }
                    
                    if (logicNotes || logicPhoto) {
                        html += `<div style="margin-bottom: 10px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 13px; color: #b45309;">`;
                        if (logicNotes) {
                            html += `<div style="margin-bottom: ${logicPhoto ? '8px' : '0'};"><strong>📝 Catatan Logic:</strong> ${logicNotes}</div>`;
                        }
                        if (logicPhoto) {
                            let photoLink = logicPhoto.replace(/(https:\/\/[^\s\\]]+)/g, '<a href="$1" target="_blank" style="color: #0284c7; font-weight: bold; text-decoration: underline; word-break: break-all;">📎 Buka Evidence Foto Logic</a>');
                            html += `<div><strong>📸 Evidence:</strong> ${photoLink}</div>`;
                        }
                        html += `</div>`;
                    }

                    let logicItems = logicStr.split(',').map(item => item.trim()).filter(i => i);
                    let allLogicTasks = {
                        "🌐 Layanan Internet": [
                            { id: "Pindah Channel", label: "Cek Interferensi / Pindah Channel" },
                            { id: "Checklist NAT", label: "Checklist NAT" },
                            { id: "Enable IPV6", label: "Enable IPV6" },
                            { id: "Firewall Medium", label: "Set Firewall Medium" },
                            { id: "Cek ONT", label: "Cek CPU/RAM & Versi ONT" },
                            { id: "Cek FPP", label: "Cek FPP (Ping, Traceroute)" }
                        ],
                        "📺 Layanan IPTV": [
                            { id: "Cek ACS", label: "Cek ACS Connection" },
                            { id: "Cek Channel", label: "Cek Last Info & Channel" },
                            { id: "Cek Isolir", label: "Cek Status Isolir" },
                            { id: "Cek STB", label: "Cek Adv STB Information" }
                        ],
                        "📊 Summary ACS": [
                            { id: "Layanan ACS Voice", aliases: ["Cek Voice", "Executive Summary ACS"], label: "Layanan ACS Voice" }
                        ]
                    };

                    if (logicItems.length > 0) {
                        html += `<div style="margin-bottom: 15px;">`;
                        for (let category in allLogicTasks) {
                            html += `<div style="background: white; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 10px;">`;
                            html += `<div style="background: #f8fafc; padding: 10px 15px; font-size: 12px; font-weight: bold; color: var(--text-secondary); border-bottom: 1px solid var(--border);">${category}</div>`;
                            
                            allLogicTasks[category].forEach(task => {
                                let isExecuted = logicItems.includes(task.id) || (task.aliases && task.aliases.some(a => logicItems.includes(a)));
                                let statusText = isExecuted ? `<span style="color: var(--success); font-weight: 600;">Executed ✅</span>` : `<span style="color: var(--text-secondary); font-weight: 500;">Dilewati ➖</span>`;
                                
                                html += `
                                    <div style="display: flex; flex-wrap: wrap; gap: 5px; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid var(--border); font-size: 13px;">
                                        <span style="color: ${isExecuted ? 'var(--text-primary)' : 'var(--text-secondary)'}; font-weight: ${isExecuted ? '600' : '400'};">${task.label}</span>
                                        <span style="text-align: right; min-width: max-content;">${statusText}</span>
                                    </div>
                                `;
                            });
                            html += `</div>`;
                        }
                        html += `</div>`;
                    }
                } else if (trimmed.includes('EVIDENCE FISIK SUBMITTED:')) {
                    let parts = trimmed.split('EVIDENCE FISIK SUBMITTED:');
                    let prefix = parts[0].trim();
                    let rest = parts[1].trim();
                    let notes = "";
                    if (rest.includes('| Catatan:')) {
                        let rParts = rest.split('| Catatan:');
                        rest = rParts[0].trim();
                        notes = rParts[1].trim();
                    }
                    html += `
                        <div style="padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 10px;">
                            ${prefix ? `<div style="font-weight: 600; font-size: 11px; color: #166534; margin-bottom: 4px;">${prefix}</div>` : ''}
                            <div style="font-weight: 700; color: #15803d; font-size: 13px; margin-bottom: 4px;">🛠️ Evidence Fisik Lapangan</div>
                            <div style="font-size: 13px; color: #166534;"><strong>Item Dikerjakan:</strong> ${rest || 'Selesai'}</div>
                            ${notes ? `<div style="font-size: 12px; color: #374151; margin-top: 5px;"><strong>📝 Catatan:</strong> ${notes}</div>` : ''}
                        </div>
                    `;
                } else {
                    let processedLine = trimmed.replace(/(https:\/\/[^\s\\]]+)/g, '<a href="$1" target="_blank" style="color: var(--primary); font-weight: bold; text-decoration: underline; word-break: break-all;">📎 Buka Evidence Foto</a>');
                    if (processedLine) {
                        if (processedLine.includes('EVIDENCE FISIK SUBMITTED') || processedLine.includes('DIKEMBALIKAN KE')) {
                            html += `<div style="font-weight: 600; color: var(--primary); margin-bottom: 5px; font-size: 14px;">${processedLine}</div>`;
                        } else {
                            html += `<div style="margin-bottom: 4px;">${processedLine}</div>`;
                        }
                    }
                }
            }
        });
        
        if (isParsingFisik) {
            html += renderFisikFormGroups(fisikProps);
        }
        return html;
    }

    let arrFisik = [];
    let arrLogic = [];
    
    blocks.forEach(block => {
        let b = block.trim();
        if (!b) return;
        let bUpper = b.toUpperCase();
        
        let isFisik = bUpper.match(/EVIDENCE FISIK|GCU FISIK|ASSIGNED|PENYEBAB\s*:|PERBAIKAN\s*:|SEGMEN\s*:|GCU JALUR|GCU ONT|GCU DC|SCC\/TSC|REDAMAN ODP/i);
        let isLogic = bUpper.match(/WAITING APPROVAL KORLAP|EKSEKUSI LOGIC|PINDAH CHANNEL|CHECKLIST NAT|ENABLE IPV6|FIREWALL MEDIUM|CEK ONT|CEK FPP|CEK ACS|CEK CHANNEL|CEK ISOLIR|CEK STB|CEK VOICE|LAYANAN ACS VOICE|SUMMARY ACS/i);
        
        if (!isLogic && !isFisik) {
            if (bUpper.includes("LOGIC") || bUpper.includes("HELPDESK")) isLogic = true;
            if (bUpper.includes("TEKNISI") || bUpper.includes("FISIK")) isFisik = true;
        }
        
        if (bUpper.includes("EVIDENCE FISIK SUBMITTED")) {
            isFisik = true;
            isLogic = false;
        }
        
        let htmlBlock = `<div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #e2e8f0;">${formatEvidenceBlock(b)}</div>`;
        
        if (isLogic && !isFisik) {
            arrLogic.push(htmlBlock);
        } else if (isFisik && !isLogic) {
            arrFisik.push(htmlBlock);
        } else {
            arrFisik.push(htmlBlock);
            arrLogic.push(htmlBlock);
        }
    });

    let evidenceFisikText = arrFisik.join('\n');
    let evidenceLogicText = arrLogic.join('\n');
    
    let driveRegex = /https:\/\/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/g;
    
    let fisikPhotosText = [];
    let matchFisik;
    while ((matchFisik = driveRegex.exec(evidenceFisikText)) !== null) {
        if (!fisikPhotosText.includes(matchFisik[0])) fisikPhotosText.push(matchFisik[0]);
    }
    
    let logicPhotosText = [];
    let matchLogic;
    while ((matchLogic = driveRegex.exec(evidenceLogicText)) !== null) {
        if (!logicPhotosText.includes(matchLogic[0])) logicPhotosText.push(matchLogic[0]);
    }

    let allFisikPhotos = [];
    if (ticket.photos && Object.keys(ticket.photos).length > 0) {
        for (let pName in ticket.photos) {
            let pUrl = ticket.photos[pName];
            if (pUrl && pUrl.startsWith('http')) {
                allFisikPhotos.push({ name: pName.replace('FOTO ', ''), url: pUrl });
            }
        }
    }
    fisikPhotosText.forEach((url, i) => {
        if (!allFisikPhotos.find(p => p.url === url)) {
            allFisikPhotos.push({ name: 'EVIDENCE ' + (i+1), url: url });
        }
    });

    function getThumbUrl(url) {
        let matchId = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (matchId && matchId[1]) return `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w1000`;
        return url;
    }

    let evidenceFisik = arrFisik.length > 0 ? evidenceFisikText : '<span style="color: var(--text-secondary); font-style: italic;">Belum ada data riwayat teks GCU Fisik</span>';
    let evidenceLogic = arrLogic.length > 0 ? evidenceLogicText : '<span style="color: var(--text-secondary); font-style: italic;">Belum ada data riwayat teks GCU Logic</span>';

    if (allFisikPhotos.length > 0) {
        let photoHtmlFisik = `<div style="margin-top: 15px; padding-top: 12px; border-top: 2px solid var(--border);">
            <h4 style="margin-bottom: 12px; color: var(--text-primary); font-size: 13px; font-weight: bold;">📸 Lampiran Foto (GCU FISIK - ${allFisikPhotos.length} Foto):</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;">`;
        
        allFisikPhotos.forEach(photo => {
            let imgSrc = getThumbUrl(photo.url);
            photoHtmlFisik += `
                <a href="${photo.url}" target="_blank" style="display: flex; flex-direction: column; align-items: center; background: #f8fafc; padding: 6px; border-radius: 8px; text-decoration: none; border: 1px solid #e2e8f0; transition: transform 0.2s ease;">
                    <img src="${imgSrc}" alt="${photo.name}" onerror="this.onerror=null; this.src='https://placehold.co/200x150?text=Foto+Evidence';" style="width: 100%; height: 95px; object-fit: cover; border-radius: 6px; margin-bottom: 6px; border: 1px solid #cbd5e1; background: #e2e8f0;">
                    <span style="font-size: 10px; font-weight: 600; color: #334155; text-align: center; word-break: break-all;">${photo.name}</span>
                </a>
            `;
        });
        photoHtmlFisik += `</div></div>`;
        evidenceFisik += photoHtmlFisik;
    }

    if (logicPhotosText.length > 0) {
        let photoHtmlLogic = `<div style="margin-top: 15px; padding-top: 12px; border-top: 2px solid var(--border);">
            <h4 style="margin-bottom: 12px; color: var(--text-primary); font-size: 13px; font-weight: bold;">📸 Lampiran Foto (GCU LOGIC - ${logicPhotosText.length} Foto):</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;">`;
        
        logicPhotosText.forEach((url, i) => {
            let imgSrc = getThumbUrl(url);
            photoHtmlLogic += `
                <a href="${url}" target="_blank" style="display: flex; flex-direction: column; align-items: center; background: #f8fafc; padding: 6px; border-radius: 8px; text-decoration: none; border: 1px solid #e2e8f0; transition: transform 0.2s ease;">
                    <img src="${imgSrc}" alt="Foto Logic" onerror="this.onerror=null; this.src='https://placehold.co/200x150?text=Foto+Logic';" style="width: 100%; height: 95px; object-fit: cover; border-radius: 6px; margin-bottom: 6px; border: 1px solid #cbd5e1; background: #e2e8f0;">
                    <span style="font-size: 10px; font-weight: 600; color: #334155; text-align: center;">FOTO LOGIC ${i+1}</span>
                </a>
            `;
        });
        photoHtmlLogic += `</div></div>`;
        evidenceLogic += photoHtmlLogic;
    }

    return {
        evidenceFisik,
        evidenceLogic,
        hasFisik: arrFisik.length > 0 || allFisikPhotos.length > 0,
        hasLogic: arrLogic.length > 0 || logicPhotosText.length > 0
    };
};

// 1. KORLAP FLOW
function renderKorlapFlow() {
    const ticket = state.tickets.find(t => t.incident === state.activeTicketId);
    if (!ticket) return;

    // Parse evidence menggunakan helper komprehensif
    const parsedEv = window.getParsedEvidence(ticket);
    window.tempEvidenceFisik = parsedEv.evidenceFisik;
    window.tempEvidenceLogic = parsedEv.evidenceLogic;

    if (ticket.category === 'COMPLETED') {
        let completedContent = `
            <div style="padding: 16px; background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; margin-bottom: 15px;">
                <p style="color: #10b981; font-weight: bold; margin:0;"><ion-icon name="checkmark-circle" style="vertical-align: middle; font-size: 20px; margin-right: 5px;"></ion-icon> Tiket ini sudah Selesai (COMPLETED / CLOSED).</p>
            </div>
        `;
        if (parsedEv.hasFisik || parsedEv.hasLogic) {
            completedContent += `
                <div style="background: var(--bg-surface); padding: 18px; border-radius: 10px; border: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 style="font-size: 14px; font-weight: bold; color: var(--text-primary); margin: 0;">📋 Detail Evidence Tiket Selesai</h4>
                        <div style="display: flex; gap: 8px;">
                            ${parsedEv.hasFisik ? `<button class="btn btn-outline" style="font-size: 11px; padding: 4px 8px; cursor: pointer;" onclick="window.showEvidenceModal('fisik')">🔍 Layar Penuh (Fisik)</button>` : ''}
                            ${parsedEv.hasLogic ? `<button class="btn btn-outline" style="font-size: 11px; padding: 4px 8px; cursor: pointer;" onclick="window.showEvidenceModal('logic')">🔍 Layar Penuh (Logic)</button>` : ''}
                        </div>
                    </div>
                    ${parsedEv.hasFisik ? `<div style="margin-bottom: 15px;"><strong style="font-size: 13px; color: var(--text-primary);">🛠️ Pekerjaan GCU Fisik:</strong><div style="margin-top: 6px; font-size: 13px; max-height: 350px; overflow-y: auto; background: rgba(0,0,0,0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">${parsedEv.evidenceFisik}</div></div>` : ''}
                    ${parsedEv.hasLogic ? `<div><strong style="font-size: 13px; color: var(--text-primary);">💻 Pekerjaan GCU Logic:</strong><div style="margin-top: 6px; font-size: 13px; max-height: 350px; overflow-y: auto; background: rgba(0,0,0,0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">${parsedEv.evidenceLogic}</div></div>` : ''}
                </div>
            `;
        }
        workflowContainer.appendChild(createStep('step-k-comp', 'Status Tiket Selesai', completedContent));
        return;
    }

    window.showEvidenceModal = function(type) {
        let title = type === 'fisik' ? '🛠️ Pekerjaan GCU FISIK (Teknisi)' : '💻 Pekerjaan GCU LOGIC (Helpdesk)';
        let content = type === 'fisik' ? window.tempEvidenceFisik : window.tempEvidenceLogic;
        
        let ticketInfoHtml = `
            <div style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; color: var(--primary); border-bottom: 1px dashed rgba(59, 130, 246, 0.3); padding-bottom: 8px;">Informasi Tiket</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                    <div><span style="color: var(--text-secondary);">No. Internet:</span><br><strong class="copy-badge" onclick="copyToClipboard('${ticket.serviceNumber}', 'Nomor Layanan', event)" style="cursor:pointer;" title="Klik untuk copy">${ticket.serviceNumber} <ion-icon name="copy-outline"></ion-icon></strong></div>
                    <div><span style="color: var(--text-secondary);">Pelanggan:</span><br><strong>${ticket.customerName || '-'}</strong></div>
                    <div><span style="color: var(--text-secondary);">STO:</span><br><strong>${ticket.sto}</strong></div>
                    <div><span style="color: var(--text-secondary);">Teknisi:</span><br><strong>${ticket.technician}</strong></div>
                    <div><span style="color: var(--text-secondary);">Status Alarm:</span><br><strong>${ticket.status}</strong></div>
                    <div><span style="color: var(--text-secondary);">Redaman:</span><br><strong>RX: ${ticket.rx} | TX: ${ticket.tx}</strong></div>
                </div>
            </div>
        `;
        
        let modalHtml = `
            <div id="evidenceModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px);">
                <div style="background: var(--bg-surface); width: 92%; max-width: 650px; border-radius: 12px; padding: 22px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); max-height: 90vh; overflow-y: auto; position: relative;">
                    <button onclick="document.getElementById('evidenceModal').remove()" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; font-size: 24px; font-weight: bold; cursor: pointer; color: var(--text-secondary);">&times;</button>
                    <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: var(--text-primary); border-bottom: 1px solid var(--border); padding-bottom: 10px;">${title}</h3>
                    
                    ${ticketInfoHtml}
                    
                    <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 14px; color: var(--text-primary);">Riwayat Pekerjaan:</h4>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-primary); background: rgba(0,0,0,0.02); padding: 15px; border-radius: 8px; border: 1px solid var(--border);">
                        ${content}
                    </div>
                    <div style="margin-top: 20px; text-align: right;">
                        <button class="btn btn-primary" onclick="document.getElementById('evidenceModal').remove()">Tutup</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    if (ticket.category === 'APPROVAL KORLAP' || ticket.category === 'PENDING') {
        let contentApprove = `
            <p class="info-text" style="margin-bottom: 15px;">Validasi pekerjaan GCU Fisik dan Logic. Pastikan sesuai SOP perusahaan sebelum approve.</p>
            
            <!-- SECTION 1: Evidence GCU FISIK -->
            <div style="background: var(--bg-surface); padding: 18px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="font-size: 14px; font-weight: bold; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 8px;">🛠️ Validasi GCU FISIK (Teknisi)</h4>
                    <button class="btn btn-outline" style="font-size: 11px; padding: 4px 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="window.showEvidenceModal('fisik')">
                        <ion-icon name="scan-outline"></ion-icon> Layar Penuh
                    </button>
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                    <span style="font-size: 12px; color: var(--text-secondary);">Teknisi: <strong style="color: var(--text-primary);">${ticket.technician}</strong></span>
                    <span style="font-size: 12px; color: var(--text-secondary);">| RX: <strong>${ticket.rx}</strong> | TX: <strong>${ticket.tx}</strong></span>
                </div>

                <div style="font-size: 13px; line-height: 1.6; color: var(--text-primary); background: rgba(0,0,0,0.02); padding: 15px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 15px; max-height: 400px; overflow-y: auto;">
                    ${window.tempEvidenceFisik}
                </div>

                <div class="btn-group" style="display: flex; gap: 10px;">
                    <button class="btn ${state.workflowState.fisikAman ? 'btn-success' : 'btn-outline'}" onclick="updateState('fisikAman', true)">Sesuai SOP ✅</button>
                    <button class="btn btn-outline" style="border-color: var(--danger); color: var(--danger);" onclick="window.rejectToQueue('GCU FISIK', 'Fisik tidak sesuai SOP')">Reject ke GCU FISIK ❌</button>
                </div>
            </div>

            <!-- SECTION 2: Evidence GCU LOGIC -->
            <div style="background: var(--bg-surface); padding: 18px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="font-size: 14px; font-weight: bold; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 8px;">💻 Validasi GCU LOGIC (Helpdesk)</h4>
                    <button class="btn btn-outline" style="font-size: 11px; padding: 4px 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="window.showEvidenceModal('logic')">
                        <ion-icon name="scan-outline"></ion-icon> Layar Penuh
                    </button>
                </div>
                
                <div style="font-size: 13px; line-height: 1.6; color: var(--text-primary); background: rgba(0,0,0,0.02); padding: 15px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 15px; max-height: 400px; overflow-y: auto;">
                    ${window.tempEvidenceLogic}
                </div>

                <div class="btn-group" style="display: flex; gap: 10px;">
                    <button class="btn ${state.workflowState.logicAman ? 'btn-success' : 'btn-outline'}" onclick="updateState('logicAman', true)">Sesuai SOP ✅</button>
                    <button class="btn btn-outline" style="border-color: var(--danger); color: var(--danger);" onclick="window.rejectToQueue('GCU LOGIC', 'Logic tidak sesuai SOP')">Reject ke GCU LOGIC ❌</button>
                </div>
            </div>
        `;

        // Catatan Korlap (opsional) + Pending
        if (!window.korlapDraft || window.korlapDraft.ticket !== state.activeTicketId) {
            window.korlapDraft = { ticket: state.activeTicketId, pending: false, reason: '', notes: '' };
        }
        const kd = window.korlapDraft;
        const pendingReasons = [
            'Tarikan jauh (> 250 meter)',
            'Pelanggan tidak mengizinkan perbaikan',
            'Pelanggan RNA',
            'Masuk Kawasan / HRB'
        ];
        const selStyle = "width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; font-size: 13px; box-sizing: border-box; background: var(--bg-surface); color: var(--text-primary);";
        contentApprove += `
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">⏸️ Alasan Pending (wajib dipilih jika klik tombol Pending)</label>
                <select id="korlapPendingReason" onchange="window.onKorlapPendingChange()" style="${selStyle}">
                    <option value="">-- Pilih alasan pending --</option>
                    ${pendingReasons.map(r => `<option value="${r}" ${kd.reason === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">📝 Catatan Korlap (Opsional)</label>
                <textarea id="korlapNotes" oninput="window.onKorlapPendingChange()" placeholder="Tulis catatan validasi di sini..." rows="2" style="width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; font-size: 13px; box-sizing: border-box; background: var(--bg-surface); color: var(--text-primary);">${(kd.notes || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
            </div>
        `;

        const pendingBtnHtml = `<button class="btn" style="width: 100%; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; padding: 14px; color: white; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 15px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);" onclick="pendingTicket()">⏸️ Pending</button>`;
        if (state.workflowState.fisikAman && state.workflowState.logicAman) {
            contentApprove += `
                <div style="margin-top: 10px; padding-top: 15px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn btn-success" style="width: 100%; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 14px; color: white; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 15px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);" onclick="approveTicketFinal()">✅ GCU Closed — Approve & Selesaikan</button>
                    ${pendingBtnHtml}
                </div>
            `;
        } else {
            contentApprove += `
                <div style="margin-top: 10px; padding: 12px; background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 8px;">
                    <p style="margin: 0; font-size: 13px; color: #eab308; font-weight: 500;">⏳ Centang kedua validasi (Fisik & Logic) agar tombol Approve muncul.</p>
                </div>
                <div style="margin-top: 10px;">${pendingBtnHtml}</div>
            `;
        }
        
        workflowContainer.appendChild(createStep('step-k2', 'Validasi Korlap — Cek Evidence', contentApprove));
        return;
    }

    let assignedTo = state.workflowState.assigned || (ticket.technician !== "-" ? ticket.technician : null);
    
    let contentAssign = '';
    if (ticket.category === 'GCU LOGIC') {
        contentAssign = `<p style="color: var(--success); font-weight: 500;">✅ Tiket berada di antrean GCU LOGIC.</p>
        <p class="info-text" style="margin-top: 10px;">Status: Menunggu Helpdesk mengeksekusi pengecekan Logic.</p>
        <button class="btn btn-outline" style="margin-top: 10px;" onclick="showWorkflow('helpdesk')">Simulasikan View Helpdesk ➡️</button>`;
    } else {
        if (assignedTo) {
            contentAssign += `<div style="padding: 10px; background: #e0f2fe; border-left: 4px solid #0284c7; margin-bottom: 15px;">
                <p style="color: #0284c7; font-weight: 500; margin: 0;">✅ Tiket saat ini di-assign ke NIK: <strong>${assignedTo}</strong></p>
                <p style="font-size: 12px; color: #0369a1; margin: 4px 0 0 0;">Status: Menunggu Teknisi submit evidence fisik.</p>
                <button class="btn btn-outline" style="margin-top: 8px; font-size: 12px; padding: 4px 8px;" onclick="showWorkflow('teknisi')">Simulasikan View Teknisi ➡️</button>
            </div>`;
        }

        contentAssign += `
            <p class="info-text">Masukkan NIK Teknisi lapangan dan ID Telegram untuk ditugaskan menangani tiket <strong>${state.activeTicketId}</strong>.</p>
            <div class="btn-group" style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                <input type="text" id="tekSelect" placeholder="Masukkan NIK Teknisi" value="${assignedTo || ''}" style="padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); width: 100%; max-width: 250px;">
                <input type="text" id="teleSelect" placeholder="Masukkan ID Telegram (Chat ID)" style="padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); width: 100%; max-width: 250px;">
            </div>
            <button class="btn btn-primary" onclick="assignTicketToTelegram(this)">${assignedTo ? 'Re-Assign Ticket' : 'Assign Ticket'}</button>
        `;
    }

    workflowContainer.appendChild(createStep('step-k1', 'Assign Tiket ke Teknisi', contentAssign));

    if (parsedEv.hasFisik || parsedEv.hasLogic) {
        let historyPreviewHtml = `
            <div style="background: var(--bg-surface); padding: 18px; border-radius: 10px; border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="font-size: 14px; font-weight: bold; color: var(--text-primary); margin: 0;">🛠️ Riwayat Evidence Lapangan</h4>
                    <div style="display: flex; gap: 8px;">
                        ${parsedEv.hasFisik ? `<button class="btn btn-outline" style="font-size: 11px; padding: 4px 8px; cursor: pointer;" onclick="window.showEvidenceModal('fisik')">🔍 Layar Penuh (Fisik)</button>` : ''}
                        ${parsedEv.hasLogic ? `<button class="btn btn-outline" style="font-size: 11px; padding: 4px 8px; cursor: pointer;" onclick="window.showEvidenceModal('logic')">🔍 Layar Penuh (Logic)</button>` : ''}
                    </div>
                </div>
                ${parsedEv.hasFisik ? `<div style="margin-bottom: 15px;"><strong style="font-size: 13px; color: var(--text-primary);">GCU Fisik:</strong><div style="margin-top: 6px; font-size: 13px; max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">${parsedEv.evidenceFisik}</div></div>` : ''}
                ${parsedEv.hasLogic ? `<div><strong style="font-size: 13px; color: var(--text-primary);">GCU Logic:</strong><div style="margin-top: 6px; font-size: 13px; max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">${parsedEv.evidenceLogic}</div></div>` : ''}
            </div>
        `;
        workflowContainer.appendChild(createStep('step-k-hist', 'Riwayat Evidence Lapangan & Logic', historyPreviewHtml));
    }
}

window.onKorlapPendingChange = function () {
    const rSel = document.getElementById('korlapPendingReason');
    const nTxt = document.getElementById('korlapNotes');
    if (!window.korlapDraft) window.korlapDraft = { ticket: state.activeTicketId, reason: '', notes: '' };
    window.korlapDraft.reason = rSel ? rSel.value : '';
    window.korlapDraft.notes = nTxt ? nTxt.value : '';
};

// Catatan Korlap untuk approve/reject. Return '' jika kosong.
window.getKorlapNoteText = function () {
    window.onKorlapPendingChange();
    const d = window.korlapDraft;
    return (d.notes && d.notes.trim()) ? 'Catatan Korlap: ' + d.notes.trim() : '';
};

window.pendingTicket = function () {
    window.onKorlapPendingChange();
    const d = window.korlapDraft;
    if (!d.reason) {
        alert("Pilih alasan pending terlebih dahulu!");
        return;
    }
    if (!confirm(`Pending tiket ${state.activeTicketId}?\nAlasan: ${d.reason}`)) return;

    let pendingText = '[PENDING] ' + d.reason;
    if (d.notes && d.notes.trim()) pendingText += ' | Catatan Korlap: ' + d.notes.trim();

    const payload = {
        action: 'pending_ticket',
        ticketId: state.activeTicketId,
        summaryText: pendingText
    };

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    }).then(() => {
        const t = state.tickets.find(x => x.incident === state.activeTicketId);
        if (t) t.actionHistory = pendingText + (t.actionHistory ? '\n\n=== SEBELUMNYA ===\n' + t.actionHistory : '');
        updateTicketCategory(state.activeTicketId, 'PENDING');
        window.korlapDraft = null;
        alert(`Tiket ${payload.ticketId} dipindah ke PENDING.`);
        showDashboard('PENDING');
    }).catch(err => {
        console.error(err);
        alert("Gagal koneksi ke server!");
    });
};

window.approveTicketFinal = function () {
    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;

    const ticket = state.tickets.find(t => t.incident === state.activeTicketId) || {};
    const payload = {
        action: 'approve_completed',
        ticketId: state.activeTicketId,
        korlapNote: window.getKorlapNoteText(),
        sto: ticket.sto,
        witel: ticket.witel,
        technician: ticket.technician,
        serviceNumber: ticket.serviceNumber,
        serviceType: ticket.serviceType,
        customerName: ticket.customerName,
        photos: ticket.photos,
        actionHistory: ticket.actionHistory
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
        alert(`Tiket ${state.activeTicketId} berhasil di-Approve dan berstatus CLOSED!`);
        showDashboard('COMPLETED');
    }).catch(err => {
        console.error(err);
        updateTicketCategory(state.activeTicketId, 'COMPLETED');
        alert(`Tiket ${state.activeTicketId} berhasil di-Approve secara lokal (offline) dan berstatus CLOSED!`);
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

window.rejectToQueue = function (targetCategory, reason) {
    const korlapNoteText = window.getKorlapNoteText();
    let fullReason = reason;
    if (korlapNoteText) fullReason += ` | ${korlapNoteText}`;

    const confirmReject = confirm(`REJECT tiket ini kembali ke ${targetCategory}?\nAlasan: ${fullReason}`);
    if (!confirmReject) return;

    const payload = {
        action: 'rework_ticket',
        ticketId: state.activeTicketId,
        targetCategory: targetCategory,
        summaryText: `[REJECTED OLEH KORLAP] - DIKEMBALIKAN KE ${targetCategory} | Alasan: ${fullReason}`
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
        alert(`Tiket di-reject dan dikembalikan ke ${targetCategory}!`);
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
        serviceNumber: ticket ? ticket.serviceNumber : '-',
        customerName: ticket ? ticket.customerName : '-',
        serviceType: ticket ? ticket.serviceType : '-',
        ticketStatus: ticket ? ticket.ticketStatus : '-'
    };

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
    }).catch(err => {
        console.error("Fetch assign_ticket error:", err);
    });
    
    // Optimistic UI Update: Langsung pindah state tanpa menunggu server selesai mengirim telegram
    updateState('assigned', teknisi);
    updateTicketCategory(state.activeTicketId, 'GCU LOGIC');
    alert("Proses assign sedang berjalan di latar belakang! Tiket dipindah ke antrean GCU LOGIC.");
};

// 2. TEKNISI FLOW
function renderTeknisiFlow() {
    const ticket = state.tickets.find(t => t.incident === state.activeTicketId);

    if (ticket && ticket.category === 'GCU FISIK') {
        let hasTeknisi = (ticket.technician && ticket.technician !== "-") || state.workflowState.assigned;
        if (!hasTeknisi) {
            workflowContainer.innerHTML = `<p style="color: var(--danger); font-weight: 500;">❌ Tiket belum di-assign oleh Korlap.</p>`;
            return;
        }
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
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
            <h4 style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">Layanan Tambahan (Opsional)</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-left: 5px;">
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" ${state.workflowState.tekVoice ? 'checked' : ''} onclick="updateState('tekVoice', this.checked)"> Ada Layanan Voice?</label>
            </div>
        </div>

        <label class="block text-sm font-medium text-gray-700 mb-1">Upload Foto Evidence (Dari Galeri/Kamera)</label>
        <input type="file" id="tekPhoto" accept="image/*" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 10px; background: white;">
        
        <label class="block text-sm font-medium text-gray-700 mb-1">Status Pekerjaan / Pending (Opsional)</label>
        <select id="tekPendingReason" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 10px; background: white;" onchange="updateState('pendingReason', this.value)">
            <option value="">-- Selesai (Submit ke GCU Logic) --</option>
            <option value="RNA" ${state.workflowState.pendingReason === 'RNA' ? 'selected' : ''}>Pending: RNA (Pelanggan Tidak Ada)</option>
            <option value="Tarikan Jauh" ${state.workflowState.pendingReason === 'Tarikan Jauh' ? 'selected' : ''}>Pending: Tarikan Jauh / Kabel Kurang</option>
            <option value="Tiang" ${state.workflowState.pendingReason === 'Tiang' ? 'selected' : ''}>Pending: Tiang / Izin Warga</option>
            <option value="Lainnya" ${state.workflowState.pendingReason === 'Lainnya' ? 'selected' : ''}>Pending: Lainnya (Tulis di Catatan)</option>
        </select>
        
        <textarea id="tekNotes" placeholder="Tulis catatan perbaikan tambahan / alasan pending di sini..." rows="3" style="width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 10px;">${state.workflowState.evidence || ''}</textarea>
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

    if (ticket) {
        const parsedEv = window.getParsedEvidence(ticket);
        if (parsedEv && parsedEv.hasFisik) {
            let previewFisikHtml = `
                <div style="background: rgba(59, 130, 246, 0.04); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="font-size: 13px; color: var(--primary);">🛠️ Evidence GCU Fisik dari Teknisi (NIK: ${ticket.technician || '-'})</strong>
                        <button class="btn btn-outline" style="font-size: 11px; padding: 4px 8px; cursor: pointer;" onclick="window.showEvidenceModal('fisik')">🔍 Layar Penuh</button>
                    </div>
                    <div style="font-size: 13px; max-height: 250px; overflow-y: auto;">
                        ${parsedEv.evidenceFisik}
                    </div>
                </div>
            `;
            workflowContainer.appendChild(createStep('step-h0', 'Evidence Pekerjaan Fisik Lapangan', previewFisikHtml));
        }
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
            <h4 style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">📊 Summary ACS</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-left: 5px;">
                <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="chk_voice1" ${state.workflowState.chk_voice1 ? 'checked' : ''} onchange="updateState('chk_voice1', this.checked)"> Layanan ACS Voice</label>
            </div>
        </div>

        <div style="margin-top: 15px; margin-bottom: 15px;">
            <label class="block text-sm font-medium text-gray-700 mb-1">Upload Foto Evidence Logic (Opsional)</label>
            <input type="file" id="hdPhoto" accept="image/*" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 10px; background: white;">
            <textarea id="hdNotes" placeholder="Tulis catatan logic / link evidence foto tambahan di sini..." rows="2" style="width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px;"></textarea>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <button class="btn btn-success" style="flex: 1;" onclick="window.requestApprovalBackend(event)">Ajukan Approval Korlap (Logic OK) ✅</button>
            <button class="btn btn-outline" style="border-color: var(--danger); color: var(--danger);" onclick="updateState('showAssignFisik', true)">Masih Gangguan (Butuh Fisik) ❌</button>
        </div>
    `;

    workflowContainer.appendChild(createStep('step-h1', 'Eksekusi Logic Flowchart', contentLogic));

    // Step 2: Form Assign Teknisi (muncul saat "Butuh Fisik" diklik)
    if (state.workflowState.showAssignFisik) {
        let contentAssignFisik = `
            <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 18px;">
                <p class="info-text" style="margin-bottom: 15px; color: var(--danger); font-weight: 600;">⚠️ Tiket membutuhkan perbaikan fisik. Assign teknisi untuk menangani:</p>
                
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-weight: 600; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">NIK Teknisi</label>
                    <input type="text" id="assignNikInput" placeholder="Masukkan NIK Teknisi..." 
                        value="${state.workflowState.assignNik || ''}"
                        oninput="window.lookupTeknisiByNik(this.value)"
                        style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: 14px; box-sizing: border-box;">
                </div>
                
                <div id="teknisiLookupResult" style="margin-bottom: 12px; display: none;">
                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 10px 14px;">
                        <p style="margin: 0; font-size: 13px; color: var(--success); font-weight: 600;" id="teknisiMatchName">-</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-secondary);" id="teknisiMatchTele">Telegram ID: -</p>
                    </div>
                </div>
                <div id="teknisiNotFound" style="margin-bottom: 12px; display: none;">
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 10px 14px;">
                        <p style="margin: 0; font-size: 13px; color: var(--danger);">❌ NIK tidak ditemukan di database TEKNISI</p>
                        <div style="margin-top: 8px;">
                            <label style="display: block; font-weight: 600; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Input ID Telegram Manual</label>
                            <input type="text" id="manualTeleInput" placeholder="Masukkan Chat ID Telegram..." 
                                style="width: 100%; padding: 8px 12px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; box-sizing: border-box;">
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn btn-primary" style="flex: 1; background: var(--danger); border: none;" onclick="window.assignAndReturnToFisik(this)">🚀 Assign & Kirim ke GCU FISIK</button>
                    <button class="btn btn-outline" style="flex-shrink: 0;" onclick="updateState('showAssignFisik', false)">Batal</button>
                </div>
            </div>
        `;
        workflowContainer.appendChild(createStep('step-h-assign', 'Assign Teknisi untuk Fisik', contentAssignFisik));
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
    if(state.workflowState.chk_voice1) checkedItems.push("Layanan ACS Voice");
    
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
            const base64String = await compressImageBase64(file);
            payload.photoBase64 = base64String;
            payload.photoMimeType = 'image/jpeg';
            payload.photoName = "Evidence_Logic_" + state.activeTicketId + ".jpeg";
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
    
    let pendingReason = document.getElementById('tekPendingReason') ? document.getElementById('tekPendingReason').value : "";
    let notes = document.getElementById('tekNotes') ? document.getElementById('tekNotes').value : "";
    
    let summaryText = "";
    let targetCategory = "GCU LOGIC";
    
    if (pendingReason) {
        summaryText = "[PENDING] - Alasan: " + pendingReason + (notes ? " | Catatan: " + notes : "");
        targetCategory = "PENDING";
    } else {
        summaryText = "[GCU LOGIC] - EVIDENCE FISIK SUBMITTED: " + (checkedItems.length > 0 ? checkedItems.join(", ") : "Selesai") + (notes ? " | Catatan: " + notes : "");
    }

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
            const base64String = await compressImageBase64(file);
            
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
        updateTicketCategory(state.activeTicketId, targetCategory);
        alert(targetCategory === 'PENDING' ? "Tiket dipindahkan ke antrean PENDING!" : "Evidence fisik & foto berhasil dikirim ke Google Sheet!");
        showDashboard(targetCategory);
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
    if(state.workflowState.chk_voice1) checkedItems.push("Layanan ACS Voice");

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
            const base64String = await compressImageBase64(file);
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

// === TEKNISI DATABASE LOOKUP ===
let _teknisiCache = null;
let _teknisiFetching = false;

async function fetchTeknisiList() {
    if (_teknisiCache) return _teknisiCache;
    if (_teknisiFetching) return [];
    _teknisiFetching = true;
    try {
        const resp = await fetch(SCRIPT_URL + '?action=get_teknisi');
        if (resp.ok) {
            _teknisiCache = await resp.json();
        } else {
            _teknisiCache = [];
        }
    } catch (e) {
        console.warn('Gagal fetch data teknisi (belum di-deploy?):', e.message);
        _teknisiCache = [];
    }
    _teknisiFetching = false;
    return _teknisiCache;
}

// Lazy fetch: hanya dipanggil saat form assign dibuka (bukan saat halaman dimuat)

let _lookupTimeout = null;
window.lookupTeknisiByNik = function (nikValue) {
    clearTimeout(_lookupTimeout);
    const nik = nikValue.trim();
    
    const resultEl = document.getElementById('teknisiLookupResult');
    const notFoundEl = document.getElementById('teknisiNotFound');
    
    if (!nik || nik.length < 3) {
        if (resultEl) resultEl.style.display = 'none';
        if (notFoundEl) notFoundEl.style.display = 'none';
        state.workflowState.assignNik = nik;
        state.workflowState.assignTeleId = null;
        state.workflowState.assignNama = null;
        return;
    }

    _lookupTimeout = setTimeout(async () => {
        const list = await fetchTeknisiList();
        const match = list.find(t => t.nik === nik);
        
        state.workflowState.assignNik = nik;
        
        if (match) {
            state.workflowState.assignTeleId = match.teleId;
            state.workflowState.assignNama = match.nama;
            if (resultEl) {
                document.getElementById('teknisiMatchName').innerText = '✅ ' + match.nama + ' (NIK: ' + match.nik + ')';
                document.getElementById('teknisiMatchTele').innerText = 'Telegram ID: ' + (match.teleId || 'Tidak ada');
                resultEl.style.display = 'block';
            }
            if (notFoundEl) notFoundEl.style.display = 'none';
        } else {
            state.workflowState.assignTeleId = null;
            state.workflowState.assignNama = null;
            if (resultEl) resultEl.style.display = 'none';
            if (notFoundEl) notFoundEl.style.display = 'block';
        }
    }, 300);
};

window.assignAndReturnToFisik = async function (btn) {
    const nik = (state.workflowState.assignNik || '').trim();
    if (!nik) {
        alert('Masukkan NIK Teknisi terlebih dahulu!');
        return;
    }

    // Dapatkan Telegram ID (dari lookup atau manual input)
    let teleId = state.workflowState.assignTeleId || '';
    if (!teleId) {
        const manualInput = document.getElementById('manualTeleInput');
        teleId = manualInput ? manualInput.value.trim() : '';
    }
    if (!teleId) {
        alert('ID Telegram teknisi tidak ditemukan. Silakan masukkan secara manual.');
        return;
    }

    const confirmMove = confirm(`Assign tiket ke NIK ${nik} dan kirim ke GCU FISIK?`);
    if (!confirmMove) return;

    const oldText = btn.innerText;
    btn.innerText = 'Memproses...';
    btn.disabled = true;

    // Kumpulkan data checklist helpdesk
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
    if(state.workflowState.chk_voice1) checkedItems.push("Layanan ACS Voice");

    let hdNotes = document.getElementById('hdNotes') ? document.getElementById('hdNotes').value : '';
    let notes = (checkedItems.length > 0 ? "Sudah dicoba Helpdesk: " + checkedItems.join(", ") : "Logic tidak mempan");
    if (hdNotes) notes += " | Catatan: " + hdNotes;

    const ticket = state.tickets.find(t => t.incident === state.activeTicketId);

    // Step 1: Rework ke GCU FISIK dengan catatan
    const reworkPayload = {
        action: 'rework_ticket',
        ticketId: state.activeTicketId,
        targetCategory: 'GCU FISIK',
        summaryText: `[BUTUH FISIK - DIKEMBALIKAN KE GCU FISIK] [ASSIGNED] TEKNISI: ${nik} | ${notes}`
    };

    // Step 2: Assign teknisi via Telegram
    const assignPayload = {
        action: 'assign_ticket',
        ticketId: state.activeTicketId,
        teknisi: nik,
        idTele: teleId,
        sto: ticket ? ticket.sto : '-',
        rx: ticket ? ticket.rx : '-',
        tx: ticket ? ticket.tx : '-',
        serviceNumber: ticket ? ticket.serviceNumber : '-',
        customerName: ticket ? ticket.customerName : '-',
        serviceType: ticket ? ticket.serviceType : '-',
        ticketStatus: ticket ? ticket.ticketStatus : '-'
    };

    try {
        // Kirim rework (tidak perlu await, biarkan jalan di background)
        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(reworkPayload)
        }).catch(console.error);

        // Kirim assign telegram (tidak perlu await)
        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(assignPayload)
        }).catch(console.error);

        // Update local state secara instan (Optimistic UI)
        if (ticket) ticket.technician = nik;
        updateTicketCategory(state.activeTicketId, 'GCU FISIK');
        alert(`✅ Tiket diproses ke ${state.workflowState.assignNama || nik} dan dikembalikan ke GCU FISIK!\nNotifikasi Telegram sedang dikirim di latar belakang.`);
        state.workflowState = {};
        showDashboard('GCU FISIK');
    } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan pada sistem!');
        btn.innerText = oldText;
        btn.disabled = false;
    }
};

// Handle paste event for images
document.addEventListener('paste', function(e) {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        var file = e.clipboardData.files[0];
        if (file.type.indexOf('image/') !== -1) {
            var targetInput = document.activeElement;
            if (!targetInput || targetInput.type !== 'file') {
                var fileInputs = document.querySelectorAll('input[type="file"]');
                for (var i = 0; i < fileInputs.length; i++) {
                    if (fileInputs[i].files.length === 0) {
                        targetInput = fileInputs[i];
                        break;
                    }
                }
            }
            
            if (targetInput && targetInput.type === 'file') {
                var dt = new DataTransfer();
                dt.items.add(file);
                targetInput.files = dt.files;
                
                // Show a quick visual feedback
                var originalBg = targetInput.style.backgroundColor;
                targetInput.style.backgroundColor = '#d1fae5';
                setTimeout(function() {
                    targetInput.style.backgroundColor = originalBg;
                }, 500);
            }
        }
    }
});

async function compressImageBase64(file) {
    if (!file || !file.type.match(/image.*/)) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIM = 800; // max dimension
                if (width > height) {
                    if (width > MAX_DIM) {
                        height *= MAX_DIM / width;
                        width = MAX_DIM;
                    }
                } else {
                    if (height > MAX_DIM) {
                        width *= MAX_DIM / height;
                        height = MAX_DIM;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.4); // 40% quality jpeg
                resolve(dataUrl.split(',')[1]);
            };
            img.onerror = () => reject(new Error("Gagal load image"));
            img.src = e.target.result;
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// --- GLOBAL PASTE & DRAG HANDLER UNTUK DASHBOARD ---
document.addEventListener('paste', function(e) {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        e.preventDefault();
        handleDashboardDroppedFile(e.clipboardData.files[0]);
    }
});

document.addEventListener('dragover', function(e) { e.preventDefault(); });
document.addEventListener('drop', function(e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault(); 
        handleDashboardDroppedFile(e.dataTransfer.files[0]);
    }
});

function handleDashboardDroppedFile(file) {
    if (!file.type.match('image.*')) return;
    
    // Cari semua input file yang sedang tampil di layar
    let fileInputs = document.querySelectorAll('input[type="file"]');
    let targetInput = null;
    for (let i=0; i<fileInputs.length; i++) {
        // Pastikan input file berada dalam elemen yang sedang terlihat
        if (fileInputs[i].offsetParent !== null && (!fileInputs[i].files || fileInputs[i].files.length === 0)) {
            targetInput = fileInputs[i];
            break;
        }
    }
    
    if (targetInput) {
        let dt = new DataTransfer();
        dt.items.add(file);
        targetInput.files = dt.files;
        
        // Beri notifikasi kecil ke layar
        let toast = document.createElement('div');
        toast.innerText = '✅ Foto berhasil di-paste!';
        toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#10b981; color:white; padding:10px 20px; border-radius:8px; z-index:9999; box-shadow:0 4px 6px rgba(0,0,0,0.1); font-weight:600;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// === PICK UP TICKET FUNCTION ===
window.pickUpTicket = function(ticketId) {
    if (!state.userName) {
        alert("Silakan login kembali.");
        return;
    }
    
    // Optimistic UI update
    let ticket = state.tickets.find(t => t.incident === ticketId);
    if (ticket) {
        ticket.helpdeskAssignee = state.userName;
        renderTable();
    }
    
    let payload = {
        action: 'pickup_ticket',
        ticketId: ticketId,
        userName: state.userName + " (" + state.userNik + ")",
        teknisiNIK: ticket ? ticket.technician : "-"
    };
    
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    }).then(() => {
        // Tampilkan pesan sukses sebentar
        let toast = document.createElement('div');
        toast.innerText = '✅ Tiket berhasil di-pick up!';
        toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#10b981; color:white; padding:10px 20px; border-radius:8px; z-index:9999; box-shadow:0 4px 6px rgba(0,0,0,0.1); font-weight:600;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }).catch(console.error);
};


