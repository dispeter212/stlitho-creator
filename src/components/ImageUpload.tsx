
import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { toast } from "sonner";

interface ImageUploadProps {
  onUpload: (file: File) => void;
  aspectRatio?: number;
}

const ImageUpload = ({ onUpload, aspectRatio = 1 }: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalFileRef = useRef<File | null>(null);

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

  const getCroppedImg = useCallback(
    async (image: HTMLImageElement, crop: PixelCrop) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No 2d context');
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = crop.width;
      canvas.height = crop.height;

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
      );

      return new Promise<File>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          const croppedFile = new File([blob], originalFileRef.current?.name || 'cropped.jpg', {
            type: 'image/jpeg',
          });
          resolve(croppedFile);
        }, 'image/jpeg');
      });
    },
    []
  );

  const handleCropComplete = useCallback(async () => {
    if (!imageRef.current || !completedCrop) {
      return;
    }

    try {
      const croppedFile = await getCroppedImg(imageRef.current, completedCrop);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(croppedFile);
      onUpload(croppedFile);
      setShowCropDialog(false);
      toast.success("Image cropped successfully");
    } catch (error) {
      console.error('Error cropping image:', error);
      toast.error("Failed to crop image");
    }
  }, [completedCrop, getCroppedImg, onUpload]);

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
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          {originalImage && (
            <div className="space-y-4">
              <div className="max-h-[60vh] overflow-auto">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspectRatio}
                >
                  <img
                    ref={imageRef}
                    src={originalImage}
                    alt="Crop"
                    className="max-w-full"
                  />
                </ReactCrop>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCropDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCropComplete}>
                  Apply Crop
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
