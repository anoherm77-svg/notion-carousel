import { useState, useEffect, useRef } from 'react';
import { getMe, getAuthUrl, disconnect, getDatabases, getDatabasePages, getChildPages, getPageBlocks, getProxyImageUrl } from './api';
import { Slide } from './Slide';
import { StyleSettingsPanel } from './StyleSettingsPanel';
import html2canvas from 'html2canvas';

const DEFAULT_STYLE_CONFIG = {
  paddingTop: 100,
  paddingBottom: 100,
  paddingLeft: 100,
  paddingRight: 100,
  bgColor: '#FFFFFF',
  bgRgbInput: '255,255,255',
  textColor: '#37352F',
  fontFamily: 'Inter, sans-serif',
  heading1Size: 72,
  heading2Size: 56,
  heading3Size: 44,
  headingWeight: 600,
  headingLineHeight: 1.3,
  bodySize: 44,
  bodyWeight: 400,
  bodyLineHeight: 1.6,
  heading1Spacing: 36,
  heading2Spacing: 28,
  heading3Spacing: 24,
  bodySpacing: 20,
  bulletSize: 14,
  bulletDotMarginTop: 28,
  nestedIndent: 66,
  nestedSpacing: 16,
  nestedGap: 22,
  listGap: 20,
  numberGap: 22,
  numberIndexWidth: 36,
  dividerColor: '#D3D1CB',
  dividerSpacingTop: 16,
  dividerSpacingBottom: 24,
  quoteBorderWidth: 5,
  quotePaddingLeft: 24,
  quoteSpacing: 28,
  calloutBorderRadius: 12,
  calloutPadding: 24,
  calloutGap: 16,
  calloutSpacing: 28,
  calloutIconSize: 40,
  calloutBgColor: '#F7F6F3',
  codeSize: 38,
  codeBgColor: '#F7F6F3',
  codePadding: '4px 8px',
  codeBorderRadius: 4,
  columnsGap: 16,
  columnsSpacing: 28,
  imageWrapSpacing: 28,
  maxImageHeight: 600,
  borderRadius: 0,
};

const SUPPORTED_TYPES = new Set([
  'heading_1',
  'heading_2',
  'heading_3',
  'paragraph',
  'bulleted_list_item',
  'numbered_list_item',
  'image',
  'divider',
  'quote',
  'callout',
  'column_list',
]);

