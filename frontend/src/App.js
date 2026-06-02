import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import MainHomePage from './pages/MainHomePage';
import StaffDirectoryPage from './pages/StaffDirectoryPage';
import NewsListPage from './pages/NewsListPage';
import EducationalProcessPage from './pages/EducationalProcessPage';
import NewsDetailPage from './pages/NewsDetailPage';
import ScientificWorkPage from './pages/ScientificWorkPage';
import ScientificLaboratoryPage from './pages/ScientificLaboratoryPage';
import LabProjectDetailsPage from './pages/LabProjectDetailsPage';
import StaffProfilePublicPage from './pages/StaffProfilePublicPage';
import SpecialtyDetailPage from './pages/SpecialtyDetailPage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StaffDashboardPage from './pages/StaffDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import { ScrollToTop } from './components/ScrollToTop';
import './App.css';

const AuthLayout = ({ children }) => <div className="app-container">{children}</div>;
const MainLayout = ({ children }) => (
  <div className="app-container">
    <AppHeader />
    <ScrollToTop />
    <main className="page-content">{children}</main>
    <AppFooter />
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth */}
            <Route path="/login"         element={<AuthLayout><LoginPage /></AuthLayout>} />
            <Route path="/register"      element={<AuthLayout><RegistrationPage /></AuthLayout>} />

            {/* Personal cabinets — no shared header/footer */}
            <Route path="/student"       element={<AuthLayout><StudentDashboardPage /></AuthLayout>} />
            <Route path="/staff-cabinet" element={<AuthLayout><StaffDashboardPage /></AuthLayout>} />
            <Route path="/admin"         element={<AuthLayout><AdminDashboardPage /></AuthLayout>} />

            {/* Public site */}
            <Route path="/"              element={<MainLayout><MainHomePage /></MainLayout>} />
            <Route path="/staff"         element={<MainLayout><StaffDirectoryPage /></MainLayout>} />
            <Route path="/staff/:id"     element={<MainLayout><StaffProfilePublicPage /></MainLayout>} />
            <Route path="/news"          element={<MainLayout><NewsListPage /></MainLayout>} />
            <Route path="/news/:id"      element={<MainLayout><NewsDetailPage /></MainLayout>} />
            <Route path="/education"     element={<MainLayout><EducationalProcessPage /></MainLayout>} />
            <Route path="/education/:id" element={<MainLayout><SpecialtyDetailPage /></MainLayout>} />
            <Route path="/research"      element={<MainLayout><ScientificWorkPage /></MainLayout>} />
            <Route path="/labs/:id"      element={<MainLayout><ScientificLaboratoryPage /></MainLayout>} />
            <Route path="/lab-projects/:id" element={<MainLayout><LabProjectDetailsPage /></MainLayout>} />
            <Route path="/projects/:id"     element={<MainLayout><LabProjectDetailsPage /></MainLayout>} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;