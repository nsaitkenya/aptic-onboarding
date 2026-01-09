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
  const [validatedIndices, setValidatedIndices] = useState<Set<number>>(new Set());

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
    const value = String(editedData[field] || '');

    return (
      <div className="mb-2">
        <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 flex items-center justify-between">
          {label}
          {status === 'verified' && <span className="text-[7px] text-emerald-500 font-bold uppercase">MATCHED</span>}
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
          className="w-full text-[10px] p-1.5 bg-white border border-gray-100 rounded-md focus:border-emerald-300 outline-none transition-all font-medium"
        />
      </div>
    );
  };

  const isLastDoc = activeDocIndex === docs.length - 1;

  const handleApprove = () => {
    const newValidated = new Set(validatedIndices);
    newValidated.add(activeDocIndex);
    setValidatedIndices(newValidated);

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
    <div className="flex flex-col lg:flex-row h-full gap-2 overflow-hidden bg-white animate-in fade-in duration-300 p-1">
      {/* INFO AUDIT PANEL */}
      <div className="lg:w-[350px] shrink-0 flex flex-col bg-white border border-gray-100 rounded-lg overflow-hidden h-full shadow-sm">
        <div className="p-3 border-b bg-gray-50/30 flex items-center justify-between">
          <div>
            <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Audit Wizard</h2>
            <p className="text-[8px] text-gray-400">Step {activeDocIndex + 1} of {docs.length}</p>
          </div>
          <div className="flex gap-1">
            {docs.map((_, idx) => (
              <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === activeDocIndex ? 'bg-emerald-500' : validatedIndices.has(idx) ? 'bg-emerald-200' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="p-3 flex-1 overflow-y-auto no-scrollbar space-y-3">
          <div className="bg-white p-2 border border-gray-50 rounded-md">
            <h3 className="text-[9px] font-black text-gray-800 uppercase mb-3 pb-1 border-b border-gray-50">
              {currentDoc.type} Data Points
            </h3>
            
            {currentDoc.type.includes('PIN') ? (
              renderField('KRA PIN', 'kra_pin')
            ) : currentDoc.type.includes('Incorporation') ? (
              <>
                {renderField('Entity Name', 'company_name')}
                {renderField('Reg No', 'registration_number')}
                {renderField('Incorporation Date', 'date_of_incorporation', 'date')}
              </>
            ) : (
              <>
                {renderField('Legal Entity Name', 'company_name')}
                {renderField('Registered Address', 'registered_address')}
              </>
            )}
          </div>

          {editedData.directors && editedData.directors.length > 0 && currentDoc.type.includes('CR12') && (
            <div className="space-y-2">
              <h3 className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Director Register</h3>
              {editedData.directors.map((director, idx) => (
                <div key={idx} className="bg-gray-50/50 p-2 rounded border border-gray-50">
                  <div className="text-[10px] font-bold text-gray-700">{String(director.name || 'N/A')}</div>
                  <div className="text-[9px] text-gray-400 font-mono">{String(director.kra_pin || director.id_number || 'N/A')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 bg-white border-t mt-auto flex flex-col gap-2">
           <div className="flex items-center gap-2 px-2">
              <span className={`text-[8px] font-black uppercase ${validatedIndices.has(activeDocIndex) ? 'text-emerald-500' : 'text-gray-300'}`}>
                {validatedIndices.has(activeDocIndex) ? '✓ Document Validated' : '○ Review Pending'}
              </span>
           </div>
          <button
            onClick={handleApprove}
            className="w-full bg-black text-white py-2 rounded font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isLastDoc ? 'Confirm All & Proceed' : 'Verify & Next Document'}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* DOCUMENT PREVIEW PANEL */}
      <div className="flex-1 h-full flex flex-col min-h-0 bg-gray-50 border border-gray-100 rounded-lg overflow-hidden shadow-sm relative">
        <div className="bg-white border-b p-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-1 rounded text-[8px] font-black text-gray-500 uppercase tracking-tighter">PREVIEW</div>
            <h3 className="text-[9px] font-black text-gray-900 uppercase tracking-widest">{currentDoc.type}</h3>
          </div>
          <div className="flex items-center gap-2 text-[8px] text-gray-300 font-mono">
            REF:{currentDoc.id}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto no-scrollbar bg-white flex flex-col items-center">
          <div className="w-full max-w-lg bg-white p-8 border border-gray-100 shadow-sm relative text-gray-800 font-serif leading-relaxed">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500"></div>
            
            <div className="text-center mb-6">
              <h4 className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-300 mb-1">Republic of Kenya</h4>
              <p className="text-[7px] font-bold text-gray-200">OFFICIAL GOVERNMENT DOCUMENT</p>
            </div>

            <div className="text-[10px] space-y-3 whitespace-pre-wrap py-4 border-y border-gray-50/50 italic">
              {currentDoc.content}
            </div>

            <div className="mt-10 flex justify-between items-end opacity-10 grayscale select-none pointer-events-none">
              <div className="text-[6px] uppercase font-black">Registrar General</div>
              <div className="text-[6px] uppercase font-black">Aptic Integrated Node</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black border border-emerald-100 shadow-sm animate-bounce">
          AI NODE ACTIVE: VERIFYING DETAILS...
        </div>
      </div>
    </div>
  );
};
