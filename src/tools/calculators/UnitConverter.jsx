import { useState, useMemo, useCallback } from 'react';
import InfoCard from '../../components/ui/InfoCard';

const UNIT_DATA = {
  Length: {
    units: [
      { id: 'mm', label: 'Millimetres (mm)', factor: 0.001 },
      { id: 'cm', label: 'Centimetres (cm)', factor: 0.01 },
      { id: 'm', label: 'Metres (m)', factor: 1 },
      { id: 'km', label: 'Kilometres (km)', factor: 1000 },
      { id: 'in', label: 'Inches (in)', factor: 0.0254 },
      { id: 'ft', label: 'Feet (ft)', factor: 0.3048 },
      { id: 'yd', label: 'Yards (yd)', factor: 0.9144 },
      { id: 'mi', label: 'Miles (mi)', factor: 1609.344 },
      { id: 'nmi', label: 'Nautical Miles (nmi)', factor: 1852 },
    ],
    base: 'm',
  },
  Weight: {
    units: [
      { id: 'mg', label: 'Milligrams (mg)', factor: 0.000001 },
      { id: 'g', label: 'Grams (g)', factor: 0.001 },
      { id: 'kg', label: 'Kilograms (kg)', factor: 1 },
      { id: 't', label: 'Metric Tonnes (t)', factor: 1000 },
      { id: 'oz', label: 'Ounces (oz)', factor: 0.028349523125 },
      { id: 'lb', label: 'Pounds (lb)', factor: 0.45359237 },
      { id: 'st', label: 'Stone (st)', factor: 6.35029318 },
    ],
    base: 'kg',
  },
  Temperature: {
    units: [
      { id: 'C', label: 'Celsius (\u00B0C)' },
      { id: 'F', label: 'Fahrenheit (\u00B0F)' },
      { id: 'K', label: 'Kelvin (K)' },
    ],
    base: 'C',
    custom: true,
  },
  Volume: {
    units: [
      { id: 'ml', label: 'Millilitres (mL)', factor: 0.001 },
      { id: 'l', label: 'Litres (L)', factor: 1 },
      { id: 'gal_us', label: 'US Gallons', factor: 3.785411784 },
      { id: 'gal_uk', label: 'Imperial Gallons', factor: 4.54609 },
      { id: 'qt_us', label: 'US Quarts', factor: 0.946352946 },
      { id: 'pt_us', label: 'US Pints', factor: 0.473176473 },
      { id: 'cup_us', label: 'US Cups', factor: 0.2365882365 },
      { id: 'floz_us', label: 'US Fluid Ounces', factor: 0.029573529563 },
      { id: 'tbsp', label: 'Tablespoons', factor: 0.014786764782 },
      { id: 'tsp', label: 'Teaspoons', factor: 0.004928921594 },
      { id: 'm3', label: 'Cubic Metres (m\u00B3)', factor: 1000 },
    ],
    base: 'l',
  },
  Area: {
    units: [
      { id: 'mm2', label: 'Square Millimetres (mm\u00B2)', factor: 0.000001 },
      { id: 'cm2', label: 'Square Centimetres (cm\u00B2)', factor: 0.0001 },
      { id: 'm2', label: 'Square Metres (m\u00B2)', factor: 1 },
      { id: 'km2', label: 'Square Kilometres (km\u00B2)', factor: 1000000 },
      { id: 'ha', label: 'Hectares (ha)', factor: 10000 },
      { id: 'ac', label: 'Acres (ac)', factor: 4046.8564224 },
      { id: 'sqft', label: 'Square Feet (ft\u00B2)', factor: 0.09290304 },
      { id: 'sqyd', label: 'Square Yards (yd\u00B2)', factor: 0.83612736 },
      { id: 'sqmi', label: 'Square Miles (mi\u00B2)', factor: 2589988.110336 },
    ],
    base: 'm2',
  },
  Speed: {
    units: [
      { id: 'mps', label: 'Metres/second (m/s)', factor: 1 },
      { id: 'kph', label: 'Kilometres/hour (km/h)', factor: 0.277777778 },
      { id: 'mph', label: 'Miles/hour (mph)', factor: 0.44704 },
      { id: 'knot', label: 'Knots (kn)', factor: 0.514444444 },
      { id: 'fps', label: 'Feet/second (ft/s)', factor: 0.3048 },
    ],
    base: 'mps',
  },
  Data: {
    units: [
      { id: 'bit', label: 'Bits (b)', factor: 1 },
      { id: 'byte', label: 'Bytes (B)', factor: 8 },
      { id: 'kb', label: 'Kilobytes (KB)', factor: 8000 },
      { id: 'mb', label: 'Megabytes (MB)', factor: 8000000 },
      { id: 'gb', label: 'Gigabytes (GB)', factor: 8000000000 },
      { id: 'tb', label: 'Terabytes (TB)', factor: 8000000000000 },
      { id: 'pb', label: 'Petabytes (PB)', factor: 8000000000000000 },
      { id: 'kib', label: 'Kibibytes (KiB)', factor: 8192 },
      { id: 'mib', label: 'Mebibytes (MiB)', factor: 8388608 },
      { id: 'gib', label: 'Gibibytes (GiB)', factor: 8589934592 },
      { id: 'tib', label: 'Tebibytes (TiB)', factor: 8796093022208 },
    ],
    base: 'bit',
  },
};

