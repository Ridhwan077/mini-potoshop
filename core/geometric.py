import cv2
import numpy as np
from .binary_edge import BinaryEdgeProcessor

class GeometricTransformer(BinaryEdgeProcessor):
    def rotate(self, angle):
        self.transforms['rotate'] = angle
        return self.apply_pipeline()

    def flip(self, direction):
        if direction == 'h':
            self.transforms['flip']['h'] = not self.transforms['flip']['h']
        elif direction == 'v':
            self.transforms['flip']['v'] = not self.transforms['flip']['v']
        return self.apply_pipeline()

    def resize(self, width, height):
        self.transforms['resize'] = (width, height)
        return self.apply_pipeline()

    def translate(self, tx, ty):
        self.transforms['translate'] = (tx, ty)
        return self.apply_pipeline()

    def apply_pipeline(self):
        if self.original_image is None: return None
        img = self.original_image.copy()
        
        # 1. Apply Color Processing (sebelum transformasi geometris)
        img = self.apply_color_pipeline(img)
        
        # 2. Apply Binary & Edge Processing
        img = self.apply_binary_edge_pipeline(img)

        # 3. Apply Resize
        if self.transforms['resize']:
            w, h = self.transforms['resize']
            img = cv2.resize(img, (w, h), interpolation=cv2.INTER_LINEAR)

        # 2. Apply Flip
        if self.transforms['flip']['h']:
            img = cv2.flip(img, 1)
        if self.transforms['flip']['v']:
            img = cv2.flip(img, 0)

        # 3. Apply Translate
        tx, ty = self.transforms['translate']
        if tx != 0 or ty != 0:
            h, w = img.shape[:2]
            M = np.float32([[1, 0, tx], [0, 1, ty]])
            img = cv2.warpAffine(img, M, (w, h))

        # 4. Apply Rotate (with auto-trim)
        angle = self.transforms['rotate']
        if angle != 0:
            h, w = img.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, -angle, 1.0)
            
            cos = np.abs(M[0, 0])
            sin = np.abs(M[0, 1])
            new_w = int((h * sin) + (w * cos))
            new_h = int((h * cos) + (w * sin))
            
            M[0, 2] += (new_w / 2) - center[0]
            M[1, 2] += (new_h / 2) - center[1]
            
            img = cv2.warpAffine(img, M, (new_w, new_h), borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
            
            if img.shape[2] == 4:
                alpha = img[:, :, 3]
                y_indices, x_indices = np.where(alpha > 0)
                if len(y_indices) > 0 and len(x_indices) > 0:
                    y_min, y_max = y_indices.min(), y_indices.max()
                    x_min, x_max = x_indices.min(), x_indices.max()
                    img = img[y_min:y_max+1, x_min:x_max+1]

        self.image = img
        return self.image

    def crop_and_bake(self, x_pct, y_pct, w_pct, h_pct):
        # We need to ensure the pipeline is applied first to get the current self.image
        self.apply_pipeline()
        if self.image is None: return None
        
        h, w = self.image.shape[:2]
        x1 = int(x_pct * w)
        y1 = int(y_pct * h)
        x2 = int((x_pct + w_pct) * w)
        y2 = int((y_pct + h_pct) * h)
        
        # Clamp bounds
        x1, x2 = max(0, x1), min(w, x2)
        y1, y2 = max(0, y1), min(h, y2)
        
        if x1 >= x2 or y1 >= y2:
            return None
            
        cropped = self.image[y1:y2, x1:x2]
        
        # Bake as new original image
        self.original_image = cropped.copy()
        self.reset_transforms()
        
        return self.apply_pipeline()
