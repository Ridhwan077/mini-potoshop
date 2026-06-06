from flask import Flask, render_template, request, jsonify
from core import ImageProcessor
import base64

app = Flask(__name__)
img_proc = ImageProcessor()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    data = request.get_json()
    if 'image' not in data:
        return jsonify({'error': 'No image data'}), 400
    
    base64_str = data['image'].split(',')[1] if ',' in data['image'] else data['image']
    if img_proc.load_image_from_base64(base64_str):
        return jsonify({'status': 'success', 'image': img_proc.get_base64_image()})
    return jsonify({'error': 'Failed to load image'}), 400

@app.route('/transform', methods=['POST'])
def transform():
    data = request.get_json()
    action = data.get('action')
    
    if img_proc.image is None:
        return jsonify({'error': 'No image loaded'}), 400
    
    result = None
    if action == 'rotate':
        angle = float(data.get('angle', 0))
        result = img_proc.rotate(angle)
    elif action == 'flip':
        direction = data.get('direction', 'h')
        result = img_proc.flip(direction)
    elif action == 'resize':
        w = int(data.get('width', 100))
        h = int(data.get('height', 100))
        result = img_proc.resize(w, h)
    elif action == 'translate':
        tx = float(data.get('tx', 0))
        ty = float(data.get('ty', 0))
        result = img_proc.translate(tx, ty)
    elif action == 'crop':
        x = float(data.get('x', 0))
        y = float(data.get('y', 0))
        w = float(data.get('w', 1))
        h = float(data.get('h', 1))
        result = img_proc.crop_and_bake(x, y, w, h)
    elif action == 'color':
        grayscale = data.get('grayscale')
        channel = data.get('channel')
        hue = data.get('hue')
        if hue is not None: hue = float(hue)
        saturation = data.get('saturation')
        if saturation is not None: saturation = float(saturation)
        tint_color = data.get('tint_color')
        result = img_proc.update_color(grayscale=grayscale, channel=channel, hue=hue, saturation=saturation, tint_color=tint_color)
    elif action == 'binary_edge':
        threshold = data.get('threshold')
        if threshold is not None: threshold = int(threshold)
        edge_type = data.get('edge_type')
        morph_type = data.get('morph_type')
        morph_size = data.get('morph_size')
        if morph_size is not None: morph_size = int(morph_size)
        result = img_proc.update_binary_edge(threshold, edge_type, morph_type, morph_size)
    elif action == 'enhancement':
        brightness = data.get('brightness')
        if brightness is not None: brightness = int(brightness)
        contrast = data.get('contrast')
        if contrast is not None: contrast = int(contrast)
        clahe = data.get('clahe')
        result = img_proc.update_enhancement(brightness, contrast, clahe)
    elif action == 'segmentation':
        k = data.get('k')
        if k is not None: k = int(k)
        result = img_proc.update_segmentation(k)
    elif action == 'restoration':
        denoise = data.get('denoise')
        median_blur = data.get('median_blur')
        if median_blur is not None: median_blur = int(median_blur)
        result = img_proc.update_restoration(denoise, median_blur)
    elif action == 'filters':
        blur_type = data.get('blur_type')
        blur_size = data.get('blur_size')
        if blur_size is not None: blur_size = int(blur_size)
        sharpen = data.get('sharpen')
        if sharpen is not None: sharpen = int(sharpen)
        result = img_proc.update_filters(blur_type, blur_size, sharpen)
    elif action == 'compression':
        quality = data.get('quality')
        if quality is not None: quality = int(quality)
        result = img_proc.update_compression(quality)
    
    if result is not None:
        return jsonify({'status': 'success', 'image': img_proc.get_base64_image()})
    
    return jsonify({'error': 'Transformation failed'}), 400

@app.route('/histogram', methods=['GET'])
def histogram():
    if img_proc.image is None:
        return jsonify({'error': 'No image loaded'}), 400
    
    hist_data = img_proc.get_histogram_data()
    if hist_data:
        return jsonify(hist_data)
    return jsonify({'error': 'Failed to calculate histogram'}), 400

@app.route('/reset', methods=['POST'])
def reset():
    if hasattr(img_proc, 'source_image') and img_proc.source_image is not None:
        img_proc.original_image = img_proc.source_image.copy()
        img_proc.image = img_proc.source_image.copy()
        img_proc.reset_transforms()
        return jsonify({'status': 'success', 'image': img_proc.get_base64_image()})
    return jsonify({'error': 'No source image found'}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
