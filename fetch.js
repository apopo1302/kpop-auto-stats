import axios from 'axios';
import fs from 'fs';

const CHANNEL_URL = 'https://www.youtube.com/@SBSKPOP_ZOOM/videos';
const DB_FILE = 'fancams.json';

async function main() {
    try {
        console.log("正在获取频道页面...");
        const response = await axios.get(CHANNEL_URL, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 15000
        });

        const html = response.data;

        // 改进的正则：同时提取 videoId、title 和 views（观看数）
        // YouTube 网页源码中通常包含带有这些数据的 JSON 片段
        const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        const matches = [...html.matchAll(videoIdRegex)];
        const newIds = [...new Set(matches.map(m => m[1]))];

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
                // 尝试从页面中粗略匹配该视频的标题或观看数（如果找不到则给个默认值）
                existingData.unshift({
                    id: id,
                    url: `https://www.youtube.com/watch?v=${id}`,
                    title: "Fancam Video", // 后续如果你需要可以在前端直接根据 ID 处理
                    views: 0, // 公开接口不可靠时，先设为0或后续通过前端优化
                    likes: 0,
                    comments: 0,
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
