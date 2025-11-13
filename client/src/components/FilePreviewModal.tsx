import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Code,
  Image as ImageIcon,
  Film,
  Music,
  File,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from "next-themes";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    fileId: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    uploadedBy?: string;
  } | null;
  onDownload?: (fileId: string, fileName: string) => void;
  onShare?: (fileId: string, fileName: string) => void;
  files?: Array<any>; // For navigation
  currentIndex?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export const FilePreviewModal = ({
  isOpen,
  onClose,
  file,
  onDownload,
  onShare,
  files,
  currentIndex,
  onNavigate
}: FilePreviewModalProps) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { theme } = useTheme();

  const token = localStorage.getItem('token');

  // Reset zoom when file changes
  useEffect(() => {
    setZoom(100);
    setIsFullscreen(false);
    setTextContent("");
    setPreviewUrl(null);
    
    if (file && isOpen) {
      loadPreview();
    }
  }, [file, isOpen]);

  const loadPreview = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/files/${file.fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load preview');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // For text-based files, read content
      if (isTextFile(file.mimeType) || isCodeFile(file.originalName)) {
        const text = await blob.text();
        setTextContent(text);
      } else {
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      toast({
        title: "Preview Error",
        description: "Failed to load file preview",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  const isVideoFile = (mimeType: string) => {
    return mimeType.startsWith('video/');
  };

  const isAudioFile = (mimeType: string) => {
    return mimeType.startsWith('audio/');
  };

  const isPdfFile = (mimeType: string) => {
    return mimeType === 'application/pdf';
  };

  const isTextFile = (mimeType: string) => {
    return mimeType.startsWith('text/') || 
           mimeType === 'application/json' ||
           mimeType === 'application/xml';
  };

  const isCodeFile = (fileName: string) => {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs',
      '.rb', '.php', '.go', '.rs', '.swift', '.kt', '.scala', '.sh',
      '.html', '.css', '.scss', '.sass', '.vue', '.svelte', '.md',
      '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.conf'
    ];
    return codeExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'rb': 'ruby',
      'php': 'php',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'sh': 'bash',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'vue': 'vue',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown'
    };
    return languageMap[ext] || 'text';
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    if (file && onDownload) {
      onDownload(file.fileId, file.originalName);
    }
  };

  const handleShare = () => {
    if (file && onShare) {
      onShare(file.fileId, file.originalName);
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (onNavigate) {
      onNavigate(direction);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && onNavigate) {
      handleNavigate('prev');
    } else if (e.key === 'ArrowRight' && onNavigate) {
      handleNavigate('next');
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  if (!file) return null;

  const canNavigate = files && files.length > 1;
  const canGoPrev = canNavigate && currentIndex !== undefined && currentIndex > 0;
  const canGoNext = canNavigate && currentIndex !== undefined && currentIndex < files.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-[95vw] h-[95vh]' : 'max-w-4xl max-h-[90vh]'} overflow-hidden flex flex-col`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold truncate">{file.originalName}</DialogTitle>
              <DialogDescription className="sr-only">
                Preview of {file.originalName} - {file.mimeType}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{file.mimeType}</Badge>
                <Badge variant="secondary">{formatFileSize(file.fileSize)}</Badge>
                {isImageFile(file.mimeType) && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    Image
                  </Badge>
                )}
                {isVideoFile(file.mimeType) && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Film className="h-3 w-3" />
                    Video
                  </Badge>
                )}
                {isAudioFile(file.mimeType) && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    Audio
                  </Badge>
                )}
                {isCodeFile(file.originalName) && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Code className="h-3 w-3" />
                    Code
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between border-t border-b py-2 px-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            {isImageFile(file.mimeType) && (
              <>
                <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[60px] text-center">{zoom}%</span>
                <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {canNavigate && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate('prev')}
                  disabled={!canGoPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {(currentIndex || 0) + 1} / {files?.length || 0}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate('next')}
                  disabled={!canGoNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            {onDownload && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            )}
            {onShare && (
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Image Preview */}
              {isImageFile(file.mimeType) && previewUrl && (
                <div className="flex items-center justify-center h-full bg-muted/30 p-4">
                  <img
                    src={previewUrl}
                    alt={file.originalName}
                    style={{ transform: `scale(${zoom / 100})`, transition: 'transform 0.2s' }}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              {/* Video Preview */}
              {isVideoFile(file.mimeType) && previewUrl && (
                <div className="flex items-center justify-center h-full bg-black/90 p-4">
                  <video
                    src={previewUrl}
                    controls
                    className="max-w-full max-h-full"
                    style={{ maxHeight: isFullscreen ? '85vh' : '60vh' }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {/* Audio Preview */}
              {isAudioFile(file.mimeType) && previewUrl && (
                <div className="flex items-center justify-center h-full bg-muted/30 p-8">
                  <div className="w-full max-w-2xl space-y-4">
                    <div className="flex items-center justify-center mb-8">
                      <Music className="h-24 w-24 text-primary opacity-50" />
                    </div>
                    <audio src={previewUrl} controls className="w-full">
                      Your browser does not support the audio tag.
                    </audio>
                    <div className="text-center text-muted-foreground">
                      <p className="font-medium">{file.originalName}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PDF Preview */}
              {isPdfFile(file.mimeType) && previewUrl && (
                <div className="h-full">
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title={file.originalName}
                  />
                </div>
              )}

              {/* Text/Code Preview */}
              {(isTextFile(file.mimeType) || isCodeFile(file.originalName)) && textContent && (
                <div className="h-full overflow-auto">
                  {isCodeFile(file.originalName) ? (
                    <SyntaxHighlighter
                      language={getLanguageFromFileName(file.originalName)}
                      style={theme === 'dark' ? vscDarkPlus : vs}
                      showLineNumbers
                      wrapLines
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        fontSize: '14px',
                      }}
                    >
                      {textContent}
                    </SyntaxHighlighter>
                  ) : (
                    <pre className="p-4 text-sm whitespace-pre-wrap font-mono">
                      {textContent}
                    </pre>
                  )}
                </div>
              )}

              {/* Unsupported File Type */}
              {!isImageFile(file.mimeType) &&
               !isVideoFile(file.mimeType) &&
               !isAudioFile(file.mimeType) &&
               !isPdfFile(file.mimeType) &&
               !isTextFile(file.mimeType) &&
               !isCodeFile(file.originalName) && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                  <File className="h-24 w-24 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Preview not available</p>
                  <p className="text-sm text-center mb-4">
                    This file type cannot be previewed in the browser.
                  </p>
                  <Button onClick={handleDownload} className="mt-4">
                    <Download className="h-4 w-4 mr-2" />
                    Download to view
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;
