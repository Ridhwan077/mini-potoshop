import cv2
import numpy as np
from core.base_processor import BaseImageProcessor

class ColorProcessor(BaseImageProcessor):
    
    def update_color(self, grayscale=None, channel=None, hue=None, saturation=None, tint_color=None):
        if grayscale is not None: self.transforms['color']['grayscale'] = grayscale
        if channel is not None: self.transforms['color']['channel'] = channel
        if hue is not None: self.transforms['color']['hue'] = hue
        if saturation is not None: self.transforms['color']['saturation'] = saturation
        if tint_color is not None: self.transforms['color']['tint_color'] = tint_color
        
        # Panggil pipeline utama untuk merender ulang gambar dengan setting warna baru
        return self.apply_pipeline()

    def apply_color_pipeline(self, img):
        """
        Menerapkan seluruh efek warna pada gambar.
        img diharapkan berformat BGRA (4 channels).
        """
        if img is None or len(img.shape) != 3 or img.shape[2] != 4:
            return img
            
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
        
        c = self.transforms['color']
        
        # 1. Grayscale
        if c['grayscale']:
            gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
            
        # 2. Hue & Saturation
        if c['hue'] != 0 or c['saturation'] != 0:
            hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
            
            # Hue (-180 to 180) -> OpenCV HSV hue is 0-179 (setengah lingkaran)
            hue_shift = c['hue'] / 2.0
            hsv[:, :, 0] = (hsv[:, :, 0] + hue_shift) % 180
            
            # Saturation (-100 to 100) -> OpenCV saturation is 0-255
            sat_shift = c['saturation'] / 100.0 # -1.0 to 1.0
            if sat_shift > 0:
                hsv[:, :, 1] = hsv[:, :, 1] + (255 - hsv[:, :, 1]) * sat_shift
            else:
                hsv[:, :, 1] = hsv[:, :, 1] * (1.0 + sat_shift)
                
            hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
            
            hsv = hsv.astype(np.uint8)
            bgr = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        
        # Apply Tint Color (Multiply Blend)
        if c.get('tint_color') and c['tint_color'] != '#ffffff':
            hex_color = c['tint_color'].lstrip('#')
            # Extract R, G, B
            r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
            tint_bgr = np.array([b, g, r], dtype=np.float32)
            
            bgr = bgr.astype(np.float32)
            bgr = (bgr * tint_bgr) / 255.0
            bgr = np.clip(bgr, 0, 255).astype(np.uint8)
            
        # 3. Channel Splitting
        if c['channel'] == 'r':
            bgr[:, :, 0] = 0 # Hapus Biru
            bgr[:, :, 1] = 0 # Hapus Hijau
        elif c['channel'] == 'g':
            bgr[:, :, 0] = 0 # Hapus Biru
            bgr[:, :, 2] = 0 # Hapus Merah
        elif c['channel'] == 'b':
            bgr[:, :, 1] = 0 # Hapus Hijau
            bgr[:, :, 2] = 0 # Hapus Merah
            
        # Gabungkan kembali dengan channel Alpha (transparansi)
        result = cv2.merge([bgr[:, :, 0], bgr[:, :, 1], bgr[:, :, 2], alpha])
        return result
