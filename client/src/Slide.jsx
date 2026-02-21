import { getPlainText, getImageUrl } from './utils/notion';

const PADDING = 100;
const CONTENT_WIDTH = 880; // 1080 - 100*2
const CONTENT_HEIGHT = 1150; // 1350 - 100*2
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const MAX_IMAGE_HEIGHT = 600;

const NOTION_TEXT_COLORS = {
  gray: '#9B9A97',
  brown: '#64473A',
  orange: '#D9730D',
  yellow: '#DFAB01',
  green: '#0F7B6C',
  blue: '#0B6E99',
  purple: '#6940A5',
  pink: '#AD1A72',
  red: '#E03E3E',
};

const NOTION_BG_COLORS = {
  gray_background: '#EBECED',
  brown_background: '#E9E5E3',
  orange_background: '#FAEBDD',
  yellow_background: '#FBF3DB',
  green_background: '#DDEDEA',
  blue_background: '#DDEBF1',
  purple_background: '#EAE4F2',
  pink_background: '#F4DFEB',
  red_background: '#FBE4E4',
};

const slideStyles = {
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#FFFFFF',
  padding: PADDING,
  boxSizing: 'border-box',
  fontFamily: "'Inter', sans-serif",
  overflow: 'hidden',
  position: 'relative',
};

const contentStyles = {
  width: CONTENT_WIDTH,
  height: CONTENT_HEIGHT,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  textAlign: 'left',
};

function renderRichText(richText) {
  if (!Array.isArray(richText) || richText.length === 0) return null;
  return richText.map((segment, index) => {
    const { annotations = {}, plain_text } = segment;
    if (!plain_text) return null;
    const style = {};

    if (annotations.bold) style.fontWeight = 600;
    if (annotations.italic) style.fontStyle = 'italic';

    const decorations = [];
    if (annotations.underline) decorations.push('underline');
    if (annotations.strikethrough) decorations.push('line-through');
    if (decorations.length) style.textDecoration = decorations.join(' ');

    if (annotations.code) {
      return (
        <code
          key={index}
          style={{
            backgroundColor: '#F7F6F3',
            color: '#37352F',
            padding: '4px 8px',
            borderRadius: 4,
            fontFamily:
              'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 38,
          }}
        >
          {plain_text}
        </code>
      );
    }

    const color = annotations.color;
    if (color && color !== 'default') {
      if (color.endsWith('_background')) {
        style.backgroundColor = NOTION_BG_COLORS[color] || style.backgroundColor;
      } else {
        style.color = NOTION_TEXT_COLORS[color] || style.color;
      }
    }

    return (
      <span key={index} style={style}>
        {plain_text}
      </span>
    );
  });
}

export function Slide({ blocks, getProxyImageUrl, backgroundColor }) {
  const proxy = getProxyImageUrl || ((url) => url);

  // Precompute numbering for top-level numbered list items
  const numbering = new Map();
  let counter = 0;
  blocks.forEach((b, idx) => {
    if (b.type === 'numbered_list_item') {
      if (idx === 0 || blocks[idx - 1].type !== 'numbered_list_item') {
        counter = 1;
      } else {
        counter += 1;
      }
      numbering.set(b.id, counter);
    }
  });

  return (
    <div
      className="slide-canvas"
      style={{
        ...slideStyles,
        backgroundColor: backgroundColor || slideStyles.backgroundColor,
      }}
    >
      <div style={contentStyles}>
        {blocks.map((block) => (
          <BlockNode key={block.id} block={block} proxy={proxy} numbering={numbering} />
        ))}
      </div>
    </div>
  );
}

