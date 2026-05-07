import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { FileText, History } from "lucide-react";
import { format } from "date-fns";

interface DocumentsTabProps {
  documents: any[];
  uploading: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownload: (docId: number, filename: string) => void;
}

export function DocumentsTab({
  documents,
  uploading,
  handleFileUpload,
  handleDownload
}: DocumentsTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Project Documents</CardTitle>
          <CardDescription>Legal, technical, and site-related documentation.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-upload-tab"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => document.getElementById('file-upload-tab')?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload New'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {documents.map((doc: any) => (
            <div key={doc.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{doc.original_filename}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {(doc.file_size / 1024).toFixed(1)} KB • Uploaded {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDownload(doc.id, doc.filename)}
              >
                <History className="h-4 w-4 rotate-90" />
              </Button>
            </div>
          ))}
          
          {documents.length === 0 && (
            <div className="p-12 border border-dashed rounded-lg bg-muted/10 text-center space-y-2">
              <p className="text-sm text-muted-foreground italic">No documents have been uploaded yet.</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Keep your project organized</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
