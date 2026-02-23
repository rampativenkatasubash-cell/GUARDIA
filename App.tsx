
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Camera, 
  ClipboardList, 
  ShieldCheck, 
  Truck, 
  IndianRupee, 
  AlertCircle,
  Search,
  CheckCircle2,
  Building2,
  ArrowLeft,
  User,
  MapPin,
  CreditCard,
  Upload,
  FileImage,
  Plus,
  X,
  CreditCard as PaymentIcon,
  Navigation,
  Globe,
  Database,
  Cpu,
  Package,
  Clock,
  ChevronRight,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

import { 
  Violation, 
  ViolationStatus, 
  DashboardStats 
} from './types';
import { MOCK_OWNERS, FINE_AMOUNTS } from './constants';
import { analyzeTrafficImage, fetchOwnerDetails } from './services/protectActService';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'
    }`}
  >
    <Icon size={18} />
    <span className="font-bold text-sm tracking-tight">{label}</span>
  </button>
);

const Card = ({ children, title, className = "" }: { children?: React.ReactNode, title?: string, className?: string }) => (
  <div className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 ${className}`}>
    {title && <h3 className="text-[10px] font-black mb-4 text-slate-400 uppercase tracking-[0.2em]">{title}</h3>}
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'detect' | 'logs'>('dashboard');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isQueryingRTO, setIsQueryingRTO] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Modal States
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [paymentViolation, setPaymentViolation] = useState<Violation | null>(null);
  const [trackingViolation, setTrackingViolation] = useState<Violation | null>(null);
  
  // Manual Entry Form State
  const [manualPlate, setManualPlate] = useState('');

  const [isPaying, setIsPaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ownerCacheRef = useRef<Record<string, any>>({}); // Cache owner lookups

  // Load initial data
  useEffect(() => {
    const saved = localStorage.getItem('guardia_violations_v2');
    if (saved) setViolations(JSON.parse(saved));
  }, []);

  // Automatic Shipping Logic
  useEffect(() => {
    const paidViolations = violations.filter(v => v.status === ViolationStatus.PAID);
    
    if (paidViolations.length > 0) {
      const timer = setTimeout(() => {
        setViolations(prev => prev.map(v => {
          if (v.status === ViolationStatus.PAID) {
            const newStatus = v.offenseCount === 1 
              ? ViolationStatus.HELMET_SHIPPED 
              : ViolationStatus.GOVERNMENT_REVENUE;
            return { ...v, status: newStatus };
          }
          return v;
        }));
      }, 2000); // 2 second delay to simulate processing/shipping trigger
      
      return () => clearTimeout(timer);
    }
  }, [violations]);

  // Save data
  useEffect(() => {
    localStorage.setItem('guardia_violations_v2', JSON.stringify(violations));
  }, [violations]);

  const processImage = async (dataUrl: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeTrafficImage(dataUrl);
      
      if (!result.hasHelmet) {
        setIsQueryingRTO(true);
        const upperPlate = result.plateNumber.toUpperCase().trim();
        let ownerData = MOCK_OWNERS[upperPlate] || ownerCacheRef.current[upperPlate];
        
        if (!ownerData) {
          ownerData = await fetchOwnerDetails(upperPlate);
          ownerCacheRef.current[upperPlate] = ownerData; // Cache the result
        }
        
        addViolationRecord(upperPlate, ownerData, dataUrl);
      } else {
        alert("✅ Rider compliant. Helmet detected. No action needed.");
      }
    } catch (error) {
      console.error("Processing failed", error);
    } finally {
      setIsAnalyzing(false);
      setIsQueryingRTO(false);
    }
  };

  const addViolationRecord = (plate: string, owner: any, imageUrl: string) => {
    const plateHistory = violations.filter(v => v.plateNumber === plate);
    const offenseCount = plateHistory.length + 1;
    
    const newViolation: Violation = {
      id: Math.random().toString(36).substring(2, 11),
      plateNumber: plate,
      timestamp: new Date().toLocaleString(),
      imageUrl: imageUrl,
      status: ViolationStatus.PENDING,
      offenseCount: offenseCount,
      fineAmount: offenseCount === 1 ? FINE_AMOUNTS.FIRST_OFFENSE : FINE_AMOUNTS.SUBSEQUENT,
      owner: { ...owner, totalViolations: offenseCount }
    };

    setViolations(prev => [newViolation, ...prev]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewUrl(dataUrl);
      if (file.type.startsWith('image/')) {
        processImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = () => {
    if (videoRef.current && stream) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        processImage(dataUrl);
      }
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPlate) return;
    
    setIsQueryingRTO(true);
    const upperPlate = manualPlate.toUpperCase().trim();
    let ownerData = MOCK_OWNERS[upperPlate] || ownerCacheRef.current[upperPlate];

    if (!ownerData) {
      ownerData = await fetchOwnerDetails(upperPlate);
      ownerCacheRef.current[upperPlate] = ownerData; // Cache the result
    }

    addViolationRecord(upperPlate, ownerData, 'https://images.unsplash.com/photo-1558981403-c5f97cbba6c1?q=80&w=200&auto=format&fit=crop');
    setIsManualModalOpen(false);
    setManualPlate('');
    setIsQueryingRTO(false);
  };

  const confirmPayment = async () => {
    if (!paymentViolation) return;
    
    setIsPaying(true);
    
    // Simulate payment gateway delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    setViolations(prev => prev.map(v => {
      if (v.id === paymentViolation.id) {
        return { ...v, status: ViolationStatus.PAID };
      }
      return v;
    }));

    setIsPaying(false);
    setPaymentViolation(null);
  };

  const getStats = (): DashboardStats & { pendingFines: number; pendingAmount: number } => {
    return violations.reduce((acc, v) => {
      acc.totalViolations++;
      if (v.status !== ViolationStatus.PENDING) {
        acc.totalFinesCollected += v.fineAmount;
      } else {
        acc.pendingFines++;
        acc.pendingAmount += v.fineAmount;
      }
      if (v.status === ViolationStatus.HELMET_SHIPPED) {
        acc.helmetsDelivered++;
      }
      if (v.status === ViolationStatus.GOVERNMENT_REVENUE) {
        acc.governmentRevenue += v.fineAmount;
      }
      return acc;
    }, { 
      totalViolations: 0, 
      totalFinesCollected: 0, 
      helmetsDelivered: 0, 
      governmentRevenue: 0,
      pendingFines: 0,
      pendingAmount: 0
    });
  };

  const stats = getStats();
  const filteredViolations = violations.filter(v => 
    v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.owner?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startCamera = async () => {
    setPreviewUrl(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 } 
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Camera access denied. Please ensure you have granted permission in your browser settings and that metadata.json includes 'camera'.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-['Inter']">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col p-8 sticky top-0 h-screen">
        <div className="flex items-center space-x-3 mb-12">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-100">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">GUARDIA</h1>
        </div>

        <nav className="space-y-1 flex-1">
          <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); stopCamera(); }} />
          <SidebarItem icon={Camera} label="AI Scanner" active={activeTab === 'detect'} onClick={() => { setActiveTab('detect'); startCamera(); }} />
          <SidebarItem icon={ClipboardList} label="Fulfillment Log" active={activeTab === 'logs'} onClick={() => { setActiveTab('logs'); stopCamera(); }} />
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-100">
          <div className="bg-indigo-900 rounded-[2rem] p-6 text-white shadow-2xl shadow-indigo-200">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">NIC Dues Outstanding</p>
            <p className="text-2xl font-black">₹{stats.pendingAmount}</p>
            <p className="text-[10px] font-bold text-indigo-300 mt-2 flex items-center">
              <Activity size={12} className="mr-1" /> System Optimized
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto max-h-screen">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">
              {activeTab === 'dashboard' ? 'Traffic Safety' : activeTab === 'detect' ? 'Enforcement' : 'Logistics'}
            </h2>
            <p className="text-slate-400 font-bold mt-3 tracking-wide">Automatic helmet dispatch system active.</p>
          </div>
          
          {(isAnalyzing || isQueryingRTO) && (
             <div className="flex items-center space-x-4 bg-white p-5 rounded-[2rem] shadow-xl border border-slate-100 animate-in slide-in-from-right-4">
                <div className="relative">
                   <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                   <Database size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Live NIC Query</p>
                   <p className="text-xs font-black text-indigo-600 uppercase">{isQueryingRTO ? 'Fetching RTO Address...' : 'AI Scene Logic...'}</p>
                </div>
             </div>
          )}
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Detected (Unpaid)">
                <div className="flex items-end justify-between">
                   <p className="text-4xl font-black text-slate-900">{stats.pendingFines}</p>
                   <div className="text-rose-500 bg-rose-50 px-2 py-1 rounded-lg text-[10px] font-black uppercase">Pending</div>
                </div>
              </Card>
              <Card title="Revenue (Settled)">
                <div className="flex items-end justify-between">
                   <p className="text-4xl font-black text-emerald-600">₹{stats.totalFinesCollected}</p>
                   <IndianRupee size={20} className="text-emerald-200" />
                </div>
              </Card>
              <Card title="Fulfillment Active">
                <div className="flex items-end justify-between">
                   <p className="text-4xl font-black text-indigo-600">{stats.helmetsDelivered}</p>
                   <Truck size={24} className="text-indigo-200" />
                </div>
              </Card>
              <Card title="RTO Lookups">
                <div className="flex items-end justify-between">
                   <p className="text-4xl font-black text-slate-900">{stats.totalViolations}</p>
                   <Globe size={24} className="text-slate-200" />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <Card title="Offense Settlement History" className="lg:col-span-2">
                 <div className="h-[300px] w-full mt-4">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={violations.slice(0, 10).reverse()}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="plateNumber" fontSize={10} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                         <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                         <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                         <Bar dataKey="fineAmount" radius={[6, 6, 0, 0]} barSize={40}>
                            {violations.slice(0, 10).map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.status === ViolationStatus.PENDING ? '#f43f5e' : '#6366f1'} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                 </div>
                 <div className="flex items-center space-x-6 mt-6 justify-center">
                    <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest"><div className="w-3 h-3 bg-rose-500 rounded-full mr-2"></div> Unpaid Fine</div>
                    <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest"><div className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div> Settled / Shipping Active</div>
                 </div>
               </Card>
               <Card title="Logistics Health">
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={[
                               { name: 'Shipped', value: stats.helmetsDelivered || 0.1 },
                               { name: 'Pending Payment', value: stats.pendingFines || 0.1 },
                            ]}
                            innerRadius={70} outerRadius={90} paddingAngle={12} dataKey="value"
                         >
                            <Cell fill="#6366f1" />
                            <Cell fill="#f43f5e" />
                         </Pie>
                         <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-2">System Impact</p>
                     <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        {stats.helmetsDelivered} lives are now secured with ISI helmets dispatched to their registered RTO addresses.
                     </p>
                  </div>
               </Card>
            </div>
          </div>
        )}

        {activeTab === 'detect' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
             <button 
                onClick={() => { setActiveTab('dashboard'); stopCamera(); }} 
                className="flex items-center space-x-3 text-slate-400 hover:text-slate-900 transition-all group"
             >
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:bg-slate-50">
                   <ArrowLeft size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Back to Overview</span>
             </button>

             <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-rose-500 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 aspect-video border-[10px] border-white shadow-2xl">
                   {!stream && !previewUrl && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                         <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10">
                            <Camera size={32} className="text-indigo-400" />
                         </div>
                         <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">Scanner Idle</h3>
                         <p className="text-slate-400 max-w-sm font-medium mb-10">System will detect number plate and instantly query NIC for registered address.</p>
                         <div className="flex gap-4">
                            <button onClick={startCamera} className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Start Live Scan</button>
                            <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-white/10 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest border border-white/10">Upload Media</button>
                         </div>
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                      </div>
                   )}
                   {previewUrl && (
                      <div className="absolute inset-0 bg-black flex items-center justify-center">
                         {previewUrl.includes('image') ? <img src={previewUrl} className="max-w-full max-h-full object-contain" /> : <video src={previewUrl} className="max-w-full max-h-full object-contain" autoPlay muted loop />}
                         <button onClick={() => { setPreviewUrl(null); stopCamera(); }} className="absolute top-8 right-8 p-3 bg-black/40 text-white rounded-full hover:bg-black transition-all border border-white/10"><X size={20} /></button>
                      </div>
                   )}
                   <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${!stream || previewUrl ? 'hidden' : ''}`} />
                   {(stream || previewUrl) && (
                      <div className="absolute top-8 left-8 flex items-center space-x-3 bg-black/50 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/10">
                         <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                         <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase">AI_SYNC_ACTIVE</span>
                      </div>
                   )}
                </div>
             </div>

             <div className="flex justify-center gap-6">
                {stream && (
                   <button
                      disabled={isAnalyzing || isQueryingRTO}
                      onClick={handleCapture}
                      className={`relative flex items-center space-x-6 px-16 py-7 rounded-[2.5rem] font-black text-white shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${isAnalyzing || isQueryingRTO ? 'bg-slate-800' : 'bg-rose-600 hover:bg-rose-700'}`}
                   >
                      {isAnalyzing || isQueryingRTO ? <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" /> : <ShieldCheck size={28} />}
                      <span className="text-xl uppercase tracking-tighter">
                         {isQueryingRTO ? 'NIC LOOKUP...' : isAnalyzing ? 'ANALYZING...' : 'ISSUE E-CHALLAN'}
                      </span>
                   </button>
                )}
             </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <button 
                onClick={() => { setActiveTab('dashboard'); stopCamera(); }} 
                className="flex items-center space-x-3 text-slate-400 hover:text-slate-900 transition-all group mb-2"
             >
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:bg-slate-50">
                   <ArrowLeft size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Back to Overview</span>
             </button>

             <div className="flex flex-col sm:flex-row gap-6 items-center justify-between">
                <div className="flex-1 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 flex items-center transition-all w-full max-w-xl focus-within:ring-4 focus-within:ring-indigo-50">
                   <Search className="text-slate-400 ml-2" size={24} />
                   <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search Plate or Registered Owner..." 
                      className="flex-1 bg-transparent border-none focus:ring-0 text-base font-bold px-4"
                   />
                </div>
                <button onClick={() => setIsManualModalOpen(true)} className="flex items-center space-x-3 px-10 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all">
                   <Plus size={20} />
                   <span>Manual Issue</span>
                </button>
             </div>

             <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vehicle Entity</th>
                            <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Shipping Target</th>
                            <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance Status</th>
                            <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Penalty</th>
                            <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Settlement</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {filteredViolations.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/50 transition-all group">
                               <td className="px-10 py-8">
                                  <div className="flex items-center space-x-5">
                                     <img src={v.imageUrl} className="w-20 h-20 rounded-[1.5rem] object-cover border-4 border-white shadow-md" />
                                     <div>
                                        <p className="text-xl font-black text-slate-900 leading-tight">{v.plateNumber}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center"><Clock size={10} className="mr-1" /> {v.timestamp.split(',')[0]}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-10 py-8">
                                  <div className="max-w-[250px]">
                                     <p className="text-sm font-black text-slate-800 mb-1">{v.owner?.name}</p>
                                     <div className="flex items-start text-[11px] font-bold text-slate-400 leading-tight bg-indigo-50/30 p-2.5 rounded-xl border border-dashed border-indigo-100/50">
                                        <MapPin size={12} className="mr-2 mt-0.5 shrink-0 text-indigo-400" />
                                        <span className="line-clamp-2 italic">{v.owner?.address}</span>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-10 py-8">
                                  <div className="space-y-2">
                                     <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center w-fit border-2 ${
                                        v.status === ViolationStatus.PENDING ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                        v.status === ViolationStatus.HELMET_SHIPPED ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm' : 'bg-amber-50 text-amber-600 border-amber-100'
                                     }`}>
                                        {v.status === ViolationStatus.HELMET_SHIPPED && <Package size={14} className="mr-2 animate-bounce" />}
                                        {v.status === ViolationStatus.PENDING && <AlertCircle size={14} className="mr-2" />}
                                        {v.status === ViolationStatus.PENDING ? 'Waiting for Payment' : v.status.replace('_', ' ')}
                                     </span>
                                     {v.status === ViolationStatus.HELMET_SHIPPED && (
                                        <button onClick={() => setTrackingViolation(v)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center hover:underline pl-1"><Truck size={12} className="mr-1" /> Fulfillment Live</button>
                                     )}
                                  </div>
                               </td>
                               <td className="px-10 py-8 text-right">
                                  <p className="text-xl font-black text-slate-900">₹{v.fineAmount}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.offenseCount === 1 ? 'Gift Fulfillment' : 'NIC Fine'}</p>
                               </td>
                               <td className="px-10 py-8 text-right">
                                  {v.status === ViolationStatus.PENDING ? (
                                     <button onClick={() => setPaymentViolation(v)} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">Settle Now</button>
                                  ) : (
                                     <div className="flex items-center justify-end text-emerald-500 bg-emerald-50 w-12 h-12 rounded-full ml-auto border-2 border-emerald-100"><CheckCircle2 size={24} /></div>
                                  )}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Payment Settlement Modal */}
      {paymentViolation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="p-10 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center space-x-4">
                    <button onClick={() => { setPaymentViolation(null); stopCamera(); }} className="p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 hover:text-slate-900 mr-2">
                       <ArrowLeft size={24} />
                    </button>
                    <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200"><CreditCard size={24} /></div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Settle Fine</h3>
                 </div>
                 <button onClick={() => setPaymentViolation(null)} className="p-4 hover:bg-slate-200 rounded-3xl transition-all"><X size={28} /></button>
              </div>
              <div className="p-12 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <div className="bg-slate-900 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-2">Verified Plate</p>
                    <p className="text-5xl font-black mb-10 tracking-tighter">{paymentViolation.plateNumber}</p>
                    <div className="flex justify-between items-end border-t border-white/10 pt-8">
                       <div>
                          <p className="text-[11px] font-black uppercase opacity-40 mb-2">Settlement Total</p>
                          <p className="text-4xl font-black text-indigo-400">₹{paymentViolation.fineAmount}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black uppercase opacity-40 mb-2">NIC Ref</p>
                          <p className="text-sm font-black text-white/80">{paymentViolation.id.toUpperCase()}</p>
                       </div>
                    </div>
                 </div>

                  <div className="space-y-8 px-2">
                    <div className="flex items-start space-x-6">
                       <div className="p-4 bg-slate-100 rounded-2xl text-slate-600 shrink-0"><User size={22} /></div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Owner Record</p>
                          <p className="font-black text-slate-900 text-xl">{paymentViolation.owner?.name}</p>
                       </div>
                    </div>
                    <div className="flex items-start space-x-6">
                       <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 shrink-0"><MapPin size={22} /></div>
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Shipping Target (NIC Data)</p>
                          <p className="text-sm font-bold text-indigo-900 leading-relaxed bg-indigo-50/50 p-4 rounded-2xl border-2 border-dashed border-indigo-200/50 mb-4">{paymentViolation.owner?.address}</p>
                          
                          <button 
                             onClick={confirmPayment} 
                             disabled={isPaying}
                             className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3"
                          >
                             {isPaying ? (
                                <>
                                   <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                   <span>Processing...</span>
                                </>
                             ) : (
                                <>
                                   <CheckCircle2 size={18} />
                                   <span>Confirm & Pay ₹{paymentViolation.fineAmount}</span>
                                </>
                             )}
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="px-2 space-y-4">
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Prototype Payment Methods</p>
                       <div className="grid grid-cols-2 gap-3">
                          <button onClick={confirmPayment} disabled={isPaying} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                             <CreditCard size={20} className="text-slate-400 group-hover:text-indigo-600 mb-2" />
                             <span className="text-[10px] font-black uppercase text-slate-600">Card</span>
                          </button>
                          <button onClick={confirmPayment} disabled={isPaying} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                             <Globe size={20} className="text-slate-400 group-hover:text-indigo-600 mb-2" />
                             <span className="text-[10px] font-black uppercase text-slate-600">UPI / Net</span>
                          </button>
                       </div>
                    </div>

                    {paymentViolation.offenseCount === 1 ? (
                      <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex items-center space-x-6 shadow-2xl shadow-indigo-200">
                         <div className="bg-white/10 p-4 rounded-2xl"><Truck size={32} /></div>
                         <div>
                           <p className="text-xs font-black uppercase tracking-wider mb-1">Activation Eligible</p>
                           <p className="text-sm font-bold opacity-80 leading-snug">Paying this fine will instantly activate shipping for a free ISI helmet to the detected address above.</p>
                         </div>
                      </div>
                    ) : (
                      <div className="bg-rose-50 p-8 rounded-[2.5rem] border-2 border-rose-100 flex items-center space-x-6 text-rose-600">
                         <div className="bg-white p-4 rounded-2xl shadow-sm"><Building2 size={32} /></div>
                         <div>
                           <p className="text-xs font-black uppercase tracking-wider mb-1">Government Revenue</p>
                           <p className="text-sm font-bold opacity-80 leading-snug">Repeat Offense. Penalty proceeds are directed to road infrastructure development.</p>
                         </div>
                      </div>
                    )}
                 </div>

                 <div className="flex gap-4">
                    <button 
                       onClick={() => { setPaymentViolation(null); setActiveTab('dashboard'); stopCamera(); }} 
                       className="flex-1 py-6 bg-slate-100 text-slate-600 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center space-x-2"
                    >
                       <ArrowLeft size={16} />
                       <span>Back to Overview</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Shipping Tracking Modal */}
      {trackingViolation && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
               <div className="p-10 bg-indigo-600 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                     <button onClick={() => setTrackingViolation(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white/70 hover:text-white mr-2">
                        <ArrowLeft size={24} />
                     </button>
                     <Package size={28} />
                     <h3 className="text-2xl font-black uppercase tracking-tighter">Shipping Active</h3>
                  </div>
                  <button onClick={() => setTrackingViolation(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={28} /></button>
               </div>
               <div className="p-12 space-y-12 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-8 relative">
                     <div className="absolute left-6 top-2 bottom-2 w-1 bg-slate-100 rounded-full"></div>
                     
                     {[
                        { icon: IndianRupee, label: 'Fine Settled', time: 'Paid', done: true },
                        { icon: Package, label: 'Order Processing', time: 'Day 1', done: true },
                        { icon: Truck, label: 'In Transit', time: 'Active', done: false, pulse: true },
                        { icon: MapPin, label: 'NIC Address Delivery', time: 'Pending', done: false }
                     ].map((step, idx) => (
                        <div key={idx} className={`relative flex items-center space-x-8 pl-1 ${step.done || step.pulse ? '' : 'opacity-30'}`}>
                           <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl ${step.done ? 'bg-indigo-600 text-white' : step.pulse ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                              <step.icon size={20} />
                           </div>
                           <div>
                              <p className={`text-base font-black ${step.done || step.pulse ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                              <p className="text-[10px] font-black uppercase text-slate-400">{step.time}</p>
                           </div>
                        </div>
                     ))}
                  </div>

                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">RTO Destination</p>
                     <p className="text-lg font-black text-slate-900 mb-1">{trackingViolation.owner?.name}</p>
                     <p className="text-sm font-bold text-slate-500 leading-relaxed italic">{trackingViolation.owner?.address}</p>
                  </div>

                  <button onClick={() => setTrackingViolation(null)} className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3">
                     <ArrowLeft size={20} />
                     <span>Back to Logs</span>
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center space-x-4">
                  <button onClick={() => setIsManualModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 hover:text-slate-900">
                     <ArrowLeft size={24} />
                  </button>
                  <div>
                     <h3 className="text-2xl font-black text-slate-900 uppercase">Manual Lookup</h3>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Address detection by plate</p>
                  </div>
               </div>
               <button onClick={() => setIsManualModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleManualSubmit} className="p-12 space-y-10">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Plate Number</label>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
                  <input type="text" required placeholder="MH-01-AB-1234" value={manualPlate} onChange={(e) => setManualPlate(e.target.value.toUpperCase())} className="w-full bg-slate-50 border-2 border-slate-200 rounded-3xl py-6 pl-16 pr-6 text-2xl font-black uppercase focus:border-indigo-500 focus:ring-8 focus:ring-indigo-50 transition-all outline-none" />
                </div>
              </div>

              <div className="p-6 bg-indigo-50 rounded-[2rem] border-2 border-dashed border-indigo-100 flex items-center space-x-4">
                 <div className="bg-white p-3 rounded-2xl shadow-sm text-indigo-600"><Globe size={24} /></div>
                 <p className="text-[11px] font-bold text-indigo-900/60 leading-tight">protectAct AI will instantly query the NIC database for registration details once submitted.</p>
              </div>

              <button type="submit" disabled={isQueryingRTO} className="w-full py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-700 transition-all disabled:opacity-50">
                {isQueryingRTO ? 'Querying RTO Records...' : 'Detect & Register'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
