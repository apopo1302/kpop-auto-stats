import axios from 'axios';
import fs from 'fs';

const CHANNEL_URL = 'https://www.youtube.com/@SBSKPOP_ZOOM/videos';
const DB_FILE = 'fancams.json';

async function main() {
    try {
        console.log("正在获取频道页面...");
        const response = await axios.get(CHANNEL_URL, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 15000
        });

        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        const newIds = [...new Set([...response.data.matchAll(regex)].map(m => m[1]))];

        if (newIds.length === 0) {
            console.log("⚠️ 没有匹配到任何视频 ID。");
            return;
        }

        let existingData = [];
        if (fs.existsSync(DB_FILE)) {
            try {
                existingData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
            } catch (err) {
                existingData = [];
            }
        }

        const existingIds = new Set(existingData.map(v => v.id));
        let addedCount = 0;

        for (const id of newIds) {
            if (!existingIds.has(id)) {
                existingData.unshift({
                    id: id,
                    url: `https://www.youtube.com/watch?v=${id}`,
                    addedAt: new Date().toISOString()
                });
                addedCount++;
            }
        }

        fs.writeFileSync(DB_FILE, JSON.stringify(existingData, null, 2), 'utf-8');
        console.log(`✅ 同步完成！新增了 ${addedCount} 条视频，总库共有 ${existingData.length} 条记录。`);
    } catch (e) {
        console.error("❌ 抓取脚本执行出错:", e.message);
        process.exit(1);
    }
}

main();
