import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FastCheckin } from './pages/FastCheckin';
import { Guests } from './pages/Guests';
import { Students } from './pages/Students';
import { StudentDetails } from './pages/StudentDetails';
import { BusManagement } from './pages/BusManagement';
import { BusDetails } from './pages/BusDetails';
import { AddGuest } from './pages/AddGuest';
import { ImportExcel } from './pages/ImportExcel';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('fast-checkin'); // Gate check-in default or dashboard
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedBusNumber, setSelectedBusNumber] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tmc-navy-900 flex flex-col items-center justify-center text-white">
        <div className="p-2 bg-white rounded-full shadow-lg border-2 border-tmc-gold mb-4 animate-pulse">
          <img src="/logo.jpg" alt="TMC Logo" className="w-16 h-16 rounded-full object-contain" />
        </div>
        <div className="text-sm font-bold text-tmc-gold">الكلية العسكرية التكنولوجية</div>
        <div className="text-xs text-slate-300 mt-1">جاري تحميل المنظومة...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleSelectTab = (tab: string) => {
    setSelectedStudentId(null);
    setSelectedBusNumber(null);
    setCurrentTab(tab);
  };

  const handleOpenStudent = (id: number) => {
    setSelectedStudentId(id);
    setCurrentTab('student-details');
  };

  const handleOpenBus = (num: number) => {
    setSelectedBusNumber(num);
    setCurrentTab('bus-details');
  };

  const renderContent = () => {
    if (currentTab === 'student-details' && selectedStudentId) {
      return (
        <StudentDetails
          studentId={selectedStudentId}
          onBack={() => setCurrentTab('students')}
        />
      );
    }

    if (currentTab === 'bus-details' && selectedBusNumber) {
      return (
        <BusDetails
          busNumber={selectedBusNumber}
          onBack={() => setCurrentTab('buses')}
        />
      );
    }

    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleSelectTab} />;
      case 'fast-checkin':
        return <FastCheckin onNavigateToAddGuest={() => handleSelectTab('add-guest')} />;
      case 'guests':
        return <Guests />;
      case 'students':
        return <Students onOpenStudent={handleOpenStudent} />;
      case 'buses':
        return <BusManagement onOpenBus={handleOpenBus} />;
      case 'add-guest':
        return <AddGuest onSuccessNavigate={handleSelectTab} />;
      case 'import':
        return <ImportExcel />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleSelectTab} />;
    }
  };

  return (
    <Layout currentTab={currentTab} onSelectTab={handleSelectTab}>
      {renderContent()}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
