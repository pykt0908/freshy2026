import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getCurrentUser, logoutUser as doLogout, subscribeUser } from '../services/authService';
import type { AppUser } from '../types';

interface AuthContextType {
  appUser: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  isJudge: boolean;
  setUser: (user: AppUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  appUser: null,
  loading: false,
  isAdmin: false,
  isJudge: false,
  setUser: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [appUser, setAppUser] = useState<AppUser | null>(() => getCurrentUser());

  useEffect(() => {
    if (!appUser?.id) return;
    const unsub = subscribeUser(appUser.id, (user) => {
      if (!user) {
        doLogout();
        setAppUser(null);
      } else {
        setAppUser(user);
      }
    });
    return () => unsub();
  }, [appUser?.id]);

  const setUser = (user: AppUser | null) => {
    setAppUser(user);
  };

  const logout = () => {
    doLogout();
    setAppUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        appUser,
        loading: false,
        isAdmin: appUser?.role === 'admin',
        isJudge: appUser?.role === 'judge',
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
