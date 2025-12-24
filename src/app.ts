import express, { Request, Response } from 'express';
import { ConsusCrawler } from './crawler';
import { fetchOpenRouterResponse } from './ai';

const app = express();
const crawler = new ConsusCrawler();

const localeMap: { [key: string]: string } = {
    tr: 'tr-tr', de: 'de-de', us: 'us-en', fr: 'fr-fr', ru: 'ru-ru',
    jp: 'jp-jp', es: 'es-es', it: 'it-it', cn: 'cn-zh', gb: 'uk-en',
    br: 'br-pt', ar: 'xa-ar', nl: 'nl-nl', pl: 'pl-pl', kr: 'kr-ko',
    in: 'in-en', ca: 'ca-en', au: 'au-en', sa: 'sa-ar', se: 'se-sv',
    no: 'no-no', dk: 'dk-da', fi: 'fi-fi', gr: 'gr-el', il: 'il-he',
    mx: 'mx-es', id: 'id-id', th: 'th-th', vn: 'vn-vi', za: 'za-en'
};

app.get('/api/search', async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const userLocals = req.query.kl as string; 
    const types = req.query.type as string || 'web'; 

    if (!query) return res.status(400).json({ error: "You must enter a query." });
    
    const locals = userLocals 
        ? Array.from(new Set(userLocals.split(',').map(l => l.trim().toLowerCase())))
        : ['tr'];
    
    const startTime = Date.now();

    const searchTasks = locals.map(async (lang) => {
        const code = localeMap[lang] || 'wt-wt';
        return await crawler.executeSearch(query, code, types);
    });
    
    const allData = await Promise.all(searchTasks);
    
    const allResults: any[] = [];
    
    allData.forEach(searchResult => {
        if (searchResult.web) allResults.push(...searchResult.web);
        if (searchResult.images) allResults.push(...searchResult.images);
        if (searchResult.news) allResults.push(...searchResult.news);
    });
    
    const uniqueResults = Array.from(
        new Map(allResults.map(item => [item.link || item.image || item.url, item])).values()
    );
    
    res.json({
        query,
        type: types,
        time: `${(Date.now() - startTime) / 1000}s`,
        results: uniqueResults
    });
});

app.get('/api/ai', async (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: "Query required" });
    
    const startTime = Date.now();
    try {
        const aiResponse = await fetchOpenRouterResponse(query);
        res.json({
            status: "success",
            query,
            answer: aiResponse,
            time: `${(Date.now() - startTime) / 1000}s`
        });
    } catch (error) {
        res.status(500).json({ error: "AI error" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Consus Search Engine: http://localhost:${PORT}/api/search`);
    console.log(`Consus AI: http://localhost:${PORT}/api/ai`);
});