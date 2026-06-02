import cv2
import numpy as np

class HistogramProcessor:
    def get_histogram_data(self):
        if self.image is None: return None
        
        bgr = self.image[:, :, :3]
        
        # Calculate histograms for B, G, R
        b_hist = cv2.calcHist([bgr], [0], None, [256], [0, 256]).flatten().tolist()
        g_hist = cv2.calcHist([bgr], [1], None, [256], [0, 256]).flatten().tolist()
        r_hist = cv2.calcHist([bgr], [2], None, [256], [0, 256]).flatten().tolist()
        
        # Grayscale
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        gray_hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten().tolist()
        
        labels = list(range(256))
        
        return {
            'labels': labels,
            'r': r_hist,
            'g': g_hist,
            'b': b_hist,
            'gray': gray_hist
        }
