
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ImageUploadProps {
  onUpload: (file: File) => void;
}

const ImageUpload = ({ onUpload }: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onUpload(file);
    },
    [onUpload]
  );

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          preview ? "border-zinc-300" : "border-zinc-200 hover:border-zinc-300"
        }`}
      >
        {preview ? (
          <div className="relative aspect-video">
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
      {preview && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setPreview(null);
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
