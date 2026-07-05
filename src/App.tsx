import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import CompetitionManager from './pages/admin/CompetitionManager';
import ContestantManager from './pages/admin/ContestantManager';
import JudgeManager from './pages/admin/JudgeManager';
import RoundManager from './pages/admin/RoundManager';
import RealtimeScoreboard from './pages/admin/RealtimeScoreboard';
import JudgeLayout from './pages/judge/JudgeLayout';
import SelectCompetition from './pages/judge/SelectCompetition';
import ContestantList from './pages/judge/ContestantList';
import ScoringForm from './pages/judge/ScoringForm';
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RealtimeScoreboard />} />
            <Route path="competitions" element={<CompetitionManager />} />
            <Route path="contestants" element={<ContestantManager />} />
            <Route path="judges" element={<JudgeManager />} />
            <Route path="rounds" element={<RoundManager />} />
            <Route path="scoreboard" element={<RealtimeScoreboard />} />
          </Route>

          {/* Judge Routes */}
          <Route
            path="/judge"
            element={
              <ProtectedRoute requiredRole="judge">
                <JudgeLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SelectCompetition />} />
            <Route path="competition/:competitionId" element={<ContestantList />} />
            <Route path="competition/:competitionId/round/:roundIndex/score/:contestantId" element={<ScoringForm />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#f3f4f6',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px 20px',
          },
          success: {
            iconTheme: { primary: '#28a745', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
