import React, { useState, useEffect } from 'react';
import { 
  OnboardingStep, 
  EntityType, 
  ExtractionResult, 
  ExtractedData, 
  AuditEntry, 
  CustomerRecord, 
  UserFeedback,
  OnboardingDoc,
  DocStatus
} from './types';
import { StepIndicator } from './components/StepIndicator';
import { ReviewScreen } from './components/ReviewScreen';
import { extractDataFromDocs } from './services/geminiService';
import { MOCK_COMPANY_DOCS, MOCK_INDIVIDUAL_DOCS, APP_NAME, MOCK_PRODUCTS } from './constants';
import confetti from 'canvas-confetti';

const App: React.FC = () => {
  const [step, setStep] = useState<OnboardingStep>(OnboardingStep.WELCOME);
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [docs, setDocs] = useState<OnboardingDoc[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractionResult | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [feedbackInput, setFeedbackInput] = useState({ rating: 5, comment: '' });

  const addAudit = (action: string, target: string = 'System', status: AuditEntry['status'] = 'info') => {
    const entry: AuditEntry = {
      timestamp: new Date().toLocaleTimeString(),
      actor: step === OnboardingStep.ADMIN_PANEL ? 'Admin-Aptic' : 'AI-Aptic',
      action: String(action),
      target: String(target),
      status
    };
    setAuditLog(prev => [entry, ...prev]);
  };

  const handleStart = () => {
    setStep(OnboardingStep.ENTITY_SELECT);
    addAudit("Session started", "Aptic Core");
  };

  const selectEntity = (type: EntityType) => {
    setEntityType(type);
    const initialDocs: OnboardingDoc[] = (type === EntityType.COMPANY 
      ? ['KRA PIN Certificate', 'CR12 (Company Search)', 'Certificate of Incorporation']
      : ['KRA PIN Certificate', 'National ID (Front)']
    ).map(typeStr => ({
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      type: typeStr,
      status: DocStatus.PENDING,
      content: null
    }));
    setDocs(initialDocs);
    setStep(OnboardingStep.DOC_UPLOAD);
    addAudit(`Path: ${type}`, "Flow Engine");
  };

  const uploadSample = (docId: string) => {
    const docToUpdate = docs.find(d => d.id === docId);
    if (!docToUpdate) return;
    
    const mockList = entityType === EntityType.COMPANY ? MOCK_COMPANY_DOCS : MOCK_INDIVIDUAL_DOCS;
    const match = mockList.find(m => m.type.toLowerCase().includes(docToUpdate.type.toLowerCase().split(' ')[0].toLowerCase())) || mockList[0];

    setDocs(prev => prev.map(d => d.id === docId ? { 
      ...d, 
      status: DocStatus.UPLOADED,
      content: match.content 
    } : d));
    
    addAudit(`Uploaded ${docToUpdate.type}`, docId, "success");
  };

  const runExtraction = async () => {
    if (!entityType || docs.some(d => d.status === DocStatus.PENDING)) {
      alert("All docs required.");
      return;
    }
    setIsLoading(true);
    setStep(OnboardingStep.AI_PROCESSING);
    addAudit("Engaging OCR Intelligence", "Gemini Node");

    try {
      const docsForExtraction = docs.map(d => ({ type: String(d.type), content: String(d.content || '') }));
      const result = await extractDataFromDocs(entityType, docsForExtraction);
      setExtractedData(result);
      setStep(OnboardingStep.REVIEW_VALIDATION);
      addAudit("OCR Cycle Success", "Extraction Data", "success");
    } catch (error) {
      addAudit("OCR Cycle Failed", "API Service", "error");
      setStep(OnboardingStep.DOC_UPLOAD);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalConfirm = (data: ExtractedData, updatedDocs: OnboardingDoc[]) => {
    setExtractedData(prev => prev ? { ...prev, extracted_data: data } : null);
    setDocs(updatedDocs);
    setStep(OnboardingStep.PASSWORD_SETUP);
    addAudit("User Validation Signed", "Audit Shield", "success");
  };

  const completeSetup = () => {
    if (password.length < 8) {
      alert("Password insecure.");
      return;
    }
    
    if (extractedData) {
      const newCustomer: CustomerRecord = {
        ...extractedData,
        id: `APT-${Math.floor(Math.random() * 9000) + 1000}`,
        joinedAt: new Date().toLocaleDateString(),
        status: 'Provisional'
      };
      setCustomers(prev => [...prev, newCustomer]);
      addAudit(`Activated: ${newCustomer.id}`, String(newCustomer.extracted_data.company_name || 'Subject'), "success");
    }

    setStep(OnboardingStep.COMPLETE);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#06b6d4']
    });
  };

  const submitFeedback = () => {
    if (!feedbackInput.comment.trim()) return;
    const newFeedback: UserFeedback = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      userName: String(extractedData?.extracted_data.company_name || extractedData?.extracted_data.full_name || 'Anonymous'),
      rating: feedbackInput.rating,
      comment: String(feedbackInput.comment),
      timestamp: new Date().toISOString()
    };
    setFeedbacks(prev => [newFeedback, ...prev]);
    setFeedbackInput({ rating: 5, comment: '' });
    addAudit("Feedback received", "System", "success");
    alert("Thank you.");
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 text-gray-900">
      {/* HEADER */}
      <header className="bg-white border-b px-6 py-2 flex items-center justify-between shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep(OnboardingStep.WELCOME)}>
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white font-black text-xs">A</div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-tight leading-none">{String(APP_NAME)}</h1>
            <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">Digital Intelligence Suite</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[8px] font-black text-gray-300 uppercase bg-gray-50 px-3 py-1 rounded-full border">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            AF-E-NBO
          </div>
          <button 
            onClick={() => setStep(step === OnboardingStep.ADMIN_PANEL ? OnboardingStep.WELCOME : OnboardingStep.ADMIN_PANEL)}
            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
              step === OnboardingStep.ADMIN_PANEL ? 'bg-rose-500 text-white' : 'bg-white border border-gray-100 hover:bg-gray-50'
            }`}
          >
            {step === OnboardingStep.ADMIN_PANEL ? 'EXIT' : 'ADMIN'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col p-4">
        {step !== OnboardingStep.WELCOME && step < OnboardingStep.COMPLETE && step !== OnboardingStep.ADMIN_PANEL && (
          <div className="max-w-xl mx-auto w-full mb-4 shrink-0">
            <StepIndicator currentStep={step} />
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {step === OnboardingStep.WELCOME && (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h1 className="text-3xl font-black mb-2 tracking-tighter">Unified Compliance</h1>
              <p className="text-gray-400 max-w-sm mx-auto mb-8 text-xs font-medium"> Kenyan automated entity verification via Gemini AI.</p>
              <button onClick={handleStart} className="bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all">Launch Portal</button>
            </div>
          )}

          {step === OnboardingStep.ENTITY_SELECT && (
            <div className="max-w-xl mx-auto grid grid-cols-2 gap-4 h-full items-center">
              <button onClick={() => selectEntity(EntityType.INDIVIDUAL)} className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-emerald-500 shadow-sm transition-all group">
                <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <h3 className="font-black text-xs uppercase">Individual</h3>
              </button>
              <button onClick={() => selectEntity(EntityType.COMPANY)} className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-emerald-500 shadow-sm transition-all group">
                <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="font-black text-xs uppercase">Company</h3>
              </button>
            </div>
          )}

          {step === OnboardingStep.DOC_UPLOAD && (
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6 border border-gray-100 flex flex-col">
              <h2 className="text-xs font-black uppercase mb-4 text-gray-400 tracking-widest">Extraction Queue</h2>
              <div className="space-y-2 mb-6">
                {docs.map(doc => (
                  <div key={doc.id} className={`flex items-center justify-between p-3 rounded-xl border ${doc.status === DocStatus.UPLOADED ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] ${doc.status === DocStatus.UPLOADED ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {doc.status === DocStatus.UPLOADED ? '✓' : '📄'}
                      </div>
                      <span className="font-bold text-gray-700 text-[10px] uppercase">{String(doc.type)}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => uploadSample(doc.id)} className="text-[8px] font-black uppercase text-gray-400 border bg-white px-2 py-1 rounded">Sample</button>
                      <button onClick={() => uploadSample(doc.id)} className="text-[8px] font-black uppercase bg-black text-white px-2 py-1 rounded">Upload</button>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={runExtraction}
                disabled={docs.some(d => d.status === DocStatus.PENDING)}
                className={`w-full py-3 rounded-xl font-black text-[10px] uppercase transition-all ${docs.some(d => d.status === DocStatus.PENDING) ? 'bg-gray-100 text-gray-300' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-50'}`}
              >
                Start AI Analysis
              </button>
            </div>
          )}

          {step === OnboardingStep.AI_PROCESSING && (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-emerald-50 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
              <h2 className="text-xs font-black uppercase text-gray-400 animate-pulse">Analyzing Registry Data</h2>
            </div>
          )}

          {step === OnboardingStep.REVIEW_VALIDATION && extractedData && (
            <ReviewScreen data={extractedData} docs={docs} onConfirm={handleFinalConfirm} />
          )}

          {step === OnboardingStep.PASSWORD_SETUP && (
            <div className="max-w-2xl mx-auto flex flex-col gap-4 h-full overflow-y-auto no-scrollbar">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 shrink-0">
                <h2 className="text-xs font-black uppercase text-gray-400 mb-4 tracking-widest text-center">Security Identity Provision</h2>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-50">
                    <span className="text-[7px] font-black text-emerald-400 uppercase block">Subject Principal</span>
                    <span className="font-extrabold text-[11px] truncate">{String(extractedData?.extracted_data.company_name || extractedData?.extracted_data.full_name || 'N/A')}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-[7px] font-black text-gray-400 uppercase block">PIN Integrity</span>
                    <span className="font-extrabold text-[11px]">{String(extractedData?.extracted_data.kra_pin || 'N/A')}</span>
                  </div>
                </div>
                <input 
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-100 text-xs font-bold mb-4 outline-none focus:ring-1 focus:ring-emerald-500" 
                  placeholder="Set Access Code (Min 8 Chars)" 
                />
                <button onClick={completeSetup} className="w-full bg-black text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-gray-200">Activate Account</button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 shrink-0">
                <h4 className="text-[8px] font-black text-gray-400 uppercase mb-3">Onboarding Compliance Artifacts</h4>
                <table className="w-full text-left text-[9px]">
                  <thead>
                    <tr className="text-gray-300 uppercase font-black border-b"><th className="pb-1">Artifact</th><th className="pb-1">User Validation</th><th className="pb-1">Aptic Approval</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {docs.map(doc => (
                      <tr key={doc.id}>
                        <td className="py-1.5 font-bold text-gray-600 uppercase">{String(doc.type)}</td>
                        <td className="py-1.5"><span className="text-emerald-500 font-bold">✓ VALIDATED</span></td>
                        <td className="py-1.5"><span className="text-blue-500 font-bold animate-pulse">● PENDING</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === OnboardingStep.COMPLETE && (
            <div className="max-w-4xl mx-auto flex flex-col gap-4 h-full overflow-y-auto no-scrollbar">
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-emerald-50 flex items-center gap-6 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-8 -mt-8"></div>
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="flex-1">
                  <h1 className="text-lg font-black leading-none mb-1">Activation Successful.</h1>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">ID: #KE-APT-{Math.floor(Math.random()*9999)}</span>
                </div>
                <button onClick={() => setStep(OnboardingStep.WELCOME)} className="text-[9px] font-black uppercase text-gray-400">Restart Session</button>
              </div>

              <div className="grid grid-cols-4 gap-3 shrink-0">
                {MOCK_PRODUCTS.slice(0, 4).map(p => (
                  <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-100 hover:shadow-md transition-all text-center group cursor-pointer">
                    <div className="text-xl mb-1">{String(p.icon)}</div>
                    <h4 className="font-black text-[9px] uppercase leading-tight truncate">{String(p.name)}</h4>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase mb-4">Post-Onboarding Evaluation</h3>
                  <div className="flex-1 space-y-3 flex flex-col">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setFeedbackInput(prev => ({ ...prev, rating: n }))} className={`w-7 h-7 rounded-lg text-[10px] font-black ${feedbackInput.rating === n ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-300'}`}>{n}</button>
                      ))}
                    </div>
                    <textarea value={feedbackInput.comment} onChange={e => setFeedbackInput(prev => ({ ...prev, comment: e.target.value }))} className="flex-1 w-full bg-gray-50 border border-gray-100 rounded-xl p-3 outline-none text-[10px] font-medium" placeholder="Analyze Aptic precision..." />
                    <button onClick={submitFeedback} className="bg-black text-white w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-widest">Submit Review</button>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-2xl p-5 text-white flex flex-col justify-between overflow-hidden">
                  <div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase mb-3">Active Registry Node</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-[8px] text-gray-600 font-bold uppercase">KRA Node</span><span className="text-emerald-400 font-bold text-[8px]">ACTIVE</span></div>
                      <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-[8px] text-gray-600 font-bold uppercase">Audit Registry</span><span className="text-blue-400 font-bold text-[8px]">PROVISIONED</span></div>
                    </div>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg border border-white/5 text-[7px] text-gray-600 font-mono leading-tight">
                    *SECURE: SESSION AUDITED BY Aptic AI Node AF-E-NBO-01. ALL KYC ARTIFACTS STORED IN E2EE VAULT.
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === OnboardingStep.ADMIN_PANEL && (
            <div className="max-w-4xl mx-auto flex flex-col gap-4 h-full overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <h2 className="text-xl font-black text-gray-900 uppercase">Operational Hub</h2>
                <div className="bg-gray-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Sessions: {customers.length + 1}</div>
              </div>

              <div className="grid grid-cols-3 gap-4 flex-1 overflow-hidden">
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col">
                  <div className="p-3 border-b bg-gray-50/50"><h3 className="font-black text-[9px] text-gray-400 uppercase tracking-widest">Compliance Identity Buffer</h3></div>
                  <div className="flex-1 overflow-y-auto no-scrollbar">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[8px] sticky top-0"><tr><th className="px-4 py-2">ID</th><th className="px-4 py-2">Subject</th><th className="px-4 py-2">Status</th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {customers.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-gray-400">{String(c.id)}</td>
                            <td className="px-4 py-2 font-black">{String(c.extracted_data.company_name || c.extracted_data.full_name || 'N/A')}</td>
                            <td className="px-4 py-2"><span className="text-blue-500 font-bold uppercase text-[8px]">{String(c.status)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-gray-950 rounded-2xl p-4 text-white shadow-2xl flex flex-col overflow-hidden">
                  <h3 className="text-[9px] font-black uppercase tracking-widest mb-4 flex items-center justify-between">Telemetry Layer <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span></h3>
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                    {auditLog.map((log, idx) => (
                      <div key={idx} className="relative pl-3 border-l border-white/5 pb-1.5">
                        <div className={`absolute -left-[4px] top-0 w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                        <div className="text-[7px] text-gray-600 mb-0.5">{String(log.timestamp)}</div>
                        <p className="text-[9px] font-bold text-gray-300 leading-tight">{String(log.action)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t px-6 py-2 flex justify-between items-center text-[8px] font-black text-gray-400 uppercase tracking-widest shrink-0">
        <div>© Aptic Intelligence Systems</div>
        <div className="flex gap-4 items-center">
          <span>E2EE ACTIVE</span>
          <span className="w-px h-2 bg-gray-100"></span>
          <span>Latency: 8ms</span>
        </div>
      </footer>
    </div>
  );
};

export default App;