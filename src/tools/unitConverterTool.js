const conversionGroups = {
  length: {
    label: 'Length',
    units: {
      m: { label: 'Meters (m)', factor: 1 },
      km: { label: 'Kilometers (km)', factor: 1000 },
      cm: { label: 'Centimeters (cm)', factor: 0.01 },
      mm: { label: 'Millimeters (mm)', factor: 0.001 },
      in: { label: 'Inches (in)', factor: 0.0254 },
      ft: { label: 'Feet (ft)', factor: 0.3048 },
      yd: { label: 'Yards (yd)', factor: 0.9144 },
      mi: { label: 'Miles (mi)', factor: 1609.344 }
    }
  },
  mass: {
    label: 'Mass',
    units: {
      kg: { label: 'Kilograms (kg)', factor: 1 },
      g: { label: 'Grams (g)', factor: 0.001 },
      mg: { label: 'Milligrams (mg)', factor: 0.000001 },
      lb: { label: 'Pounds (lb)', factor: 0.45359237 },
      oz: { label: 'Ounces (oz)', factor: 0.028349523125 }
    }
  },
  volume: {
    label: 'Volume',
    units: {
      L: { label: 'Liters (L)', factor: 1 },
      mL: { label: 'Milliliters (mL)', factor: 0.001 },
      cup: { label: 'Cups (US)', factor: 0.2365882365 },
      pt: { label: 'Pints (US)', factor: 0.473176473 },
      gal: { label: 'Gallons (US)', factor: 3.785411784 }
    }
  },
  temperature: {
    label: 'Temperature',
    units: {
      C: { label: 'Celsius (C)' },
      F: { label: 'Fahrenheit (F)' },
      K: { label: 'Kelvin (K)' }
    }
  }
};

const formatResult = (value) => {
  if (!Number.isFinite(value)) {
    return 'Invalid result';
  }

  if (Math.abs(value) >= 1000000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
    return value.toExponential(6);
  }

  return Number(value.toFixed(6)).toString();
};

const convertTemperature = (value, fromUnit, toUnit) => {
  let celsius = value;

  if (fromUnit === 'F') {
    celsius = ((value - 32) * 5) / 9;
  } else if (fromUnit === 'K') {
    celsius = value - 273.15;
  }

  if (toUnit === 'F') {
    return (celsius * 9) / 5 + 32;
  }

  if (toUnit === 'K') {
    return celsius + 273.15;
  }

  return celsius;
};

const convertValue = (groupId, value, fromUnit, toUnit) => {
  if (groupId === 'temperature') {
    return convertTemperature(value, fromUnit, toUnit);
  }

  const group = conversionGroups[groupId];
  const fromFactor = group.units[fromUnit]?.factor;
  const toFactor = group.units[toUnit]?.factor;

  if (!fromFactor || !toFactor) {
    return Number.NaN;
  }

  const valueInBase = value * fromFactor;
  return valueInBase / toFactor;
};

const createUnitOptions = (groupId) => {
  const units = conversionGroups[groupId].units;

  return Object.entries(units)
    .map(([id, unit]) => `<option value="${id}">${unit.label}</option>`)
    .join('');
};

export const unitConverterTool = {
  id: 'unit-converter',
  label: 'Unit Converter',
  render: () => `
    <section class="card converter-card">
      <h2>Unit Converter</h2>
      <p>Convert values between common units for length, mass, volume, and temperature.</p>

      <div class="converter-grid">
        <label>
          Category
          <select id="converter-group"></select>
        </label>

        <label>
          Value
          <input id="converter-input" type="number" step="any" placeholder="Enter a number" />
        </label>

        <label>
          From
          <select id="converter-from"></select>
        </label>

        <label>
          To
          <select id="converter-to"></select>
        </label>
      </div>

      <div class="converter-actions">
        <button id="converter-swap" class="action-btn" type="button">Swap Units</button>
        <button id="converter-run" class="action-btn primary" type="button">Convert</button>
      </div>

      <div id="converter-status" class="result" aria-live="polite">
        <p>Enter a value and click Convert.</p>
      </div>
    </section>
  `,
  mount: (root) => {
    const groupSelect = root.querySelector('#converter-group');
    const input = root.querySelector('#converter-input');
    const fromSelect = root.querySelector('#converter-from');
    const toSelect = root.querySelector('#converter-to');
    const swapButton = root.querySelector('#converter-swap');
    const convertButton = root.querySelector('#converter-run');
    const status = root.querySelector('#converter-status');

    const groups = Object.entries(conversionGroups);

    groupSelect.innerHTML = groups.map(([id, group]) => `<option value="${id}">${group.label}</option>`).join('');
    groupSelect.value = 'length';

    const refreshUnits = () => {
      const groupId = groupSelect.value;
      const optionsHtml = createUnitOptions(groupId);
      fromSelect.innerHTML = optionsHtml;
      toSelect.innerHTML = optionsHtml;

      const unitIds = Object.keys(conversionGroups[groupId].units);
      fromSelect.value = unitIds[0];
      toSelect.value = unitIds[1] || unitIds[0];
    };

    const runConversion = () => {
      const rawValue = Number(input.value);

      if (Number.isNaN(rawValue)) {
        status.innerHTML = '<p>Please enter a valid number to convert.</p>';
        return;
      }

      const groupId = groupSelect.value;
      const fromUnit = fromSelect.value;
      const toUnit = toSelect.value;
      const converted = convertValue(groupId, rawValue, fromUnit, toUnit);
      const fromLabel = conversionGroups[groupId].units[fromUnit].label;
      const toLabel = conversionGroups[groupId].units[toUnit].label;

      status.innerHTML = `
        <p><strong>${formatResult(rawValue)} ${fromLabel}</strong></p>
        <p>equals</p>
        <p><strong>${formatResult(converted)} ${toLabel}</strong></p>
      `;
    };

    groupSelect.addEventListener('change', () => {
      refreshUnits();
      status.innerHTML = '<p>Units updated. Enter a value and click Convert.</p>';
    });

    swapButton.addEventListener('click', () => {
      const from = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = from;
      runConversion();
    });

    convertButton.addEventListener('click', runConversion);

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        runConversion();
      }
    });

    refreshUnits();
  }
};
