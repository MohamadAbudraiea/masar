import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, FileText, CheckCircle, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client.js';

/**
 * FileUpload Component
 *
 * @param {Object} props
 * @param {'document' | 'images'} [props.type] - 'document' (single PDF) or 'images' (up to maxCount)
 * @param {string | string[]} [props.value] - key (string) or keys array
 * @param {Function} props.onChange - returns key (for document) or string[] (for images)
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {number} [props.maxCount] - max images (default 3)
 * @param {string} [props.kind] - upload subfolder kind ('documents', 'truck_photos', etc.)
 */
export default function FileUpload({
  type = 'document',
  value = null,
  onChange,
  label,
  hint,
  maxCount = 3,
  kind = 'documents',
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const fileInputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const isImages = type === 'images' || type === 'image';
  const currentKeys = isImages
    ?Array.isArray(value)
    ? value.filter((v) => typeof v === 'string' && v.trim())
    : typeof value === 'string' && value.trim()
      ? [value]
      : []
    : typeof value === 'string' && value.trim()
    ? [value]
    : [];

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      if (isImages) {
        // Enforce maxCount
        const remainingSlots = maxCount - currentKeys.length;
        if (remainingSlots <= 0) {
          throw new Error(isAr ? `الحد الأقصى ${maxCount} صور فقط` : `Maximum ${maxCount} images allowed`);
        }

        const filesToUpload = files.slice(0, remainingSlots);
        const uploadedKeys = [...currentKeys];

        for (const file of filesToUpload) {
          if (!file.type.startsWith('image/')) {
            throw new Error(isAr ? 'يرجى اختيار صور فقط' : 'Only image files are accepted');
          }

          const formData = new FormData();
          formData.append('file', file);
          const res = await apiClient(`/uploads?kind=${kind}`, {
            method: 'POST',
            body: formData,
          });
          uploadedKeys.push(res.key);
        }

        onChange(uploadedKeys);
      } else {
        // Single Document (PDF)
        const file = files[0];
        if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
          throw new Error(isAr ? 'يجب أن يكون الملف بصيغة PDF' : 'Document must be a PDF file');
        }

        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient(`/uploads?kind=${kind}`, {
          method: 'POST',
          body: formData,
        });

        onChange(res.key);
      }
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleRemove(keyToRemove) {
    if (isImages) {
      onChange(currentKeys.filter((k) => k !== keyToRemove));
    } else {
      onChange(null);
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold text-navy-900">
          {label}
        </label>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={isImages ? 'image/*' : 'application/pdf'}
        multiple={isImages}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Dropzone / Trigger */}
      {(!currentKeys.length || (isImages && currentKeys.length < maxCount)) && (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${isUploading
              ? 'border-amber-300 bg-amber-50/50 cursor-wait'
              : 'border-line hover:border-amber-500 hover:bg-slate-50/60 bg-white'
            }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-2 text-amber-700">
              <Loader2 className="w-6 h-6 animate-spin mb-1 text-amber-500" />
              <span className="text-xs font-semibold">
                {isAr ? 'جاري رفع الملف...' : 'Uploading file...'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2 space-y-1">
              <div className="w-10 h-10 rounded-xl bg-navy-100/60 text-navy-800 flex items-center justify-center">
                {isImages ? (
                  <ImageIcon className="w-5 h-5" />
                ) : (
                  <UploadCloud className="w-5 h-5" />
                )}
              </div>
              <div className="text-xs font-bold text-navy-900">
                {isImages
                  ? isAr ? `انقر لاختيار صور الشاحنة (حتى ${maxCount})` : `Upload truck photos (max ${maxCount})`
                  : isAr ? 'انقر لرفع وثيقة PDF' : 'Click to upload PDF document'}
              </div>
              <div className="text-[10px] text-ink-muted">
                {hint || (isImages ? 'JPG, PNG, WebP' : 'PDF only, max 25MB')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
          <span>•</span>
          <span>{uploadError}</span>
        </div>
      )}

      {/* Uploaded Items List */}
      {currentKeys.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {currentKeys.map((key) => {
            const fileName =
              typeof key === 'string'
                ? key.split('/').pop()?.replace(/^[0-9a-f-]+_?/, '') || key
                : 'file';
            return (
              <div
                key={key}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-line text-xs"
              >
                <div className="flex items-center gap-2 truncate me-2">
                  {isImages ? (
                    <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span className="font-semibold text-navy-900 truncate">
                    {fileName}
                  </span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(key);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-200 transition shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

