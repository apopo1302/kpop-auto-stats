const axios = require('axios');
const fs = require('fs');

const CHANNEL_URL = 'https://www.youtube.com/@SBSKPOP_ZOOM/videos';
const DB_FILE = 'fancams.json';

async function main() {
    try {
        const response = await axios.get(CHANNEL_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        const newIds = [...new Set([...response.data.matchAll(regex)].map(m => m[1]))];

        // 1. 读取旧数据（如果不存在则为空数组）
        let existingData = [];
        if (fs.existsSync(DB_FILE)) {
            existingData = JSON.parse(fs.readFileSync(DB_FILE));
        }

        // 2. 只添加那些数据库里还没有的新 ID
        const existingIds = new Set(existingData.map(v => v.id));
        let addedCount = 0;
        
        newIds.forEach(id => {
            if (!existingIds.has(id)) {
                existingData.unshift({ // 把新视频插到最前面
                    id: id,
                    url: `https://www.youtube.com/watch?v=${id}`,
                    addedAt: new Date().toISOString()
                });
                addedCount++;
            }
        });

        // 3. 保存
        fs.writeFileSync(DB_FILE, JSON.stringify(existingData, null, 2));
        console.log(`✅ 同步完成！新增了 ${addedCount} 条视频，目前总库共有 ${existingData.length} 条记录。`);
    } catch (e) {
        console.error("❌ 抓取失败:", e.message);
    }
}

main();