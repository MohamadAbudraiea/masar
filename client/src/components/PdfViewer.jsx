import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, FileText } from 'lucide-react';

/**
 * Inline PDF Viewer with direct download and open actions.
 *
 * @param {Object} props
 * @param {string} props.url - presigned PDF URL
 * @param {string} [props.title] - Document title
 * @param {string} [props.className]
 */
export default function PdfViewer({ url, title = 'Document.pdf', className = '' }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  if (!url) {
    return (
      <div className="p-8 rounded-2xl bg-slate-50 border border-line text-center text-xs text-slate-400">
        {isAr ? 'لم يتم تحميل الوثيقة بعد' : 'No document available'}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-line bg-card overflow-hidden shadow-xs flex flex-col ${className}`}>
      {/* Viewer Header */}
      <div className="px-4 py-2.5 bg-slate-100 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2 truncate me-3">
          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-navy-900 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg border border-line bg-white hover:bg-slate-50 text-navy-900 text-xs font-semibold flex items-center gap-1 shadow-2xs"
            title={isAr ? 'فتح في نافذة جديدة' : 'Open in new tab'}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={url}
            download
            className="px-2.5 py-1.5 rounded-lg bg-navy-900 text-white hover:bg-navy-800 text-xs font-semibold flex items-center gap-1 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'تحميل' : 'Download'}</span>
          </a>
        </div>
      </div>

      {/* Embedded Iframe */}
      <div className="w-full h-80 sm:h-96 bg-slate-200">
        <iframe
          src={`${url}#toolbar=0`}
          title={title}
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}

