import cv2
import numpy as np
from core.geometric import GeometricTransformer

class EnhancementProcessor:
    def update_enhancement(self, brightness=None, contrast=None, clahe=None):
        if brightness is not None: self.transforms['enhancement']['brightness'] = brightness
        if contrast is not None: self.transforms['enhancement']['contrast'] = contrast
        if clahe is not None: self.transforms['enhancement']['clahe'] = clahe
        return self.apply_pipeline()

    def apply_enhancement_pipeline(self, img):
        if img is None or len(img.shape) != 3 or img.shape[2] != 4:
            return img
            
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
        
        c = self.transforms['enhancement']
        
        # 1. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        if c['clahe']:
            lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
            l_channel, a, b = cv2.split(lab)
            clahe_obj = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            cl = clahe_obj.apply(l_channel)
            limg = cv2.merge((cl, a, b))
            bgr = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
            
        # 2. Brightness and Contrast
        brightness = int(c['brightness'])
        contrast = int(c['contrast'])
        
        if brightness != 0 or contrast != 0:
            if contrast > 0:
                alpha_c = 1.0 + (contrast / 100.0) * 2.0
            else:
                alpha_c = 1.0 + (contrast / 100.0)
            
            beta_c = brightness
            
            bgr = cv2.convertScaleAbs(bgr, alpha=alpha_c, beta=beta_c)
            
        result = cv2.merge([bgr[:, :, 0], bgr[:, :, 1], bgr[:, :, 2], alpha])
        return result
