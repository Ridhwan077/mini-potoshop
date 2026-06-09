const fileInput = document.getElementById('fileInput');
const mainImage = document.getElementById('mainImage');
const imageWrapper = document.getElementById('imageWrapper');
const emptyState = document.getElementById('emptyState');

const transformFrame = document.getElementById('transformFrame');
const rotateHandle = document.getElementById('rotateHandle');
const rotateRange = document.getElementById('rotateRange');

function updateLabel(id, val) {
    document.getElementById(id).textContent = val;
}

fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const base64Image = event.target.result;
        uploadImage(base64Image);
    };
    reader.readAsDataURL(file);
});

async function uploadImage(base64) {
    const res = await fetch('/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
    });
    const data = await res.json();
    if (data.status === 'success') {
        displayImage(data.image, true); // True to reset state
    }
}

// --- State Variables ---
let isDragging = false;
let currentRotation = 0;
let originalImageBase64 = null;
let bakedRotation = 0;

function displayImage(base64, isReset = false) {
    mainImage.src = `data:image/png;base64,${base64}`;
    if (isReset) {
        originalImageBase64 = base64; // Store original for comparison
    }
    transformFrame.style.display = 'flex';
    emptyState.style.display = 'none';
    // Show sidebar tools when image is loaded
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (sidebarPlaceholder && sidebarPlaceholder.style.display !== 'none') {
        sidebarPlaceholder.style.display = 'none';
        document.getElementById('main-menu').style.display = 'block';
    }
    // Show compare button
    const btnCompare = document.getElementById('btnCompare');
    if (btnCompare) btnCompare.style.display = 'block';
    // Show rotate handle only if geometric panel is currently active
    const geometricPanel = document.getElementById('panel-geometric');
    if (geometricPanel && geometricPanel.style.display !== 'none') {
        rotateHandle.style.display = 'flex';
    } else {
        rotateHandle.style.display = 'none';
    }

    if (isReset) {
        currentRotation = 0;
        bakedRotation = 0;
        transformFrame.style.transform = 'none';

        // Reset resize mode if active
        if (isResizeMode) toggleResizeMode(false);

        if (rotateRange) {
            rotateRange.value = 0;
            updateLabel('rotateVal', '0');
        }

        // Reset Color UI
        if (typeof isGrayscale !== 'undefined') {
            isGrayscale = false;
            const btnGray = document.getElementById('btnGrayscale');
            if (btnGray) btnGray.classList.remove('btn-primary');
            const hueRange = document.getElementById('hueRange');
            if (hueRange) {
                hueRange.value = 0; updateLabel('hueVal', '0');
                hueRange.disabled = false;
            }
            const satRange = document.getElementById('satRange');
            if (satRange) {
                satRange.value = 0; updateLabel('satVal', '0');
                satRange.disabled = false;
            }
            const btnResetHue = document.getElementById('btnResetHue');
            if (btnResetHue) btnResetHue.disabled = false;
            const btnResetSat = document.getElementById('btnResetSat');
            if (btnResetSat) btnResetSat.disabled = false;
        }
        const tintColor = document.getElementById('tintColor');
        if (tintColor) tintColor.value = '#ffffff';

        // Reset Binary UI
        const threshToggle = document.getElementById('threshToggle');
        if (threshToggle) {
            threshToggle.checked = false;
            document.getElementById('threshRange').disabled = true;
        }
        const edgeType = document.getElementById('edgeType');
        if (edgeType) edgeType.value = 'none';
        const morphType = document.getElementById('morphType');
        if (morphType) morphType.value = 'none';

        // Reset Filters UI
        const blurType = document.getElementById('blurType');
        if (blurType) {
            blurType.value = 'none';
            const sizeGroup = document.getElementById('blurSizeGroup');
            if (sizeGroup) sizeGroup.style.display = 'none';
        }
        const blurRange = document.getElementById('blurRange');
        if (blurRange) {
            blurRange.value = 1;
            updateLabel('blurVal', '1');
            updateLabel('blurVal2', '1');
        }
        const sharpenRange = document.getElementById('sharpenRange');
        if (sharpenRange) {
            sharpenRange.value = 0;
            updateLabel('sharpenVal', '0');
        }
    }

    // Offset the CSS rotation so the baked image doesn't double-rotate
    imageWrapper.style.transform = `rotate(${-bakedRotation}deg)`;
}

