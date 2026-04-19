import { useRef, useState, useEffect } from 'react';
import { Button } from './button';
import { Progress } from './progress';
import { Upload, X, FileText, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Camera } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { CameraCapture, type CameraDocumentType } from './CameraCapture';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  uploading?: boolean;
  progress?: number;
  uploadedUrl?: string | null;
  onRemove?: () => void;
  label?: string;
  description?: string;
  className?: string;
  documentType?: CameraDocumentType;
}

export function FileUpload({
  onFileSelect,
  accept = 'image/*,.pdf',
  maxSizeMB = 5,
  uploading = false,
  progress = 0,
  uploadedUrl = null,
  onRemove,
  label = 'Upload File',
  description = `Max ${maxSizeMB}MB`,
  className,
  documentType,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setFileName(file.name);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    onFileSelect(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setFileName(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onRemove?.();
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  // Show uploaded state
  if (uploadedUrl) {
    return (
      <div className={cn('relative rounded-xl border-2 border-green-500/50 bg-green-50 p-4', className)}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-green-900">File uploaded successfully</p>
            <p className="text-xs text-green-700 truncate">{fileName}</p>
          </div>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show uploading state
  if (uploading) {
    return (
      <div className={cn('relative rounded-xl border-2 border-primary/50 bg-primary/5 p-4', className)}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Uploading...</p>
              <p className="text-xs text-muted-foreground truncate">{fileName}</p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">{progress}%</p>
        </div>
      </div>
    );
  }

  // Show preview if file selected
  if (preview || fileName) {
    return (
      <div className={cn('relative rounded-xl border-2 border-border bg-muted/30 p-4', className)}>
        <div className="flex items-center gap-3">
          {preview ? (
            <img src={preview} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Show upload button
  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="space-y-2">
        <div
          onClick={handleClick}
          className="relative rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5 transition-all cursor-pointer p-6"
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl border border-coke-red/30 bg-coke-red/5 text-coke-red hover:bg-coke-red/10 transition-colors"
          >
            <Camera className="h-4 w-4" weight="duotone" /> Take Photo
          </button>
        )}
      </div>
      {isMobile && (
        <CameraCapture
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onCapture={(file) => {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
            onFileSelect(file);
          }}
          documentType={documentType ?? 'general'}
        />
      )}
    </div>
  );
}
