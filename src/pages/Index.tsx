
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ImageUpload from "@/components/ImageUpload";
import ParameterControl from "@/components/ParameterControl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { generateSTL } from "@/utils/stlGenerator";
import 'react-image-crop/dist/ReactCrop.css';

const Index = () => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [parameters, setParameters] = useState({
    maxHeight: 3,
    minHeight: 0.5,
    outerDiameter: 100,
    innerDiameter: 30,
    wallHeight: 5,
    wallDistance: 40,
  });

  const handleImageUpload = useCallback((file: File) => {
    setOriginalImage(file);
    if (file) {
      toast.success("Image uploaded successfully");
    }
  }, []);

  const handleParameterChange = useCallback((name: string, value: number) => {
    setParameters((prev) => ({ ...prev, [name]: value }));
  }, []);

  const processImage = useCallback(async () => {
    if (!originalImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(originalImage);
      });

      const size = Math.min(img.width, img.height);
      canvas.width = size;
      canvas.height = size;

      if (!ctx) return;

      const outerRadius = (size * parameters.outerDiameter) / (2 * Math.max(parameters.outerDiameter, parameters.outerDiameter));
      const innerRadius = (size * parameters.innerDiameter) / (2 * Math.max(parameters.outerDiameter, parameters.outerDiameter));
      const centerX = size / 2;
      const centerY = size / 2;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      const scale = size / Math.min(img.naturalWidth, img.naturalHeight);
      const x = (size - img.naturalWidth * scale) / 2;
      const y = (size - img.naturalHeight * scale) / 2;
      ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);

      // Create donut mask
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
      ctx.fill();

      // Reset composite operation and add black background
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.rect(0, 0, size, size);
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
      ctx.fill('evenodd');

      const previewBlob = await new Promise<Blob>((resolve) => 
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg')
      );

      const previewFile = new File([previewBlob], originalImage.name, {
        type: 'image/jpeg',
      });

      setPreviewUrl(URL.createObjectURL(previewBlob));
      setProcessedImage(previewFile);
      setShowPreviewDialog(true);

    } catch (error) {
      console.error('Error processing image:', error);
      toast.error("Failed to process image");
    }
  }, [originalImage, parameters.outerDiameter, parameters.innerDiameter]);

  const handleGenerateSTL = useCallback(async () => {
    if (!processedImage) return;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(processedImage);
      });

      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx!.fillStyle = '#FFFFFF';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx!.drawImage(img, 0, 0);
      
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
      const stlBlob = await generateSTL(imageData, parameters);

      const downloadUrl = URL.createObjectURL(stlBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = "lithophane.stl";
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      URL.revokeObjectURL(downloadUrl);
      setShowPreviewDialog(false);
      toast.success("STL file generated successfully!");
    } catch (error) {
      console.error("STL generation error:", error);
      toast.error("Failed to generate STL file");
    }
  }, [processedImage, parameters]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-block bg-zinc-100 text-zinc-800 text-sm font-medium px-4 py-1 rounded-full">
              3D Model Generator
            </div>
            <h1 className="text-4xl font-semibold text-zinc-900">
              Lithophane Creator
            </h1>
            <p className="text-zinc-600 max-w-2xl mx-auto">
              Transform your images into beautiful lithophane panels. Upload an
              image, adjust the parameters, and generate an STL file ready for 3D
              printing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-medium text-zinc-900">Image Upload</h2>
              <ImageUpload onUpload={handleImageUpload} />
              {originalImage && (
                <Button 
                  onClick={processImage}
                  className="w-full"
                >
                  Preview Lithophane
                </Button>
              )}
            </Card>

            <Card className="p-6 space-y-6">
              <h2 className="text-xl font-medium text-zinc-900">Parameters</h2>
              <div className="space-y-4">
                <ParameterControl
                  label="Maximum Height (mm)"
                  value={parameters.maxHeight}
                  min={1}
                  max={10}
                  step={0.1}
                  onChange={(value) => handleParameterChange("maxHeight", value)}
                />
                <ParameterControl
                  label="Minimum Height (mm)"
                  value={parameters.minHeight}
                  min={0.1}
                  max={2}
                  step={0.1}
                  onChange={(value) => handleParameterChange("minHeight", value)}
                />
                <ParameterControl
                  label="Outer Diameter (mm)"
                  value={parameters.outerDiameter}
                  min={50}
                  max={200}
                  step={1}
                  onChange={(value) =>
                    handleParameterChange("outerDiameter", value)
                  }
                />
                <ParameterControl
                  label="Inner Diameter (mm)"
                  value={parameters.innerDiameter}
                  min={10}
                  max={50}
                  step={1}
                  onChange={(value) =>
                    handleParameterChange("innerDiameter", value)
                  }
                />
                <ParameterControl
                  label="Wall Height (mm)"
                  value={parameters.wallHeight}
                  min={1}
                  max={10}
                  step={0.1}
                  onChange={(value) => handleParameterChange("wallHeight", value)}
                />
                <ParameterControl
                  label="Wall Distance from Center (mm)"
                  value={parameters.wallDistance}
                  min={20}
                  max={90}
                  step={1}
                  onChange={(value) =>
                    handleParameterChange("wallDistance", value)
                  }
                />
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Confirm Lithophane Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Your image has been processed into a donut shape based on the diameter settings.
              The area between the outer and inner diameter will be used to create the lithophane.
            </p>
            {previewUrl && (
              <div className="max-h-[60vh] overflow-auto">
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowPreviewDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerateSTL}>
                Generate STL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
