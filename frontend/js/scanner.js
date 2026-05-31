// ── Scanner de documentos / boletas ──────────────────────────────────────────
// Procesa imágenes capturadas con la cámara para mejorar la legibilidad
// de boletas, facturas y documentos usando la API Canvas del browser.

const Scanner = (() => {

  // Kernel de sharpening 3x3
  const SHARPEN_KERNEL = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0,
  ];

  // Aplica convolución 3x3 sobre imageData
  function convolve(src, dst, width, height, kernel) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const ki = (ky + 1) * 3 + (kx + 1);
            const pi = ((y + ky) * width + (x + kx)) * 4;
            r += src[pi] * kernel[ki];
          }
        }
        const di = (y * width + x) * 4;
        dst[di] = dst[di + 1] = dst[di + 2] = Math.max(0, Math.min(255, r));
        dst[di + 3] = 255;
      }
    }
  }

  // ── Modos de procesamiento ────────────────────────────────────────────────
  //
  //  'color'    → Realza colores y contraste (foto mejorada)
  //  'scanner'  → Escala de grises con alto contraste (aspecto de escáner)
  //  'bw'       → Blanco y negro con umbral adaptivo (máxima legibilidad)

  function processImage(canvas, mode) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imgData = ctx.getImageData(0, 0, width, height);
    const src = imgData.data;
    const out = new Uint8ClampedArray(src);

    // 1. Calcular luminancia de cada píxel
    const luma = new Float32Array(width * height);
    for (let i = 0, pi = 0; i < luma.length; i++, pi += 4) {
      luma[i] = 0.299 * src[pi] + 0.587 * src[pi + 1] + 0.114 * src[pi + 2];
    }

    // 2. Auto-niveles: encontrar min/max para normalizar
    let min = 255, max = 0;
    for (let i = 0; i < luma.length; i++) {
      if (luma[i] < min) min = luma[i];
      if (luma[i] > max) max = luma[i];
    }
    const range = max - min || 1;

    if (mode === 'color') {
      // Modo color: realzar contraste y saturación sin desaturar
      for (let i = 0, pi = 0; i < luma.length; i++, pi += 4) {
        const factor = 1.4; // contraste
        const brightness = 10; // brillo base
        for (let c = 0; c < 3; c++) {
          out[pi + c] = Math.max(0, Math.min(255,
            factor * (src[pi + c] - 128) + 128 + brightness
          ));
        }
        out[pi + 3] = 255;
      }
    } else {
      // Modo scanner/bw: desaturar primero
      for (let i = 0, pi = 0; i < luma.length; i++, pi += 4) {
        let v = ((luma[i] - min) / range) * 255; // normalizar
        if (mode === 'scanner') {
          // Contraste alto pero suave
          v = Math.max(0, Math.min(255, (v - 128) * 2.2 + 128));
        } else if (mode === 'bw') {
          // Umbral adaptivo: fondo blanco, texto negro
          const t = 145; // umbral
          v = v > t ? 255 : v < (t - 60) ? 0 : v; // zona de transición suave
        }
        out[pi] = out[pi + 1] = out[pi + 2] = v;
        out[pi + 3] = 255;
      }

      // 3. Sharpening (solo scanner y bw)
      const sharpened = new Uint8ClampedArray(out);
      convolve(out, sharpened, width, height, SHARPEN_KERNEL);
      sharpened.copyWithin
        ? sharpened.forEach((v, i) => { out[i] = v; })
        : Object.assign(out, sharpened);
    }

    const result = new ImageData(out, width, height);
    ctx.putImageData(result, 0, 0);
  }

  // ── UI principal ──────────────────────────────────────────────────────────
  // Muestra overlay con preview + botones de modo + confirmar

  function showUI(file, onConfirm) {
    // Cargar imagen en canvas
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
      img.onload = () => _buildOverlay(img, file, onConfirm);
    };
    reader.readAsDataURL(file);
  }

  function _buildOverlay(img, originalFile, onConfirm) {
    // Eliminar overlay previo
    document.getElementById("scanner-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "scanner-overlay";
    overlay.innerHTML = `
      <div class="scanner-box">
        <div class="scanner-header">
          <span style="font-weight:800;font-size:16px">Mejorar foto</span>
          <button class="scanner-close" id="sc-close">✕</button>
        </div>

        <div class="scanner-preview-wrap">
          <canvas id="sc-canvas"></canvas>
        </div>

        <div class="scanner-modes">
          <button class="sc-mode active" data-mode="original">
            <span>🖼️</span><small>Original</small>
          </button>
          <button class="sc-mode" data-mode="color">
            <span>✨</span><small>Mejorado</small>
          </button>
          <button class="sc-mode" data-mode="scanner">
            <span>🔲</span><small>Scanner</small>
          </button>
          <button class="sc-mode" data-mode="bw">
            <span>📄</span><small>B/N</small>
          </button>
        </div>

        <div style="padding:0 16px 16px;display:flex;gap:8px">
          <button class="btn btn-outline" style="flex:1" id="sc-cancel">Cancelar</button>
          <button class="btn btn-primary" style="flex:1" id="sc-confirm">Usar esta foto</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Dibujar imagen en canvas
    const canvas = document.getElementById("sc-canvas");
    const MAX = 700;
    let w = img.naturalWidth, h = img.naturalHeight;
    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    let _currentMode = 'original';
    const _originalCanvas = document.createElement('canvas');
    _originalCanvas.width = w; _originalCanvas.height = h;
    _originalCanvas.getContext('2d').drawImage(img, 0, 0, w, h);

    // Cambiar modo
    overlay.querySelectorAll('.sc-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.sc-mode').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _currentMode = btn.dataset.mode;

        // Restaurar imagen original en canvas
        ctx.drawImage(_originalCanvas, 0, 0, w, h);

        if (_currentMode !== 'original') {
          processImage(canvas, _currentMode);
        }
      });
    });

    // Confirmar
    document.getElementById("sc-confirm").addEventListener('click', () => {
      canvas.toBlob(blob => {
        const enhancedFile = new File([blob], originalFile.name, { type: 'image/jpeg' });
        overlay.remove();
        onConfirm(enhancedFile, canvas.toDataURL('image/jpeg', 0.92));
      }, 'image/jpeg', 0.92);
    });

    // Cancelar / Cerrar
    document.getElementById("sc-cancel").addEventListener('click', () => overlay.remove());
    document.getElementById("sc-close").addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  return { showUI, processImage };
})();
