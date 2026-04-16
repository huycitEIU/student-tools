import QRCode from 'qrcode';

const escapeHtml = (value) => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const clampNumber = (value, min, max, fallback) => {
  if (Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
};

const buildFilename = (content) => {
  const normalized = content
    .trim()
    .replace(/https?:\/\//gi, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  return `${normalized || 'qr-code'}.png`;
};

export const qrGeneratorTool = {
  id: 'qr-generator',
  label: 'QR Generator',
  render: () => `
    <section class="card qr-card">
      <h2>QR Generator</h2>
      <p>Create a QR code from text, a link, or a short message and download it as a PNG.</p>

      <div class="qr-layout">
        <div class="qr-form-panel">
          <label class="qr-field">
            <span>Content</span>
            <textarea id="qr-content" class="qr-textarea" placeholder="https://example.com"></textarea>
          </label>

          <div class="qr-options">
            <label class="qr-field">
              <span>Size</span>
              <input id="qr-size" type="number" min="128" max="1024" step="16" value="320" />
            </label>

            <label class="qr-field">
              <span>Margin</span>
              <input id="qr-margin" type="number" min="0" max="8" step="1" value="2" />
            </label>

            <label class="qr-field">
              <span>Error correction</span>
              <select id="qr-error-level">
                <option value="L">Low</option>
                <option value="M" selected>Medium</option>
                <option value="Q">Quartile</option>
                <option value="H">High</option>
              </select>
            </label>
          </div>

          <div class="actions qr-actions">
            <button id="qr-generate-btn" class="action-btn primary" type="button">Generate QR</button>
            <button id="qr-copy-btn" class="action-btn" type="button" disabled>Copy Content</button>
            <a id="qr-download-btn" class="action-btn qr-download" href="#" download="qr-code.png" aria-disabled="true">Download PNG</a>
          </div>

          <div id="qr-status" class="notes-status qr-status">Enter content and click Generate QR.</div>
        </div>

        <div class="qr-preview-panel">
          <div id="qr-preview" class="qr-preview">
            <p>Your QR code will appear here.</p>
          </div>
          <div id="qr-details" class="qr-details"></div>
        </div>
      </div>
    </section>
  `,
  mount: (root) => {
    const contentInput = root.querySelector('#qr-content');
    const sizeInput = root.querySelector('#qr-size');
    const marginInput = root.querySelector('#qr-margin');
    const errorLevelSelect = root.querySelector('#qr-error-level');
    const generateBtn = root.querySelector('#qr-generate-btn');
    const copyBtn = root.querySelector('#qr-copy-btn');
    const downloadBtn = root.querySelector('#qr-download-btn');
    const previewBox = root.querySelector('#qr-preview');
    const detailsBox = root.querySelector('#qr-details');
    const statusBox = root.querySelector('#qr-status');

    let currentContent = '';
    let currentDataUrl = '';

    const setIdleState = () => {
      previewBox.innerHTML = '<p>Your QR code will appear here.</p>';
      detailsBox.innerHTML = '';
      copyBtn.disabled = true;
      downloadBtn.setAttribute('aria-disabled', 'true');
      downloadBtn.removeAttribute('href');
      downloadBtn.removeAttribute('download');
    };

    const setGeneratedState = (content, dataUrl, size, margin, errorLevel) => {
      previewBox.innerHTML = `
        <img class="qr-image" src="${dataUrl}" alt="QR code for ${escapeHtml(content)}" width="${size}" height="${size}" />
      `;
      detailsBox.innerHTML = `
        <p><strong>Content:</strong> ${escapeHtml(content)}</p>
        <p><strong>Size:</strong> ${size}px</p>
        <p><strong>Margin:</strong> ${margin}</p>
        <p><strong>Error correction:</strong> ${escapeHtml(errorLevel)}</p>
      `;
      copyBtn.disabled = false;
      downloadBtn.setAttribute('aria-disabled', 'false');
      downloadBtn.href = dataUrl;
      downloadBtn.download = buildFilename(content);
    };

    const generateQr = async () => {
      const content = contentInput.value.trim();
      const size = clampNumber(Number(sizeInput.value), 128, 1024, 320);
      const margin = clampNumber(Number(marginInput.value), 0, 8, 2);
      const errorLevel = ['L', 'M', 'Q', 'H'].includes(errorLevelSelect.value) ? errorLevelSelect.value : 'M';

      if (!content) {
        currentContent = '';
        currentDataUrl = '';
        statusBox.textContent = 'Please enter content to generate a QR code.';
        setIdleState();
        return;
      }

      statusBox.textContent = 'Generating QR code...';

      try {
        const dataUrl = await QRCode.toDataURL(content, {
          errorCorrectionLevel: errorLevel,
          margin,
          width: size,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });

        currentContent = content;
        currentDataUrl = dataUrl;
        setGeneratedState(content, dataUrl, size, margin, errorLevel);
        statusBox.textContent = 'QR code generated successfully.';
      } catch {
        currentContent = '';
        currentDataUrl = '';
        statusBox.textContent = 'Unable to generate a QR code right now.';
        setIdleState();
      }
    };

    const copyContent = async () => {
      if (!currentContent) {
        return;
      }

      try {
        await navigator.clipboard.writeText(currentContent);
        statusBox.textContent = 'QR content copied to clipboard.';
      } catch {
        statusBox.textContent = 'Clipboard access is not available in this browser.';
      }
    };

    generateBtn.addEventListener('click', generateQr);
    copyBtn.addEventListener('click', copyContent);
    contentInput.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        generateQr();
      }
    });

    setIdleState();
  }
};