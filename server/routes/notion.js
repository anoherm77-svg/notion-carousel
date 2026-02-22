import { Router } from 'express';
import { Client } from '@notionhq/client';

const router = Router();
const NOTION_VERSION = '2022-06-28';

function getNotionClient(req) {
  const token = req.session?.notionAccessToken;
  if (!token) return null;
  return new Client({ auth: token, notionVersion: NOTION_VERSION });
}

function parsePageId(input) {
  if (!input) return null;
  
  const trimmed = input.trim();
  
  // If it's a URL, extract the pathname (strip query params and hash)
  let pathname = trimmed;
  try {
    // Try parsing as full URL
    const url = new URL(trimmed);
    pathname = url.pathname;
  } catch {
    // If not a valid URL, check if it contains notion.so or notion.site
    if (trimmed.includes('notion.so/') || trimmed.includes('notion.site/')) {
      // Extract pathname manually (everything after domain, before ? or #)
      const match = trimmed.match(/notion\.(?:so|site)(\/[^?#]*)/i);
      if (match) pathname = match[1];
    }
    // Otherwise, treat as raw ID
  }
  
  // Try to extract UUID format: 8-4-4-4-12 hex chars (with or without hyphens)
  const uuidMatch = pathname.match(/([a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12})$/i);
  if (uuidMatch) {
    return formatBlockId(uuidMatch[1]);
  }
  
  // Try to extract 32 consecutive hex chars at the end (without hyphens)
  const consecutiveHexMatch = pathname.match(/([a-f0-9]{32})$/i);
  if (consecutiveHexMatch) {
    return formatBlockId(consecutiveHexMatch[1]);
  }
  
  // If input is just a raw ID (with or without hyphens), try to parse it directly
  const rawId = trimmed.replace(/-/g, '');
  if (/^[a-f0-9]{32}$/i.test(rawId)) {
    return formatBlockId(rawId);
  }
  
  return null;
}

function formatBlockId(id) {
  const clean = id.replace(/-/g, '');
  if (clean.length !== 32) return id;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
}

router.use((req, res, next) => {
  // 图片代理不依赖 Notion 会话，直接放行
  if (req.path === '/proxy-image') {
    return next();
  }
  const notion = getNotionClient(req);
  if (!notion) {
    return res.status(401).json({ error: 'Not connected to Notion' });
  }
  req.notion = notion;
  next();
});

router.get('/proxy-image', async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url' });
  }
  try {
    const token = req.session?.notionAccessToken;
    const headers = { Accept: 'image/*' };
    if (token && (url.includes('notion') || url.includes('s3-us-west-2.amazonaws.com'))) {
      headers.Authorization = `Bearer ${token}`;
    }
    const imgRes = await fetch(url, { headers });
    if (!imgRes.ok) throw new Error('Image fetch failed');
    const contentType = imgRes.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  } catch (err) {
    res.status(502).json({ error: 'Failed to load image' });
  }
});

// 从 Notion 富文本数组取纯文本
function richTextToPlain(richText) {
  if (!Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text || '').join('');
}

// 从 database 对象取标题（2022-06-28 中 database 有 title 数组）
function getDatabaseTitle(db) {
  if (db.title && Array.isArray(db.title)) return richTextToPlain(db.title);
  return 'Untitled Database';
}

// 从 query 返回的 page 的 properties 中取第一个 title 类型属性作为页面标题
function getPageTitleFromProperties(properties) {
  if (!properties || typeof properties !== 'object') return 'Untitled';
  for (const key of Object.keys(properties)) {
    const prop = properties[key];
    if (prop && prop.type === 'title' && Array.isArray(prop.title)) {
      return richTextToPlain(prop.title);
    }
  }
  return 'Untitled';
}

// 搜索当前连接有权限的数据库（仅返回 database 类型）
// 不传 filter，避免部分 Notion 版本返回 400/404，在服务端只保留 object === 'database'
router.get('/search-databases', async (req, res) => {
  try {
    const all = [];
    let cursor = undefined;
    do {
      const resp = await req.notion.search({
        page_size: 100,
        start_cursor: cursor,
      });
      const results = resp.results || [];
      for (const r of results) {
        if (r.object === 'database') {
          all.push({
            id: r.id,
            title: getDatabaseTitle(r),
          });
        }
      }
      cursor = resp.next_cursor ?? undefined;
    } while (cursor);
    res.json({ databases: all });
  } catch (err) {
    const code = err.code || err.status;
    const status = code === 'object_not_found' || code === 404 ? 404 : err.status || 500;
    const message =
      status === 404
        ? '无法获取数据库列表。请确保已在 Notion 中把需要的数据库「添加连接」到本应用（数据库页面右上角 ··· → 连接 → 选择本应用）。'
        : (err.message || 'Notion API error');
    res.status(status).json({ error: message });
  }
});

// 查询指定数据库中的页面列表（分页，返回 id + 标题）
router.get('/databases/:databaseId/pages', async (req, res) => {
  const databaseId = parsePageId(req.params.databaseId);
  if (!databaseId) {
    return res.status(400).json({ error: 'Invalid database ID or URL' });
  }
  try {
    const pages = [];
    let cursor = undefined;
    do {
      const resp = await req.notion.databases.query({
        database_id: databaseId,
        page_size: 100,
        start_cursor: cursor,
      });
      const results = resp.results || [];
      for (const p of results) {
        if (p.object === 'page') {
          pages.push({
            id: p.id,
            title: getPageTitleFromProperties(p.properties),
            url: p.url || undefined,
          });
        }
      }
      cursor = resp.next_cursor ?? undefined;
    } while (cursor);
    res.json({ pages });
  } catch (err) {
    const status = err.code === 'object_not_found' ? 404 : err.status || 500;
    res.status(status).json({ error: err.message || 'Notion API error' });
  }
});

router.get('/children', async (req, res) => {
  const pageIdOrUrl = req.query.pageIdOrUrl;
  if (!pageIdOrUrl || typeof pageIdOrUrl !== 'string') {
    return res.status(400).json({ error: 'Missing pageIdOrUrl' });
  }
  const pageId = parsePageId(pageIdOrUrl);
  if (!pageId) {
    return res.status(400).json({ error: 'Invalid page ID or URL' });
  }
  try {
    const allBlocks = [];
    let cursor = undefined;
    do {
      const resp = await req.notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100,
      });
      allBlocks.push(...resp.results);
      cursor = resp.next_cursor ?? undefined;
    } while (cursor);

    const childPages = allBlocks
      .filter((b) => b.type === 'child_page')
      .map((b) => ({
        id: b.id,
        title: b.child_page?.title || 'Untitled',
      }));
    res.json({ children: childPages });
  } catch (err) {
    const status = err.code === 'object_not_found' ? 404 : err.status || 500;
    res.status(status).json({ error: err.message || 'Notion API error' });
  }
});

