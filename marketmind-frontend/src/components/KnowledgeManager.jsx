import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  FileText, 
  Trash2, 
  Upload,
  BarChart3,
  File
} from 'lucide-react';
import { 
  uploadBrandDocument, 
  getBrandDocuments, 
  deleteBrandDocument, 
  getKnowledgeStats 
} from '../services/api';

const shellCard = 'rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] shadow-sm';
const innerCard = 'rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm';

const KnowledgeManager = ({ brandId, brandName }) => {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (brandId) {
      loadKnowledgeData();
    }
  }, [brandId]);

  const loadKnowledgeData = async () => {
    try {
      setLoading(true);
      const [documentsData, statsData] = await Promise.all([
        getBrandDocuments(brandId),
        getKnowledgeStats(brandId)
      ]);
      
      setDocuments(documentsData.documents || []);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to load knowledge base');
      console.error('Error loading knowledge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|md)$/i)) {
      toast.error('Please upload PDF, TXT, or MD files only');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      const result = await uploadBrandDocument(brandId, file);
      
      toast.success(`Document uploaded successfully (${result.chunks_created} chunks created)`);
      
      // Reload data
      await loadKnowledgeData();
      
      // Clear file input
      event.target.value = '';
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload document');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      setDeletingId(documentId);
      await deleteBrandDocument(brandId, documentId);
      
      toast.success('Document deleted successfully');
      await loadKnowledgeData();
      
    } catch (error) {
      toast.error('Failed to delete document');
      console.error('Delete error:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      {stats && (
        <div className={shellCard}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Knowledge Base Stats</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total_documents}</div>
                <div className="text-sm text-gray-500">Documents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total_chunks}</div>
                <div className="text-sm text-gray-500">Chunks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{formatFileSize(stats.total_file_size)}</div>
                <div className="text-sm text-gray-500">Total Size</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{Object.keys(stats.file_types || {}).length}</div>
                <div className="text-sm text-gray-500">File Types</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Card */}
      <div className={shellCard}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Click to upload or drag and drop
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  PDF, TXT, MD files up to 10MB
                </span>
              </label>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
            {uploading && (
              <div className="mt-4">
                <div className="h-2 w-32 mx-auto bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="mt-2 text-sm text-gray-600">Processing document...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className={shellCard}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Documents ({documents.length})
            </h3>
          </div>
          
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <File className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                No documents uploaded yet. Upload your first document to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className={innerCard}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {doc.file_type === 'pdf' ? (
                          <FileText className="h-8 w-8 text-red-500" />
                        ) : (
                          <File className="h-8 w-8 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {doc.filename}
                        </h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatFileSize(doc.file_size)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {doc.file_type.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(doc.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                      disabled={deletingId === doc.id}
                      className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="Delete document"
                    >
                      {deletingId === doc.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border border-red-600 border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeManager;