// --- Interactive Rotation Logic ---
rotateHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    document.body.style.userSelect = 'none'; // Prevent text selection
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const rect = transformFrame.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate angle from center to mouse
    const radians = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let degree = (radians * (180 / Math.PI)) + 90; // Add 90 so top is 0
    if (degree < 0) degree += 360;

    currentRotation = Math.round(degree);

    // Visual preview (instant)
    transformFrame.style.transform = `rotate(${currentRotation}deg)`;
    // DO NOT update imageWrapper here. Keep it at -bakedRotation so the image rotates visually with the frame.

    // Sync slider
    if (rotateRange) {
        rotateRange.value = currentRotation;
        updateLabel('rotateVal', currentRotation);
    }
});

// Update slider manually
if (rotateRange) {
    rotateRange.addEventListener('change', (e) => {
        currentRotation = parseInt(e.target.value);
        transformFrame.style.transform = `rotate(${currentRotation}deg)`;
        applyTransform('rotate');
    });
}

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        document.body.style.userSelect = '';

        // Apply permanent rotation via Backend
        applyTransform('rotate');
    }
});
// ----------------------------------

async function applyTransform(action, params = {}) {
    const body = { action, ...params };

    if (action === 'rotate') {
        body.angle = currentRotation; // Send absolute angle for the pipeline
    }

    const res = await fetch('/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.status === 'success') {
        if (action === 'rotate') {
            bakedRotation = currentRotation;
        }
        displayImage(data.image, false);
        updateUndoRedoButtons(data.can_undo, data.can_redo);
    } else {
        alert(data.error);
    }
}

// --- Undo / Redo Logic ---
function updateUndoRedoButtons(canUndo, canRedo) {
    const btnUndo = document.getElementById('btnUndo');
    const btnRedo = document.getElementById('btnRedo');
    if (btnUndo) btnUndo.disabled = !canUndo;
    if (btnRedo) btnRedo.disabled = !canRedo;
}

async function undoAction() {
    const res = await fetch('/undo', { method: 'POST' });
    const data = await res.json();
    if (data.status === 'success') {
        displayImage(data.image, false);
        updateUndoRedoButtons(data.can_undo, data.can_redo);
    }
}

async function redoAction() {
    const res = await fetch('/redo', { method: 'POST' });
    const data = await res.json();
    if (data.status === 'success') {
        displayImage(data.image, false);
        updateUndoRedoButtons(data.can_undo, data.can_redo);
    }
}

// Keyboard shortcuts: Ctrl+Z = Undo, Ctrl+Y = Redo
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undoAction();
    } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redoAction();
    }
});

function applyResizePreset(value) {
    if (!value || value === 'custom') return;
    const [w, h] = value.split('x');
    document.getElementById('resizeW').value = w;
    document.getElementById('resizeH').value = h;
}

async function applyResize() {
    const width = document.getElementById('resizeW').value;
    const height = document.getElementById('resizeH').value;
    if (!width || !height) return alert("Please enter width and height");
    applyTransform('resize', { width, height });
}

// --- Crop Logic ---
const cropOverlay = document.getElementById('cropOverlay');
const cropBox = document.getElementById('cropBox');
const btnStartCrop = document.getElementById('btnStartCrop');
const btnApplyCrop = document.getElementById('btnApplyCrop');
const btnCancelCrop = document.getElementById('btnCancelCrop');

let isCropping = false;
let isDrawingCrop = false;
let startX, startY;

function toggleCropMode(enable = true) {
    isCropping = enable;
    if (enable) {
        cropOverlay.style.display = 'block';
        btnStartCrop.style.display = 'none';
        btnApplyCrop.style.display = 'block';
        btnCancelCrop.style.display = 'block';
        cropBox.style.display = 'none'; // hide until drawn
    } else {
        cropOverlay.style.display = 'none';
        btnStartCrop.style.display = 'block';
        btnApplyCrop.style.display = 'none';
        btnCancelCrop.style.display = 'none';
    }
}

