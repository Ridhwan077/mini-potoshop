from .geometric import GeometricTransformer
from .enhancement import EnhancementProcessor
from .segmentation import SegmentationProcessor
from .restoration import RestorationProcessor
from .compression import CompressionProcessor
from .histogram import HistogramProcessor
from .filters import FiltersProcessor

class FeatureChainProcessor(HistogramProcessor, CompressionProcessor, SegmentationProcessor, RestorationProcessor, FiltersProcessor, EnhancementProcessor, GeometricTransformer):
    pass

class ImageProcessor(FeatureChainProcessor):
    def apply_pipeline(self):
        if self.original_image is None: return None
        img = self.original_image.copy()
        
        # We need to apply all effects in a logical order:
        
        # 1. Restoration (Denoise, Blur)
        img = self.apply_restoration_pipeline(img)
        
        # 1b. Filters (Gaussian Blur, Average Blur, Sharpening)
        img = self.apply_filters_pipeline(img)
        
        # 2. Enhancement (Brightness, Contrast, CLAHE)
        img = self.apply_enhancement_pipeline(img)
        
        # 3. Segmentation (K-Means)
        img = self.apply_segmentation_pipeline(img)
        
        # 4. Color Processing (Grayscale, Hue, Saturation, Channels)
        img = self.apply_color_pipeline(img)
        
        # 5. Binary & Edge Processing
        img = self.apply_binary_edge_pipeline(img)
        
        # 6. Geometric Transform
        img = self.apply_geometric_pipeline(img)
        
        # 7. Compression
        img = self.apply_compression_pipeline(img)
        
        self.image = img
        return self.image

