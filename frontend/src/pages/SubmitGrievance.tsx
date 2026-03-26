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
            className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <MessageSquare className="text-blue-400" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Submit a Grievance</h1>
                <p className="text-sm text-slate-400">Share your concerns with the MCD — Delhi Government</p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Message (Minimum 10 words)</label>
                <textarea
                  required
                  placeholder="Describe the issue in your area..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[150px] transition-all"
                  value={form.text}
                  onChange={(e) => setForm({...form, text: e.target.value})}
                />
              </div>
              
              <div className="flex gap-4">
                 <button
                   type="submit"
                   disabled={form.text.length < 20}
                   className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                 >
                   Continue <Send size={18} />
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
            className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl"
          >
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
               <MapPin className="text-emerald-400" /> Regional Context
             </h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
               <div>
                 <label className="text-xs text-slate-500 uppercase tracking-widest mb-1 block">Your Zone</label>
                 <select 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/40 outline-none"
                    value={form.zone}
                    onChange={(e) => setForm({...form, zone: e.target.value})}
                >
                   {MCD_ZONES.map(z => <option key={z}>{z}</option>)}
                 </select>
               </div>
               <div>
                 <label className="text-xs text-slate-500 uppercase tracking-widest mb-1 block">Category</label>
                 <select 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/40 outline-none"
                    value={form.category}
                    onChange={(e) => setForm({...form, category: e.target.value})}
                >
                   {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                 </select>
               </div>
             </div>

             <div className="flex items-center gap-2 p-4 bg-blue-500/10 rounded-2xl mb-8 border border-blue-500/20">
               <Globe className="text-blue-400" size={18} />
               <p className="text-xs text-blue-300">Your message will be automatically translated and analyzed by the JanaNaadi Global Ontology Engine for priority tracking.</p>
             </div>

             <div className="flex gap-4">
               <button onClick={() => setStep(1)} className="px-6 py-4 bg-slate-700 rounded-2xl text-sm font-bold">Back</button>
               <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
               >
                 {loading ? <Loader2 className="animate-spin" /> : <><Send size={18}/> Submit for Analysis</>}
               </button>
             </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center bg-slate-800 border border-slate-700 rounded-3xl p-12 shadow-2xl"
          >
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-white">Submitted!</h1>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">
              Your grievance has been ingested. It is now part of the **MCD Intelligence Graph** for Zonal decision-making.
            </p>
            <button
               onClick={() => { setStep(1); setSuccess(false); setForm({...form, text: ''}); }}
               className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 transition-all"
            >
              Back to Home
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