cropOverlay.addEventListener('mousedown', (e) => {
    isDrawingCrop = true;
    const rect = cropOverlay.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    cropBox.style.left = `${startX}px`;
    cropBox.style.top = `${startY}px`;
    cropBox.style.width = '0px';
    cropBox.style.height = '0px';
    cropBox.style.display = 'block';
});

cropOverlay.addEventListener('mousemove', (e) => {
    if (!isDrawingCrop) return;
    const rect = cropOverlay.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);

    cropBox.style.left = `${left}px`;
    cropBox.style.top = `${top}px`;
    cropBox.style.width = `${width}px`;
    cropBox.style.height = `${height}px`;
});

cropOverlay.addEventListener('mouseup', () => {
    isDrawingCrop = false;
});

function getRenderedImageBounds() {
    const imgRatio = mainImage.naturalWidth / mainImage.naturalHeight;
    const rect = mainImage.getBoundingClientRect();
    const containerRatio = rect.width / rect.height;

    let renderedWidth, renderedHeight, renderedLeft, renderedTop;

    if (containerRatio > imgRatio) {
        renderedHeight = rect.height;
        renderedWidth = rect.height * imgRatio;
        renderedLeft = rect.left + (rect.width - renderedWidth) / 2;
        renderedTop = rect.top;
    } else {
        renderedWidth = rect.width;
        renderedHeight = rect.width / imgRatio;
        renderedTop = rect.top + (rect.height - renderedHeight) / 2;
        renderedLeft = rect.left;
    }
    return { left: renderedLeft, top: renderedTop, width: renderedWidth, height: renderedHeight };
}

function applyCrop() {
    if (cropBox.style.display === 'none' || !cropBox.style.width) {
        return alert('Please draw a crop area first.');
    }

    const boxRect = cropBox.getBoundingClientRect();
    const imgBounds = getRenderedImageBounds();

    let xp = (boxRect.left - imgBounds.left) / imgBounds.width;
    let yp = (boxRect.top - imgBounds.top) / imgBounds.height;
    let wp = boxRect.width / imgBounds.width;
    let hp = boxRect.height / imgBounds.height;

    // Clamp to [0, 1]
    xp = Math.max(0, Math.min(1, xp));
    yp = Math.max(0, Math.min(1, yp));
    wp = Math.max(0, Math.min(1 - xp, wp));
    hp = Math.max(0, Math.min(1 - yp, hp));

    if (wp === 0 || hp === 0) return alert('Invalid crop area');

    applyTransform('crop', { x: xp, y: yp, w: wp, h: hp });
    toggleCropMode(false);
}

// ---------------------------

async function applyTranslate() {
    const tx = document.getElementById('transX').value || 0;
    const ty = document.getElementById('transY').value || 0;
    applyTransform('translate', { tx, ty });
}

async function resetImage() {
    const res = await fetch('/reset', { method: 'POST' });
    const data = await res.json();
    if (data.status === 'success') {
        displayImage(data.image, true);
        updateUndoRedoButtons(0, 0);
    }
}

function downloadImage() {
    if (!mainImage.src) return;
    const link = document.createElement('a');
    link.download = 'processed_image.jpg';
    link.href = mainImage.src;
    link.click();
}

function deleteImage() {
    // Clear image
    mainImage.src = '';
    transformFrame.style.display = 'none';
    emptyState.style.display = 'block';
    // Hide all sidebar tools and show placeholder
    document.getElementById('main-menu').style.display = 'none';
    document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
    document.getElementById('sidebar-placeholder').style.display = 'flex';
    // Hide compare button
    const btnCompare = document.getElementById('btnCompare');
    if (btnCompare) btnCompare.style.display = 'none';
    originalImageBase64 = null;
    // Reset state
    rotateHandle.style.display = 'none';
    if (isResizeMode) toggleResizeMode(false);
    currentRotation = 0;
    bakedRotation = 0;
    transformFrame.style.transform = 'none';
    if (rotateRange) {
        rotateRange.value = 0;
        updateLabel('rotateVal', '0');
    }
}

// --- Color Processing Logic ---
let isGrayscale = false;

