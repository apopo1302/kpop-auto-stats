import axios from 'axios';
import fs from 'fs';

const CHANNEL_URL = 'https://www.youtube.com/@SBSKPOP_ZOOM/videos';
const DB_FILE = 'fancams.json';

const INVIDIOUS_INSTANCES = [
    'https://invidious.nerdvpn.de',
    'https://vid.priv.au',
    'https://inv.nadeko.net',
    'https://invidious.projectsegfau.lt'
];

async function getVideoDetailsWithFallback(id) {
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            const res = await axios.get(`${instance}/api/v1/videos/${id}`, { timeout: 5000 });
            if (res.data && res.data.viewCount !== undefined) {
                return {
                    views: res.data.viewCount || 0,
                    likes: res.data.likeCount || 0,
                    comments: res.data.commentCount || 0,
                    title: res.data.title || "Fancam Video"
                };
            }
        } catch (e) { continue; }
    }
    return null;
}

async function main() {
    try {
        console.log("正在获取频道页面...");
        // 增加 timeout，确保大页面能加载完成
        const response = await axios.get(CHANNEL_URL, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 20000
        });

        // 核心修改：正则匹配所有出现的 videoId
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        const matches = [...response.data.matchAll(regex)];
        
        // 使用 Set 去重，并限制抓取数量为 200 条
        const newIds = [...new Set(matches.map(m => m[1]))].slice(0, 200);

        if (newIds.length === 0) {
            console.log("⚠️ 没有匹配到任何视频 ID。");
            return;
        }

        console.log(`页面解析完成，共发现 ${newIds.length} 个视频 ID。`);

        let existingData = [];
        if (fs.existsSync(DB_FILE)) {
            try {
                existingData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
            } catch (err) { existingData = []; }
        }

        const existingMap = new Map(existingData.map(v => [v.id, v]));
        let addedCount = 0;

        // 这里仅处理新发现的 ID，防止 API 超限
        for (const id of newIds) {
            if (!existingMap.has(id)) {
                console.log(`正在获取新视频详情: ${id}`);
                const details = await getVideoDetailsWithFallback(id);
                
                existingData.unshift({
                    id: id,
                    url: `https://www.youtube.com/watch?v=${id}`,
                    title: details ? details.title : "Fancam Video",
                    views: details ? details.views : 0,
                    likes: details ? details.likes : 0,
                    comments: details ? details.comments : 0,
                    addedAt: new Date().toISOString()
                });
                addedCount++;
            }
            // 防止单次运行处理过多导致 Invidious 封禁或超时
            if (addedCount >= 50) break; 
        }

        // 保持总数控制在 200 以内
        const finalData = existingData.slice(0, 200);

        fs.writeFileSync(DB_FILE, JSON.stringify(finalData, null, 2), 'utf-8');
        console.log(`✅ 同步完成！当前数据库总数: ${finalData.length} 条。`);
    } catch (e) {
        console.error("❌ 抓取脚本执行出错:", e.message);
        process.exit(1);
    }
}

main();
