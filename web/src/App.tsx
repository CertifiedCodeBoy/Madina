import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import IssueReport from './pages/IssueReport';
import Assistant from './pages/Assistant';
import Energy from './pages/Energy';
import Mobility from './pages/Mobility';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/report" element={<IssueReport />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/energy" element={<Energy />} />
          <Route path="/mobility" element={<Mobility />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
