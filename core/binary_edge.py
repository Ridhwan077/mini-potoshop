import cv2
import numpy as np
from core.color import ColorProcessor

class BinaryEdgeProcessor(ColorProcessor):
    
    def update_binary_edge(self, threshold=None, edge_type=None, morph_type=None, morph_size=None):
        if threshold is not None: self.transforms['binary_edge']['threshold'] = threshold
        if edge_type is not None: self.transforms['binary_edge']['edge_type'] = edge_type
        if morph_type is not None: self.transforms['binary_edge']['morph_type'] = morph_type
        if morph_size is not None: self.transforms['binary_edge']['morph_size'] = morph_size
        return self.apply_pipeline()

    def apply_binary_edge_pipeline(self, img):
        if img is None or len(img.shape) != 3 or img.shape[2] != 4:
            return img
            
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
        
        c = self.transforms['binary_edge']
        
        # 1. Edge Detection
        edge_type = c['edge_type']
        if edge_type != 'none':
            gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            if edge_type == 'canny':
                # Canny takes lower and upper thresholds. We use standard 100, 200
                edges = cv2.Canny(gray, 100, 200)
            elif edge_type == 'sobel':
                sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
                sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
                edges = cv2.magnitude(sobelx, sobely)
                edges = np.uint8(np.clip(edges, 0, 255))
            elif edge_type == 'prewitt':
                kernelx = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=np.float32)
                kernely = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]], dtype=np.float32)
                prewittx = cv2.filter2D(gray, cv2.CV_64F, kernelx)
                prewitty = cv2.filter2D(gray, cv2.CV_64F, kernely)
                edges = cv2.magnitude(prewittx, prewitty)
                edges = np.uint8(np.clip(edges, 0, 255))
            elif edge_type == 'robert':
                kernelx = np.array([[1, 0], [0, -1]], dtype=np.float32)
                kernely = np.array([[0, 1], [-1, 0]], dtype=np.float32)
                robertx = cv2.filter2D(gray, cv2.CV_64F, kernelx)
                roberty = cv2.filter2D(gray, cv2.CV_64F, kernely)
                edges = cv2.magnitude(robertx, roberty)
                edges = np.uint8(np.clip(edges, 0, 255))
            elif edge_type == 'laplacian':
                laplacian = cv2.Laplacian(gray, cv2.CV_64F)
                edges = np.uint8(np.absolute(laplacian))
            elif edge_type == 'log':
                blur = cv2.GaussianBlur(gray, (3, 3), 0)
                laplacian = cv2.Laplacian(blur, cv2.CV_64F)
                edges = np.uint8(np.absolute(laplacian))
            else:
                edges = gray
            
            # Ubah kembali ke BGR agar bisa digabungkan dengan pipeline
            bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

        # 2. Thresholding (Binarization)
        threshold = c['threshold']
        if threshold >= 0:
            gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
            bgr = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

        # 3. Morphology
        morph_type = c['morph_type']
        morph_size = int(c['morph_size'])
        if morph_type != 'none' and morph_size > 1:
            # Kernel harus bernilai ganjil
            if morph_size % 2 == 0: 
                morph_size += 1 
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (morph_size, morph_size))
            
            if morph_type == 'erosion':
                bgr = cv2.erode(bgr, kernel, iterations=1)
            elif morph_type == 'dilation':
                bgr = cv2.dilate(bgr, kernel, iterations=1)

        result = cv2.merge([bgr[:, :, 0], bgr[:, :, 1], bgr[:, :, 2], alpha])
        return result
