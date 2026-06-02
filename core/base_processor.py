import cv2
import numpy as np
import base64

class BaseImageProcessor:
    def __init__(self):
        self.image = None
        self.original_image = None
        self.source_image = None
        self.reset_transforms()

    def reset_transforms(self):
        self.transforms = {
            'rotate': 0,
            'flip': {'h': False, 'v': False},
            'resize': None,
            'translate': (0, 0),
            'color': {
                'grayscale': False,
                'channel': 'all', # 'all', 'r', 'g', 'b'
                'hue': 0,
                'saturation': 0
            },
            'binary_edge': {
                'threshold': -1,
                'edge_type': 'none',
                'morph_type': 'none',
                'morph_size': 3
            },
            'filters': {
                'blur_type': 'none',
                'blur_size': 1,
                'sharpen': 0
            },
            'enhancement': {
                'brightness': 0,
                'contrast': 0,
                'clahe': False
            },
            'segmentation': {
                'k': 0
            },
            'restoration': {
                'denoise': False,
                'median_blur': 0
            },
            'compression': {
                'quality': 100
            }
        }

    def load_image_from_base64(self, base64_str):
        # Decode base64 string to numpy array
        nparr = np.frombuffer(base64.b64decode(base64_str), np.uint8)
        self.image = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        
        # Ensure it has 4 channels (BGRA) for transparency support
        if len(self.image.shape) == 2:
            self.image = cv2.cvtColor(self.image, cv2.COLOR_GRAY2BGRA)
        elif self.image.shape[2] == 3:
            self.image = cv2.cvtColor(self.image, cv2.COLOR_BGR2BGRA)
            
        self.original_image = self.image.copy()
        self.source_image = self.image.copy() # Simpan versi murni (untouched)
        return self.image is not None

    def get_base64_image(self, img=None):
        if img is None:
            img = self.image
        if img is None:
            return None
        _, buffer = cv2.imencode('.png', img)
        return base64.b64encode(buffer).decode('utf-8')
