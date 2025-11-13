import { useEffect, useState } from "react";
import { apiUrl } from '@/lib/api';
import { FileText, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface FileOption {
  fileId: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
}

interface FileFilterSelectorProps {
  value: string;
  onChange: (fileId: string) => void;
  className?: string;
}

export const FileFilterSelector = ({ value, onChange, className }: FileFilterSelectorProps) => {
  const [files, setFiles] = useState<FileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('apiUrl('/api/files/my-files')', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to load files:', response.status, errorText);
        throw new Error('Failed to load files');
      }

      const data = await response.json();
      console.log('Files loaded for filter:', data.files?.length || 0, 'files');
      setFiles(data.files || []);
    } catch (error: any) {
      console.error('Error loading files:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📁';
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading files...
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-[250px] ${className}`}>
        <FileText className="h-4 w-4 mr-2" />
        <SelectValue placeholder="All Files" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Files</SelectItem>
        {files.map((file) => (
          <SelectItem key={file.fileId} value={file.fileId}>
            <div className="flex items-center gap-2">
              <span>{getFileIcon(file.mimeType)}</span>
              <span className="truncate max-w-[150px]">{file.originalName}</span>
              <span className="text-xs text-muted-foreground">({formatBytes(file.fileSize)})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
