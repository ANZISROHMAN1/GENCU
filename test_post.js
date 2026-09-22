const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyYTj41Fk1iLgZ6ph3Ol5PDcUDelBOOph4DfXJx_trHcLtkzHLfz6qWFsnNPHGMtBGY/exec";

async function test() {
    console.log("Testing POST to: " + SCRIPT_URL);
    try {
        let res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'update_measurement_bulk',
                measurements: [{serviceNumber: "131640103017", rx: "-30 dBm", tx: "2.0 dBm", olt: "GPON"}]
            })
        });
        let text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
