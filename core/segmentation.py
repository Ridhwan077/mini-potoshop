import cv2
import numpy as np

class SegmentationProcessor:
    def update_segmentation(self, k=None):
        if k is not None: self.transforms['segmentation']['k'] = k
        return self.apply_pipeline()

    def apply_segmentation_pipeline(self, img):
        if img is None or len(img.shape) != 3 or img.shape[2] != 4:
            return img
            
        k = int(self.transforms['segmentation']['k'])
        if k <= 1:
            return img
            
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
        
        # Reshape the image to a 2D array of pixels and 3 color values (RGB)
        pixel_values = bgr.reshape((-1, 3))
        pixel_values = np.float32(pixel_values)
        
        # Define stopping criteria
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
        
        # Apply K-means
        _, labels, (centers) = cv2.kmeans(pixel_values, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
        
        # Convert back to 8 bit values
        centers = np.uint8(centers)
        
        # Flatten the labels array
        labels = labels.flatten()
        
        # Convert all pixels to the color of the centroids
        segmented_image = centers[labels.flatten()]
        
        # Reshape back to the original image dimension
        segmented_image = segmented_image.reshape(bgr.shape)
        
        result = cv2.merge([segmented_image[:, :, 0], segmented_image[:, :, 1], segmented_image[:, :, 2], alpha])
        return result
