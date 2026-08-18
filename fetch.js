import axios from 'axios';
import fs from 'fs';

const CHANNEL_URL = 'https://www.youtube.com/@SBSKPOP_ZOOM/videos';
const DB_FILE = 'fancams.json';

async function getVideoDetails(id) {
    try {
        const res = await axios.get(`https://invidious.jing.rocks/api/v1/videos/${id}`);
        return {
            views: res.data.viewCount,
            likes: res.data.likeCount,
            comments: res.data.commentCount || 0,
            title: res.data.title
        };
    } catch (e) {
        return { views: 0, likes: 0, comments: 0, title: "Unknown" };
    }
}

async function main() {
    try {
        const response = await axios.get(CHANNEL_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        const newIds = [...new Set([...response.data.matchAll(regex)].map(m => m[1]))];

        let existingData = [];
        if (fs.existsSync(DB_FILE)) {
            existingData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        }

        const existingIds = new Set(existingData.map(v => v.id));
        let addedCount = 0;

        for (const id of newIds) {
            if (!existingIds.has(id)) {
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
        console.log(`✅ 同步完成！新增了 ${addedCount} 条视频，目前总库共有 ${existingData.length} 条记录。`);
    } catch (e) {
        console.error("❌ 抓取失败:", e.message);
    }
}

main();
