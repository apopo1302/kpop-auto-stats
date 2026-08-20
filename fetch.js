import fs from 'fs';

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID || "UCM3jwNRfl5-W8VzgT6DsaEQ";
const DB_FILE = 'fancams.json';

async function main() {
    try {
        if (!API_KEY) {
            console.error("❌ 错误: 未找到 YOUTUBE_API_KEY 环境变量，请检查 GitHub Secrets！");
            process.exit(1);
        }

        console.log(`正在通过 YouTube API 抓取频道 ${CHANNEL_ID} 的最新视频...`);
        
        // 调用 YouTube Search API 按发布时间倒序获取
        // YouTube API 单次最大支持 50 条
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=50`;
        const res = await fetch(searchUrl);
        const data = await res.json();

        if (!data.items) {
            console.error("⚠️ API 返回数据异常:", JSON.stringify(data));
            return;
        }

        // 提取视频 ID
        const newIds = data.items
            .filter(item => item.id.kind === 'youtube#video')
            .map(item => item.id.videoId);

        console.log(`API 成功返回 ${newIds.length} 个视频 ID。`);

        let existingData = [];
        if (fs.existsSync(DB_FILE)) {
            try {
                existingData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
            } catch (err) { existingData = []; }
        }

        const existingMap = new Map(existingData.map(v => [v.id, v]));
        let addedCount = 0;

        for (const id of newIds) {
            if (!existingMap.has(id)) {
                // 插入新视频，后续让前端的智能解析去拉取实时播放量和标题
                existingData.unshift({
                    id: id,
                    url: `https://www.youtube.com/watch?v=${id}`,
                    addedAt: new Date().toISOString()
                });
                addedCount++;
            }
        }

        // 保持总数控制在 200 以内
        const finalData = existingData.slice(0, 200);

        fs.writeFileSync(DB_FILE, JSON.stringify(finalData, null, 2), 'utf-8');
        console.log(`✅ 同步完成！新增了 ${addedCount} 条视频，当前数据库总数: ${finalData.length} 条。`);
    } catch (e) {
        console.error("❌ 抓取脚本执行出错:", e.message);
        process.exit(1);
    }
}

main();
