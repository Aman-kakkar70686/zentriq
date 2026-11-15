import { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pf_token'));
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('pf_user') || 'null'));

  const save = ({ access_token, user }) => {
    localStorage.setItem('pf_token', access_token);
    localStorage.setItem('pf_user', JSON.stringify(user));
    setToken(access_token);
    setUser(user);
  };

  const login = async (email, password) => save((await api.post('/auth/login', { email, password })).data);
  const register = async (name, email, password) => save((await api.post('/auth/register', { name, email, password })).data);
  const logout = () => {
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ token, user, login, register, logout }}>{children}</AuthContext.Provider>;
}
