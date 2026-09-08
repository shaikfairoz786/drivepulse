import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  quickLoginAs: (role: 'ADMIN' | 'MANAGER' | 'SALES' | 'FIELD') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSales: boolean;
  isField: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('autolms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('autolms_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('autolms_token');
      if (storedToken) {
        try {
          const res: any = await api.get('/auth/me');
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('autolms_user', JSON.stringify(res.data));
          }
        } catch (error) {
          localStorage.removeItem('autolms_token');
          localStorage.removeItem('autolms_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    const res: any = await api.post('/auth/login', { identifier, password });
    if (res.success && res.data) {
      const { token: jwtToken, user: userData } = res.data;
      setToken(jwtToken);
      setUser(userData);
      localStorage.setItem('autolms_token', jwtToken);
      localStorage.setItem('autolms_user', JSON.stringify(userData));
    } else {
      throw new Error(res.message || 'Login failed');
    }
  };

  const quickLoginAs = async (roleType: 'ADMIN' | 'MANAGER' | 'SALES' | 'FIELD') => {
    const emailMap = {
      ADMIN: 'admin@autolms.com',
      MANAGER: 'manager@autolms.com',
      SALES: 'sales1@autolms.com',
      FIELD: 'field1@autolms.com',
    };
    await login(emailMap[roleType], 'password123');
  };

  const logout = () => {
    localStorage.removeItem('autolms_token');
    localStorage.removeItem('autolms_user');
    setToken(null);
    setUser(null);
  };

  const role = user?.role;
  const isAdmin = role === Role.ADMIN;
  const isManager = role === Role.MANAGER || isAdmin;
  const isSales = role === Role.SALES_EXECUTIVE;
  const isField = role === Role.FIELD_AGENT;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        quickLoginAs,
        logout,
        isAuthenticated: !!token && !!user,
        isAdmin,
        isManager,
        isSales,
        isField,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
