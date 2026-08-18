import axios from 'axios';
import fs from 'fs';

const CHANNEL_URL = 'https://www.youtube.com/@SBSKPOP_ZOOM/videos';
const DB_FILE = 'fancams.json';

async function getVideoDetails(id) {
    try {
        // 加上超时设置，防止请求卡死
        const res = await axios.get(`https://invidious.jing.rocks/api/v1/videos/${id}`, { timeout: 5000 });
        return {
            views: res.data.viewCount || 0,
            likes: res.data.likeCount || 0,
            comments: res.data.commentCount || 0,
            title: res.data.title || "Unknown"
        };
    } catch (e) {
        // 如果 API 请求失败，返回默认值，绝不让整个脚本崩溃
        console.warn(`⚠️ 无法获取视频 ${id} 的详细信息，使用默认值。`);
        return { views: 0, likes: 0, comments: 0, title: "Fancam Video" };
    }
}

async function main() {
    try {
        console.log("正在获取频道页面...");
        const response = await axios.get(CHANNEL_URL, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 10000
        });
        
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        const newIds = [...new Set([...response.data.matchAll(regex)].map(m => m[1]))];

        if (newIds.length === 0) {
            console.log("⚠️ 没有匹配到任何视频 ID，可能 YouTube 页面结构有变。");
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
                console.log(`正在抓取新视频: ${id}`);
                const details = await getVideoDetails(id);
                existingData.unshift({
                    id: id,
                    url: `https://www.youtube.com/watch?v=${id}`,
                    title: details.title,
                    views: details.views,
                    likes: details.likes,
                    comments: details.comments,
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
