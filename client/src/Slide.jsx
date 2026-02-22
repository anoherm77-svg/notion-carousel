import { useState, useCallback, useMemo } from 'react';
import { getPlainText, getImageUrl } from './utils/notion';

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;

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

function clampNum(v, min, max, def) {
  const n = Number(v);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function getStylesFromConfig(c) {
  const paddingTop = clampNum(c.paddingTop, 0, 500, 100);
  const paddingBottom = clampNum(c.paddingBottom, 0, 500, 100);
  const paddingLeft = clampNum(c.paddingLeft, 0, 500, 100);
  const paddingRight = clampNum(c.paddingRight, 0, 500, 100);
  const contentWidth = CANVAS_WIDTH - paddingLeft - paddingRight;
  const contentHeight = CANVAS_HEIGHT - paddingTop - paddingBottom;
  return {
    slideStyles: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: c.bgColor ?? '#FFFFFF',
      paddingTop,
      paddingBottom,
      paddingLeft,
      paddingRight,
      boxSizing: 'border-box',
      fontFamily: c.fontFamily ?? "'Inter', sans-serif",
      overflow: 'hidden',
      position: 'relative',
    },
    contentStyles: {
      width: contentWidth,
      height: contentHeight,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      textAlign: 'left',
      whiteSpace: 'pre-wrap',
    },
    contentWidth,
    contentHeight,
    blockStyles: {
      h1: {
        fontSize: clampNum(c.heading1Size, 12, 200, 72),
        fontWeight: c.headingWeight ?? 600,
        lineHeight: clampNum(c.headingLineHeight, 0.5, 3, 1.3),
        color: c.textColor ?? '#37352F',
        margin: 0,
        marginBottom: clampNum(c.heading1Spacing, 0, 100, 36),
        whiteSpace: 'pre-wrap',
      },
      h2: {
        fontSize: clampNum(c.heading2Size, 12, 200, 56),
        fontWeight: c.headingWeight ?? 600,
        lineHeight: clampNum(c.headingLineHeight, 0.5, 3, 1.3),
        color: c.textColor ?? '#37352F',
        margin: 0,
        marginBottom: clampNum(c.heading2Spacing, 0, 100, 28),
        whiteSpace: 'pre-wrap',
      },
      h3: {
        fontSize: clampNum(c.heading3Size, 12, 200, 44),
        fontWeight: c.headingWeight ?? 600,
        lineHeight: clampNum(c.headingLineHeight, 0.5, 3, 1.3),
        color: c.textColor ?? '#37352F',
        margin: 0,
        marginBottom: clampNum(c.heading3Spacing, 0, 100, 24),
        whiteSpace: 'pre-wrap',
      },
      paragraph: {
        fontSize: clampNum(c.bodySize, 12, 120, 44),
        fontWeight: c.bodyWeight ?? 400,
        lineHeight: clampNum(c.bodyLineHeight, 0.5, 4, 1.6),
        color: c.textColor ?? '#37352F',
        margin: 0,
        marginBottom: clampNum(c.bodySpacing, 0, 100, 20),
        whiteSpace: 'pre-wrap',
      },
      bulletWrap: {
        marginBottom: clampNum(c.bodySpacing, 0, 100, 20),
      },
      bulletItem: {
        fontSize: clampNum(c.bodySize, 12, 120, 44),
        fontWeight: c.bodyWeight ?? 400,
        lineHeight: clampNum(c.bodyLineHeight, 0.5, 4, 1.6),
        color: c.textColor ?? '#37352F',
        display: 'flex',
        alignItems: 'flex-start',
        gap: c.listGap ?? 20,
        whiteSpace: 'pre-wrap',
      },
      bulletDot: {
        flexShrink: 0,
        width: c.bulletSize ?? 14,
        height: c.bulletSize ?? 14,
        borderRadius: '50%',
        backgroundColor: c.textColor ?? '#37352F',
        marginTop: c.bulletDotMarginTop ?? 28,
      },
      bulletText: { flex: 1 },
      numberWrap: {
        marginBottom: clampNum(c.bodySpacing, 0, 100, 20),
      },
      numberItem: {
        fontSize: clampNum(c.bodySize, 12, 120, 44),
        fontWeight: c.bodyWeight ?? 400,
        lineHeight: clampNum(c.bodyLineHeight, 0.5, 4, 1.6),
        color: c.textColor ?? '#37352F',
        display: 'flex',
        alignItems: 'flex-start',
        gap: c.numberGap ?? 22,
        whiteSpace: 'pre-wrap',
      },
      numberIndex: {
        flexShrink: 0,
        width: c.numberIndexWidth ?? 36,
        textAlign: 'right',
      },
      nestedWrap: {
        fontSize: clampNum(c.bodySize, 12, 120, 44),
        fontWeight: c.bodyWeight ?? 400,
        lineHeight: clampNum(c.bodyLineHeight, 0.5, 4, 1.6),
        color: c.textColor ?? '#37352F',
        marginLeft: c.nestedIndent ?? 66,
        marginTop: c.nestedSpacing ?? 16,
        marginBottom: c.nestedSpacing ?? 16,
        display: 'flex',
        alignItems: 'flex-start',
        gap: c.nestedGap ?? 22,
        whiteSpace: 'pre-wrap',
      },
      nestedDot: {
        flexShrink: 0,
        width: c.bulletSize ?? 14,
        height: c.bulletSize ?? 14,
        border: `1.5px solid ${c.textColor ?? '#37352F'}`,
        borderRadius: '50%',
        backgroundColor: 'transparent',
        marginTop: c.bulletDotMarginTop ?? 28,
      },
      nestedText: { flex: 1 },
      nestedNumberWrap: {
        fontSize: clampNum(c.bodySize, 12, 120, 44),
        fontWeight: c.bodyWeight ?? 400,
        lineHeight: clampNum(c.bodyLineHeight, 0.5, 4, 1.6),
        color: c.textColor ?? '#37352F',
        marginLeft: c.nestedIndent ?? 66,
        marginTop: c.nestedSpacing ?? 16,
        marginBottom: c.nestedSpacing ?? 16,
        display: 'flex',
        alignItems: 'flex-start',
        gap: c.nestedGap ?? 22,
        whiteSpace: 'pre-wrap',
      },
      nestedNumberIndex: {
        flexShrink: 0,
        width: c.numberIndexWidth ?? 36,
        textAlign: 'right',
      },
      divider: {
        width: '100%',
        borderTop: `1px solid ${c.dividerColor ?? '#D3D1CB'}`,
        marginTop: c.dividerSpacingTop ?? 16,
        marginBottom: c.dividerSpacingBottom ?? 24,
      },
      quote: {
        borderLeft: `${c.quoteBorderWidth ?? 5}px solid ${c.textColor ?? '#37352F'}`,
        paddingLeft: c.quotePaddingLeft ?? 24,
        marginBottom: c.quoteSpacing ?? 28,
      },
      quoteText: {
        fontSize: clampNum(c.bodySize, 12, 120, 44),
        fontWeight: c.bodyWeight ?? 400,
        lineHeight: clampNum(c.bodyLineHeight, 0.5, 4, 1.6),
        color: c.textColor ?? '#37352F',
        margin: 0,
        whiteSpace: 'pre-wrap',
      },
      callout: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: c.calloutGap ?? 16,
        backgroundColor: c.calloutBgColor ?? '#F7F6F3',
        borderRadius: c.calloutBorderRadius ?? 12,
        padding: c.calloutPadding ?? 24,
        marginBottom: c.calloutSpacing ?? 28,
      },
      calloutIcon: {
        fontSize: c.calloutIconSize ?? 40,
        lineHeight: 1,
      },
      calloutIconImage: {
        height: '1em',
        width: '1em',
        display: 'inline-block',
        verticalAlign: 'middle',
      },
      calloutBody: {
        fontSize: clampNum(c.bodySize, 12, 120, 44),
        fontWeight: c.bodyWeight ?? 400,
        lineHeight: clampNum(c.bodyLineHeight, 0.5, 4, 1.6),
        color: c.textColor ?? '#37352F',
        flex: 1,
        whiteSpace: 'pre-wrap',
      },
      columns: {
        display: 'flex',
        gap: c.columnsGap ?? 16,
        width: '100%',
        marginBottom: c.columnsSpacing ?? 28,
      },
      column: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      },
      imageWrap: {
        width: '100%',
        marginBottom: c.imageWrapSpacing ?? 28,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    },
  };
}

