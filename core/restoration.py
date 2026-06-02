import cv2
import numpy as np

class RestorationProcessor:
    def update_restoration(self, denoise=None, median_blur=None):
        if denoise is not None: self.transforms['restoration']['denoise'] = denoise
        if median_blur is not None: self.transforms['restoration']['median_blur'] = median_blur
        return self.apply_pipeline()

    def apply_restoration_pipeline(self, img):
        if img is None or len(img.shape) != 3 or img.shape[2] != 4:
            return img
            
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
        
        c = self.transforms['restoration']
        
        if c['denoise']:
            bgr = cv2.fastNlMeansDenoisingColored(bgr, None, 10, 10, 7, 21)
            
        mb = int(c['median_blur'])
        if mb > 0:
            if mb % 2 == 0:
                mb += 1
            bgr = cv2.medianBlur(bgr, mb)
            
        result = cv2.merge([bgr[:, :, 0], bgr[:, :, 1], bgr[:, :, 2], alpha])
        return result
