const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzPBLTPwr536d2mVuOps8RmKw2UzMPne-xcM89vtnHMjPzpUB_B9DCEbf7KpYS9SWOj/exec";

async function test() {
    console.log("Testing POST to: " + SCRIPT_URL);
    try {
        let res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'update_measurement_bulk',
                measurements: [{serviceNumber: "131640102104", rx: "-27.7", tx: "2.13", olt: "GPON"}]
            })
        });
        let text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