function BlockNode({ block, proxy, numbering }) {
  if (block.type === 'heading_1') {
    const nodes = renderRichText(block.heading_1?.rich_text);
    return <h1 style={styles.h1}>{nodes}</h1>;
  }
  if (block.type === 'heading_2') {
    const nodes = renderRichText(block.heading_2?.rich_text);
    return <h2 style={styles.h2}>{nodes}</h2>;
  }
  if (block.type === 'heading_3') {
    const nodes = renderRichText(block.heading_3?.rich_text);
    return <h3 style={styles.h3}>{nodes}</h3>;
  }
  if (block.type === 'paragraph') {
    const nodes = renderRichText(block.paragraph?.rich_text);
    if (!nodes) return null;
    return <p style={styles.paragraph}>{nodes}</p>;
  }
  if (block.type === 'bulleted_list_item') {
    const nodes = renderRichText(block.bulleted_list_item?.rich_text);
    const nested = block.nested || [];
    return (
      <div style={styles.bulletWrap}>
        <div style={styles.bulletItem}>
          <div style={styles.numberIndex}>
            <div style={styles.bulletDot} />
          </div>
          <span style={styles.bulletText}>{nodes}</span>
        </div>
        {nested.map((n) => (
          <div key={n.id} style={styles.nestedWrap}>
            <div style={styles.nestedDot} />
            <span style={styles.nestedText}>
              {renderRichText(
                n.bulleted_list_item?.rich_text || n.numbered_list_item?.rich_text,
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (block.type === 'numbered_list_item') {
    const nodes = renderRichText(block.numbered_list_item?.rich_text);
    const nested = block.nested || [];
    const index = numbering?.get(block.id) ?? 1;
    return (
      <div style={styles.numberWrap}>
        <div style={styles.numberItem}>
          <span style={styles.numberIndex}>{index}.</span>
          <span style={styles.bulletText}>{nodes}</span>
        </div>
        {nested.map((n, nestedIdx) => {
          const letter = String.fromCharCode('a'.charCodeAt(0) + nestedIdx);
          return (
            <div key={n.id} style={styles.nestedNumberWrap}>
              <span style={styles.nestedNumberIndex}>{letter}.</span>
              <span style={styles.nestedText}>
                {renderRichText(
                  n.numbered_list_item?.rich_text || n.bulleted_list_item?.rich_text,
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  if (block.type === 'divider') {
    return <div style={styles.divider} />;
  }
  if (block.type === 'quote') {
    const nodes = renderRichText(block.quote?.rich_text);
    if (!nodes) return null;
    return (
      <div style={styles.quote}>
        <p style={styles.quoteText}>{nodes}</p>
      </div>
    );
  }
  if (block.type === 'callout') {
    const callout = block.callout || {};
    const nodes = renderRichText(callout.rich_text);
    if (!nodes) return null;
    const icon = callout.icon;
    let iconNode = null;
    if (icon?.type === 'emoji' && icon.emoji) {
      iconNode = icon.emoji;
    } else if (icon?.type === 'external' && icon.external?.url) {
      iconNode = (
        <img
          src={icon.external.url}
          alt=""
          style={styles.calloutIconImage}
        />
      );
    } else if (icon?.type === 'file' && icon.file?.url) {
      iconNode = (
        <img
          src={icon.file.url}
          alt=""
          style={styles.calloutIconImage}
        />
      );
    } else if (typeof icon?.emoji === 'string') {
      iconNode = icon.emoji;
    } else {
      iconNode = '💡';
    }

    // 根据 callout 颜色设置背景 / 边框 / 文本色
    const colorKey = callout.color || 'default';
    let calloutStyle = { ...styles.callout };
    let calloutTextStyle = { ...styles.calloutBody };
    if (!colorKey || colorKey === 'default') {
      calloutStyle = {
        ...calloutStyle,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E0E0E0',
      };
    } else if (colorKey.endsWith('_background')) {
      const bg = NOTION_BG_COLORS[colorKey];
      calloutStyle = {
        ...calloutStyle,
        backgroundColor: bg || '#FFFFFF',
      };
    } else {
      const textColor = NOTION_TEXT_COLORS[colorKey] || '#37352F';
      calloutStyle = {
        ...calloutStyle,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E0E0E0',
      };
      calloutTextStyle = {
        ...calloutTextStyle,
        color: textColor,
      };
    }

    return (
      <div style={calloutStyle}>
        <div style={styles.calloutIcon}>{iconNode}</div>
        <div style={calloutTextStyle}>{nodes}</div>
      </div>
    );
  }
  if (block.type === 'column_list') {
    const columns = block.columns || [];
    if (!columns.length) return null;
    const ratios = columns.map((c) =>
      typeof c.ratio === 'number' && c.ratio > 0 ? c.ratio : 1,
    );
    const totalRatio = ratios.reduce((sum, r) => sum + r, 0) || columns.length || 1;
    return (
      <div style={styles.columns}>
        {columns.map((col, idx) => {
          const flexGrow = ratios[idx] / totalRatio;
          return (
            <div
              key={col.id}
              style={{
                ...styles.column,
                flexGrow,
                flexBasis: 0,
                minWidth: 0,
              }}
            >
              {col.blocks.map((child) => (
                <BlockNode
                  key={child.id}
                  block={child}
                  proxy={proxy}
                  numbering={numbering}
                />
              ))}
            </div>
          );
        })}
      </div>
    );
  }
  if (block.type === 'image') {
    const url = getImageUrl(block);
    if (!url) return null;
    const src = proxy(url);
    return (
      <div style={styles.imageWrap}>
        <img
          src={src}
          alt=""
          style={styles.image}
          crossOrigin="anonymous"
        />
      </div>
    );
  }
  return null;
}

const styles = {
  h1: {
    fontSize: 72,
    fontWeight: 600,
    lineHeight: 1.3,
    color: '#37352F',
    margin: 0,
    marginBottom: 36,
  },
  h2: {
    fontSize: 56,
    fontWeight: 600,
    lineHeight: 1.3,
    color: '#37352F',
    margin: 0,
    marginBottom: 28,
  },
  h3: {
    fontSize: 44,
    fontWeight: 600,
    lineHeight: 1.3,
    color: '#37352F',
    margin: 0,
    marginBottom: 24,
  },
  paragraph: {
    fontSize: 44,
    fontWeight: 400,
    lineHeight: 1.6,
    color: '#37352F',
    margin: 0,
    marginBottom: 20,
  },
  bulletWrap: {
    marginBottom: 20,
  },
  bulletItem: {
    fontSize: 44,
    fontWeight: 400,
    lineHeight: 1.6,
    color: '#37352F',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 20,
  },
  bulletDot: {
    flexShrink: 0,
    width: 14,
    height: 14,
    borderRadius: '50%',
    backgroundColor: '#37352F', // filled circle
    marginTop: 28,
  },
  bulletText: {
    flex: 1,
  },
  numberWrap: {
    marginBottom: 20,
  },
  numberItem: {
    fontSize: 44,
    fontWeight: 400,
    lineHeight: 1.6,
    color: '#37352F',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 22,
  },
  numberIndex: {
    flexShrink: 0,
    width: 36,
    textAlign: 'right',
  },
  nestedWrap: {
    fontSize: 44,
    fontWeight: 400,
    lineHeight: 1.6,
    color: '#37352F',
    marginLeft: 66,
    marginTop: 16,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 35,
  },
  nestedDot: {
    flexShrink: 0,
    width: 14,
    height: 14,
    border: '1.5px solid #37352F',
    borderRadius: '50%', // hollow circle
    backgroundColor: 'transparent',
    marginTop: 28,
  },
  nestedText: {
    flex: 1,
  },
  nestedNumberWrap: {
    fontSize: 44,
    fontWeight: 400,
    lineHeight: 1.6,
    color: '#37352F',
    marginLeft: 66,
    marginTop: 16,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 22,
  },
  nestedNumberIndex: {
    flexShrink: 0,
    width: 36,
    textAlign: 'right',
  },
  divider: {
    width: '100%',
    borderTop: '1px solid #D3D1CB',
    marginTop: 16,
    marginBottom: 24,
  },
  quote: {
    borderLeft: '5px solid #37352F',
    paddingLeft: 24,
    marginBottom: 28,
  },
  quoteText: {
    fontSize: 44,
    fontWeight: 400,
    lineHeight: 1.6,
    color: '#37352F',
    margin: 0,
  },
  callout: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    padding: 24,
    marginBottom: 28,
  },
  calloutIcon: {
    fontSize: 40,
    lineHeight: 1,
  },
  calloutIconImage: {
    height: '1em',
    width: '1em',
    display: 'inline-block',
    verticalAlign: 'middle',
  },
  calloutBody: {
    fontSize: 44,
    fontWeight: 400,
    lineHeight: 1.6,
    color: '#37352F',
    flex: 1,
  },
  columns: {
    display: 'flex',
    gap: 16,
    width: '100%',
    marginBottom: 28,
  },
  column: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  imageWrap: {
    width: '100%',
    marginBottom: 28,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    maxWidth: '100%',
    width: '100%',
    height: 'auto',
    maxHeight: MAX_IMAGE_HEIGHT,
    objectFit: 'contain',
    display: 'block',
  },
};
