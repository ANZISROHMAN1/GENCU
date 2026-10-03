const fs = require('fs');

const data = JSON.parse(fs.readFileSync('response.json', 'utf8'));

let rows = data;
if (rows && rows.length > 0) {
    let headers = rows[0].map(h => (h || "").toString().toUpperCase().trim());
    
    let incIdx = -1;
    for (let c = 0; c < headers.length; c++) {
        for (let r = 1; r < Math.min(10, rows.length); r++) {
            if (rows[r][c] && rows[r][c].toString().match(/^(INC\d{5,}|1-SV\d{5,})/)) {
                incIdx = c;
                break;
            }
        }
        if (incIdx !== -1) break;
    }
    if (incIdx === -1) incIdx = 1;

    let technicianIdx = headers.findIndex(h => h === "TECHNICIAN" || h === "NAMA TEKNISI");
    let actionIdx = headers.indexOf("ACTION");

    console.log("incIdx:", incIdx, "technicianIdx:", technicianIdx, "actionIdx:", actionIdx);

    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        let ticketId = row[incIdx] ? row[incIdx].toString().trim() : "-";
        
        if (ticketId === "INC53516825") {
            console.log("FOUND ROW:", row);
            
            let technician = "-";
            if (technicianIdx !== -1 && row[technicianIdx]) {
                let tVal = row[technicianIdx].toString().trim();
                let nikMatch = tVal.match(/\d+/);
                if (nikMatch && !tVal.toLowerCase().includes("please assign")) {
                    technician = nikMatch[0];
                }
            }
            
            let rowText = row.join(" ").toUpperCase();
            
            let assignMatch = rowText.match(/\[ASSIGNED\] TEKNISI:\s*([A-Z0-9_]+)/i);
            if (assignMatch && assignMatch[1]) {
                technician = assignMatch[1];
            }
            
            let category = 'GCU FISIK';

            if (technician === "-") {
                category = 'GCU LOGIC';
            }

            if (rowText.includes("[COMPLETED]")) {
                category = 'COMPLETED';
            } else if (rowText.includes("DIKEMBALIKAN KE GCU FISIK") || rowText.includes("[BUTUH FISIK") || rowText.includes("[ASSIGNED]")) {
                category = 'GCU FISIK'; 
            } else if (rowText.includes("DIKEMBALIKAN KE GCU LOGIC")) {
                category = 'GCU LOGIC';
            } else if (rowText.includes("MENUNGGU APPROVAL KORLAP") || rowText.includes("[WAITING APPROVAL KORLAP]")) {
                category = 'APPROVAL KORLAP';
            } else if (rowText.includes("EVIDENCE FISIK SUBMITTED")) {
                category = 'GCU LOGIC';
            }
            
            console.log("FINAL TECHNICIAN:", technician);
            console.log("FINAL CATEGORY:", category);
            console.log("ROW TEXT INCLUDES EVIDENCE FISIK SUBMITTED:", rowText.includes("EVIDENCE FISIK SUBMITTED"));
            console.log("ROW TEXT INCLUDES DIKEMBALIKAN KE GCU LOGIC:", rowText.includes("DIKEMBALIKAN KE GCU LOGIC"));
        }
    }
}
