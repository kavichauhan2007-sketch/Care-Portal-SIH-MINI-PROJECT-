'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

interface DocumentUploadProps {
  patientId?: string;
  sessionId?: string;
  onDocumentsChange: (documents: UploadedDocument[]) => void;
}

export default function DocumentUpload({ patientId, sessionId, onDocumentsChange }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypes = [
    { value: 'prescription', label: 'Prescription', icon: '💊' },
    { value: 'lab_report', label: 'Lab Report', icon: '🧪' },
    { value: 'discharge_summary', label: 'Discharge Summary', icon: '📋' },
    { value: 'imaging', label: 'X-Ray / Scan', icon: '🩻' },
    { value: 'medical_certificate', label: 'Medical Certificate', icon: '📄' },
    { value: 'other', label: 'Other Document', icon: '📎' },
  ];

  const [selectedType, setSelectedType] = useState('prescription');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);

    for (const file of files) {
      try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          alert(`File type not allowed: ${file.name}`);
          continue;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          alert(`File too large: ${file.name} (max 10MB)`);
          continue;
        }

        // Create unique filename
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const filePath = `documents/${patientId || 'temp'}/${fileName}`;

        // Upload to Supabase Storage (if configured)
        // For development, we'll store base64 in database
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;

          // Store in database
          if (patientId) {
            const { data, error } = await supabase
              .from('documents')
              .insert({
                patient_id: patientId,
                session_id: sessionId,
                type: selectedType,
                file_url: base64, // In production, this would be storage URL
                mime_type: file.type,
                file_size: file.size,
                metadata: {
                  original_name: file.name,
                  uploaded_via: 'kiosk',
                },
              })
              .select()
              .single();

            if (error) {
              console.error('Upload error:', error);
              alert(`Error uploading ${file.name}`);
              return;
            }
          }

          // Add to local state
          const newDoc: UploadedDocument = {
            id: timestamp.toString(),
            name: file.name,
            type: file.type,
            size: file.size,
            url: base64,
            uploadedAt: new Date(),
          };

          const updated = [...documents, newDoc];
          setDocuments(updated);
          onDocumentsChange(updated);
        };

        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Error uploading ${file.name}`);
      }
    }

    setUploading(false);
  };

  const removeDocument = (id: string) => {
    const updated = documents.filter(doc => doc.id !== id);
    setDocuments(updated);
    onDocumentsChange(updated);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-semibold text-[#151c27] mb-2 md:mb-4">Upload Medical Documents</h3>
      <p className="text-sm text-[#5C5C5C] mb-4">
        Share previous prescriptions, lab reports, or medical records (optional)
      </p>

      {/* Document Type Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-[#151c27]">Document Type</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {documentTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`p-2 md:p-3 rounded-lg border text-left transition-all ${
                selectedType === type.value
                  ? 'border-[#00685f] bg-[#00685f]/5 shadow-sm'
                  : 'border-[#bcc9c6] hover:border-[#00685f]/50 hover:bg-[#f0f7f4]'
              }`}
            >
              <div className="text-xl md:text-2xl mb-1">{type.icon}</div>
              <div className="text-xs md:text-sm font-medium text-[#151c27]">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 md:p-8 text-center transition-all ${
          dragActive
            ? 'border-[#00685f] bg-[#00685f]/5 scale-[1.02]'
            : 'border-[#bcc9c6] hover:border-[#00685f]/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 rounded-full bg-[#f0f7f4] flex items-center justify-center">
          <Upload className="w-6 h-6 md:w-8 md:h-8 text-[#00685f]" />
        </div>
        
        <h4 className="text-base md:text-lg font-medium mb-2 text-[#151c27]">
          {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
        </h4>
        
        <p className="text-xs md:text-sm text-[#5C5C5C] mb-4">
          Supports: JPG, PNG, PDF (Max 10MB per file)
        </p>

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-[#00685f] hover:bg-[#008378] text-white"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Uploading...
            </>
          ) : (
            'Choose Files'
          )}
        </Button>
      </div>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-[#151c27]">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-[#00685f]" />
            Uploaded Documents ({documents.length})
          </h4>
          
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 bg-[#f0f7f4] border border-[#bcc9c6] rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  {doc.type.startsWith('image/') ? (
                    <ImageIcon className="w-5 h-5 text-[#0058be]" />
                  ) : (
                    <FileText className="w-5 h-5 text-[#ba1a1a]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-[#151c27]">{doc.name}</p>
                  <p className="text-xs text-[#5C5C5C]">
                    {formatFileSize(doc.size)} • {selectedType.replace('_', ' ')}
                  </p>
                </div>

                <button
                  onClick={() => removeDocument(doc.id)}
                  className="p-2 hover:bg-[#ffdad6] rounded-lg flex-shrink-0 transition-colors"
                  aria-label="Remove document"
                >
                  <X className="w-4 h-4 text-[#ba1a1a]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-4 p-3 md:p-4 bg-[#d8e2ff] border border-[#0058be]/20 rounded-lg text-sm text-[#151c27]">
        <strong className="text-[#0058be]">📋 Tips:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1 text-xs md:text-sm">
          <li>Ensure documents are clear and readable</li>
          <li>Include date on prescriptions</li>
          <li>Upload recent lab reports first</li>
          <li>You can upload multiple files at once</li>
        </ul>
      </div>
    </Card>
  );
}
