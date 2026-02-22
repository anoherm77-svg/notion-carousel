import { useState, useEffect } from 'react';

const panelStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 999,
    pointerEvents: 'none',
  },
  drawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 320,
    maxWidth: '90vw',
    height: '100vh',
    backgroundColor: '#f0f0f0',
    boxShadow: '4px 0 20px rgba(0,0,0,0.12)',
    zIndex: 1000,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    color: '#666',
    cursor: 'pointer',
    padding: 4,
    lineHeight: 1,
  },
  body: {
    padding: 16,
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 10,
    marginTop: 0,
  },
  row: {
    marginBottom: 10,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    fontSize: 13,
    border: '1px solid #ccc',
    borderRadius: 4,
    boxSizing: 'border-box',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  slider: {
    flex: 1,
    minWidth: 0,
  },
  sliderValue: {
    fontSize: 12,
    color: '#555',
    minWidth: 36,
    textAlign: 'right',
  },
  select: {
    width: '100%',
    padding: '6px 8px',
    fontSize: 13,
    border: '1px solid #ccc',
    borderRadius: 4,
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  resetBtn: {
    marginTop: 8,
    width: '100%',
    padding: '10px',
    fontSize: 13,
    fontWeight: 500,
    backgroundColor: '#fff',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: 6,
    cursor: 'pointer',
  },
};

const FONT_OPTIONS = [
  { value: 'inter', label: 'Inter', fontFamily: 'Inter, sans-serif' },
  { value: 'noto', label: 'Noto Sans SC', fontFamily: "'Noto Sans SC', sans-serif" },
  { value: 'georgia', label: 'Georgia', fontFamily: 'Georgia, serif' },
  { value: 'system', label: 'system-ui', fontFamily: 'system-ui, sans-serif' },
];

function fontFamilyToOption(fontFamily) {
  const lower = (fontFamily || '').toLowerCase();
  if (lower.includes('noto')) return 'noto';
  if (lower.includes('georgia')) return 'georgia';
  if (lower.includes('system-ui')) return 'system';
  return 'inter';
}

function Section({ id, title, children, isCollapsed, onToggle }) {
  return (
    <div style={panelStyles.section}>
      <button
        type="button"
        style={{
          ...panelStyles.sectionTitle,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onClick={() => onToggle(id)}
      >
        {title}
        <span style={{ fontSize: 10 }}>{isCollapsed ? '▶' : '▼'}</span>
      </button>
      {!isCollapsed && children}
    </div>
  );
}

function NumberInput({ label, value, onChange, inputMode = 'numeric' }) {
  const displayValue = value === undefined || value === null ? '' : String(value);
  return (
    <div style={panelStyles.row}>
      <label style={panelStyles.label}>{label}</label>
      <input
        type="text"
        inputMode={inputMode}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        style={panelStyles.input}
      />
    </div>
  );
}

export function StyleSettingsPanel({ open, onClose, styleConfig, setStyleConfig, defaultStyleConfig }) {
  const [collapsedSections, setCollapsedSections] = useState({});

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const update = (partial) => {
    setStyleConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleReset = () => {
    setStyleConfig({ ...defaultStyleConfig });
  };

  if (!open) return null;

  return (
    <>
      <div
        style={{ ...panelStyles.overlay, pointerEvents: 'auto' }}
        onClick={onClose}
        aria-hidden
      />
      <div style={panelStyles.drawer} role="dialog" aria-label="样式设置">
        <div style={panelStyles.header}>
          <h2 style={panelStyles.title}>样式设置</h2>
          <button type="button" onClick={onClose} style={panelStyles.closeBtn} aria-label="关闭">
            ×
          </button>
        </div>
        <div style={panelStyles.body}>
          <Section id="margins" title="📐 页边距" isCollapsed={collapsedSections.margins} onToggle={toggleSection}>
            <NumberInput label="上 (px)" value={styleConfig.paddingTop} onChange={(v) => update({ paddingTop: v })} />
            <NumberInput label="下 (px)" value={styleConfig.paddingBottom} onChange={(v) => update({ paddingBottom: v })} />
            <NumberInput label="左 (px)" value={styleConfig.paddingLeft} onChange={(v) => update({ paddingLeft: v })} />
            <NumberInput label="右 (px)" value={styleConfig.paddingRight} onChange={(v) => update({ paddingRight: v })} />
          </Section>

          <Section id="headings" title="🔤 标题" isCollapsed={collapsedSections.headings} onToggle={toggleSection}>
            <NumberInput label="H1 字号 (px)" value={styleConfig.heading1Size} onChange={(v) => update({ heading1Size: v })} />
            <NumberInput label="H2 字号 (px)" value={styleConfig.heading2Size} onChange={(v) => update({ heading2Size: v })} />
            <NumberInput label="H3 字号 (px)" value={styleConfig.heading3Size} onChange={(v) => update({ heading3Size: v })} />
            <NumberInput label="标题行高" value={styleConfig.headingLineHeight} onChange={(v) => update({ headingLineHeight: v })} inputMode="decimal" />
          </Section>

          <Section id="body" title="📝 正文" isCollapsed={collapsedSections.body} onToggle={toggleSection}>
            <NumberInput label="正文字号 (px)" value={styleConfig.bodySize} onChange={(v) => update({ bodySize: v })} />
            <NumberInput label="正文行高" value={styleConfig.bodyLineHeight} onChange={(v) => update({ bodyLineHeight: v })} inputMode="decimal" />
            <NumberInput label="块间距 (px)" value={styleConfig.bodySpacing} onChange={(v) => update({ bodySpacing: v })} />
          </Section>

          <Section id="colors" title="🎨 颜色与字体" isCollapsed={collapsedSections.colors} onToggle={toggleSection}>
            <div style={panelStyles.row}>
              <label style={panelStyles.label}>背景色</label>
              <input
                type="text"
                value={styleConfig.bgColor ?? '#FFFFFF'}
                onChange={(e) => update({ bgColor: e.target.value })}
                placeholder="#FFFFFF 或 rgb(255,255,255)"
                style={panelStyles.input}
              />
            </div>
            <div style={panelStyles.row}>
              <label style={panelStyles.label}>文字颜色</label>
              <input
                type="text"
                value={styleConfig.textColor ?? '#37352F'}
                onChange={(e) => update({ textColor: e.target.value })}
                placeholder="#37352F"
                style={panelStyles.input}
              />
            </div>
            <div style={panelStyles.row}>
              <label style={panelStyles.label}>字体</label>
              <select
                value={fontFamilyToOption(styleConfig.fontFamily)}
                onChange={(e) => {
                  const opt = FONT_OPTIONS.find((o) => o.value === e.target.value);
                  if (opt) update({ fontFamily: opt.fontFamily });
                }}
                style={panelStyles.select}
              >
                {FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </Section>

          <button type="button" onClick={handleReset} style={panelStyles.resetBtn}>
            恢复默认
          </button>
        </div>
      </div>
    </>
  );
}