function renderRichText(richText, options = {}) {
  if (!Array.isArray(richText) || richText.length === 0) return null;
  const { proxy, emojiSize = 44 } = options;
  return richText.map((segment, index) => {
    if (segment.type === 'mention' && segment.mention?.type === 'custom_emoji') {
      const customEmoji = segment.mention.custom_emoji;
      const url = customEmoji?.url;
      const name = customEmoji?.name || '';
      if (!url) return <span key={index}>{segment.plain_text || name || ''}</span>;
      const size = typeof emojiSize === 'number' ? emojiSize : 44;
      return (
        <img
          key={index}
          src={proxy ? proxy(url) : url}
          alt={name}
          style={{
            width: size,
            height: size,
            verticalAlign: 'middle',
            display: 'inline-block',
          }}
          crossOrigin="anonymous"
        />
      );
    }
    const { annotations = {} } = segment;
    // 优先使用 text.content 保留原始空格，fallback 到 plain_text
    const plainText = (segment.type === 'text' && segment.text?.content) ?? segment.plain_text ?? segment.text?.content ?? '';
    if (plainText === '') return null;
    const style = {};

    if (annotations.bold) style.fontWeight = 600;
    if (annotations.italic) style.fontStyle = 'italic';

    const decorations = [];
    if (annotations.underline) decorations.push('underline');
    if (annotations.strikethrough) decorations.push('line-through');
    if (decorations.length) style.textDecoration = decorations.join(' ');

    if (annotations.code) {
      const c = options.styleConfig || {};
      return (
        <code
          key={index}
          style={{
            backgroundColor: c.codeBgColor ?? '#F7F6F3',
            color: c.textColor ?? '#37352F',
            padding: c.codePadding ?? '4px 8px',
            borderRadius: c.codeBorderRadius ?? 4,
            fontFamily:
              'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: c.codeSize ?? 38,
          }}
        >
          {plainText}
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
        {plainText}
      </span>
    );
  });
}

export function Slide({ blocks, getProxyImageUrl, styleConfig }) {
  const proxy = getProxyImageUrl || ((url) => url);
  const computed = useMemo(() => getStylesFromConfig(styleConfig || {}), [styleConfig]);
  const { slideStyles, contentStyles, blockStyles, contentWidth } = computed;
  const maxImageHeight = styleConfig?.maxImageHeight ?? 600;

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
    <div className="slide-canvas" style={slideStyles}>
      <div style={contentStyles}>
        {blocks.map((block) => (
          <BlockNode
            key={block.id}
            block={block}
            proxy={proxy}
            numbering={numbering}
            blockStyles={blockStyles}
            styleConfig={styleConfig}
            contentWidth={contentWidth}
            maxImageHeight={maxImageHeight}
          />
        ))}
      </div>
    </div>
  );
}