function filterBlocks(blocks) {
  return (blocks || []).filter((b) => SUPPORTED_TYPES.has(b.type));
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function parseRgbString(input) {
  if (!input) return '#ffffff';
  const parts = input.split(',').map((p) => p.trim());
  if (parts.length !== 3) return '#ffffff';
  const nums = parts.map((p) => {
    const n = Number(p);
    if (Number.isNaN(n)) return 255;
    return Math.max(0, Math.min(255, n));
  });
  return `rgb(${nums[0]}, ${nums[1]}, ${nums[2]})`;
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState('');
  const [databasePages, setDatabasePages] = useState([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [parentUrl, setParentUrl] = useState('');
  const [subpages, setSubpages] = useState([]);
  const [slides, setSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [refreshingIndex, setRefreshingIndex] = useState(null);
  const [styleConfig, setStyleConfig] = useState({ ...DEFAULT_STYLE_CONFIG });
  const [stylePanelOpen, setStylePanelOpen] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'carousel'
  const [exportingIndex, setExportingIndex] = useState(null); // 声明以避免 ReferenceError（导出方案 1 已移除，保留兼容）
  const carouselRef = useRef(null);
  const slideRefs = useRef([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('error')) {
      setError(params.get('error'));
      window.history.replaceState({}, '', window.location.pathname);
    }
    getMe()
      .then((data) => {
        setConnected(!!data.connected);
        setError(null);
      })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, []);

  // 连接后自动拉取数据库列表
  useEffect(() => {
    if (!connected) return;
    setLoadingDatabases(true);
    setError(null);
    getDatabases()
      .then((data) => {
        setDatabases(data.databases || []);
        setSelectedDatabaseId('');
        setDatabasePages([]);
      })
      .catch((err) => setError(err.message || '获取数据库列表失败'))
      .finally(() => setLoadingDatabases(false));
  }, [connected]);

  // 选择数据库后拉取页面列表
  useEffect(() => {
    if (!selectedDatabaseId) {
      setDatabasePages([]);
      return;
    }
    setLoadingPages(true);
    setError(null);
    getDatabasePages(selectedDatabaseId)
      .then((data) => {
        setDatabasePages(data.pages || []);
      })
      .catch((err) => setError(err.message || '获取页面列表失败'))
      .finally(() => setLoadingPages(false));
  }, [selectedDatabaseId]);

  // Scroll carousel to start when slides are loaded
  useEffect(() => {
    if (slides.length > 0 && carouselRef.current) {
      carouselRef.current.scrollLeft = 0;
    }
  }, [slides]);

  // Load Noto Sans SC from Google Fonts when selected
  useEffect(() => {
    const fontFamily = styleConfig.fontFamily || '';
    if (!fontFamily.includes('Noto Sans SC')) return;
    let link = document.getElementById('font-noto-sans-sc');
    if (link) return;
    link = document.createElement('link');
    link.id = 'font-noto-sans-sc';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&display=swap';
    document.head.appendChild(link);
  }, [styleConfig.fontFamily]);

  const handleConnect = () => {
    window.location.href = getAuthUrl();
  };

  const handleDisconnect = () => {
    disconnect()
      .then(() => setConnected(false))
      .catch(() => {});
  };

  const handleOpenPageFromDatabase = async (page) => {
    setError(null);
    setLoadingSlides(true);
    setSlides([]);
    try {
      const { children } = await getChildPages(page.id);
      if (children && children.length > 0) {
        setSubpages(children);
        const blocksList = [];
        for (const child of children) {
          const { blocks } = await getPageBlocks(child.id);
          blocksList.push({ page: child, blocks: filterBlocks(blocks) });
        }
        setSlides(blocksList);
      } else {
        const { blocks } = await getPageBlocks(page.id);
        setSubpages([{ id: page.id, title: page.title }]);
        setSlides([{ page: { id: page.id, title: page.title }, blocks: filterBlocks(blocks) }]);
      }
      setTimeout(() => {
        if (carouselRef.current) carouselRef.current.scrollLeft = 0;
      }, 100);
      setView('carousel');
    } catch (err) {
      setError(err.message || '加载页面失败');
    } finally {
      setLoadingSlides(false);
    }
  };

  const handleLoadSubpages = async () => {
    if (!parentUrl.trim()) {
      setError('请输入父页面 URL');
      return;
    }
    setError(null);
    setLoadingSlides(true);
    setSlides([]);
    try {
      const { children } = await getChildPages(parentUrl.trim());
      setSubpages(children);
      if (children.length === 0) {
        setLoadingSlides(false);
        return;
      }
      const blocksList = [];
      for (const page of children) {
        const { blocks } = await getPageBlocks(page.id);
        blocksList.push({ page, blocks: filterBlocks(blocks) });
      }
      setSlides(blocksList);
      setTimeout(() => {
        if (carouselRef.current) carouselRef.current.scrollLeft = 0;
      }, 100);
      setView('carousel');
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoadingSlides(false);
    }
  };

  const getExportOptions = () => ({
    width: 1080,
    height: 1350,
    scale: 1,
    useCORS: true,
    allowTaint: true,
    backgroundColor: styleConfig.bgColor,
    logging: false,
    windowWidth: 1080,
    windowHeight: 1350,
    onclone: (clonedDoc, clonedEl) => {
      clonedEl.style.transform = 'none';
      clonedEl.style.width = '1080px';
      clonedEl.style.height = '1350px';
      let parent = clonedEl.parentElement;
      while (parent && parent !== clonedDoc.body) {
        parent.style.transform = 'none';
        parent.style.width = 'auto';
        parent.style.height = 'auto';
        parent.style.overflow = 'visible';
        parent = parent.parentElement;
      }
    },
  });

  const handleRefreshSlide = async (index) => {
    const slide = slides[index];
    if (!slide?.page?.id) return;
    setRefreshingIndex(index);
    setError(null);
    try {
      const { blocks } = await getPageBlocks(slide.page.id);
      setSlides((prev) =>
        prev.map((s, j) => (j === index ? { ...s, blocks: filterBlocks(blocks) } : s))
      );
    } catch (err) {
      setError('刷新失败: ' + (err.message || '未知错误'));
    } finally {
      setRefreshingIndex(null);
    }
  };

  const handleDownloadOne = async (index) => {
    const el = slideRefs.current[index];
    if (!el) return;
    setDownloadStatus(`正在导出第 ${index + 1} 张…`);
    try {
      const canvas = await html2canvas(el, getExportOptions());
      const indexName = String(index + 1).padStart(2, '0');
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${indexName}.jpg`;
      a.click();
      setDownloadStatus('已下载');
      setTimeout(() => setDownloadStatus(null), 1500);
    } catch (err) {
      setDownloadStatus(null);
      setError('导出失败: ' + (err.message || '未知错误'));
    }
  };

  const handleDownloadAll = async () => {
    if (slides.length === 0) return;
    setDownloadStatus('正在生成图片…');
    try {
      for (let i = 0; i < slideRefs.current.length; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;
        setDownloadStatus(`正在导出 ${i + 1}/${slides.length}…`);
        const canvas = await html2canvas(el, getExportOptions());
        const indexName = String(i + 1).padStart(2, '0');
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${indexName}.jpg`;
        a.click();
      }
      setDownloadStatus('全部下载完成');
      setTimeout(() => setDownloadStatus(null), 2000);
    } catch (err) {
      setDownloadStatus(null);
      setError('导出失败: ' + (err.message || '未知错误'));
    }
  };

  if (loading) {
  return (
      <div style={styles.center}>
        <p>加载中…</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div style={styles.center}>
        <h1 style={styles.title}>Notion Carousel</h1>
        <p style={styles.subtitle}>将 Notion 子页面转为可下载的轮播图</p>
        {error && <p style={styles.errorMsg}>{error}</p>}
        <button type="button" onClick={handleConnect} style={styles.primaryBtn}>
          Connect Notion
        </button>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        {view === 'carousel' && slides.length > 0 ? (
          <button type="button" onClick={() => setView('list')} style={styles.textBtn}>
            ← 返回
          </button>
        ) : (
          <span style={{ width: 48 }} />
        )}
        <h1 style={styles.appTitle}>Notion Carousel</h1>
        <button type="button" onClick={handleDisconnect} style={styles.textBtn}>
          断开 Notion
        </button>
      </header>

      {view !== 'carousel' && (
      <>
      <section style={styles.section}>
        <label style={styles.label}>从数据库选择页面</label>
        <div style={styles.inputRow}>
          <select
            value={selectedDatabaseId}
            onChange={(e) => setSelectedDatabaseId(e.target.value)}
            disabled={loadingDatabases}
            style={{ ...styles.input, flex: 1, maxWidth: 400 }}
          >
            <option value="">
              {loadingDatabases ? '加载数据库中…' : '选择数据库'}
            </option>
            {databases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.title || 'Untitled'}
              </option>
            ))}
          </select>
        </div>
        {!loadingDatabases && databases.length === 0 && !error && (
          <p style={styles.hint}>
            未找到数据库。请在 Notion 中打开要使用的数据库，点击右上角「···」→「连接」→ 选择本应用并添加。
          </p>
        )}
        {selectedDatabaseId && (
          <div style={styles.pageList}>
            {loadingPages ? (
              <p style={styles.hint}>加载页面列表中…</p>
            ) : databasePages.length === 0 ? (
              <p style={styles.hint}>该数据库下暂无页面，或暂无权限。</p>
            ) : (
              <>
                <p style={styles.label}>点击页面进入编辑 / 导出：</p>
                <ul style={styles.pageListUl}>
                  {databasePages.map((page) => (
                    <li key={page.id} style={styles.pageListItem}>
                      <button
                        type="button"
                        style={styles.pageListBtn}
                        onClick={() => handleOpenPageFromDatabase(page)}
                        disabled={loadingSlides}
                      >
                        {page.title || 'Untitled'}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>

      <section style={styles.section}>
        <label style={styles.label}>
          或：父页面 URL（包含子页面的 Notion 页面链接）
        </label>
        <div style={styles.inputRow}>
          <input
            type="url"
            value={parentUrl}
            onChange={(e) => setParentUrl(e.target.value)}
            placeholder="https://www.notion.so/..."
            style={styles.input}
          />
          <button
            type="button"
            onClick={handleLoadSubpages}
            disabled={loadingSlides}
            style={styles.primaryBtn}
          >
            {loadingSlides ? '加载中…' : '加载子页面'}
          </button>
        </div>
        {error && <p style={styles.errorMsg}>{error}</p>}
      </section>

      {connected && subpages.length === 0 && !loadingSlides && parentUrl && (
        <p style={styles.hint}>该页面下没有子页面，或暂无权限访问。</p>
      )}
      </>
      )}

      {slides.length > 0 && (
        <>
          <section style={styles.section}>
            <div style={styles.carouselHeader}>
              <span>共 {slides.length} 张幻灯片</span>
              <div style={styles.carouselActions}>
                <button
                  type="button"
                  onClick={() => setStylePanelOpen(true)}
                  style={styles.gearBtn}
                  title="样式设置"
                  aria-label="样式设置"
                >
                  ⚙️
                </button>
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  style={styles.primaryBtn}
                >
                  Download All
                </button>
              </div>
            </div>
            {downloadStatus && <p style={styles.status}>{downloadStatus}</p>}
            <div ref={carouselRef} style={styles.carousel}>
              {slides.map(({ page, blocks }, i) => (
                <div key={page.id} style={styles.slideWrapper}>
                  <div style={styles.slidePreviewWrapper}>
                    <div ref={(el) => (slideRefs.current[i] = el)} style={styles.slideContainer}>
                      <Slide
                        blocks={blocks}
                        getProxyImageUrl={getProxyImageUrl}
                        styleConfig={styleConfig}
                      />
                    </div>
                  </div>
                  <div style={styles.slideInfo}>
                    <p style={styles.slideNumber}>{i + 1}/{slides.length}</p>
                    <p style={styles.slideLabel}>{page.title}</p>
                    <div style={styles.slideActions}>
                      <button
                        type="button"
                        onClick={() => handleRefreshSlide(i)}
                        disabled={refreshingIndex === i}
                        style={styles.refreshOneBtn}
                        title="从 Notion 重新拉取本页内容"
                      >
                        {refreshingIndex === i ? '刷新中…' : '刷新'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadOne(i)}
                        style={styles.downloadOneBtn}
                      >
                        下载
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <StyleSettingsPanel
        open={stylePanelOpen}
        onClose={() => setStylePanelOpen(false)}
        styleConfig={styleConfig}
        setStyleConfig={setStyleConfig}
        defaultStyleConfig={DEFAULT_STYLE_CONFIG}
      />
    </div>
  );
}

const styles = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    fontFamily: "'Inter', sans-serif",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a1a',
    margin: 0,
  },
  subtitle: {
    color: '#666',
    margin: 0,
  },
  app: {
    fontFamily: "'Inter', sans-serif",
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    paddingBottom: 48,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #eee',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
  },
  textBtn: {
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontSize: 14,
  },
  section: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: 24,
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontWeight: 500,
    color: '#333',
  },
  inputRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 16,
    border: '1px solid #ccc',
    borderRadius: 8,
  },
  primaryBtn: {
    padding: '10px 20px',
    fontSize: 16,
    fontWeight: 600,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  errorMsg: {
    color: '#c00',
    marginTop: 12,
    marginBottom: 0,
  },
  carouselHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  carouselActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  gearBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    padding: 4,
    lineHeight: 1,
  },
  status: {
    marginBottom: 12,
    color: '#666',
  },
  carousel: {
    display: 'flex',
    gap: 24,
    overflowX: 'auto',
    overflowY: 'visible',
    padding: '16px 24px',
    width: '100%',
    scrollBehavior: 'smooth',
  },
  slideWrapper: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  slidePreviewWrapper: {
    width: 400, // Preview width
    height: 500, // Preview height (maintains 1080:1350 ratio)
    position: 'relative',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.1)',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  slideContainer: {
    width: 1080,
    height: 1350,
    transform: 'scale(0.37037)', // 400/1080 ≈ 0.37037
    transformOrigin: 'top left',
  },
  slideInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    width: '100%',
    maxWidth: 400,
  },
  slideNumber: {
    fontSize: 12,
    fontWeight: 600,
    color: '#666',
    margin: 0,
  },
  slideLabel: {
    fontSize: 14,
    color: '#333',
    margin: 0,
    textAlign: 'center',
    wordBreak: 'break-word',
  },
  slideActions: {
    marginTop: 8,
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
  },
  refreshOneBtn: {
    padding: '6px 12px',
    fontSize: 13,
    backgroundColor: '#fff',
    color: '#1a1a1a',
    border: '1px solid #ccc',
    borderRadius: 6,
    cursor: 'pointer',
  },
  downloadOneBtn: {
    padding: '6px 12px',
    fontSize: 13,
    backgroundColor: '#fff',
    color: '#1a1a1a',
    border: '1px solid #ccc',
    borderRadius: 6,
    cursor: 'pointer',
  },
  hint: {
    textAlign: 'center',
    color: '#666',
    padding: 24,
  },
  pageList: {
    marginTop: 12,
  },
  pageListUl: {
    listStyle: 'none',
    padding: 0,
    margin: '8px 0 0',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  pageListItem: {
    margin: 0,
  },
  pageListBtn: {
    padding: '8px 14px',
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#1a1a1a',
    border: '1px solid #ccc',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    maxWidth: 320,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
