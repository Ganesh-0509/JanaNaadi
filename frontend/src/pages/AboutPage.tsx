import { ExternalLink, Shield, Database, Users, Zap } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Platform Methodology
        </h1>
        <p className="text-slate-400 text-lg">
          The Science Behind JanaNaadi Intelligence
        </p>
      </div>

      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-blue-400" />
          <h2 className="text-xl font-bold">Our Mission</h2>
        </div>
        <p className="text-slate-300 leading-relaxed">
          JanaNaadi aggregates and analyzes public sentiment from diverse sources across India,
          providing government agencies, researchers, and policymakers with real-time insights
          into citizen concerns, emerging issues, and regional sentiment patterns. Our AI-powered
          platform processes voices in multiple Indian languages to deliver actionable intelligence.
        </p>
      </div>

      {/* Ontology Module — Core PS Feature */}
      <div className="bg-gradient-to-br from-indigo-900/30 to-slate-800 rounded-2xl p-6 border border-indigo-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={20} className="text-indigo-400" />
          <h2 className="text-xl font-bold">Global Ontology Engine</h2>
        </div>
        <div className="space-y-4">
          <p className="text-slate-300 leading-relaxed">
            The core of JanaNaadi is a sophisticated <span className="text-indigo-300 font-semibold">Intelligence Graph</span> that goes beyond mere sentiment counting.
            It connects unstructured content (voices) to structured domains:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
              <h4 className="text-sm font-bold text-indigo-300 mb-2 uppercase">Entity Extraction</h4>
              <p className="text-xs text-slate-400">
                Algorithms automatically identify people, organizations, locations, and policies mentioned in speech.
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
              <h4 className="text-sm font-bold text-indigo-300 mb-2 uppercase">Cross-Domain Mapping</h4>
              <p className="text-xs text-slate-400">
                Understanding how a shift in <span className="text-emerald-400">Economic</span> sentiment impacts <span className="text-amber-400">Society</span> or <span className="text-red-400">Defense</span> posture.
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
              <h4 className="text-sm font-bold text-indigo-300 mb-2 uppercase">Predictive Risk</h4>
              <p className="text-xs text-slate-400">
                A linear intelligence forecast that predicts future urgency based on connectivity strength between entities.
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
              <h4 className="text-sm font-bold text-indigo-300 mb-2 uppercase">Structural Reasoning</h4>
              <p className="text-xs text-slate-400">
                Moving from "What are people saying?" to "Why is this happening and what is the strategic risk?"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Database size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold">Data Sources & Attribution</h2>
        </div>
        <p className="text-slate-300 mb-4 leading-relaxed">
          JanaNaadi aggregates publicly available data from the following sources. We respect all
          copyright and terms of service, and provide full attribution to original publishers:
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-200 mb-2">📰 News RSS Feeds</h3>
            <p className="text-sm text-slate-400 mb-2">
              We collect publicly available RSS feeds from major Indian news publications including:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-slate-500">
              <span>• NDTV</span>
              <span>• The Hindu</span>
              <span>• Hindustan Times</span>
              <span>• Times of India</span>
              <span>• Indian Express</span>
              <span>• The Wire</span>
              <span>• Scroll.in</span>
              <span>• The Print</span>
              <span>• India Today</span>
              <span>• News18</span>
              <span>• FirstPost</span>
              <span>• Deccan Herald</span>
              <span>• Manorama</span>
              <span>• Mathrubhumi</span>
              <span>• Hans India</span>
              <span>• + 75 more regional outlets</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-200 mb-2">🔍 Google News RSS</h3>
            <p className="text-sm text-slate-400">
              State-specific and topic-based news aggregation via Google News RSS (public API, no authentication required)
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-200 mb-2">🟠 Reddit</h3>
            <p className="text-sm text-slate-400">
              Public posts from India-related subreddits (r/india, r/IndiaSpeaks, regional subreddits)
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-200 mb-2">👥 Citizen Submissions</h3>
            <p className="text-sm text-slate-400">
              Direct voice submissions from citizens, surveys, and CSV uploads (admin only)
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Attribution:</strong> All news articles retain their original source URLs and are linked
            back to the publisher. We do not claim ownership of any aggregated content. JanaNaadi provides
            sentiment analysis and aggregation services only.
          </p>
        </div>
      </div>

      {/* Technology */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={20} className="text-yellow-400" />
          <h2 className="text-xl font-bold">Technology Stack</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-slate-200 mb-2">NLP & AI</h4>
            <ul className="text-slate-400 space-y-1">
              <li>• Bytez LLM (Google Gemini 2.5 Flash)</li>
              <li>• Multi-language sentiment analysis</li>
              <li>• Topic classification & keyword extraction</li>
              <li>• Geolocation detection</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-200 mb-2">Infrastructure</h4>
            <ul className="text-slate-400 space-y-1">
              <li>• FastAPI backend</li>
              <li>• React + TypeScript frontend</li>
              <li>• Supabase PostgreSQL database</li>
              <li>• Real-time WebSocket updates</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Privacy & Security */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-purple-400" />
          <h2 className="text-xl font-bold">Privacy & Security</h2>
        </div>
        <div className="space-y-3 text-slate-300">
          <p className="leading-relaxed">
            <strong>Data Collection:</strong> We only collect publicly available information from
            RSS feeds, public forums, and voluntary citizen submissions. No personal data is scraped
            or stored without explicit consent.
          </p>
          <p className="leading-relaxed">
            <strong>Anonymization:</strong> All citizen submissions are anonymized. We do not store
            IP addresses, personal identifiers, or any information that can trace back to individual users.
          </p>
          <p className="leading-relaxed">
            <strong>Security:</strong> All data is encrypted in transit (HTTPS) and at rest. Admin
            access is protected by JWT authentication and role-based access control.
          </p>
          <p className="leading-relaxed">
            <strong>Compliance:</strong> We respect robots.txt directives and rate-limit all automated
            requests to avoid overloading source servers.
          </p>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 text-center">
        <h2 className="text-xl font-bold mb-3">Contact & Feedback</h2>
        <p className="text-slate-400 mb-4">
          For attribution requests, data removal, or technical inquiries, please contact:
        </p>
        <a
          href="mailto:admin@jananaadi.gov.in"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium transition-colors"
        >
          <ExternalLink size={16} />
          admin@jananaadi.gov.in
        </a>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-slate-600 pb-6">
        <p>JanaNaadi Platform v1.0.0 • Government of India — Citizen Intelligence Platform</p>
        <p className="mt-1">Powered by JanaNaadi AI • Built with ❤️ for India</p>
      </div>
    </div>
  );
}
