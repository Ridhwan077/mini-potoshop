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
        result = img_proc.update_color(grayscale, channel, hue, saturation)
    elif action == 'binary_edge':
        threshold = data.get('threshold')
        if threshold is not None: threshold = int(threshold)
        edge_type = data.get('edge_type')
        morph_type = data.get('morph_type')
        morph_size = data.get('morph_size')
        if morph_size is not None: morph_size = int(morph_size)
        result = img_proc.update_binary_edge(threshold, edge_type, morph_type, morph_size)
    
    if result is not None:
        return jsonify({'status': 'success', 'image': img_proc.get_base64_image()})
    
    return jsonify({'error': 'Transformation failed'}), 400

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
