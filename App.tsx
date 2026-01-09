
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  
  // Admin State
  const [selectedAdminCustomerId, setSelectedAdminCustomerId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<OnboardingDoc | null>(null);

  const addAudit = (action: string, target: string = 'System', status: AuditEntry['status'] = 'info') => {
    const entry: AuditEntry = {
      timestamp: new Date().toLocaleTimeString(),
      actor: step === OnboardingStep.ADMIN_PANEL ? 'Admin-Aptic' : 'AI-Agent',
      action: String(action),
      target: String(target),
      status
    };
    setAuditLog(prev => [entry, ...prev]);
  };

  const handleStart = () => {
    setStep(OnboardingStep.ENTITY_SELECT);
    addAudit("Onboarding Sequence Launched", "Session Core");
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
    addAudit(`Path Determined: ${type}`, "Onboarding Flow");
  };

  const uploadDoc = (docId: string) => {
    const docToUpdate = docs.find(d => d.id === docId);
    if (!docToUpdate) return;
    
    const mockList = entityType === EntityType.COMPANY ? MOCK_COMPANY_DOCS : MOCK_INDIVIDUAL_DOCS;
    const match = mockList.find(m => m.type.toLowerCase().includes(docToUpdate.type.toLowerCase().split(' ')[0].toLowerCase())) || mockList[0];

    setDocs(prev => prev.map(d => d.id === docId ? { 
      ...d, 
      status: DocStatus.UPLOADED,
      content: match.content 
    } : d));
    
    addAudit(`Artifact Uploaded: ${docToUpdate.type}`, docId, "success");
  };

  const runExtraction = async () => {
    if (!entityType || docs.some(d => d.status === DocStatus.PENDING)) {
      alert("Please upload all artifacts to proceed.");
      return;
    }
    setIsLoading(true);
    setStep(OnboardingStep.AI_PROCESSING);
    addAudit("AI Extraction Node Engaged", "Gemini Node NBO");

    try {
      const docsForExtraction = docs.map(d => ({ type: String(d.type), content: String(d.content || '') }));
      const result = await extractDataFromDocs(entityType, docsForExtraction);
      setExtractedData(result);
      setStep(OnboardingStep.REVIEW_VALIDATION);
      addAudit("OCR Cycle Success", "Extraction Data", "success");
    } catch (error) {
      addAudit("Extraction Layer Failed", "System Error", "error");
      setStep(OnboardingStep.DOC_UPLOAD);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalConfirm = (data: ExtractedData, updatedDocs: OnboardingDoc[]) => {
    setExtractedData(prev => prev ? { ...prev, extracted_data: data } : null);
    setDocs(updatedDocs);
    setStep(OnboardingStep.PASSWORD_SETUP);
    addAudit("Extraction Confirmed by Principal", "Compliance Log", "success");
  };

  const completeSetup = () => {
    if (password.length < 8) {
      alert("Password security requirements not met.");
      return;
    }
    
    if (extractedData) {
      const newCustomer: CustomerRecord = {
        ...extractedData,
        id: `APT-${Math.floor(Math.random() * 9000) + 1000}`,
        joinedAt: new Date().toLocaleDateString(),
        status: 'Provisional',
        originalDocs: [...docs]
      };
      setCustomers(prev => [...prev, newCustomer]);
      addAudit(`Account Provisioned: ${newCustomer.id}`, String(newCustomer.extracted_data.company_name || newCustomer.extracted_data.full_name), "success");
    }

    setStep(OnboardingStep.COMPLETE);
    confetti({
      particleCount: 120,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10b981', '#3b82f6', '#000000']
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
    addAudit("Interaction Feedback Logged", "Feedback Hub", "success");
    alert("Onboarding evaluation received.");
  };

  // Admin Actions
  const approveDocument = (customerId: string, docId: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const updatedDocs = c.originalDocs.map(d => 
          d.id === docId ? { ...d, status: DocStatus.APPROVED } : d
        );
        const allApproved = updatedDocs.every(d => d.status === DocStatus.APPROVED);
        return { 
          ...c, 
          originalDocs: updatedDocs,
          status: allApproved ? 'Verified' : c.status
        };
      }
      return c;
    }));
    addAudit(`Document Approved: ${docId}`, `Customer ${customerId}`, 'success');
  };

  // Keyboard navigation for Admin
  const navigateAdmin = useCallback((direction: 'next' | 'prev') => {
    if (!selectedAdminCustomerId || customers.length <= 1) return;
    const currentIndex = customers.findIndex(c => c.id === selectedAdminCustomerId);
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % customers.length;
    } else {
      nextIndex = (currentIndex - 1 + customers.length) % customers.length;
    }
    
    setSelectedAdminCustomerId(customers[nextIndex].id);
    setViewingDoc(null); // Clear viewing doc when switching customer
  }, [selectedAdminCustomerId, customers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step === OnboardingStep.ADMIN_PANEL && selectedAdminCustomerId) {
        if (e.key === 'ArrowRight') navigateAdmin('next');
        if (e.key === 'ArrowLeft') navigateAdmin('prev');
        if (e.key === 'Escape') {
          if (viewingDoc) setViewingDoc(null);
          else setSelectedAdminCustomerId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, selectedAdminCustomerId, viewingDoc, navigateAdmin]);

  const selectedAdminCustomer = customers.find(c => c.id === selectedAdminCustomerId);

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = customers.length;
    const verified = customers.filter(c => c.status === 'Verified').length;
    const provisional = customers.filter(c => c.status === 'Provisional').length;
    const pendingDocs = customers.reduce((acc, c) => acc + c.originalDocs.filter(d => d.status !== DocStatus.APPROVED).length, 0);
    const individualCount = customers.filter(c => c.entity_type === EntityType.INDIVIDUAL).length;
    const companyCount = customers.filter(c => c.entity_type === EntityType.COMPANY).length;

    return { total, verified, provisional, pendingDocs, individualCount, companyCount };
  }, [customers]);

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b px-6 py-2 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
          setStep(OnboardingStep.WELCOME);
          setSelectedAdminCustomerId(null);
        }}>
          <div className="w-7 h-7 bg-black rounded flex items-center justify-center text-white font-black text-sm">A</div>
          <div>
            <h1 className="text-[11px] font-black uppercase tracking-widest leading-none">{String(APP_NAME)}</h1>
            <span className="text-[7px] text-gray-400 font-bold uppercase tracking-[0.3em]">Identity Governance Node</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-[8px] font-black text-gray-400 uppercase bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            AF-E-NBO
          </div>
          <button 
            onClick={() => {
              const nextStep = step === OnboardingStep.ADMIN_PANEL ? OnboardingStep.WELCOME : OnboardingStep.ADMIN_PANEL;
              setStep(nextStep);
              if (nextStep !== OnboardingStep.ADMIN_PANEL) setSelectedAdminCustomerId(null);
            }}
            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${
              step === OnboardingStep.ADMIN_PANEL ? 'bg-black text-white' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            {step === OnboardingStep.ADMIN_PANEL ? 'EXIT NODE' : 'ADMIN PANEL'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col p-4 bg-gray-50/30">
        {step !== OnboardingStep.WELCOME && step < OnboardingStep.COMPLETE && step !== OnboardingStep.ADMIN_PANEL && (
          <div className="max-w-xl mx-auto w-full mb-4 shrink-0">
            <StepIndicator currentStep={step} />
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {step === OnboardingStep.WELCOME && (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
              <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h1 className="text-4xl font-black mb-3 tracking-tighter text-gray-900">Digital Identity <br/>Onboarding</h1>
              <p className="text-gray-400 max-w-xs mx-auto mb-10 text-[11px] font-medium leading-relaxed uppercase tracking-wider">Automated KE-Registry verification via Aptic AI Node.</p>
              <button onClick={handleStart} className="bg-black text-white px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl shadow-gray-200">Initiate Protocol</button>
            </div>
          )}

          {step === OnboardingStep.ENTITY_SELECT && (
            <div className="max-w-xl mx-auto grid grid-cols-2 gap-4 h-full items-center px-4">
              <button onClick={() => selectEntity(EntityType.INDIVIDUAL)} className="bg-white p-8 rounded-2xl border border-gray-100 hover:border-emerald-500 shadow-sm transition-all group text-center">
                <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-black group-hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-900">Individual</h3>
                <p className="text-[9px] text-gray-400 mt-2 uppercase tracking-tighter">KE-National Identification</p>
              </button>
              <button onClick={() => selectEntity(EntityType.COMPANY)} className="bg-white p-8 rounded-2xl border border-gray-100 hover:border-emerald-500 shadow-sm transition-all group text-center">
                <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-black group-hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-900">Company</h3>
                <p className="text-[9px] text-gray-400 mt-2 uppercase tracking-tighter">Business / Legal Entity</p>
              </button>
            </div>
          )}

          {step === OnboardingStep.DOC_UPLOAD && (
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6 border border-gray-100 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6">
                <h2 className="text-[10px] font-black uppercase text-gray-900 tracking-widest mb-1">Upload Queue</h2>
                <p className="text-[8px] text-gray-400 font-bold uppercase">Required artifacts for KE-Compliance</p>
              </div>
              
              <div className="space-y-2 mb-8">
                {docs.map(doc => (
                  <div key={doc.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${doc.status === DocStatus.UPLOADED ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] ${doc.status === DocStatus.UPLOADED ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                        {doc.status === DocStatus.UPLOADED ? '✓' : '📄'}
                      </div>
                      <div>
                        <span className="font-bold text-gray-700 text-[10px] uppercase block leading-tight">{String(doc.type)}</span>
                        <span className={`text-[7px] font-black uppercase ${doc.status === DocStatus.UPLOADED ? 'text-emerald-600' : 'text-gray-300'}`}>
                          {doc.status === DocStatus.UPLOADED ? 'Validated locally' : 'Awaiting file'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => uploadDoc(doc.id)} className="text-[8px] font-black uppercase text-gray-400 border border-gray-200 bg-white px-2 py-1.5 rounded hover:border-emerald-500 transition-colors">Sample</button>
                      <button onClick={() => uploadDoc(doc.id)} className="text-[8px] font-black uppercase bg-black text-white px-3 py-1.5 rounded hover:bg-emerald-600 transition-all">Upload</button>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={runExtraction}
                disabled={docs.some(d => d.status === DocStatus.PENDING)}
                className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${docs.some(d => d.status === DocStatus.PENDING) ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-black text-white shadow-xl shadow-gray-200 hover:bg-emerald-600'}`}
              >
                Launch Intelligence Cycle
              </button>
            </div>
          )}

          {step === OnboardingStep.AI_PROCESSING && (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-emerald-50 border-t-emerald-600 rounded-full animate-spin mb-6"></div>
              <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] animate-pulse">Analyzing Registry Artifacts</h2>
            </div>
          )}

          {step === OnboardingStep.REVIEW_VALIDATION && extractedData && (
            <ReviewScreen data={extractedData} docs={docs} onConfirm={handleFinalConfirm} />
          )}

          {step === OnboardingStep.PASSWORD_SETUP && (
            <div className="max-w-3xl mx-auto flex flex-col gap-4 h-full overflow-y-auto no-scrollbar p-2">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 shrink-0 text-center">
                <h2 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-widest">Identity Protection Vault</h2>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-left">
                    <span className="text-[7px] font-black text-gray-400 uppercase block mb-1">Principal Entity</span>
                    <span className="font-extrabold text-[11px] text-gray-900 truncate block">
                      {String(extractedData?.extracted_data.company_name || extractedData?.extracted_data.full_name || 'Anonymous')}
                    </span>
                  </div>
                  <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-50 text-left">
                    <span className="text-[7px] font-black text-emerald-500 uppercase block mb-1">Registry Status</span>
                    <span className="font-extrabold text-[11px] text-emerald-700 block uppercase">Verified Registry Check</span>
                  </div>
                </div>
                
                <div className="max-w-xs mx-auto mb-8">
                  <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 text-left">Establish Access Code</label>
                  <input 
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:border-black transition-all" 
                    placeholder="Min 8 characters" 
                  />
                </div>
                <button onClick={completeSetup} className="bg-black text-white px-12 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-emerald-600 transition-all">Activate Account</button>
              </div>

              {/* PROTECTION OF IDENTITY TABLE */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 shrink-0">
                <h4 className="text-[9px] font-black text-gray-900 uppercase tracking-widest mb-4">Protection of Identity Protocol</h4>
                <div className="overflow-hidden border border-gray-50 rounded-lg">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[8px] tracking-widest">
                      <tr className="border-b border-gray-50">
                        <th className="px-4 py-3">Legal Artifact</th>
                        <th className="px-4 py-3">User Validation</th>
                        <th className="px-4 py-3">Aptic Approval</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {docs.map(doc => (
                        <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-700 uppercase">{String(doc.type)}</td>
                          <td className="px-4 py-3">
                            <span className="text-emerald-500 font-black text-[9px] uppercase flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Validated
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-400 font-black text-[9px] uppercase flex items-center gap-1.5 italic animate-pulse">
                              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span> Pending Audit
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === OnboardingStep.COMPLETE && (
            <div className="max-w-4xl mx-auto flex flex-col gap-4 h-full overflow-y-auto no-scrollbar pb-10">
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-emerald-50 flex items-center gap-8 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16"></div>
                <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center shrink-0 shadow-xl">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-black leading-none mb-1 text-gray-900">Provisioning Complete.</h1>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Principal ID: #KE-APT-{Math.floor(Math.random()*99999)}</span>
                </div>
                <button onClick={() => setStep(OnboardingStep.WELCOME)} className="text-[9px] font-black uppercase text-gray-400 border border-gray-100 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">Terminate Session</button>
              </div>
              <div className="grid grid-cols-4 gap-4 shrink-0">
                {MOCK_PRODUCTS.slice(0, 4).map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all text-center group cursor-pointer">
                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{String(p.icon)}</div>
                    <h4 className="font-black text-[9px] uppercase tracking-widest text-gray-900 leading-tight truncate">{String(p.name)}</h4>
                    <p className="text-[7px] text-gray-400 uppercase font-black mt-2 tracking-tighter">Available Integrated</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === OnboardingStep.ADMIN_PANEL && (
            <div className="max-w-6xl mx-auto flex flex-col gap-4 h-full overflow-hidden p-2">
              {/* ADMIN DASHBOARD HEADER */}
              <div className="flex items-center justify-between shrink-0 mb-2">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Identity Management Node</h2>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Administrative Control Hub</p>
                </div>
                <div className="flex gap-2">
                   {[{l:'TOTAL', v:stats.total}, {l:'PENDING', v:stats.pendingDocs, c:'text-orange-500'}, {l:'VERIFIED', v:stats.verified, c:'text-emerald-500'}].map((s,i)=>(
                      <div key={i} className="bg-white border border-gray-100 px-4 py-2 rounded-xl text-center shadow-sm min-w-[80px]">
                        <span className="text-[7px] font-black text-gray-400 uppercase block mb-0.5">{s.l}</span>
                        <span className={`font-black text-sm ${s.c || 'text-gray-900'}`}>{s.v}</span>
                      </div>
                   ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 flex-1 overflow-hidden">
                {/* REGISTRY LIST / DETAIL */}
                <div className={`col-span-3 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col ${selectedAdminCustomerId ? 'border-emerald-100' : ''}`}>
                  <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedAdminCustomerId && (
                        <button onClick={() => setSelectedAdminCustomerId(null)} className="bg-gray-100 p-1.5 rounded hover:bg-gray-200 transition-colors mr-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                      )}
                      <h3 className="font-black text-[10px] text-gray-900 uppercase tracking-widest">
                        {selectedAdminCustomerId ? `PROFILE: ${selectedAdminCustomer?.id}` : 'Compliance Identity Registry'}
                      </h3>
                    </div>
                    {selectedAdminCustomerId && (
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-gray-400 uppercase">Nav: Use Arrow Keys</span>
                        <div className="flex gap-1">
                          <button onClick={() => navigateAdmin('prev')} className="bg-white border p-1 rounded hover:bg-gray-50"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg></button>
                          <button onClick={() => navigateAdmin('next')} className="bg-white border p-1 rounded hover:bg-gray-50"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col">
                    {!selectedAdminCustomerId ? (
                      <div className="flex flex-col h-full">
                        {/* MINI STATS CHARTS */}
                        <div className="p-4 grid grid-cols-2 gap-4 bg-gray-50/20 border-b">
                           <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-4">
                              <div className="w-10 h-10 shrink-0">
                                 <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                    <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path className="text-emerald-500" strokeDasharray={`${(stats.verified / (stats.total || 1)) * 100}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                 </svg>
                              </div>
                              <div>
                                 <div className="text-[9px] font-black uppercase text-gray-400">Approval Rate</div>
                                 <div className="text-xs font-black">{stats.total ? Math.round((stats.verified / stats.total) * 100) : 0}%</div>
                              </div>
                           </div>
                           <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-4">
                              <div className="flex-1 space-y-1.5">
                                 <div className="flex justify-between text-[7px] font-black uppercase"><span>Company</span><span>{stats.companyCount}</span></div>
                                 <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden"><div className="bg-black h-full" style={{width:`${(stats.companyCount/stats.total)*100}%`}}></div></div>
                                 <div className="flex justify-between text-[7px] font-black uppercase"><span>Individual</span><span>{stats.individualCount}</span></div>
                                 <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full" style={{width:`${(stats.individualCount/stats.total)*100}%`}}></div></div>
                              </div>
                           </div>
                        </div>
                        <div className="overflow-y-auto no-scrollbar flex-1">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[8px] tracking-widest sticky top-0 z-10">
                              <tr className="border-b border-gray-100"><th className="px-6 py-3">Session ID</th><th className="px-6 py-3">Legal Subject</th><th className="px-6 py-3">Protocol</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {customers.map(c => (
                                <tr key={c.id} className="hover:bg-emerald-50/30 transition-colors cursor-pointer group" onClick={() => setSelectedAdminCustomerId(c.id)}>
                                  <td className="px-6 py-3 font-mono text-gray-400 group-hover:text-black">{c.id}</td>
                                  <td className="px-6 py-3 font-black text-gray-900 uppercase truncate max-w-[150px]">{c.extracted_data.company_name || c.extracted_data.full_name}</td>
                                  <td className="px-6 py-3 text-gray-400 uppercase text-[9px] font-black">{c.entity_type}</td>
                                  <td className="px-6 py-3">
                                    <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[8px] border ${c.status === 'Verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{c.status}</span>
                                  </td>
                                  <td className="px-6 py-3"><button className="text-[9px] font-black uppercase text-gray-400 group-hover:text-emerald-600">Review</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      // Profile Detail View
                      <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-white animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2 bg-black text-white text-[7px] font-black uppercase">Active Subject</div>
                              <h4 className="text-[9px] font-black uppercase text-gray-400 mb-4 border-b pb-2">Extracted Payload</h4>
                              <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                <div><span className="text-[7px] font-bold text-gray-400 uppercase block">Entity</span><span className="text-[10px] font-black text-gray-900 uppercase">{selectedAdminCustomer?.extracted_data.company_name || selectedAdminCustomer?.extracted_data.full_name}</span></div>
                                <div><span className="text-[7px] font-bold text-gray-400 uppercase block">KRA PIN</span><span className="text-[10px] font-black text-emerald-600 font-mono">{selectedAdminCustomer?.extracted_data.kra_pin}</span></div>
                                <div><span className="text-[7px] font-bold text-gray-400 uppercase block">Registry No</span><span className="text-[10px] font-black text-gray-900">{selectedAdminCustomer?.extracted_data.registration_number || 'N/A'}</span></div>
                                <div><span className="text-[7px] font-bold text-gray-400 uppercase block">Inc. Date</span><span className="text-[10px] font-black text-gray-900">{selectedAdminCustomer?.extracted_data.date_of_incorporation || 'N/A'}</span></div>
                              </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                              <h4 className="text-[9px] font-black uppercase text-gray-400 mb-4 border-b pb-2">Governance Audit</h4>
                              <div className="space-y-2">
                                {selectedAdminCustomer?.extracted_data.directors.map((d, i) => (
                                  <div key={i} className="p-2 bg-gray-50/50 rounded-lg border border-gray-100 flex justify-between items-center">
                                    <div><div className="text-[9px] font-black uppercase">{d.name}</div><div className="text-[7px] text-gray-400 font-mono">PIN:{d.kra_pin}</div></div>
                                    <span className="text-[6px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded font-black uppercase">Verified</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col">
                            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[300px]">
                              <div className="p-4 border-b bg-gray-50/30 flex justify-between items-center">
                                <h4 className="text-[9px] font-black uppercase text-gray-900 tracking-widest">Artifact Register</h4>
                                <span className="text-[7px] font-black text-orange-500 bg-orange-50 px-2 rounded uppercase border border-orange-100">Action Required</span>
                              </div>
                              <div className="flex-1 overflow-y-auto no-scrollbar">
                                <table className="w-full text-left text-[10px]">
                                  <thead className="bg-gray-50/50 text-gray-400 font-black text-[7px] uppercase border-b sticky top-0">
                                    <tr><th className="px-4 py-2">Artifact</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Action</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {selectedAdminCustomer?.originalDocs.map((doc, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-bold text-gray-700 uppercase">{doc.type}</td>
                                        <td className="px-4 py-3">
                                          <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border ${doc.status === DocStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{doc.status}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <button onClick={() => setViewingDoc(doc)} className="text-[8px] font-black uppercase text-black bg-gray-100 px-2 py-1 rounded hover:bg-black hover:text-white transition-all">Audit</button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* TELEMETRY / LOGS */}
                <div className="bg-gray-950 rounded-2xl p-6 text-white shadow-2xl flex flex-col overflow-hidden">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center justify-between">Audit Node Telemetry <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span></h3>
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                    {auditLog.map((log, idx) => (
                      <div key={idx} className="relative pl-5 border-l border-white/5 pb-3 group">
                        <div className={`absolute -left-[4px] top-0 w-2 h-2 rounded-full transition-all group-hover:scale-125 ${log.status === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                        <div className="text-[7px] text-gray-600 mb-0.5 font-mono uppercase tracking-tighter">{log.timestamp}</div>
                        <p className="text-[9px] font-bold text-gray-300 leading-tight uppercase tracking-tight">{log.action}</p>
                        <p className="text-[7px] text-gray-600 font-mono mt-1 uppercase truncate">{log.target}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DOCUMENT VIEWER MODAL */}
      {viewingDoc && selectedAdminCustomer && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
             <div className="bg-white border-b p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                   <div><h3 className="text-xs font-black uppercase tracking-widest">{viewingDoc.type}</h3><p className="text-[9px] text-gray-400 font-bold uppercase">Compliance Audit Cycle</p></div>
                </div>
                <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             
             <div className="flex-1 flex overflow-hidden">
                {/* DOC CONTENT */}
                <div className="flex-1 bg-gray-50 p-8 overflow-y-auto border-r border-gray-100 relative">
                   <div className="bg-white p-10 shadow-lg border border-gray-100 mx-auto max-w-lg min-h-full font-serif text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-black"></div>
                      <div className="text-center mb-8 border-b pb-4 border-gray-50"><span className="text-[7px] font-black uppercase tracking-[0.4em] text-gray-300">Aptic Secured Digital Artifact</span></div>
                      {viewingDoc.content}
                   </div>
                </div>

                {/* EXTRACTION DETAILS PANEL */}
                <div className="w-80 shrink-0 bg-white p-6 overflow-y-auto flex flex-col">
                   <h4 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Gemini Extraction
                   </h4>
                   <div className="space-y-6 flex-1">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                         <h5 className="text-[8px] font-black text-gray-400 uppercase mb-3">Key Match Points</h5>
                         <div className="space-y-3">
                            {viewingDoc.type.includes('PIN') ? (
                              <div><span className="text-[7px] font-bold text-gray-400 uppercase block">KRA PIN</span><span className="text-[10px] font-black text-emerald-600 font-mono">{selectedAdminCustomer.extracted_data.kra_pin}</span></div>
                            ) : viewingDoc.type.includes('Incorporation') ? (
                              <>
                                <div><span className="text-[7px] font-bold text-gray-400 uppercase block">Name</span><span className="text-[10px] font-black text-gray-900 uppercase">{selectedAdminCustomer.extracted_data.company_name}</span></div>
                                <div><span className="text-[7px] font-bold text-gray-400 uppercase block">Reg Number</span><span className="text-[10px] font-black text-gray-900 font-mono">{selectedAdminCustomer.extracted_data.registration_number}</span></div>
                              </>
                            ) : (
                               <div><span className="text-[7px] font-bold text-gray-400 uppercase block">Name Match</span><span className="text-[10px] font-black text-gray-900 uppercase">{selectedAdminCustomer.extracted_data.company_name || selectedAdminCustomer.extracted_data.full_name}</span></div>
                            )}
                         </div>
                      </div>
                      <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/30">
                         <h5 className="text-[8px] font-black text-orange-600 uppercase mb-2">Internal Validation</h5>
                         <p className="text-[9px] text-orange-700 font-medium leading-tight">Data points matched with 98% AI confidence. Manual verification required for final compliance sign-off.</p>
                      </div>
                   </div>

                   <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-2">
                      <button 
                        disabled={viewingDoc.status === DocStatus.APPROVED}
                        onClick={() => { approveDocument(selectedAdminCustomer.id, viewingDoc.id); setViewingDoc(null); }}
                        className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewingDoc.status === DocStatus.APPROVED ? 'bg-emerald-100 text-emerald-600 cursor-not-allowed' : 'bg-black text-white hover:bg-emerald-600 shadow-xl shadow-gray-200'}`}
                      >
                        {viewingDoc.status === DocStatus.APPROVED ? 'Document Approved' : 'Approve Artifact'}
                      </button>
                      <button onClick={() => setViewingDoc(null)} className="w-full py-2 text-[9px] font-black uppercase text-gray-400 hover:text-rose-500 transition-colors">Flag as Inconsistent</button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t px-8 py-2 flex justify-between items-center text-[9px] font-black text-gray-300 uppercase tracking-widest shrink-0">
        <div>© Aptic Identity Protocol v2.5.1</div>
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div><span>E2EE Node Active</span></div>
          <div className="w-px h-3 bg-gray-100"></div>
          <span>KE-Region Central</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
