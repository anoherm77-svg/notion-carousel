import { useState, useEffect, useRef } from 'react';
import { getMe, getAuthUrl, disconnect, getChildPages, getPageBlocks, getProxyImageUrl } from './api';
import { Slide } from './Slide';
import html2canvas from 'html2canvas';

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
  const [parentUrl, setParentUrl] = useState('');
  const [subpages, setSubpages] = useState([]);
  const [slides, setSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [bgRgb, setBgRgb] = useState('255,255,255'); // R,G,B
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

  // Scroll carousel to start when slides are loaded
  useEffect(() => {
    if (slides.length > 0 && carouselRef.current) {
      carouselRef.current.scrollLeft = 0;
    }
  }, [slides]);

  const handleConnect = () => {
    window.location.href = getAuthUrl();
  };

  const handleDisconnect = () => {
    disconnect()
      .then(() => setConnected(false))
      .catch(() => {});
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
      // Scroll to start when slides are loaded
      setTimeout(() => {
        if (carouselRef.current) {
          carouselRef.current.scrollLeft = 0;
        }
      }, 100);
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoadingSlides(false);
    }
  };

  const handleDownloadAll = async () => {
    if (slides.length === 0) return;
    setDownloadStatus('正在生成图片…');
    // Scale factor: 1080/400 = 2.7 (to get full resolution from scaled preview)
    const exportScale = 1080 / 400;
    const bgColor = parseRgbString(bgRgb);
    const options = {
      scale: exportScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: bgColor,
      logging: false,
    };
    try {
      for (let i = 0; i < slideRefs.current.length; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;
        setDownloadStatus(`正在导出 ${i + 1}/${slides.length}…`);
        const canvas = await html2canvas(el, options);
        const indexName = String(i + 1).padStart(2, '0');
        // 只导出 JPG
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
        <h1 style={styles.appTitle}>Notion Carousel</h1>
        <button type="button" onClick={handleDisconnect} style={styles.textBtn}>
          断开 Notion
        </button>
      </header>

      <section style={styles.section}>
        <label style={styles.label}>
          父页面 URL（包含子页面的 Notion 页面链接）
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

      {slides.length > 0 && (
        <>
          <section style={styles.section}>
            <div style={styles.carouselHeader}>
              <span>共 {slides.length} 张幻灯片</span>
              <div style={styles.bgControl}>
                <span style={styles.bgLabel}>背景 RGB</span>
                <input
                  type="text"
                  value={bgRgb}
                  onChange={(e) => setBgRgb(e.target.value)}
                  placeholder="255,255,255"
                  style={styles.bgInput}
                />
              </div>
              <button
                type="button"
                onClick={handleDownloadAll}
                style={styles.primaryBtn}
              >
                Download All
              </button>
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
                        backgroundColor={parseRgbString(bgRgb)}
                      />
                    </div>
                  </div>
                  <div style={styles.slideInfo}>
                    <p style={styles.slideNumber}>{i + 1}/{slides.length}</p>
                    <p style={styles.slideLabel}>{page.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {connected && subpages.length === 0 && !loadingSlides && parentUrl && (
        <p style={styles.hint}>该页面下没有子页面，或暂无权限访问。</p>
      )}
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
  status: {
    marginBottom: 12,
    color: '#666',
  },
  bgControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  bgLabel: {
    fontSize: 12,
    color: '#666',
  },
  bgInput: {
    width: 90,
    fontSize: 12,
    padding: '4px 6px',
    borderRadius: 4,
    border: '1px solid #ccc',
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
  hint: {
    textAlign: 'center',
    color: '#666',
    padding: 24,
  },
};