async function toggleGrayscale() {
    isGrayscale = !isGrayscale;
    document.getElementById('btnGrayscale').classList.toggle('btn-primary', isGrayscale);

    // Disable/enable hue and saturation controls
    const hueRange = document.getElementById('hueRange');
    const satRange = document.getElementById('satRange');
    const btnResetHue = document.getElementById('btnResetHue');
    const btnResetSat = document.getElementById('btnResetSat');

    if (hueRange) hueRange.disabled = isGrayscale;
    if (satRange) satRange.disabled = isGrayscale;
    if (btnResetHue) btnResetHue.disabled = isGrayscale;
    if (btnResetSat) btnResetSat.disabled = isGrayscale;

    await applyTransform('color', { grayscale: isGrayscale });
}

async function applyColorParam(param, value) {
    const params = {};
    params[param] = value;
    await applyTransform('color', params);
}

function resetColorParam(param) {
    if (param === 'hue') {
        document.getElementById('hueRange').value = 0;
        updateLabel('hueVal', '0');
        applyColorParam('hue', 0);
    } else if (param === 'saturation') {
        document.getElementById('satRange').value = 0;
        updateLabel('satVal', '0');
        applyColorParam('saturation', 0);
    } else if (param === 'tint_color') {
        document.getElementById('tintColor').value = '#ffffff';
        applyColorParam('tint_color', '#ffffff');
    }
}

// --- Binary & Edge Processing Logic ---
async function applyBinaryEdgeParam(param, value) {
    const params = {};
    params[param] = value;
    await applyTransform('binary_edge', params);
}

function toggleThreshold(enabled) {
    const threshRange = document.getElementById('threshRange');
    threshRange.disabled = !enabled;
    const val = enabled ? threshRange.value : -1;
    applyBinaryEdgeParam('threshold', val);
}

function updateMorphSizeLabel(val) {
    document.getElementById('morphSizeVal').textContent = val;
    document.getElementById('morphSizeVal2').textContent = val;
}

// --- Navigation Logic ---
function openPanel(panelId) {
    // Close resize mode if active when switching panels
    if (isResizeMode) toggleResizeMode(false);

    document.getElementById('main-menu').style.display = 'none';
    const panels = document.querySelectorAll('.tool-panel');
    panels.forEach(p => p.style.display = 'none');

    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.display = 'block';
        panel.classList.add('fade-in');
        setTimeout(() => panel.classList.remove('fade-in'), 300);
    }

    // Show rotation handle only when Geometric panel is active
    if (panelId === 'panel-geometric' && transformFrame.style.display !== 'none') {
        rotateHandle.style.display = 'flex';
    } else {
        rotateHandle.style.display = 'none';
    }
}

function closePanel() {
    // Close resize mode if active
    if (isResizeMode) toggleResizeMode(false);

    const panels = document.querySelectorAll('.tool-panel');
    panels.forEach(p => p.style.display = 'none');

    const mainMenu = document.getElementById('main-menu');
    mainMenu.style.display = 'block';
    mainMenu.classList.add('fade-in');
    setTimeout(() => mainMenu.classList.remove('fade-in'), 300);

    // Hide rotation handle when leaving any panel
    rotateHandle.style.display = 'none';
}

// --- Enhancement Logic ---
async function applyEnhancementParam(param, value) {
    const params = {};
    params[param] = value;
    await applyTransform('enhancement', params);
}

// --- Segmentation Logic ---
async function applySegmentationParam(param, value) {
    const params = {};
    params[param] = value;
    await applyTransform('segmentation', params);
}

// --- Restoration Logic ---
async function applyRestorationParam(param, value) {
    const params = {};
    params[param] = value;
    await applyTransform('restoration', params);
}

// --- Compression Logic ---
async function applyCompressionParam(param, value) {
    const params = {};
    params[param] = value;
    await applyTransform('compression', params);
}

// --- Histogram Logic ---
let histogramChart = null;
let currentHistData = null;

async function fetchHistogram() {
    const res = await fetch('/histogram');
    const data = await res.json();
    if (!data.error) {
        currentHistData = data;
        renderHistogramChart();
    } else {
        alert(data.error);
    }
}