function BlockNode({
  block,
  proxy,
  numbering,
  blockStyles,
  styleConfig,
  contentWidth,
  maxImageHeight,
}) {
  const st = blockStyles || {};
  const richTextOpts = { proxy, styleConfig };
  if (block.type === 'heading_1') {
    const nodes = renderRichText(block.heading_1?.rich_text, richTextOpts);
    return <h1 style={st.h1}>{nodes}</h1>;
  }
  if (block.type === 'heading_2') {
    const nodes = renderRichText(block.heading_2?.rich_text, richTextOpts);
    return <h2 style={st.h2}>{nodes}</h2>;
  }
  if (block.type === 'heading_3') {
    const nodes = renderRichText(block.heading_3?.rich_text, richTextOpts);
    return <h3 style={st.h3}>{nodes}</h3>;
  }
  if (block.type === 'paragraph') {
    const richText = block.paragraph?.rich_text;
    if (!richText || richText.length === 0) {
      const bodySize = clampNum(styleConfig?.bodySize, 12, 120, 44);
      const bodyLineHeight = clampNum(styleConfig?.bodyLineHeight, 0.5, 4, 1.6);
      return (
        <div
          style={{
            height: bodySize * bodyLineHeight,
            marginBottom: 0,
          }}
        />
      );
    }
    const nodes = renderRichText(richText, richTextOpts);
    return <p style={st.paragraph}>{nodes}</p>;
  }
  if (block.type === 'bulleted_list_item') {
    const nodes = renderRichText(block.bulleted_list_item?.rich_text, richTextOpts);
    const nested = block.nested || [];
    return (
      <div style={st.bulletWrap}>
        <div style={st.bulletItem}>
          <div style={st.numberIndex}>
            <div style={st.bulletDot} />
          </div>
          <span style={st.bulletText}>{nodes}</span>
        </div>
        {nested.map((n) => (
          <div key={n.id} style={st.nestedWrap}>
            <div style={st.nestedDot} />
            <span style={st.nestedText}>
              {renderRichText(
                n.bulleted_list_item?.rich_text || n.numbered_list_item?.rich_text,
                richTextOpts,
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (block.type === 'numbered_list_item') {
    const nodes = renderRichText(block.numbered_list_item?.rich_text, richTextOpts);
    const nested = block.nested || [];
    const index = numbering?.get(block.id) ?? 1;
    return (
      <div style={st.numberWrap}>
        <div style={st.numberItem}>
          <span style={st.numberIndex}>{index}.</span>
          <span style={st.bulletText}>{nodes}</span>
        </div>
        {nested.map((n, nestedIdx) => {
          const letter = String.fromCharCode('a'.charCodeAt(0) + nestedIdx);
          return (
            <div key={n.id} style={st.nestedNumberWrap}>
              <span style={st.nestedNumberIndex}>{letter}.</span>
              <span style={st.nestedText}>
                {renderRichText(
                  n.numbered_list_item?.rich_text || n.bulleted_list_item?.rich_text,
                  richTextOpts,
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  if (block.type === 'divider') {
    return <div style={st.divider} />;
  }
  if (block.type === 'quote') {
    const richText = block.quote?.rich_text;
    if (!richText || richText.length === 0) {
      const bodySize = clampNum(styleConfig?.bodySize, 12, 120, 44);
      const bodyLineHeight = clampNum(styleConfig?.bodyLineHeight, 0.5, 4, 1.6);
      return (
        <div
          style={{
            height: bodySize * bodyLineHeight,
            marginBottom: 0,
          }}
        />
      );
    }
    const nodes = renderRichText(richText, richTextOpts);
    return (
      <div style={st.quote}>
        <p style={st.quoteText}>{nodes}</p>
      </div>
    );
  }
  if (block.type === 'callout') {
    const callout = block.callout || {};
    const emojiSize = styleConfig?.calloutIconSize ?? 40;
    const nodes = renderRichText(callout.rich_text, { ...richTextOpts, emojiSize });
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
          style={st.calloutIconImage}
        />
      );
    } else if (icon?.type === 'file' && icon.file?.url) {
      iconNode = (
        <img
          src={icon.file.url}
          alt=""
          style={st.calloutIconImage}
        />
      );
    } else if (typeof icon?.emoji === 'string') {
      iconNode = icon.emoji;
    } else {
      iconNode = '💡';
    }

    // 根据 callout 颜色设置背景 / 边框 / 文本色
    const colorKey = callout.color || 'default';
    let calloutStyle = { ...st.callout };
    let calloutTextStyle = { ...st.calloutBody };
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
        <div style={st.calloutIcon}>{iconNode}</div>
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
      <div style={st.columns}>
        {columns.map((col, idx) => {
          const flexGrow = ratios[idx] / totalRatio;
          return (
            <div
              key={col.id}
              style={{
                ...st.column,
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
                  blockStyles={blockStyles}
                  styleConfig={styleConfig}
                  contentWidth={contentWidth}
                  maxImageHeight={maxImageHeight}
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
    return (
      <SlideImage
        src={proxy(url)}
        wrapStyle={st.imageWrap}
        maxHeight={maxImageHeight}
        contentWidth={contentWidth}
      />
    );
  }
  return null;
}

// 使用显式像素宽高而非 aspect-ratio，因 html2canvas 不支持 aspect-ratio
function SlideImage({ src, wrapStyle, maxHeight, contentWidth = 880 }) {
  const [dims, setDims] = useState(null);
  const onLoad = useCallback((e) => {
    const img = e.target;
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    if (!nw || !nh) return;
    setDims({ nw, nh });
  }, []);
  let containerWidth = contentWidth;
  let containerHeight = maxHeight;
  if (dims) {
    const scaledHeight = (dims.nh / dims.nw) * contentWidth;
    if (scaledHeight > maxHeight) {
      containerHeight = maxHeight;
      containerWidth = (dims.nw / dims.nh) * maxHeight;
    } else {
      containerHeight = scaledHeight;
      containerWidth = contentWidth;
    }
  }
  const wrapStyleFinal = {
    ...wrapStyle,
    width: containerWidth + 'px',
    height: dims ? containerHeight + 'px' : 'auto',
    overflow: 'hidden',
  };
  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  };
  return (
    <div style={wrapStyleFinal}>
      <img
        src={src}
        alt=""
        style={imgStyle}
        crossOrigin="anonymous"
        onLoad={onLoad}
      />
    </div>
  );
}
