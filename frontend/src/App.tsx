import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { FilterProvider } from './context/FilterContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';

// Heavy pages - lazy loaded
const HeatmapView = lazy(() => import('./pages/HeatmapView'));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'));
const AnalysisView = lazy(() => import('./pages/AnalysisView'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const GovDashboard = lazy(() => import('./pages/GovDashboard'));
const OntologyPage = lazy(() => import('./pages/OntologyPage'));
const CrossDomainPage = lazy(() => import('./pages/CrossDomainPage'));

// Medium weight pages - lazy loaded
const PolicyBriefs = lazy(() => import('./pages/PolicyBriefs'));
const DataIngestion = lazy(() => import('./pages/DataIngestion'));

// Light pages - directly imported
import PublicDashboard from './pages/PublicDashboard';
import AlertCenter from './pages/AlertCenter';
import HotspotsPage from './pages/HotspotsPage';
import StreamPage from './pages/StreamPage';
import AboutPage from './pages/AboutPage';
import SubmitGrievance from './pages/SubmitGrievance';

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-slate-900">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-slate-400">Loading...</p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FilterProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route element={<Layout />}>
                <Route path="/pulse" element={<PublicDashboard />} />
                <Route
                  path="/map"
                  element={<PrivateRoute><HeatmapView /></PrivateRoute>}
                />
                <Route
                  path="/analysis/:type/:id"
                  element={<PrivateRoute><AnalysisView /></PrivateRoute>}
                />
                <Route
                  path="/compare"
                  element={<PrivateRoute><ComparisonPage /></PrivateRoute>}
                />
                <Route
                  path="/alerts"
                  element={<PrivateRoute requireAdmin><AlertCenter /></PrivateRoute>}
                />
                <Route
                  path="/briefs"
                  element={<PrivateRoute requireAdmin><PolicyBriefs /></PrivateRoute>}
                />
                <Route
                  path="/admin/ingest"
                  element={<PrivateRoute requireAdmin><DataIngestion /></PrivateRoute>}
                />
                <Route path="/hotspots" element={<HotspotsPage />} />
                <Route
                  path="/gov"
                  element={<PrivateRoute><GovDashboard /></PrivateRoute>}
                />
                <Route
                  path="/stream"
                  element={<PrivateRoute><StreamPage /></PrivateRoute>}
                />
                <Route
                  path="/search"
                  element={<PrivateRoute><SearchPage /></PrivateRoute>}
                />
                <Route
                  path="/ontology"
                  element={<PrivateRoute><OntologyPage /></PrivateRoute>}
                />
                <Route
                  path="/cross-domain"
                  element={<PrivateRoute><CrossDomainPage /></PrivateRoute>}
                />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/submit" element={<SubmitGrievance />} />
              </Route>
            </Routes>
          </Suspense>
        </FilterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
