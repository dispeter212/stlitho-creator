
import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactCrop, { PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { toast } from "sonner";

interface ImageUploadProps {
  onUpload: (file: File) => void;
  outerDiameter: number;
  innerDiameter: number;
}

const ImageUpload = ({ onUpload, outerDiameter, innerDiameter }: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalFileRef = useRef<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const createDonutMask = useCallback((canvas: HTMLCanvasElement, outerRadius: number, innerRadius: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    // Draw outer circle
    ctx.arc(canvas.width / 2, canvas.height / 2, outerRadius, 0, Math.PI * 2);
    // Draw inner circle (counterclockwise to create hole)
    ctx.arc(canvas.width / 2, canvas.height / 2, innerRadius, 0, Math.PI * 2, true);
    ctx.clip();
  }, []);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const canvas = document.createElement('canvas');
    const size = Math.min(img.width, img.height);
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate radii in pixels
    const outerRadius = (size * outerDiameter) / (2 * Math.max(outerDiameter, outerDiameter));
    const innerRadius = (size * innerDiameter) / (2 * Math.max(outerDiameter, outerDiameter));

    // Draw donut shape
    createDonutMask(canvas, outerRadius, innerRadius);
    
    // Draw and crop image
    const scale = size / Math.min(img.naturalWidth, img.naturalHeight);
    const x = (size - img.naturalWidth * scale) / 2;
    const y = (size - img.naturalHeight * scale) / 2;
    
    ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
    ctx.restore();

    // Create crop area that matches the donut
    const crop: PixelCrop = {
      unit: 'px',
      x: (size - outerRadius * 2) / 2,
      y: (size - outerRadius * 2) / 2,
      width: outerRadius * 2,
      height: outerRadius * 2
    };

    setCompletedCrop(crop);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], originalFileRef.current?.name || 'cropped.jpg', {
          type: 'image/jpeg',
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(croppedFile);
        onUpload(croppedFile);
      }
    }, 'image/jpeg');
  }, [outerDiameter, innerDiameter, createDonutMask, onUpload]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      originalFileRef.current = file;
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setShowCropDialog(true);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          preview ? "border-zinc-300" : "border-zinc-200 hover:border-zinc-300"
        }`}
      >
        {preview ? (
          <div className="relative aspect-square">
            <img
              src={preview}
              alt="Preview"
              className="rounded object-contain w-full h-full"
            />
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-zinc-600">
              Drag and drop an image here, or click to select
            </p>
          </div>
        )}
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Confirm Image Crop</DialogTitle>
          </DialogHeader>
          {originalImage && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                Your image has been automatically cropped to match the lithophane dimensions. 
                The preview shows exactly how your lithophane will look.
              </p>
              <div className="max-h-[60vh] overflow-auto">
                <img
                  ref={imageRef}
                  src={originalImage}
                  alt="Crop"
                  className="max-w-full"
                  onLoad={onImageLoad}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCropDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setShowCropDialog(false)}>
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {preview && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setPreview(null);
            setOriginalImage(null);
            originalFileRef.current = null;
            onUpload(null as any);
          }}
        >
          Remove Image
        </Button>
      )}
    </div>
  );
};

export default ImageUpload;
