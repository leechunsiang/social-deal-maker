import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import DataDeletionRequest from './pages/DataDeletionRequest';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* <Route path="/signup" element={<SignUpPage />} /> */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/data-deletion" element={<DataDeletionRequest />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