function mapBlock(b) {
  const out = {
    id: b.id,
    type: b.type,
    has_children: !!b.has_children,
    ...(b.heading_1 && { heading_1: b.heading_1 }),
    ...(b.heading_2 && { heading_2: b.heading_2 }),
    ...(b.heading_3 && { heading_3: b.heading_3 }),
    ...(b.paragraph && { paragraph: b.paragraph }),
    ...(b.bulleted_list_item && { bulleted_list_item: b.bulleted_list_item }),
    ...(b.numbered_list_item && { numbered_list_item: b.numbered_list_item }),
    ...(b.quote && { quote: b.quote }),
    ...(b.callout && { callout: b.callout }),
    ...(b.divider && { divider: b.divider }),
    ...(b.column_list && { column_list: true }),
    ...(b.column && { column: true }),
    ...(b.image && { image: b.image }),
  };
  return out;
}

async function fetchBlockChildren(notion, blockId) {
  const list = [];
  let cursor = undefined;
  do {
    const resp = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    list.push(...resp.results);
    cursor = resp.next_cursor ?? undefined;
  } while (cursor);
  return list;
}

router.get('/blocks', async (req, res) => {
  const blockIdOrUrl = req.query.blockIdOrUrl;
  if (!blockIdOrUrl || typeof blockIdOrUrl !== 'string') {
    return res.status(400).json({ error: 'Missing blockIdOrUrl' });
  }
  const blockId = parsePageId(blockIdOrUrl);
  if (!blockId) {
    return res.status(400).json({ error: 'Invalid block ID or URL' });
  }
  try {
    const allBlocks = await fetchBlockChildren(req.notion, blockId);
    const blocks = [];
    for (const b of allBlocks) {
      const block = mapBlock(b);
      // One-level nested list support for bulleted and numbered lists
      if ((b.type === 'bulleted_list_item' || b.type === 'numbered_list_item') && b.has_children) {
        const nested = await fetchBlockChildren(req.notion, b.id);
        block.nested = nested.map((n) => mapBlock(n));
      }
      // Column list: fetch columns and their children, include column_ratio when available
      if (b.type === 'column_list') {
        const columnBlocks = await fetchBlockChildren(req.notion, b.id);
        const rawColumns = columnBlocks.filter((c) => c.type === 'column');
        const columns = [];
        // 先读出所有列的 column_ratio（有些列可能缺省）
        const ratios = rawColumns.map((col) =>
          col.format && typeof col.format.column_ratio === 'number'
            ? col.format.column_ratio
            : undefined,
        );
        const definedTotal = ratios
          .filter((r) => typeof r === 'number')
          .reduce((sum, r) => sum + r, 0);
        const undefinedCount = ratios.filter((r) => typeof r !== 'number').length;
        // 如果部分列没有 ratio，则把「1 - 已知之和」平均分配给缺省列
        const fallbackRatio =
          undefinedCount > 0 && definedTotal < 1
            ? (1 - definedTotal) / undefinedCount
            : undefined;

        for (let i = 0; i < rawColumns.length; i += 1) {
          const col = rawColumns[i];
          const colChildren = await fetchBlockChildren(req.notion, col.id);
          const baseRatio = ratios[i];
          const ratio =
            typeof baseRatio === 'number'
              ? baseRatio
              : fallbackRatio !== undefined
                ? fallbackRatio
                : undefined;
          columns.push({
            id: col.id,
            ratio,
            blocks: colChildren.map((n) => mapBlock(n)),
          });
        }
        block.columns = columns;
      }
      blocks.push(block);
    }
    res.json({ blocks });
  } catch (err) {
    const status = err.code === 'object_not_found' ? 404 : err.status || 500;
    res.status(status).json({ error: err.message || 'Notion API error' });
  }
});

export { router as notionRouter };
