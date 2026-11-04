import React, { useState, useEffect } from 'react';
import { Mail, Smartphone, Monitor, ExternalLink, RefreshCw } from 'lucide-react';
import { apiClient } from '../../api/client.js';

export default function DevEmails() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('PaymentReceived');
  const [viewport, setViewport] = useState('desktop'); // 'desktop' (620px) | 'mobile' (380px)
  const [key, setKey] = useState(0); // for iframe reloads

  useEffect(() => {
    async function loadTemplates() {
      try {
        const data = await apiClient('/dev/emails');
        setTemplates(data.templates || []);
        if (data.templates?.length && !data.templates.find((t) => t.key === selectedTemplate)) {
          setSelectedTemplate(data.templates[0].key);
        }
      } catch (err) {
        console.error('Failed to load email templates:', err);
      }
    }
    loadTemplates();
  }, []);

  const iframeSrc = `http://localhost:4000/api/dev/emails/${selectedTemplate}`;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-navy-900 flex items-center justify-center font-black">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-white block">
              Masar Email Templates Gallery (15)
            </span>
            <span className="text-[10px] text-slate-400">
              Developer Preview &bull; Responsive Design Validation
            </span>
          </div>
        </div>

        {/* Viewport & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewport === 'desktop' ? 'bg-amber-500 text-navy-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewport === 'mobile' ? 'bg-amber-500 text-navy-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setKey((k) => k + 1)}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
            title="Reload Preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <a
            href={iframeSrc}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition"
            title="Open Raw in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Templates Sidebar */}
        <div className="w-72 border-r border-slate-800 bg-slate-950 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Registered Templates ({templates.length})
          </div>
          {templates.map((t) => {
            const isSelected = selectedTemplate === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedTemplate(t.key)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer flex flex-col ${
                  isSelected
                    ? 'bg-amber-500 text-navy-900 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span className="font-bold">{t.key}</span>
                <span className={`text-[10px] truncate ${isSelected ? 'text-navy-800' : 'text-slate-500'}`}>
                  {t.subject}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Preview Stage */}
        <div className="flex-1 bg-slate-900/60 p-6 flex flex-col items-center justify-start overflow-y-auto">
          <div
            className="transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border border-slate-700 bg-white"
            style={{
              width: viewport === 'desktop' ? '620px' : '380px',
              height: '800px',
            }}
          >
            <iframe
              key={key}
              src={iframeSrc}
              title={`Preview: ${selectedTemplate}`}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

