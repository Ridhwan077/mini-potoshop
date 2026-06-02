import cv2
import numpy as np

class CompressionProcessor:
    def update_compression(self, quality=None):
        if quality is not None: self.transforms['compression']['quality'] = quality
        return self.apply_pipeline()

    def apply_compression_pipeline(self, img):
        if img is None or len(img.shape) != 3 or img.shape[2] != 4:
            return img
            
        quality = int(self.transforms['compression']['quality'])
        if quality >= 100:
            return img
            
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
        
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        result, encimg = cv2.imencode('.jpg', bgr, encode_param)
        
        if result:
            decimg = cv2.imdecode(encimg, 1)
            return cv2.merge([decimg[:, :, 0], decimg[:, :, 1], decimg[:, :, 2], alpha])
            
        return img
