import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { FastCheckin } from './pages/FastCheckin';
import { Guests } from './pages/Guests';
import { Students } from './pages/Students';
import { StudentDetails } from './pages/StudentDetails';
import { BusManagement } from './pages/BusManagement';
import { BusDetails } from './pages/BusDetails';
import { AddGuest } from './pages/AddGuest';
import { ImportExcel } from './pages/ImportExcel';
import { Reports } from './pages/Reports';

const MainApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('fast-checkin');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedBusNumber, setSelectedBusNumber] = useState<number | null>(null);

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
      default:
        return <FastCheckin onNavigateToAddGuest={() => handleSelectTab('add-guest')} />;
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
