import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FilterProvider } from './context/FilterContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import PublicDashboard from './pages/PublicDashboard';
import HeatmapView from './pages/HeatmapView';
import AnalysisView from './pages/AnalysisView';
import AlertCenter from './pages/AlertCenter';
import PolicyBriefs from './pages/PolicyBriefs';
import DataIngestion from './pages/DataIngestion';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FilterProvider>
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
            </Route>
          </Routes>
        </FilterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
