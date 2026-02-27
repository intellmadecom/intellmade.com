// This file exists so that App.tsx can import from './contexts/AuthContext'.
// The REAL AuthContext logic lives in components/AuthContext.tsx (Supabase-powered).
// This file simply re-exports everything from there.

export { useAuth, AuthProvider } from '../components/AuthContext';
export { default } from '../components/AuthContext';