function renderHistogramChart() {
    if (!currentHistData) return;

    const mode = document.getElementById('histMode').value;
    const ctx = document.getElementById('histogramCanvas').getContext('2d');

    if (histogramChart) {
        histogramChart.destroy();
    }

    let datasets = [];

    if (mode === 'rgb') {
        datasets = [
            { label: 'Red', data: currentHistData.r, borderColor: 'red', backgroundColor: 'rgba(255, 0, 0, 0.1)', fill: true, tension: 0.1, pointRadius: 0 },
            { label: 'Green', data: currentHistData.g, borderColor: 'green', backgroundColor: 'rgba(0, 255, 0, 0.1)', fill: true, tension: 0.1, pointRadius: 0 },
            { label: 'Blue', data: currentHistData.b, borderColor: 'blue', backgroundColor: 'rgba(0, 0, 255, 0.1)', fill: true, tension: 0.1, pointRadius: 0 }
        ];
    } else {
        datasets = [
            { label: 'Grayscale', data: currentHistData.gray, borderColor: 'gray', backgroundColor: 'rgba(128, 128, 128, 0.1)', fill: true, tension: 0.1, pointRadius: 0 }
        ];
    }

    histogramChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: currentHistData.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                x: { display: false },
                y: { display: false }
            },
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            }
        }
    });
}

// --- Filters Logic ---
function updateBlurLabel(val) {
    document.getElementById('blurVal').textContent = val;
    document.getElementById('blurVal2').textContent = val;
}

async function applyFiltersParam(param, value) {
    const params = {};
    params[param] = value;
    await applyTransform('filters', params);

    if (param === 'blur_type') {
        const sizeGroup = document.getElementById('blurSizeGroup');
        if (sizeGroup) {
            sizeGroup.style.display = (value !== 'none') ? 'block' : 'none';
        }
    }
}

// --- Interactive Resize Logic ---
const resizeOverlay = document.getElementById('resizeOverlay');
const resizeFrameEl = document.getElementById('resizeFrame');
const resizeDimLabel = document.getElementById('resizeDimLabel');

let isResizeMode = false;
let resizeDragHandle = null;
let resizeStartMouseX = 0, resizeStartMouseY = 0;
let resizeOrigRect = { left: 0, top: 0, width: 0, height: 0 };
let resizeCurrentRect = { left: 0, top: 0, width: 0, height: 0 };
let resizeImgRenderedBounds = null;

function toggleResizeMode(enable = true) {
    isResizeMode = enable;
    const btnStart = document.getElementById('btnStartResize');
    const btnCancel = document.getElementById('btnCancelResize');

    if (enable) {
        if (!mainImage.src || mainImage.naturalWidth === 0) {
            alert('Load gambar terlebih dahulu.');
            isResizeMode = false;
            return;
        }
        resizeOverlay.style.display = 'block';
        imageWrapper.style.overflow = 'visible';
        if (btnStart) btnStart.style.display = 'none';
        if (btnCancel) btnCancel.style.display = 'inline-block';
        initResizeFrame();
    } else {
        resizeOverlay.style.display = 'none';
        imageWrapper.style.overflow = 'hidden';
        // Reset image styles from live preview
        mainImage.style.position = '';
        mainImage.style.left = '';
        mainImage.style.top = '';
        mainImage.style.width = '';
        mainImage.style.height = '';
        mainImage.style.maxWidth = '';
        mainImage.style.maxHeight = '';
        mainImage.style.objectFit = '';
        if (btnStart) btnStart.style.display = 'inline-block';
        if (btnCancel) btnCancel.style.display = 'none';
        resizeDragHandle = null;
    }
}

function initResizeFrame() {
    const imgBounds = getRenderedImageBounds();
    const wrapperRect = imageWrapper.getBoundingClientRect();

    resizeImgRenderedBounds = {
        width: imgBounds.width,
        height: imgBounds.height
    };

    resizeCurrentRect = {
        left: imgBounds.left - wrapperRect.left,
        top: imgBounds.top - wrapperRect.top,
        width: imgBounds.width,
        height: imgBounds.height
    };
    updateResizeFrameUI();
    syncResizeDimensions();
}

