import React, { createContext, useContext, useState } from 'react';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'GATE_OPERATOR' | 'SUPERVISOR';
  militaryNumber?: string;
}

interface AuthContextType {
  user: User;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isGateOperator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Official user: المقدم / أسامة الجمل
const OFFICIAL_USER: User = {
  id: 'osama-elgamal',
  username: 'osama_elgamal',
  fullName: 'المقدم / أسامة الجمل',
  role: 'ADMIN',
  militaryNumber: 'M-10001',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useState<User>(OFFICIAL_USER);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: 'tmc-session',
        isLoading: false,
        isAdmin: true,
        isSupervisor: true,
        isGateOperator: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
