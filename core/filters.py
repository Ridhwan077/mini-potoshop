import cv2
import numpy as np

class FiltersProcessor:
    def update_filters(self, blur_type=None, blur_size=None, sharpen=None):
        if blur_type is not None: self.transforms['filters']['blur_type'] = blur_type
        if blur_size is not None: self.transforms['filters']['blur_size'] = blur_size
        if sharpen is not None: self.transforms['filters']['sharpen'] = sharpen
        return self.apply_pipeline()

    def apply_filters_pipeline(self, img):
        if img is None or len(img.shape) != 3 or img.shape[2] != 4:
            return img
            
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
        
        c = self.transforms['filters']
        
        # 1. Apply Blur
        bt = c['blur_type']
        bs = int(c['blur_size'])
        if bt != 'none' and bs > 1:
            # Ensure blur size is odd for Gaussian Blur
            if bs % 2 == 0:
                bs += 1
            if bt == 'gaussian':
                bgr = cv2.GaussianBlur(bgr, (bs, bs), 0)
            elif bt == 'average':
                bgr = cv2.blur(bgr, (bs, bs))
                
        # 2. Apply Sharpening
        sh = float(c['sharpen']) / 100.0  # Scale 0-100 to 0.0-1.0
        if sh > 0:
            k_center = 1.0 + 4.0 * sh
            k_other = -sh
            kernel = np.array([
                [0, k_other, 0],
                [k_other, k_center, k_other],
                [0, k_other, 0]
            ], dtype=np.float32)
            bgr = cv2.filter2D(bgr, -1, kernel)
            # Clip values to valid range [0, 255] and convert to uint8
            bgr = np.clip(bgr, 0, 255).astype(np.uint8)
            
        result = cv2.merge([bgr[:, :, 0], bgr[:, :, 1], bgr[:, :, 2], alpha])
        return result