const CATEGORIES = Object.keys(UNIT_DATA);

function convertTemperature(value, from, to) {
  if (from === to) return value;
  let celsius;
  if (from === 'C') celsius = value;
  else if (from === 'F') celsius = (value - 32) * (5 / 9);
  else celsius = value - 273.15;

  if (to === 'C') return celsius;
  if (to === 'F') return celsius * (9 / 5) + 32;
  return celsius + 273.15;
}

function convertStandard(value, fromUnit, toUnit, units) {
  const from = units.find(u => u.id === fromUnit);
  const to = units.find(u => u.id === toUnit);
  if (!from || !to) return 0;
  const baseValue = value * from.factor;
  return baseValue / to.factor;
}

function formatResult(num) {
  if (num === 0) return '0';
  const abs = Math.abs(num);
  if (abs >= 1e15 || (abs > 0 && abs < 1e-10)) {
    return num.toExponential(6);
  }
  if (Number.isInteger(num)) return num.toLocaleString();
  const str = num.toPrecision(10);
  return parseFloat(str).toString();
}

export default function UnitConverter({ tool }) {
  const [category, setCategory] = useState('Length');
  const [fromValue, setFromValue] = useState('1');
  const [fromUnit, setFromUnit] = useState(UNIT_DATA.Length.units[2].id);
  const [toUnit, setToUnit] = useState(UNIT_DATA.Length.units[3].id);
  const [direction, setDirection] = useState('from'); // which field was last edited

  const catData = UNIT_DATA[category];

  const handleCategoryChange = useCallback((newCat) => {
    setCategory(newCat);
    const data = UNIT_DATA[newCat];
    setFromUnit(data.units[0].id);
    setToUnit(data.units.length > 1 ? data.units[1].id : data.units[0].id);
    setFromValue('1');
    setDirection('from');
  }, []);

  const convert = useCallback((value, from, to) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    if (catData.custom) {
      return formatResult(convertTemperature(num, from, to));
    }
    return formatResult(convertStandard(num, from, to, catData.units));
  }, [catData]);

  const toValue = useMemo(() => {
    if (direction === 'from') return convert(fromValue, fromUnit, toUnit);
    return fromValue;
  }, [direction, fromValue, fromUnit, toUnit, convert]);

  const computedFromValue = useMemo(() => {
    if (direction === 'to') return convert(fromValue, toUnit, fromUnit);
    return fromValue;
  }, [direction, fromValue, fromUnit, toUnit, convert]);

  const handleSwap = useCallback(() => {
    const prevFrom = fromUnit;
    const prevTo = toUnit;
    setFromUnit(prevTo);
    setToUnit(prevFrom);
  }, [fromUnit, toUnit]);

  return (
    <div>
      <InfoCard description="Convert between units of length, weight, temperature, volume, area, speed, and data storage. All conversion factors are hardcoded — no network requests. Processing happens entirely in your browser." />

      <div className="unit-converter-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`unit-converter-tab ${category === cat ? 'unit-converter-tab--active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="unit-converter-panel">
        <div className="unit-converter-row">
          <div className="unit-converter-field">
            <label className="unit-converter-label">From</label>
            <input
              type="number"
              className="unit-converter-input"
              value={direction === 'from' ? fromValue : computedFromValue}
              onChange={e => {
                setFromValue(e.target.value);
                setDirection('from');
              }}
              placeholder="Enter value"
            />
            <select
              className="unit-converter-select"
              value={fromUnit}
              onChange={e => setFromUnit(e.target.value)}
            >
              {catData.units.map(u => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>

          <button
            className="unit-converter-swap"
            onClick={handleSwap}
            title="Swap units"
            aria-label="Swap units"
          >
            &#8644;
          </button>

          <div className="unit-converter-field">
            <label className="unit-converter-label">To</label>
            <input
              type="number"
              className="unit-converter-input"
              value={direction === 'to' ? fromValue : toValue}
              onChange={e => {
                setFromValue(e.target.value);
                setDirection('to');
              }}
              placeholder="Result"
            />
            <select
              className="unit-converter-select"
              value={toUnit}
              onChange={e => setToUnit(e.target.value)}
            >
              {catData.units.map(u => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="unit-converter-formula">
          {(() => {
            const val = parseFloat(direction === 'from' ? fromValue : computedFromValue);
            if (isNaN(val)) return null;
            const fromLabel = catData.units.find(u => u.id === fromUnit)?.label || fromUnit;
            const toLabel = catData.units.find(u => u.id === toUnit)?.label || toUnit;
            const result = direction === 'from' ? toValue : fromValue;
            return (
              <span className="unit-converter-formula-text">
                {val} {fromLabel} = {result} {toLabel}
              </span>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