function updateResizeFrameUI() {
    resizeFrameEl.style.left = resizeCurrentRect.left + 'px';
    resizeFrameEl.style.top = resizeCurrentRect.top + 'px';
    resizeFrameEl.style.width = Math.max(resizeCurrentRect.width, 20) + 'px';
    resizeFrameEl.style.height = Math.max(resizeCurrentRect.height, 20) + 'px';
}

function syncResizeDimensions() {
    if (!resizeImgRenderedBounds) return;
    const scaleX = resizeCurrentRect.width / resizeImgRenderedBounds.width;
    const scaleY = resizeCurrentRect.height / resizeImgRenderedBounds.height;

    const newW = Math.max(1, Math.round(mainImage.naturalWidth * scaleX));
    const newH = Math.max(1, Math.round(mainImage.naturalHeight * scaleY));

    document.getElementById('resizeW').value = newW;
    document.getElementById('resizeH').value = newH;
    resizeDimLabel.textContent = newW + ' x ' + newH;
}

// Attach mousedown to resize handles
document.querySelectorAll('#resizeFrame .resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resizeDragHandle = handle.dataset.handle;
        resizeStartMouseX = e.clientX;
        resizeStartMouseY = e.clientY;
        resizeOrigRect = { ...resizeCurrentRect };
        document.body.style.userSelect = 'none';
    });
});

window.addEventListener('mousemove', (e) => {
    if (!resizeDragHandle) return;

    const dx = e.clientX - resizeStartMouseX;
    const dy = e.clientY - resizeStartMouseY;

    let { left, top, width, height } = resizeOrigRect;

    if (resizeDragHandle.includes('e')) width += dx;
    if (resizeDragHandle.includes('w')) { left += dx; width -= dx; }
    if (resizeDragHandle.includes('s')) height += dy;
    if (resizeDragHandle.includes('n')) { top += dy; height -= dy; }

    // Enforce minimum size
    if (width < 20) {
        if (resizeDragHandle.includes('w')) left = resizeOrigRect.left + resizeOrigRect.width - 20;
        width = 20;
    }
    if (height < 20) {
        if (resizeDragHandle.includes('n')) top = resizeOrigRect.top + resizeOrigRect.height - 20;
        height = 20;
    }

    resizeCurrentRect = { left, top, width, height };
    updateResizeFrameUI();
    syncResizeDimensions();

    // Live visual preview - stretch image to match frame
    mainImage.style.position = 'absolute';
    mainImage.style.left = resizeCurrentRect.left + 'px';
    mainImage.style.top = resizeCurrentRect.top + 'px';
    mainImage.style.width = resizeCurrentRect.width + 'px';
    mainImage.style.height = resizeCurrentRect.height + 'px';
    mainImage.style.maxWidth = 'none';
    mainImage.style.maxHeight = 'none';
    mainImage.style.objectFit = 'fill';
});

window.addEventListener('mouseup', () => {
    if (resizeDragHandle) {
        resizeDragHandle = null;
        document.body.style.userSelect = '';

        // Reset image styles from live preview
        mainImage.style.position = '';
        mainImage.style.left = '';
        mainImage.style.top = '';
        mainImage.style.width = '';
        mainImage.style.height = '';
        mainImage.style.maxWidth = '';
        mainImage.style.maxHeight = '';
        mainImage.style.objectFit = '';

        // Auto-apply resize on release
        const w = document.getElementById('resizeW').value;
        const h = document.getElementById('resizeH').value;
        if (w && h) {
            applyTransform('resize', { width: w, height: h });
        }
        toggleResizeMode(false);
    }
});

// --- Before/After Compare Logic ---
function openCompare() {
    if (!originalImageBase64 || !mainImage.src) {
        alert('Belum ada gambar untuk dibandingkan.');
        return;
    }

    const overlay = document.getElementById('compareOverlay');
    const afterImg = document.getElementById('compareAfter');
    const beforeImg = document.getElementById('compareBefore');

    beforeImg.src = `data:image/png;base64,${originalImageBase64}`;
    afterImg.src = mainImage.src;

    overlay.style.display = 'flex';
}

function closeCompare() {
    document.getElementById('compareOverlay').style.display = 'none';
}
