const fs = require('fs');
const url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2YxYzAzMzJhZDY3NzRiYzY5ZjMwNzY0ODY5MGRlNTIwEgsSBxDSsc2gthkYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjQwOTcxMTQ3NDAzMDMwMTc5MQ&filename=&opi=89354086";

async function download() {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        fs.writeFileSync('stitch_login.html', html);
        console.log("Downloaded " + html.length + " bytes");
    } catch (e) {
        console.error("Error:", e);
    }
}
download();
