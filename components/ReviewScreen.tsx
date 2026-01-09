
import React, { useState } from 'react';
import { ExtractionResult, ExtractedData, OnboardingDoc, DocStatus } from '../types';

interface ReviewScreenProps {
  data: ExtractionResult;
  docs: OnboardingDoc[];
  onConfirm: (finalData: ExtractedData, updatedDocs: OnboardingDoc[]) => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ data, docs, onConfirm }) => {
  const [editedData, setEditedData] = useState<ExtractedData>(data.extracted_data);
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  const currentDoc = docs[activeDocIndex];

  const handleChange = (field: keyof ExtractedData, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const getFieldStatus = (field: string) => {
    if (data.validation.conflicts_detected.some(c => String(c).toLowerCase().includes(field.toLowerCase()))) return 'conflict';
    if (data.validation.missing_fields.some(m => String(m).toLowerCase().includes(field.toLowerCase()))) return 'missing';
    return 'verified';
  };

  const renderField = (label: string, field: keyof ExtractedData, type: string = 'text') => {
    const status = getFieldStatus(field as string);
    // Explicitly cast to string to avoid Error 31
    const value = String(editedData[field] || '');

    return (
      <div className="mb-2">
        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5 flex items-center justify-between">
          {label}
          {status === 'verified' && <span className="text-[7px] text-emerald-600 bg-emerald-50 px-1 rounded">MATCHED</span>}
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
          className="w-full text-[11px] p-1.5 bg-white border border-gray-100 rounded-lg focus:ring-1 focus:ring-emerald-100 outline-none transition-all font-medium"
        />
      </div>
    );
  };

  const isLastDoc = activeDocIndex === docs.length - 1;

  const handleApprove = () => {
    if (!isLastDoc) {
      setActiveDocIndex(prev => prev + 1);
    } else {
      const updatedDocs = docs.map(d => ({
        ...d,
        status: DocStatus.VALIDATED
      }));
      onConfirm(editedData, updatedDocs);
    }
  };

  return (
    <div className="flex flex-row h-full gap-3 overflow-hidden animate-in fade-in duration-300">
      {/* LEFT: INFO AUDIT - COMPACT */}
      <div className="w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
        <div className="p-3 border-b bg-gray-50/50 shrink-0">
          <div className="flex items-center justify-between mb-0.5">
            <h2 className="text-xs font-black text-gray-900 uppercase">Information Audit</h2>
            <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 rounded-full">
              {activeDocIndex + 1} / {docs.length}
            </div>
          </div>
          <p className="text-[10px] text-gray-400">Validating Intelligence Layer</p>
        </div>

        <div className="p-3 flex-1 overflow-y-auto no-scrollbar space-y-3">
          <div className="bg-emerald-50/20 p-2 rounded-lg border border-emerald-50">
            {currentDoc.type.includes('PIN') ? (
              renderField('KRA PIN', 'kra_pin')
            ) : currentDoc.type.includes('Incorporation') ? (
              <>
                {renderField('Entity Name', 'company_name')}
                {renderField('Reg No', 'registration_number')}
                {renderField('Date of Inc', 'date_of_incorporation', 'date')}
              </>
            ) : (
              <>
                {renderField('Legal Name', 'full_name')}
                {renderField('Registered Address', 'registered_address')}
              </>
            )}
          </div>

          {editedData.directors && editedData.directors.length > 0 && currentDoc.type.includes('CR12') && (
            <div className="space-y-2">
              <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b pb-0.5">Governance Trace</h3>
              {editedData.directors.map((director, idx) => (
                <div key={idx} className="bg-gray-50/30 p-2 rounded-lg border border-gray-100 text-[10px]">
                  <div className="font-bold text-gray-700">{String(director.name || 'Unknown')}</div>
                  <div className="text-gray-400 font-mono text-[9px]">{String(director.kra_pin || director.id_number || 'No ID')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 bg-gray-50 border-t shrink-0">
          <button
            onClick={handleApprove}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
          >
            {isLastDoc ? 'Complete Verification' : 'Approve & Next'}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* RIGHT: DOCUMENT PREVIEW - COMPACT */}
      <div className="w-2/3 h-full flex flex-col">
        <div className="bg-gray-900 rounded-xl flex-1 p-4 relative overflow-hidden flex flex-col shadow-xl border border-gray-800">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-white text-[9px] font-bold">DOC</div>
              <h3 className="text-white font-black text-[10px] uppercase tracking-widest">{currentDoc.type}</h3>
            </div>
            <span className="text-[8px] text-gray-500 font-mono">HASH_{currentDoc.id}</span>
          </div>

          <div className="flex-1 bg-white rounded-lg p-6 overflow-y-auto no-scrollbar relative shadow-inner">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
            <div className="text-center mb-6">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-200">Republic of Kenya Official Record</h4>
            </div>

            <div className="font-serif text-[11px] text-gray-800 space-y-3 leading-relaxed whitespace-pre-wrap">
              {currentDoc.content}
            </div>

            <div className="mt-8 pt-4 border-t border-gray-50 flex justify-between items-end opacity-20 italic text-[8px] text-gray-400">
              <div>Aptic Verified System Node</div>
              <div>Registrar Signature Placeholder</div>
            </div>
          </div>

          <div className="mt-3 flex justify-between items-center px-1">
            <div className="flex gap-2">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-[8px] text-emerald-400 font-bold uppercase">Confidence High</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="text-[8px] text-blue-400 font-bold uppercase">OCR Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
