import { ExternalLink, Shield, Database, Users, Zap, Landmark } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="p-10 max-w-6xl mx-auto space-y-16 bg-[#F5E9D8] min-h-screen italic">
      {/* 🏛️ Header — Light Mode */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-[#E76F2E]/10 border border-[#E76F2E]/20 rounded-2xl mb-4 shadow-sm">
           <Landmark size={20} className="text-[#E76F2E]" />
           <span className="text-[10px] font-black text-[#E76F2E] uppercase tracking-[0.3em] font-mono">Official MCD Protocol</span>
        </div>
        <h1 className="text-6xl font-black uppercase tracking-tighter text-[#3E2C23] leading-none">
          Platform <span className="text-[#E76F2E]">Methodology</span>
        </h1>
        <p className="text-[#6B5E57] text-lg font-black uppercase tracking-widest opacity-80">
          The Science Behind JanaNaadi Intelligence Core
        </p>
      </div>

      <div className="bg-white rounded-[48px] p-12 border border-[#3E2C23]/5 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none text-[#3E2C23]">
           <Users size={200} />
        </div>
        <div className="flex items-center gap-6 mb-8 relative z-10">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-sm">
             <Users size={28} className="text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#3E2C23]">Our <span className="text-emerald-500">Mission</span></h2>
        </div>
        <p className="text-xl font-black text-[#6B5E57] leading-relaxed relative z-10 antialiased">
          JanaNaadi aggregates and analyzes public sentiment from diverse sources across Delhi MCD Wards,
          providing government agencies, researchers, and policymakers with real-time insights
          into citizen concerns, emerging issues, and regional sentiment patterns. Our AI-powered
          platform processes voices in multiple languages to deliver actionable intelligence.
        </p>
      </div>

      {/* Ontology Module — Core PS Feature — Light variant */}
      <div className="bg-[#FAF5ED] rounded-[48px] p-12 border border-[#3E2C23]/5 shadow-sm relative overflow-hidden transition-all hover:bg-white hover:shadow-xl">
        <div className="absolute top-0 right-0 p-16 opacity-[0.4] pointer-events-none text-[#E76F2E]/5 blur-[2px]">
           <Zap size={240} />
        </div>
        <div className="flex items-center gap-6 mb-10 relative z-10">
           <div className="w-14 h-14 bg-[#E76F2E]/10 rounded-2xl flex items-center justify-center border border-[#E76F2E]/20 shadow-sm">
              <Zap size={28} className="text-[#E76F2E]" />
           </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#3E2C23]">Global <span className="text-[#E76F2E]">Ontology</span> Engine</h2>
        </div>
        <div className="space-y-10 relative z-10">
          <p className="text-xl font-black text-[#6B5E57] leading-relaxed italic">
            The core of JanaNaadi is a sophisticated <span className="text-[#E76F2E]">Intelligence Graph</span> that goes beyond mere sentiment counting.
            It connects unstructured content (voices) to structured domains:
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[32px] border border-[#3E2C23]/5 shadow-sm hover:border-[#E76F2E]/30 transition-all">
              <h4 className="text-xs font-black text-[#6B5E57] mb-4 uppercase tracking-widest italic">Entity Extraction</h4>
              <p className="text-sm font-black text-[#3E2C23] uppercase tracking-tight leading-relaxed antialiased">
                Algorithms automatically identify people, organizations, locations, and policies mentioned in speech.
              </p>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-[#3E2C23]/5 shadow-sm hover:border-[#E76F2E]/30 transition-all">
              <h4 className="text-xs font-black text-[#6B5E57] mb-4 uppercase tracking-widest italic">Cross-Domain Mapping</h4>
              <p className="text-sm font-black text-[#3E2C23] uppercase tracking-tight leading-relaxed antialiased">
                Understanding how a shift in <span className="text-emerald-500">Economic</span> sentiment impacts <span className="text-amber-500">Society</span> or <span className="text-red-500">Infrastructure</span> posture.
              </p>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-[#3E2C23]/5 shadow-sm hover:border-[#E76F2E]/30 transition-all">
              <h4 className="text-xs font-black text-[#6B5E57] mb-4 uppercase tracking-widest italic">Predictive Risk</h4>
              <p className="text-sm font-black text-[#3E2C23] uppercase tracking-tight leading-relaxed antialiased">
                A linear intelligence forecast that predicts future urgency based on connectivity strength between entities.
              </p>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-[#3E2C23]/5 shadow-sm hover:border-[#E76F2E]/30 transition-all">
              <h4 className="text-xs font-black text-[#6B5E57] mb-4 uppercase tracking-widest italic">Structural Reasoning</h4>
              <p className="text-sm font-black text-[#3E2C23] uppercase tracking-tight leading-relaxed antialiased">
                Moving from "What are people saying?" to "Why is this happening and what is the strategic risk?"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources — Light Mode */}
      <div className="bg-white rounded-[48px] p-12 border border-[#3E2C23]/5 shadow-sm">
        <div className="flex items-center gap-6 mb-10">
          <div className="w-14 h-14 bg-[#2FA4D7]/10 rounded-2xl flex items-center justify-center border border-[#2FA4D7]/20 shadow-sm">
             <Database size={28} className="text-[#2FA4D7]" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#3E2C23]">Data <span className="text-[#2FA4D7]">Sources</span> & Attribution</h2>
        </div>
        <p className="text-xl font-black text-[#6B5E57] mb-10 leading-relaxed italic">
          JanaNaadi aggregates publicly available data from the following sources. We respect all
          copyright and terms of service, and provide full attribution to original publishers:
        </p>

        <div className="space-y-12">
          <div className="bg-[#FAF5ED] p-10 rounded-[40px] border border-[#3E2C23]/5 italic">
            <h3 className="text-xs font-black text-[#6B5E57] mb-6 uppercase tracking-widest shadow-none">📰 News RSS Feeds</h3>
            <p className="text-sm font-black text-[#3E2C23] uppercase tracking-tight mb-8">
              We collect publicly available RSS feeds from major Indian news publications including:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[10px] font-black text-[#6B5E57] uppercase tracking-[0.2em]">
              <span>• NDTV</span>
              <span>• The Hindu</span>
              <span>• Hindustan Times</span>
              <span>• Times of India</span>
              <span>• Indian Express</span>
              <span>• The Wire</span>
              <span>• Print & Scroll</span>
              <span>• Regional Hubs</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[32px] border border-[#3E2C23]/5 shadow-sm hover:border-[#2FA4D7]/20 transition-all">
              <h3 className="text-[10px] font-black text-[#6B5E57] mb-4 uppercase tracking-widest italic">🔍 Google News RSS</h3>
              <p className="text-sm font-black text-[#3E2C23] uppercase tracking-tight leading-relaxed">
                State-specific and topic-based news aggregation via Google News RSS (public API).
              </p>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-[#3E2C23]/5 shadow-sm hover:border-[#2FA4D7]/20 transition-all">
              <h3 className="text-[10px] font-black text-[#6B5E57] mb-4 uppercase tracking-widest italic">🟠 Communities</h3>
              <p className="text-sm font-black text-[#3E2C23] uppercase tracking-tight leading-relaxed">
                Public posts from regional r/Delhi and MCD-related forum signals for local audit.
              </p>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-[#3E2C23]/5 shadow-sm hover:border-[#2FA4D7]/20 transition-all">
              <h3 className="text-[10px] font-black text-[#6B5E57] mb-4 uppercase tracking-widest italic">👥 Citizen Intake</h3>
              <p className="text-sm font-black text-[#3E2C23] uppercase tracking-tight leading-relaxed">
                Direct voice submissions from citizens, surveys, and official CSV record syncs.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 p-8 bg-[#2FA4D7]/5 border border-[#2FA4D7]/10 rounded-[32px] shadow-sm italic">
          <p className="text-[10px] font-black text-[#2FA4D7] uppercase tracking-[0.2em] leading-loose">
            <strong>Attribution:</strong> All news articles retain their original source URLs and are linked
            back to the publisher. We do not claim ownership of any aggregated content. JanaNaadi provides
            sentiment analysis and aggregation services only.
          </p>
        </div>
      </div>

      {/* Technology — Light Mode */}
      <div className="bg-[#FAF5ED] rounded-[48px] p-12 border border-[#3E2C23]/5 shadow-sm relative overflow-hidden group">
        <div className="flex items-center gap-6 mb-10">
           <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 shadow-sm">
              <Zap size={28} className="text-purple-500" />
           </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#3E2C23]">Technology <span className="text-purple-500">Stack</span></h2>
        </div>
        <div className="grid md:grid-cols-2 gap-10">
          <div className="bg-white p-10 rounded-[40px] border border-[#3E2C23]/5 shadow-sm">
            <h4 className="text-[10px] font-black text-[#6B5E57] mb-6 uppercase tracking-widest italic font-mono">NLP & AI Intelligence</h4>
            <ul className="text-sm font-black text-[#3E2C23] uppercase tracking-tight space-y-4">
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Google Gemini 1.5 Sync</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Multi-language Sentiment Core</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Topic Entity Extraction</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Zonal Geolocation Detection</li>
            </ul>
          </div>
          <div className="bg-white p-10 rounded-[40px] border border-[#3E2C23]/5 shadow-sm">
            <h4 className="text-[10px] font-black text-[#6B5E57] mb-6 uppercase tracking-widest italic font-mono">Core Infrastructure</h4>
            <ul className="text-sm font-black text-[#3E2C23] uppercase tracking-tight space-y-4">
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#E76F2E]" /> FastAPI Intelligence Hub</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#E76F2E]" /> React TypeScript Engine</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#E76F2E]" /> Supabase Vector DB Sync</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#E76F2E]" /> Real-time Node Updates</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Privacy — Light Mode */}
      <div className="bg-white rounded-[48px] p-12 border border-[#3E2C23]/5 shadow-sm relative overflow-hidden group">
        <div className="flex items-center gap-6 mb-10">
          <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-sm">
             <Shield size={28} className="text-red-500" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#3E2C23]">Privacy & <span className="text-red-500">Integrity</span></h2>
        </div>
        <div className="space-y-10 text-[#6B5E57] font-black italic">
          <div className="border-l-4 border-[#F5E9D8] pl-10 py-2">
            <h4 className="text-xs font-black text-[#6B5E57] mb-3 uppercase tracking-widest italic">Data Collection Protocols</h4>
            <p className="text-lg leading-relaxed uppercase tracking-tight text-[#3E2C23]">We only collect publicly available record signals from RSS feeds, public forums, and voluntary submissions. No personal identifiers are stored.</p>
          </div>
          <div className="border-l-4 border-[#F5E9D8] pl-10 py-2">
            <h4 className="text-xs font-black text-[#6B5E57] mb-3 uppercase tracking-widest italic">Anonymization Sync</h4>
            <p className="text-lg leading-relaxed uppercase tracking-tight text-[#3E2C23]">All submissions are vectorized and anonymized in real-time. We do not store IP addresses or personal breadcrumbs.</p>
          </div>
        </div>
      </div>

      {/* Contact — Light Mode */}
      <div className="bg-[#FAF5ED] rounded-[48px] p-16 border border-[#3E2C23]/5 text-center shadow-sm italic">
        <h2 className="text-3xl font-black mb-6 uppercase tracking-tighter text-[#3E2C23]">Direct <span className="text-[#E76F2E]">Sync</span> Inquiry</h2>
        <p className="text-[10px] font-black text-[#6B5E57] mb-10 uppercase tracking-[0.4em] max-w-lg mx-auto leading-loose">
          For attribution requests, data removal, or intelligence core participation, please contact our command staff:
        </p>
        <a
          href="mailto:admin@jananaadi.gov.in"
          className="inline-flex items-center gap-4 px-12 py-5 bg-gradient-saffron hover:scale-105 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest shadow-xl transition-all mcd-glow-saffron"
        >
          <ExternalLink size={20} />
          COMMAND@JANANAADI.GOV.IN
        </a>
      </div>

      {/* Footer — Light Mode */}
      <div className="text-center text-[10px] font-black text-[#6B5E57] pb-12 uppercase tracking-[0.6em] italic opacity-50 space-y-4">
        <p>OFFICIAL MCD INTELLIGENCE CORE v1.0.0 — RESTRICTED ACCESS SYNC</p>
        <p>POWERED BY JANANAADI AI — BUILT FOR DELHI MUNICIPAL GOVERNANCE</p>
      </div>
    </div>
  );
}
