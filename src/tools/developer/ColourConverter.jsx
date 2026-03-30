import { useState, useMemo, useCallback, useEffect } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import { Copy, Check } from 'lucide-react';

// Named colours subset
const NAMED_COLOURS = {
  'red': [255, 0, 0], 'green': [0, 128, 0], 'blue': [0, 0, 255],
  'white': [255, 255, 255], 'black': [0, 0, 0], 'yellow': [255, 255, 0],
  'cyan': [0, 255, 255], 'magenta': [255, 0, 255], 'orange': [255, 165, 0],
  'purple': [128, 0, 128], 'pink': [255, 192, 203], 'brown': [165, 42, 42],
  'gray': [128, 128, 128], 'grey': [128, 128, 128], 'navy': [0, 0, 128],
  'teal': [0, 128, 128], 'lime': [0, 255, 0], 'maroon': [128, 0, 0],
  'olive': [128, 128, 0], 'aqua': [0, 255, 255], 'coral': [255, 127, 80],
  'salmon': [250, 128, 114], 'gold': [255, 215, 0], 'indigo': [75, 0, 130],
  'violet': [238, 130, 238], 'turquoise': [64, 224, 208], 'crimson': [220, 20, 60],
  'khaki': [240, 230, 140], 'plum': [221, 160, 221], 'tan': [210, 180, 140],
  'beige': [245, 245, 220], 'ivory': [255, 255, 240], 'lavender': [230, 230, 250],
  'silver': [192, 192, 192], 'sienna': [160, 82, 45], 'tomato': [255, 99, 71],
  'wheat': [245, 222, 179], 'peru': [205, 133, 63], 'orchid': [218, 112, 214],
};

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function rgbaToHex(r, g, b, a) {
  if (a === 1) return rgbToHex(r, g, b);
  return rgbToHex(r, g, b) + Math.round(a * 255).toString(16).padStart(2, '0');
}

function parseColourInput(input) {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Named colour
  if (NAMED_COLOURS[trimmed]) {
    const [r, g, b] = NAMED_COLOURS[trimmed];
    return { r, g, b, a: 1 };
  }

  // Hex: #RGB, #RRGGBB, #RRGGBBAA
  const hexMatch = trimmed.match(/^#?([0-9a-f]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    }
    if (hex.length === 4) {
      hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0,2), 16),
        g: parseInt(hex.slice(2,4), 16),
        b: parseInt(hex.slice(4,6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0,2), 16),
        g: parseInt(hex.slice(2,4), 16),
        b: parseInt(hex.slice(4,6), 16),
        a: parseInt(hex.slice(6,8), 16) / 255,
      };
    }
  }

  // RGB/RGBA: rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+)\s*)?\)$/);
  if (rgbMatch) {
    return {
      r: clamp(parseInt(rgbMatch[1], 10), 0, 255),
      g: clamp(parseInt(rgbMatch[2], 10), 0, 255),
      b: clamp(parseInt(rgbMatch[3], 10), 0, 255),
      a: rgbMatch[4] !== undefined ? clamp(parseFloat(rgbMatch[4]), 0, 1) : 1,
    };
  }

  // HSL/HSLA: hsl(h, s%, l%) or hsla(h, s%, l%, a)
  const hslMatch = trimmed.match(/^hsla?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})%?\s*[,\s]\s*(\d{1,3})%?\s*(?:[,/]\s*([\d.]+)\s*)?\)$/);
  if (hslMatch) {
    const h = clamp(parseInt(hslMatch[1], 10), 0, 360);
    const s = clamp(parseInt(hslMatch[2], 10), 0, 100);
    const l = clamp(parseInt(hslMatch[3], 10), 0, 100);
    const [r, g, b] = hslToRgb(h, s, l);
    return {
      r, g, b,
      a: hslMatch[4] !== undefined ? clamp(parseFloat(hslMatch[4]), 0, 1) : 1,
    };
  }

  return null;
}

