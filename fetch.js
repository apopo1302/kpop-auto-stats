import axios from 'axios';
import fs from 'fs';

const CHANNEL_URL = 'https://www.youtube.com/@SBSKPOP_ZOOM/videos';
const DB_FILE = 'fancams.json';

// 备用的 Invidious 公开 API 节点列表
const INVIDIOUS_INSTANCES = [
    'https://invidious.nerdvpn.de',
    'https://vid.priv.au',
    'https://inv.nadeko.net',
    'https://invidious.projectsegfau.lt'
];

async function getVideoDetailsWithFallback(id) {
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            const res = await axios.get(`${instance}/api/v1/videos/${id}`, { timeout: 4000 });
            if (res.data && res.data.viewCount !== undefined) {
                return {
                    views: res.data.viewCount || 0,
                    likes: res.data.likeCount || 0,
                    comments: res.data.commentCount || 0,
                    title: res.data.title || "Fancam Video"
                };
            }
        } catch (e) {
            // 当前节点失败，尝试下一个
            continue;
        }
    }
    // 所有节点都失败时，返回 null 而不是假数据 0，保留之前的状态或给个标记
    return null;
}

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

        const existingMap = new Map(existingData.map(v => [v.id, v]));
        let addedCount = 0;

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
        }

        fs.writeFileSync(DB_FILE, JSON.stringify(existingData, null, 2), 'utf-8');
        console.log(`✅ 同步完成！新增了 ${addedCount} 条视频，总库共有 ${existingData.length} 条记录。`);
    } catch (e) {
        console.error("❌ 抓取脚本执行出错:", e.message);
        process.exit(1);
    }
}

main();
