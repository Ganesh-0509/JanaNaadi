import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MapPin, CheckCircle, AlertCircle, Loader2, MessageSquare, Globe } from 'lucide-react';
import { useFilters } from '../context/FilterContext';

const CATEGORIES = [
  "Sanitation & Waste Management",
  "Roads & Infrastructure",
  "Public Health & Mohalla Clinics",
  "Education (MCD Schools)",
  "Water & Electricity",
  "Others"
];

const MCD_ZONES = [
  "South Delhi", "Central Delhi", "Karol Bagh", "Rohini", "City-SP", 
  "Civil Lines", "Shahdara North", "Shahdara South", "Najafgarh", "West Delhi"
];

export default function SubmitGrievance() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    text: '',
    zone: 'South Delhi',
    category: 'Sanitation & Waste Management',
    anonymous: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call to ingest grievance
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setStep(3);
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-[80vh] flex flex-col justify-center">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface-base border border-white/10 rounded-[40px] p-10 shadow-xl relative overflow-hidden italic"
          >
            {/* Decoration */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-saffron" />
            
            <div className="flex items-center gap-6 mb-10">
              <div className="w-14 h-14 bg-[#E76F2E]/10 rounded-2xl flex items-center justify-center border border-[#E76F2E]/20 shadow-sm">
                <MessageSquare className="text-[#E76F2E]" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter text-content-primary">Submit <span className="text-[#E76F2E]">Grievance</span></h1>
                <p className="text-[10px] font-black text-content-secondary uppercase tracking-widest mt-1 italic">MUNICIPAL CORPORATION OF DELHI — OFFICIAL RECORD</p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-content-secondary uppercase tracking-widest mb-4 ml-1">Message (Minimum 20 characters)</label>
                <textarea
                  required
                  placeholder="DESCRIBE THE ISSUE IN YOUR WARD FOR AUDIT SYNC…"
                  className="w-full bg-surface-base border-2 border-white/10 rounded-[32px] p-6 text-content-primary focus:outline-none focus:border-[#E76F2E]/30 min-h-[180px] transition-all font-medium italic text-lg shadow-inner placeholder-slate-200"
                  value={form.text}
                  onChange={(e) => setForm({...form, text: e.target.value})}
                />
              </div>
              
              <div className="flex gap-4">
                 <button
                   type="submit"
                   disabled={form.text.length < 20}
                   className="flex-1 bg-gradient-saffron hover:scale-[1.02] disabled:opacity-30 text-white font-black py-5 rounded-2xl transition-all shadow-xl mcd-glow-saffron flex items-center justify-center gap-3 uppercase tracking-tighter text-lg"
                 >
                   Continue <Send size={20} />
                 </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-surface-base border border-white/10 rounded-[40px] p-10 shadow-xl italic"
          >
             <h2 className="text-2xl font-black mb-10 flex items-center gap-4 text-content-primary uppercase tracking-tighter">
               <MapPin className="text-[#E76F2E]" size={28} /> Regional Case <span className="text-[#E76F2E]">Context</span>
             </h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
               <div>
                 <label className="text-[10px] font-black text-content-secondary uppercase tracking-widest mb-3 block ml-1">MCD Reporting Zone</label>
                 <select 
                    className="w-full bg-surface-base border-2 border-white/10 rounded-xl px-5 py-4 text-xs font-black uppercase text-content-primary focus:border-[#E76F2E]/30 outline-none transition-all shadow-sm"
                    value={form.zone}
                    onChange={(e) => setForm({...form, zone: e.target.value})}
                >
                   {MCD_ZONES.map(z => <option key={z}>{z}</option>)}
                 </select>
               </div>
               <div>
                 <label className="text-[10px] font-black text-content-secondary uppercase tracking-widest mb-3 block ml-1">Audit Category</label>
                 <select 
                    className="w-full bg-surface-base border-2 border-white/10 rounded-xl px-5 py-4 text-xs font-black uppercase text-content-primary focus:border-[#E76F2E]/30 outline-none transition-all shadow-sm"
                    value={form.category}
                    onChange={(e) => setForm({...form, category: e.target.value})}
                >
                   {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                 </select>
               </div>
             </div>

             <div className="flex items-center gap-4 p-6 bg-[#3B82F6]/5 rounded-[24px] mb-10 border border-[#3B82F6]/10 shadow-sm">
               <Globe className="text-[#3B82F6]" size={24} />
               <p className="text-[10px] font-black text-content-secondary uppercase tracking-widest leading-relaxed">
                 Signal ingestion active. Message will be automatically translated and vectorized for the <span className="text-[#3B82F6]">Global Ontology Engine</span>.
               </p>
             </div>

             <div className="flex gap-4">
               <button onClick={() => setStep(1)} className="px-8 py-5 bg-surface-base text-content-secondary hover:text-content-primary border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">Back</button>
               <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-gradient-saffron hover:scale-[1.02] text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl mcd-glow-saffron uppercase tracking-tighter text-lg"
               >
                 {loading ? <Loader2 className="animate-spin" /> : <><Send size={20}/> Submit for Sync</>}
               </button>
             </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center bg-surface-base border border-white/10 rounded-[40px] p-16 shadow-xl italic"
          >
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-emerald-500/20 shadow-sm">
              <CheckCircle size={48} className="text-emerald-500" />
            </div>
            <h1 className="text-4xl font-black mb-4 text-content-primary uppercase tracking-tighter italic">INGESTION <span className="text-emerald-500">COMPLETE</span></h1>
            <p className="text-content-secondary mb-12 max-w-sm mx-auto text-[10px] font-black uppercase tracking-widest leading-loose">
              Your grievance has been vectorized. It is now part of the <span className="text-emerald-500">MCD Intelligence Graph</span> for Zonal decision-support systems.
            </p>
            <button
               onClick={() => { setStep(1); setSuccess(false); setForm({...form, text: ''}); }}
               className="px-12 py-5 bg-surface-base hover:scale-105 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest shadow-xl transition-all font-mono"
            >
              Back to Command Center
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
