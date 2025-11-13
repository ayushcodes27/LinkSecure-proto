import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  id: string;
}

interface FileUploadZoneProps {
  onUploadComplete?: () => void;
}

export const FileUploadZone = ({ onUploadComplete }: FileUploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<FileWithProgress[]>([]);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  const handleFiles = async (files: File[]) => {
    const newFiles: FileWithProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
      id: Math.random().toString(36).substr(2, 9)
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);

    // Upload files to server
    for (const fileWithProgress of newFiles) {
      try {
        await uploadFile(fileWithProgress);
      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === fileWithProgress.id 
              ? { ...f, status: 'error' as const }
              : f
          )
        );
        toast({
          title: "Upload failed",
          description: `Failed to upload ${fileWithProgress.file.name}`,
          variant: "destructive"
        });
      }
    }
  };

  const uploadFile = async (fileWithProgress: FileWithProgress) => {
    const formData = new FormData();
    formData.append('files', fileWithProgress.file);
    formData.append('uploadMethod', 'drag-drop');

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found. Please log in first.');
    }

    console.log('Uploading file with token:', token.substring(0, 20) + '...');

    const response = await fetch(apiUrl('/api/files/upload-multiple'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Upload failed');
    }

    const result = await response.json();
    
    // Update progress to completed
    setUploadingFiles(prev => 
      prev.map(f => 
        f.id === fileWithProgress.id 
          ? { ...f, progress: 100, status: 'completed' as const }
          : f
      )
    );

    toast({
      title: "File uploaded successfully",
      description: `${fileWithProgress.file.name} has been uploaded and secured.`,
    });
    
    // Call onUploadComplete callback if provided
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const removeFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="bg-gradient-card border-0 shadow-soft">
      <CardContent className="p-6">
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
            ${isDragOver 
              ? 'border-primary bg-primary/5 shadow-glow' 
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
          <h3 className="text-lg font-semibold mb-2">
            Drop files here or click to upload
          </h3>
          <p className="text-muted-foreground mb-4">
            Support for PDF, DOC, JPG, PNG, MP4 and more. Max file size: 100MB
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.mov,.avi"
          />
          <Button asChild className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </label>
          </Button>
        </div>

        {/* Upload Progress */}
        {uploadingFiles.length > 0 && (
          <div className="mt-6 space-y-4">
            <h4 className="font-semibold">Uploading Files</h4>
            {uploadingFiles.map((fileWithProgress) => (
              <div key={fileWithProgress.id} className="flex items-center space-x-4 p-3 bg-muted/30 rounded-lg">
                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{fileWithProgress.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(fileWithProgress.file.size)}
                  </p>
                  <Progress value={fileWithProgress.progress} className="mt-2" />
                </div>
                <div className="flex items-center space-x-2">
                  {fileWithProgress.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : fileWithProgress.status === 'error' ? (
                    <X className="h-5 w-5 text-red-500" />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {fileWithProgress.progress}%
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileWithProgress.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};