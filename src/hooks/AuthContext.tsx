// src/hooks/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AuthUser,
  getCurrentUser,
  signIn,
  signOut,
  confirmSignIn,
} from "aws-amplify/auth";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  needsPasswordChange: boolean;
  completePasswordChange: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Add a small delay to ensure Amplify is configured
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser || null);
    } catch (error) {
      // User is not authenticated or Amplify failed to initialize
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // You may ask why its username but not email here, check AuthSignInInput<ServiceOptions> API documentation
      // https://aws-amplify.github.io/amplify-js/api/interfaces/aws_amplify.auth._Reference_Types_.AuthSignInInput.html
      const result = await signIn({ username: email, password });

      if (
        result.nextStep?.signInStep ===
        "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        setNeedsPasswordChange(true);
        return;
      }

      const currentUser = await getCurrentUser();
      setUser(currentUser);
      router.push("/platform");
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      setNeedsPasswordChange(false);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const completePasswordChange = async (newPassword: string) => {
    try {
      await confirmSignIn({ challengeResponse: newPassword });
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setNeedsPasswordChange(false);
      router.push("/platform");
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        needsPasswordChange,
        completePasswordChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
