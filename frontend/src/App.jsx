import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, AreaChart, Area, CartesianGrid, LabelList
} from 'recharts';
import { 
  Activity, AlertCircle, ChevronRight, LayoutDashboard, Users, PieChart as PieChartIcon, 
  Settings, Bell, Search, CheckCircle, TrendingUp, ShieldAlert, Clock, Loader2, Bot, Upload, FileText, Send, User, Sparkles, Brain, Briefcase, Database, Download, Printer, X, Image as ImageIcon
} from 'lucide-react';

const Card = ({ children, className = "", delay = 0 }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300 animate-fade-in ${className}`} style={{ animationDelay: `${delay}ms` }}>{children}</div>
);

const StatCard = ({ title, value, icon: Icon, trend, themeColor = "blue", delay }) => {
  const colorMap = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-600" },
    green: { bg: "bg-green-500/10", text: "text-green-600" },
    red: { bg: "bg-red-500/10", text: "text-red-600" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-600" },
  };
  const theme = colorMap[themeColor] || colorMap.blue;

  return (
    <Card delay={delay} className="relative overflow-hidden">
      <div className="flex justify-between items-start z-10 relative">
        <div><p className="text-sm font-medium text-gray-500 mb-1">{title}</p><h3 className="text-2xl font-bold text-gray-900">{value}</h3></div>
        <div className={`p-3 rounded-xl ${theme.bg}`}><Icon className={`w-6 h-6 ${theme.text}`} /></div>
      </div>
      {trend && <div className="mt-4 flex items-center gap-1 text-sm font-medium text-green-600"><TrendingUp className="w-4 h-4" /><span>{trend}</span><span className="text-gray-400 font-normal ml-1">vs last month</span></div>}
    </Card>
  );
};

const InputGroup = ({ label, children }) => (<div className="flex flex-col gap-1.5"><label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">{label}</label>{children}</div>);
const Select = ({ ...props }) => (<div className="relative"><select {...props} className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block p-3 appearance-none hover:bg-white" /><ChevronRight className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 rotate-90 pointer-events-none" /></div>);
const Input = ({ ...props }) => (<input {...props} className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block p-3 hover:bg-white placeholder-gray-400" />);

// --- NEW: SMART REPORT FORMATTER ---
const FormatReportContent = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n').filter(line => line.trim() !== '');

  return (
    <div className="space-y-4"> 
      {lines.map((line, index) => {
        const isListItem = /^[•\-\*]|\d+\./.test(line.trim());
        if (isListItem && line.includes(':')) {
           const parts = line.split(':');
           const title = parts[0];
           const content = parts.slice(1).join(':');
           return (
             <div key={index} className="mb-2 text-gray-800">
               <span className="font-bold text-gray-900">{title}:</span>
               <span className="text-gray-700 leading-relaxed">{content}</span>
             </div>
           );
        }
        if (isListItem) {
            return <div key={index} className="font-bold text-gray-900 mb-1 mt-2">{line}</div>
        }
        return <p key={index} className="text-gray-700 leading-relaxed">{line}</p>;
      })}
    </div>
  );
};

// --- APPLICATION DETAIL MODAL (WITH SHAP) ---
const AppDetailModal = ({ app, onClose, onUpdate }) => {
  const [shapData, setShapData] = useState(null);
  const [loadingShap, setLoadingShap] = useState(false);

  useEffect(() => {
    if (app) {
        setLoadingShap(true);
        // Explicitly cast types to ensure backend compatibility
        const payload = {
            person_name: String(app.person_name),
            person_age: Number(app.age),
            person_income: Number(app.income),
            person_home_ownership: String(app.home_ownership),
            person_emp_length: Number(app.emp_length),
            loan_intent: String(app.intent || "PERSONAL"),
            loan_grade: String(app.grade),
            loan_amnt: Number(app.loan_amnt),
            loan_int_rate: Number(app.int_rate),
            cb_person_default_on_file: String(app.default_hist || "N"), 
            cb_person_cred_hist_length: Number(app.cred_hist_length)
        };
        
        fetch('http://localhost:8000/api/xai/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if(data.contributions) setShapData(data.contributions);
            else console.warn("No contributions in SHAP response", data);
        })
        .catch(err => console.error("SHAP Error:", err))
        .finally(() => setLoadingShap(false));
    }
  }, [app]);

  if (!app) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in flex flex-col md:flex-row max-h-[90vh]">
        {/* LEFT: DETAILS */}
        <div className="flex-1 overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
            <div>
                <h3 className="text-xl font-bold text-gray-800">{app.person_name}</h3>
                <p className="text-sm text-gray-500">ID: {app.timestamp || "N/A"}</p>
            </div>
            <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
            <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Financial Profile</h4>
                <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Income</p><p className="font-semibold text-lg">${app.income?.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500">Age</p><p className="font-semibold text-lg">{app.age}</p></div>
                <div><p className="text-xs text-gray-500">Employment</p><p className="font-semibold text-lg">{app.emp_length} Years</p></div>
                <div><p className="text-xs text-gray-500">Home</p><p className="font-semibold text-lg">{app.home_ownership}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Default History</p><p className="font-semibold">{app.default_hist === 'Y' ? 'Yes' : 'No'}</p></div>
                <div><p className="text-xs text-gray-500">Credit History</p><p className="font-semibold">{app.cred_hist_length} Years</p></div>
                </div>
            </div>
            <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Loan Details</h4>
                <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Amount</p><p className="font-semibold text-lg">${app.loan_amnt?.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500">Rate</p><p className="font-semibold text-lg">{app.int_rate}%</p></div>
                <div><p className="text-xs text-gray-500">Grade</p><div className="badge badge-outline font-bold">{app.grade}</div></div>
                <div><p className="text-xs text-gray-500">Intent</p><p className="font-semibold capitalize">{app.intent?.toLowerCase()}</p></div>
                </div>
                <div className="mt-4">
                    <p className="text-xs text-gray-500">Raw Probability</p>
                    <p className="font-mono text-gray-700">{(app.probability * 100).toFixed(4)}%</p>
                </div>
            </div>
            <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                <div><p className="text-xs text-gray-500 uppercase">Risk Assessment</p><p className={`text-2xl font-black ${app.risk_level === 'High' ? 'text-red-500' : app.risk_level === 'Medium' ? 'text-amber-500' : 'text-green-500'}`}>{app.risk_level} Risk</p></div>
                <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase mb-1">Decision</p>
                    <div className="flex gap-2 items-center">
                        <span className={`px-4 py-1.5 rounded-lg text-sm font-bold text-white ${app.decision === 'Approved' ? 'bg-green-500' : app.decision === 'Denied' ? 'bg-red-500' : 'bg-amber-500'}`}>{app.decision}</span>
                        <div className="flex gap-1 ml-2">
                            {app.decision !== 'Approved' && <button onClick={() => onUpdate(app.request_id, 'Approved')} className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 text-xs font-bold rounded">Approve</button>}
                            {app.decision !== 'Denied' && <button onClick={() => onUpdate(app.request_id, 'Denied')} className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold rounded">Deny</button>}
                        </div>
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>

        {/* RIGHT: SHAP EXPLANATION */}
        <div className="w-full md:w-1/3 bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto relative">
             <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-full transition-colors hidden md:block"><X size={20} /></button>
             <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <Sparkles size={16} className="text-indigo-600"/> AI Risk Factors (SHAP)
             </h4>
             
             {loadingShap ? (
                 <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                     <Loader2 className="w-8 h-8 animate-spin mb-2"/>
                     <span className="text-xs">Analyzing decision factors...</span>
                 </div>
             ) : shapData ? (
                 <div className="space-y-4">
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="99%" height="100%">
                            <BarChart data={shapData} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb"/>
                                <XAxis type="number" hide/>
                                <YAxis dataKey="feature" type="category" width={80} tick={{fontSize: 10}} interval={0}/>
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{fontSize: '12px'}}/>
                                <Bar dataKey="value" name="Impact" radius={[0, 4, 4, 0]}>
                                    {shapData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.value > 0 ? "#EF4444" : "#10B981"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="text-xs text-gray-500 space-y-2">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span>Red factors increase risk</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span>Green factors decrease risk</span></div>
                     </div>
                     
                     <div className="mt-6 border-t border-gray-200 pt-4">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Key Insights:</p>
                        <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1">
                            {shapData.slice(0, 3).map((item, idx) => (
                                <li key={idx}>
                                    <b>{item.feature}</b> {item.value > 0 ? "increased" : "decreased"} risk score significantly.
                                </li>
                            ))}
                        </ul>
                     </div>
                 </div>
             ) : (
                 <div className="text-center text-gray-400 text-sm mt-10">
                    <p>Explanation unavailable.</p>
                    <p className="text-xs mt-2">Check backend logs for errors.</p>
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default function SmartCreditApp() {
  const [activeTab, setActiveTab] = useState('manager');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isBackendReady, setIsBackendReady] = useState(true);
  
  // New State for Modal
  const [selectedApp, setSelectedApp] = useState(null);
  
  // New Global SHAP Image
  const [globalShapImage, setGlobalShapImage] = useState(null);

  // Analytics State
  const [analytics, setAnalytics] = useState({ 
    total_apps: 0, approval_rate: 0, avg_risk: 0, pending: 0, 
    risk_dist: [], trend: [], model_accuracy: 0.94, model_f1: 0.0, system_status: "Healthy",
    model_params: {},
    insight_report: "Initializing strategic insights..." 
  });
  
  // Report State for Split Screen
  const [activeReport, setActiveReport] = useState(null);
  
  const [formData, setFormData] = useState({ person_name: "", person_age: 28, person_income: 65000, person_home_ownership: "MORTGAGE", person_emp_length: 5.0, loan_intent: "VENTURE", loan_grade: "A", loan_amnt: 15000, loan_int_rate: 9.5, cb_person_default_on_file: "N", cb_person_cred_hist_length: 6 });

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    { id: 1, type: 'bot', text: "Hello! Upload a credit dataset (CSV) to begin.", agent: "System" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeTab === 'officer') {
        loadTableData();
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  useEffect(() => { 
    // Always fetch analytics on mount or tab switch to get model accuracy/params
    fetchAnalytics();
    if(activeTab === 'manager') {
        fetchGlobalShap();
    }
  }, [activeTab]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  
  // --- FETCH GLOBAL SHAP ---
  const fetchGlobalShap = async () => {
    try {
        const res = await fetch('http://localhost:8000/api/xai/global-summary');
        if (res.ok) {
            const data = await res.json();
            setGlobalShapImage(data.image);
        } else {
            console.error("Global SHAP fetch failed with status:", res.status);
            setGlobalShapImage(null); 
        }
    } catch(e) { 
        console.error("Global SHAP error", e); 
        setGlobalShapImage(null);
    }
  }

  // --- PDF GENERATION (Updated styles for new formatting) ---
  const handleDownloadPDF = () => {
    if (!activeReport) return;
    
    const printWindow = window.open('', '_blank');
    const content = document.getElementById('council-report-content').innerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>AI Council Risk Report</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              .print-container { padding: 40px; }
              .page-break { page-break-before: always; display: block; } /* Force separate page for charts */
              
              .recharts-responsive-container {
                 width: 100% !important;
                 height: 350px !important;
                 max-height: 350px !important;
                 page-break-inside: avoid;
              }
              .section {
                 page-break-inside: avoid;
                 break-inside: avoid;
                 margin-bottom: 30px;
                 border: 1px solid #ddd;
                 display: block;
                 page-break-after: auto;
              }
              /* Stack charts vertically */
              .chart-wrapper {
                 display: block !important;
                 width: 100% !important;
                 height: 400px !important; 
                 page-break-inside: avoid;
                 margin-bottom: 40px;
                 border: 1px solid #eee;
                 border-radius: 8px;
                 padding: 20px;
                 background-color: #fff;
              }
              .grid { display: block !important; }
              /* Force charts to be full width in print mode, effectively one by one */
              .chart-container { grid-template-columns: 1fr !important; }
              .md\\:col-span-2 { width: 100% !important; }
              /* Force labels to be visible */
              .recharts-label-list tspan { fill: #333 !important; font-weight: bold; }
            }
            
            body { font-family: 'Helvetica', sans-serif; color: #1f2937; -webkit-print-color-adjust: exact; }
            h1 { color: #111827; font-size: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; margin-top: 0; }
            .section { margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background-color: #f9fafb; }
            .section-title { font-weight: bold; color: #374151; font-size: 16px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
            
            .font-bold { font-weight: bold; color: #111827; }
            .text-gray-700 { color: #374151; line-height: 1.5; }
            .mb-2 { margin-bottom: 10px; display: block; }
            .space-y-4 > * + * { margin-top: 16px; }
            
            .timestamp { text-align: right; color: #9ca3af; font-size: 12px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="print-container">
            <h1>🛡️ AI Risk Council Report</h1>
            ${content}
            <div class="timestamp">Generated by SmartCredit AI • ${new Date().toLocaleString()}</div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Increased timeout to ensure Recharts renders fully before print dialog opens
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 1500);
  };

  // --- DATA LOADING & LOGIC ---
  const loadTableData = async () => {
    setTableLoading(true);
    try {
      let url = searchQuery.trim() 
        ? `http://localhost:8000/api/search?q=${searchQuery}` 
        : 'http://localhost:8000/api/history';
      const res = await fetch(url);
      if (res.ok) { setHistory(await res.json()); setIsBackendReady(true); } 
      else { setHistory([]); setIsBackendReady(true); }
    } catch (e) { setIsBackendReady(false); } finally { setTableLoading(false); }
  };

  const fetchAnalytics = async () => { 
    setAnalyticsLoading(true); 
    try { 
      const res = await fetch('http://localhost:8000/api/analytics'); 
      if (res.ok) { 
        const data = await res.json();
        setAnalytics(data); 
        setIsBackendReady(true); 
      } 
    } catch (e) { setIsBackendReady(false); } finally { setAnalyticsLoading(false); } 
  };
  
  const handleUpdateDecision = async (requestId, newDecision) => {
      try {
          const res = await fetch('http://localhost:8000/api/update-decision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ request_id: requestId, decision: newDecision })
          });
          
          if (res.ok) {
              // Optimistic UI Update
              setHistory(prev => prev.map(item => 
                  item.request_id === requestId ? { ...item, decision: newDecision } : item
              ));
              // Also update the modal if open
              if (selectedApp && selectedApp.request_id === requestId) {
                  setSelectedApp(prev => ({ ...prev, decision: newDecision }));
              }
          }
      } catch (e) {
          console.error("Failed to update decision", e);
      }
  };

  const handleSimulateDrift = async () => {
    try {
      setAnalyticsLoading(true);
      await fetch('http://localhost:8000/api/simulate-drift', { method: 'POST' });
      await fetchAnalytics();
      alert("⚠️ Market Shock Simulated! Autonomous Agent is detecting drift...");
      const intervalId = setInterval(async () => {
        const res = await fetch('http://localhost:8000/api/analytics');
        if (res.ok) {
            const newData = await res.json();
            setAnalytics(newData);
            if (newData.system_status === "Healthy") { clearInterval(intervalId); }
        }
      }, 2000); 
      setTimeout(() => clearInterval(intervalId), 20000);
    } catch (e) { console.error("Drift simulation failed", e); } finally { setAnalyticsLoading(false); }
  };

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: ["person_age", "person_income", "person_emp_length", "loan_amnt", "loan_int_rate", "cb_person_cred_hist_length"].includes(name) ? (value === '' ? 0 : Number(value)) : value })); };
  
  const handlePredict = async (e) => { 
    e.preventDefault(); setLoading(true); 
    try { 
      const response = await fetch('http://localhost:8000/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); 
      const data = await response.json(); setPrediction(data); setSearchQuery(""); loadTableData(); 
    } catch (err) {} finally { setLoading(false); } 
  };

  // --- AGENTIC WORKFLOW ---
  const handleFileUpload = async (e) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    setChatMessages(prev => [...prev, { id: Date.now(), type: 'user', text: `Uploaded ${file.name}` }]);
    setChatMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: "Convening AI Council... (Analyzing Data, Business & Strategy)", agent: "System", isLoading: true }]);

    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const uploadRes = await fetch('http://localhost:8000/api/ai/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      
      const councilRes = await fetch('http://localhost:8000/api/ai/council-meeting', { method: 'POST' });
      const report = await councilRes.json();
      
      // Update the Right-Hand Report Panel
      setActiveReport(report);
      
      setChatMessages(prev => prev.map(msg => {
        if (msg.isLoading) return { ...msg, text: "Report Generated! View the details in the right panel.", isLoading: false };
        return msg;
      }));
      
    } catch (error) { 
      setChatMessages(prev => prev.map(msg => msg.isLoading ? { ...msg, text: `Error: ${error.message}`, isLoading: false } : msg)); 
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault(); if (!chatInput.trim()) return;
    const userMsg = { id: Date.now(), type: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]); setChatInput(""); setIsChatLoading(true);
    try { const res = await fetch('http://localhost:8000/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMsg.text }) }); const data = await res.json(); setChatMessages(prev => [...prev, { id: Date.now()+1, type: 'bot', text: data.response, agent: "Lead Analyst" }]); } catch (err) { setChatMessages(prev => [...prev, { id: Date.now()+1, type: 'bot', text: "Sorry, I couldn't process that.", agent: "System" }]); } finally { setIsChatLoading(false); }
  };

  // [CHANGE] Swapped the positions of Loan Status Dashboard and Loan Processing
  const menuItems = [{ id: 'manager', label: 'Loan Status Dashboard', icon: PieChartIcon }, { id: 'officer', label: 'Loan Processing', icon: Users }, { id: 'chatbot', label: 'AI Council', icon: Bot }];

  const getProcessedDistribution = () => {
    return (analytics.risk_dist || []).map(item => ({
      ...item,
      displayName: item.name === 'High' ? 'Denied' : item.name === 'Low' ? 'Approved' : 'Pending',
      color: item.name === 'High' ? '#EF4444' : item.name === 'Low' ? '#10B981' : '#F59E0B' // Amber for Medium/Pending
    }));
  };

  const processedDistData = getProcessedDistribution();

  const CustomLegend = ({ payload }) => (
    <ul className="flex flex-col gap-2 justify-center pl-6">
      {payload.map((entry, index) => (
        <li key={`item-${index}`} className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="font-medium">{entry.payload.displayName}</span>
          <span className="text-gray-400">({entry.payload.value})</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex font-sans overflow-hidden">
      <AppDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} onUpdate={handleUpdateDecision} />
      
      <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-indigo-900 text-white transition-all duration-300 flex flex-col shadow-2xl relative z-20`}>
        {/* [CHANGE] Sidebar Header Title */}
        <div className="h-20 flex items-center px-6 border-b border-indigo-800"><Activity className="w-8 h-8 text-cyan-400" /><span className={`ml-3 font-bold text-xl ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>Smart Credit</span></div>
        <nav className="flex-1 py-8 px-4 space-y-2">{menuItems.map((item) => (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-200 hover:bg-indigo-800'}`}><item.icon className={`w-6 h-6 ${activeTab === item.id ? 'text-cyan-300' : ''}`} /><span className={`ml-4 font-medium whitespace-nowrap transition-all ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>{item.label}</span></button>))}</nav>
        <div className="p-4 border-t border-indigo-800"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex justify-center p-2 hover:bg-indigo-800 rounded-lg"><ChevronRight className={`w-5 h-5 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} /></button></div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-end px-8 shadow-sm z-10">
          <div className="flex items-center gap-6"><div className="flex items-center gap-3 pl-6 border-l border-gray-200"><div className="text-right hidden md:block"><p className="text-sm font-bold text-gray-900">Chan Jin Wei</p><p className="text-xs text-gray-500 font-medium">Analyst</p></div><div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">CJ</div></div></div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 scroll-smooth bg-gray-100">
          {!isBackendReady && <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 mx-auto max-w-7xl"><p className="text-sm text-amber-700 font-bold">Backend Disconnected</p></div>}

          {/* === SPLIT SCREEN LAYOUT FOR CHATBOT === */}
          {activeTab === 'chatbot' ? (
            <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex gap-6">
              
              {/* LEFT COLUMN: CHAT */}
              <div className="w-5/12 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-600"/> Council Chat</h3>
                  <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">Online</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] rounded-xl p-3 shadow-sm text-sm ${msg.type === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                        {msg.type === 'bot' && <div className="text-xs font-bold text-indigo-500 mb-1 uppercase tracking-wide">{msg.agent}</div>}
                        {msg.isLoading ? <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Thinking...</div> : msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 bg-white border-t border-gray-200">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <label className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer transition-colors" title="Upload Dataset"><Upload size={20} /><input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} /></label>
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        value={chatInput} 
                        onChange={(e) => setChatInput(e.target.value)} 
                        placeholder="Type a message..." 
                        className="w-full h-10 pl-3 pr-10 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm" // IMPROVED VISIBILITY
                        disabled={isChatLoading} 
                      />
                      <button type="submit" disabled={isChatLoading} className="absolute right-1 top-1 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"><Send size={16} /></button>
                    </div>
                  </form>
                </div>
              </div>

              {/* RIGHT COLUMN: GENERATED REPORT */}
              <div className="w-7/12 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Report Viewer</h3>
                  {activeReport && (
                    <button onClick={handleDownloadPDF} className="text-xs font-bold px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors">
                      <Printer size={14}/> Print / Save PDF
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                  {activeReport ? (
                    <div id="council-report-content" className="space-y-6 animate-fade-in">
                      {/* Report Header */}
                      <div className="text-center border-b border-gray-100 pb-4">
                        <h2 className="text-2xl font-bold text-gray-900">Credit Risk Assessment</h2>
                        <p className="text-sm text-gray-500 mt-1">Generated by AI Council • {new Date().toLocaleDateString()}</p>
                      </div>

                      {/* Section 1: Data Agent */}
                      <div className="section bg-purple-50 p-5 rounded-xl border border-purple-100">
                        <div className="section-title text-purple-800 font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                          <Database size={18}/> Data Profile Analysis
                        </div>
                        <div className="content">
                          <FormatReportContent text={activeReport.data_analysis} />
                          
                          {/* [NEW] DYNAMIC AI-SELECTED VISUALIZATIONS */}
                          {activeReport.visualizations && activeReport.visualizations.length > 0 && (
                             <div className="mt-8 grid grid-cols-1 gap-6 p-4 rounded-xl border border-indigo-50 shadow-md bg-white page-break chart-container">
                                {activeReport.visualizations.map((viz, idx) => (
                                    <div key={idx} className={`chart-wrapper h-96 overflow-hidden relative w-full`} style={{minWidth: 0}}>
                                        <p className="text-xs font-bold text-gray-600 uppercase mb-4 text-center tracking-wider bg-gray-50 py-2 rounded-lg border border-gray-100">
                                            Group {idx + 1}: {viz.title}
                                        </p>
                                        <ResponsiveContainer width="99%" height="100%">
                                            {viz.type === 'pie' ? (
                                                <PieChart>
                                                    <Pie 
                                                        data={viz.data} 
                                                        innerRadius={60} 
                                                        outerRadius={100} 
                                                        paddingAngle={5} 
                                                        dataKey="value"
                                                        nameKey="name" 
                                                        isAnimationActive={false}
                                                        label={({name, value}) => {
                                                            let label = name;
                                                            if (String(name) === '0') label = 'Good';
                                                            if (String(name) === '1') label = 'Bad';
                                                            return `${label}: ${value}`;
                                                        }} 
                                                    >
                                                        {viz.data.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"][index % 5]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend 
                                                        wrapperStyle={{fontSize:'11px', paddingTop: '15px'}} 
                                                        layout="vertical" 
                                                        verticalAlign="middle" 
                                                        align="right"
                                                    />
                                                </PieChart>
                                            ) : (
                                                <BarChart 
                                                    data={viz.data} 
                                                    layout={viz.type === 'bar' && viz.data.length > 5 ? "vertical" : "horizontal"}
                                                    margin={{ top: 20, right: 60, left: 40, bottom: 5 }} 
                                                >
                                                    {viz.type === 'bar' && viz.data.length > 5 ? (
                                                        <>
                                                            <XAxis type="number" hide />
                                                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize:11, fill:'#4b5563'}} interval={0} />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XAxis dataKey="name" tick={{fontSize:11, fill:'#4b5563'}} />
                                                            <YAxis hide/>
                                                        </>
                                                    )}
                                                    <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                                                    <Bar dataKey="value" fill="#6366f1" radius={[4,4,4,4]} barSize={24} isAnimationActive={false}>
                                                        {viz.data.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444"][index % 6]} />
                                                        ))}
                                                        <LabelList 
                                                            dataKey="value" 
                                                            position={viz.type === 'bar' && viz.data.length > 5 ? "right" : "top"} 
                                                            style={{ fontSize: '11px', fill: '#6b7280', fontWeight: 'bold' }} 
                                                        />
                                                    </Bar>
                                                </BarChart>
                                            )}
                                        </ResponsiveContainer>
                                    </div>
                                ))}
                             </div>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Business Agent */}
                      <div className="section bg-blue-50 p-5 rounded-xl border border-blue-100">
                        <div className="section-title text-blue-800 font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                          <Briefcase size={18}/> Business Risk Assessment
                        </div>
                        <div className="content">
                          <FormatReportContent text={activeReport.business_risks} />
                        </div>
                      </div>

                      {/* Section 3: Strategy Agent */}
                      <div className="section bg-emerald-50 p-5 rounded-xl border border-emerald-100">
                        <div className="section-title text-emerald-800 font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                          <Sparkles size={18}/> Strategic Recommendations
                        </div>
                        <div className="content">
                          <FormatReportContent text={activeReport.strategy_recommendation} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <FileText size={32} className="text-gray-300"/>
                      </div>
                      <p className="font-medium">No report generated yet.</p>
                      <p className="text-sm mt-1">Upload a CSV dataset in the chat to begin.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            // === ORIGINAL DASHBOARD TABS (OFFICER & MANAGER) ===
            <div className="max-w-7xl mx-auto space-y-8 pb-10">
              {activeTab === 'officer' && (
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-4"><Card className="border-t-4 border-t-indigo-500"><h3 className="font-bold mb-4">Applicant</h3><form onSubmit={handlePredict} className="space-y-4"><InputGroup label="Name"><Input name="person_name" value={formData.person_name} onChange={handleInputChange}/></InputGroup><div className="grid grid-cols-2 gap-4"><InputGroup label="Income"><Input type="number" min="0" name="person_income" value={formData.person_income} onChange={handleInputChange}/></InputGroup><InputGroup label="Age"><Input type="number" min="0" name="person_age" value={formData.person_age} onChange={handleInputChange}/></InputGroup></div><InputGroup label="Home"><Select name="person_home_ownership" value={formData.person_home_ownership} onChange={handleInputChange}><option value="RENT">Rent</option><option value="OWN">Own</option><option value="MORTGAGE">Mortgage</option><option value="OTHER">Other</option></Select></InputGroup><div className="grid grid-cols-2 gap-4"><InputGroup label="Emp (Yrs)"><Input type="number" step="0.1" min="0" name="person_emp_length" value={formData.person_emp_length} onChange={handleInputChange}/></InputGroup><InputGroup label="Amount"><Input type="number" min="0" name="loan_amnt" value={formData.loan_amnt} onChange={handleInputChange}/></InputGroup></div><div className="grid grid-cols-2 gap-4"><InputGroup label="Intent"><Select name="loan_intent" value={formData.loan_intent} onChange={handleInputChange}><option value="PERSONAL">Personal</option><option value="EDUCATION">Education</option><option value="MEDICAL">Medical</option><option value="VENTURE">Venture</option><option value="HOMEIMPROVEMENT">Home Imp.</option><option value="DEBTCONSOLIDATION">Debt</option></Select></InputGroup><InputGroup label="Grade"><Select name="loan_grade" value={formData.loan_grade} onChange={handleInputChange}>{['A','B','C','D','E','F','G'].map(g=><option key={g} value={g}>{g}</option>)}</Select></InputGroup></div><div className="grid grid-cols-2 gap-4"><InputGroup label="Rate %"><Input type="number" step="0.01" min="0" name="loan_int_rate" value={formData.loan_int_rate} onChange={handleInputChange}/></InputGroup><InputGroup label="Def. Hist"><Select name="cb_person_default_on_file" value={formData.cb_person_default_on_file} onChange={handleInputChange}><option value="N">No</option><option value="Y">Yes</option></Select></InputGroup></div><InputGroup label="Hist (Yrs)"><Input type="number" min="0" name="cb_person_cred_hist_length" value={formData.cb_person_cred_hist_length} onChange={handleInputChange}/></InputGroup><button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded mt-2">Predict</button></form></Card></div>
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                      {!prediction ? <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-3xl bg-gray-50/50 text-gray-400"><Activity className="w-10 h-10 mb-4 text-indigo-300"/><h3 className="text-lg font-semibold">Waiting for Data</h3></div> : 
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className={`text-white border-none shadow-xl ${prediction.risk_level==='Low'?'bg-gradient-to-br from-green-500 to-emerald-600':prediction.risk_level==='Medium'?'bg-gradient-to-br from-amber-400 to-orange-500':'bg-gradient-to-br from-red-500 to-rose-600'}`}><p className="text-white/80 text-sm uppercase mb-1">Risk Level</p><div className="flex items-center gap-3"><h2 className="text-3xl font-bold">{prediction.risk_level}</h2></div><div className="mt-4 bg-white/20 rounded-lg p-2 text-center text-sm">{prediction.decision}</div></Card>
                            <Card><p className="text-gray-500 text-sm uppercase mb-2">Probability</p><div className="flex items-baseline gap-1"><span className="text-4xl font-bold text-gray-900">{(prediction.probability_of_default*100).toFixed(1)}</span><span className="text-lg text-gray-400">%</span></div><div className="w-full bg-gray-100 h-2 rounded-full mt-4"><div className={`h-full rounded-full ${prediction.probability_of_default>0.5?'bg-red-500':'bg-green-500'}`} style={{width:`${prediction.probability_of_default*100}%`}}/></div></Card>
                            {/* NEW: DYNAMIC MODEL ACCURACY CARD */}
                            <Card className="flex flex-col justify-center items-center text-center p-4">
                              <div className="flex justify-around w-full mb-2">
                                <div className="flex flex-col items-center">
                                  <p className="text-gray-400 text-xs uppercase mb-1">AUC</p>
                                  <div className="text-indigo-600 text-lg font-bold radial-progress" style={{"--value": (analytics.model_accuracy * 100).toFixed(0)}}>
                                    {(Number(analytics.model_accuracy || 0) * 100).toFixed(1)}%
                                  </div>
                                </div>
                                <div className="flex flex-col items-center">
                                  <p className="text-gray-400 text-xs uppercase mb-1">F1 Score</p>
                                  <div className="text-emerald-500 text-lg font-bold radial-progress" style={{"--value": (analytics.model_f1 * 100).toFixed(0)}}>
                                    {(Number(analytics.model_f1 || 0) * 100).toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 mt-2 font-mono break-all px-2">
                                {analytics.model_params && Object.keys(analytics.model_params).length > 0
                                  ? JSON.stringify(analytics.model_params).replace(/classifier__/g, '').replace(/[{"}]/g, '').replace(/,/g, ', ')
                                  : "GridSearch Optimized"}
                              </p>
                            </Card>
                          </div>
                        </>
                      }
                      {/* --- HISTORY / SEARCH TABLE --- */}
                      <Card>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                          <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <span>Recent Applications</span>
                            {tableLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600"/>}
                          </h3>
                          
                          {/* Search Bar Moved Here */}
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 w-full sm:w-64 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input 
                              type="text" 
                              placeholder="Search name..." 
                              className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400" 
                              value={searchQuery} 
                              onChange={(e) => setSearchQuery(e.target.value)} 
                            />
                          </div>
                        </div>
                        
                        <div className="overflow-x-auto h-[600px] overflow-y-auto"> {/* FIXED HEIGHT SCROLL */}
                          <table className="w-full text-left relative">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10"> {/* STICKY HEADER */}
                              <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Grade</th><th className="px-4 py-2">Risk</th><th className="px-4 py-2">Result</th></tr>
                            </thead>
                            <tbody>
                              {history.length > 0 ? (
                                history.map((r, i) => (
                                  <tr 
                                    key={i} 
                                    onClick={() => setSelectedApp(r)} 
                                    className="hover:bg-indigo-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0 group"
                                  >
                                    <td className="px-4 py-3 font-medium text-gray-900 group-hover:text-indigo-700">{r.person_name}</td>
                                    <td className="px-4 py-3 text-gray-600">${r.loan_amnt?.toLocaleString()}</td>
                                    <td className="px-4 py-3"><span className="badge badge-ghost font-bold">{r.grade}</span></td>
                                    <td className="px-4 py-3 text-gray-600">{(r.probability*100).toFixed(1)}%</td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold text-white shadow-sm ${
                                        r.decision === 'Approved' ? 'bg-green-500' : 
                                        r.decision === 'Denied' ? 'bg-red-500' : 'bg-amber-500'
                                      }`}>
                                        {r.decision}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">{tableLoading ? "Searching..." : "No records found."}</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
                {activeTab === 'manager' && (
                  <div className="space-y-8">
                    {/* NEW: AI INSIGHT REPORT */}
                    <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl border-none">
                        <h3 className="font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Brain className="w-4 h-4"/> Strategic Executive Insight
                        </h3>
                        <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                           <FormatReportContent text={analytics.insight_report} />
                        </div>
                    </Card>

                    {/* MLOps Autonomous Cycle Card */}
                    <Card className="border-l-4 border-indigo-500 bg-gradient-to-r from-white to-indigo-50/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-600"/> 
                            Autonomous AI Health
                          </h3>
                          <p className="text-sm text-gray-500">Real-time MLOps Drift Monitoring</p>
                        </div>
                        <button 
                          onClick={handleSimulateDrift}
                          className="px-4 py-2 bg-rose-100 text-rose-700 font-bold rounded-lg hover:bg-rose-200 transition-colors flex items-center gap-2"
                        >
                          <AlertCircle size={18} />
                          Simulate Market Crash
                        </button>
                      </div>
                      
                      <div className="mt-6 grid grid-cols-3 gap-8">
                        {/* Metric 1: Accuracy */}
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Accuracy</p>
                          <div className={`text-3xl font-black transition-colors duration-500 ${analytics.system_status === "Drift Detected" ? "text-red-500 animate-pulse" : "text-emerald-600"}`}>
                            {(Number(analytics.model_accuracy || 0) * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs font-medium text-gray-400 mt-1">
                            {analytics.active_model ? `Active: ${analytics.active_model}` : "Standard Model"}
                          </div>
                        </div>

                        {/* Metric 2: Status */}
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">System Status</p>
                          <div className="flex justify-center mt-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 ${analytics.system_status === "Drift Detected" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                              {analytics.system_status === "Drift Detected" ? (
                                <><Loader2 className="w-4 h-4 animate-spin"/> Drift Detected</>
                              ) : (
                                <><CheckCircle className="w-4 h-4"/> Healthy</>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Metric 3: Action */}
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Next Action</p>
                          <p className="text-sm font-medium text-gray-700 mt-2">
                            {analytics.system_status === "Drift Detected" ? "Auto-Retraining Pending..." : "Monitoring active"}
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* NEW: GLOBAL SHAP CARD */}
                    <Card>
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600"/> Global Risk Drivers (SHAP Analysis)
                        </h3>
                        <div className="flex justify-center items-center min-h-[300px] bg-white rounded-xl">
                            {globalShapImage ? (
                                <img src={globalShapImage} alt="Global SHAP Summary" className="max-w-full h-auto rounded-lg shadow-sm border border-gray-100"/>
                            ) : (
                                <div className="text-center text-gray-400 py-10">
                                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-300"/>
                                      <p className="text-sm">Generating global AI explanation...</p>
                                      <p className="text-xs text-gray-300 mt-1">This may take a few seconds</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatCard title="Total Apps" value={analytics.total_apps} icon={Users} themeColor="blue" />
                      <StatCard title="Auto-Approval" value={analytics.approval_rate+"%"} icon={CheckCircle} themeColor="green" />
                      <StatCard title="Avg Risk" value={analytics.avg_risk+"%"} icon={ShieldAlert} themeColor="red" />
                      <StatCard title="Pending" value={analytics.pending} icon={Clock} themeColor="amber" />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Trend Graph */}
                      <Card>
                        <h3 className="font-bold mb-4">Loan Status Volume</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="99%" height="100%">
                            <BarChart data={analytics.trend||[]} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB"/>
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#6B7280',fontSize:12}} dy={10}/>
                              <YAxis axisLine={false} tickLine={false} tick={{fill:'#6B7280',fontSize:12}}/>
                              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} itemStyle={{color: '#4F46E5', fontWeight: 600}}/>
                              <Bar dataKey="val" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                      
                      {/* Distribution Graph with Labels */}
                      <Card>
                        <h3 className="font-bold mb-4">Loan Status Distribution</h3>
                        <div className="h-64 flex items-center">
                          <ResponsiveContainer width="99%" height="100%">
                            <PieChart>
                              <Pie 
                                data={processedDistData} 
                                innerRadius={60} 
                                outerRadius={80} 
                                dataKey="value"
                                paddingAngle={5}
                              >
                                {processedDistData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend content={<CustomLegend />} layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}