export default function ColourConverter({ tool }) {
  const [input, setInput] = useState('#00427A');
  const [alpha, setAlpha] = useState(100);
  const [copiedField, setCopiedField] = useState(null);

  const parsed = useMemo(() => {
    const result = parseColourInput(input);
    if (!result) return null;
    return { ...result, a: alpha / 100 };
  }, [input, alpha]);

  const formats = useMemo(() => {
    if (!parsed) return null;
    const { r, g, b, a } = parsed;
    const [h, s, l] = rgbToHsl(r, g, b);
    return {
      hex: rgbaToHex(r, g, b, a),
      rgb: a < 1 ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})` : `rgb(${r}, ${g}, ${b})`,
      hsl: a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a.toFixed(2)})` : `hsl(${h}, ${s}%, ${l}%)`,
      r, g, b, a, h, s, l,
    };
  }, [parsed]);

  // Sync picker with parsed colour
  const pickerValue = formats ? rgbToHex(formats.r, formats.g, formats.b) : '#000000';

  const handlePickerChange = useCallback((e) => {
    setInput(e.target.value);
  }, []);

  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch { /* ignore */ }
  }, []);

  const renderFormatRow = (label, value, fieldKey) => (
    <div className="colour-format-row" key={fieldKey}>
      <span className="colour-format-label">{label}</span>
      <div className="colour-format-value-row">
        <code className="colour-format-value">{value}</code>
        <button
          className="colour-copy-btn"
          onClick={() => handleCopy(value, fieldKey)}
          title={`Copy ${label}`}
        >
          {copiedField === fieldKey ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <InfoCard description="Convert between HEX, RGB, and HSL colour formats. Accepts named colours, hex codes, and CSS colour strings. Includes a colour picker and alpha/opacity support. All processing happens locally in your browser." />

      <div className="colour-converter-panel">
        <div className="colour-input-group">
          <label className="colour-label">Enter a colour</label>
          <div className="colour-input-row">
            <input
              type="color"
              className="colour-picker"
              value={pickerValue}
              onChange={handlePickerChange}
              title="Pick a colour"
            />
            <input
              type="text"
              className="colour-text-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="#00427A, rgb(0,66,122), hsl(208,100%,24%), coral..."
              spellCheck={false}
            />
          </div>
          <div className="colour-alpha-row">
            <label className="colour-alpha-label">Opacity: {alpha}%</label>
            <input
              type="range"
              className="colour-alpha-slider"
              min="0"
              max="100"
              value={alpha}
              onChange={e => setAlpha(parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        {!parsed && input.trim() && (
          <div className="colour-no-parse">
            Could not parse colour. Try a hex (#FF0000), RGB (rgb(255,0,0)), HSL (hsl(0,100%,50%)), or named colour (red).
          </div>
        )}

        {formats && (
          <>
            <div className="colour-preview-section">
              <div
                className="colour-preview-swatch"
                style={{
                  backgroundColor: formats.a < 1
                    ? `rgba(${formats.r}, ${formats.g}, ${formats.b}, ${formats.a})`
                    : formats.hex,
                }}
              />
              <div
                className="colour-preview-swatch colour-preview-swatch--checker"
                style={{
                  backgroundColor: `rgba(${formats.r}, ${formats.g}, ${formats.b}, ${formats.a})`,
                }}
              />
            </div>

            <div className="colour-formats">
              {renderFormatRow('HEX', formats.hex, 'hex')}
              {renderFormatRow('RGB', formats.rgb, 'rgb')}
              {renderFormatRow('HSL', formats.hsl, 'hsl')}
            </div>

            <div className="colour-details">
              <div className="colour-detail-grid">
                <div className="colour-detail-item">
                  <span className="colour-detail-label">Red</span>
                  <span className="colour-detail-value">{formats.r}</span>
                </div>
                <div className="colour-detail-item">
                  <span className="colour-detail-label">Green</span>
                  <span className="colour-detail-value">{formats.g}</span>
                </div>
                <div className="colour-detail-item">
                  <span className="colour-detail-label">Blue</span>
                  <span className="colour-detail-value">{formats.b}</span>
                </div>
                <div className="colour-detail-item">
                  <span className="colour-detail-label">Hue</span>
                  <span className="colour-detail-value">{formats.h}&deg;</span>
                </div>
                <div className="colour-detail-item">
                  <span className="colour-detail-label">Saturation</span>
                  <span className="colour-detail-value">{formats.s}%</span>
                </div>
                <div className="colour-detail-item">
                  <span className="colour-detail-label">Lightness</span>
                  <span className="colour-detail-value">{formats.l}%</span>
                </div>
                <div className="colour-detail-item">
                  <span className="colour-detail-label">Alpha</span>
                  <span className="colour-detail-value">{formats.a.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
