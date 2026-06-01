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

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
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
let bakedRotation = 0;

function displayImage(base64, isReset = false) {
    mainImage.src = `data:image/png;base64,${base64}`;
    transformFrame.style.display = 'flex';
    emptyState.style.display = 'none';
    
    if (isReset) {
        currentRotation = 0;
        bakedRotation = 0;
        transformFrame.style.transform = 'none';
        if (rotateRange) {
            rotateRange.value = 0;
            updateLabel('rotateVal', '0');
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
    } else {
        alert(data.error);
    }
}

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
    }
}

function downloadImage() {
    if (!mainImage.src) return;
    const link = document.createElement('a');
    link.download = 'processed_image.jpg';
    link.href = mainImage.src;
    link.click();
}

// --- Navigation Logic ---
function openPanel(panelId) {
    document.getElementById('main-menu').style.display = 'none';
    const panels = document.querySelectorAll('.tool-panel');
    panels.forEach(p => p.style.display = 'none');
    
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.display = 'block';
        panel.classList.add('fade-in');
        setTimeout(() => panel.classList.remove('fade-in'), 300);
    }
}

function closePanel() {
    const panels = document.querySelectorAll('.tool-panel');
    panels.forEach(p => p.style.display = 'none');
    
    const mainMenu = document.getElementById('main-menu');
    mainMenu.style.display = 'block';
    mainMenu.classList.add('fade-in');
    setTimeout(() => mainMenu.classList.remove('fade-in'), 300);
}
