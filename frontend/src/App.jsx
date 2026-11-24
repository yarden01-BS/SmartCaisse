import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CaissePage } from './features/caissiere';
import { AdminPage } from './features/admin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/caisse" replace />} />
        <Route path="/caisse" element={<CaissePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/caisse" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
