
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import ImageUpload from "@/components/ImageUpload";
import ParameterControl from "@/components/ParameterControl";
import { toast } from "sonner";

const Index = () => {
  const [image, setImage] = useState<File | null>(null);
  const [parameters, setParameters] = useState({
    maxHeight: 3,
    minHeight: 0.5,
    outerDiameter: 100,
    innerDiameter: 30,
    grooveDepth: 1,
  });

  const handleImageUpload = useCallback((file: File) => {
    setImage(file);
    toast.success("Image uploaded successfully");
  }, []);

  const handleParameterChange = useCallback((name: string, value: number) => {
    setParameters((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!image) {
      toast.error("Please upload an image first");
      return;
    }

    try {
      // TODO: Implement STL generation
      toast.success("STL file generated successfully!");
    } catch (error) {
      toast.error("Failed to generate STL file");
    }
  }, [image, parameters]);

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
                  label="Groove Depth (mm)"
                  value={parameters.grooveDepth}
                  min={0.5}
                  max={3}
                  step={0.1}
                  onChange={(value) => handleParameterChange("grooveDepth", value)}
                />
              </div>
              <Button
                onClick={handleGenerate}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                disabled={!image}
              >
                Generate STL File
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
