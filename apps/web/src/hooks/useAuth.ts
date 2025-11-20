import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setUser, setTokens, clearAuth } = useAuthStore();

  // Get current user
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getCurrentUser,
    enabled: isAuthenticated && !user,
    retry: false,
    onSuccess: (data) => {
      setUser(data);
    },
    onError: () => {
      clearAuth();
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      toast.success('Logged in successfully');
      router.push('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login failed');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      toast.success('Logged out successfully');
      router.push('/login');
    },
  });

  // MFA setup mutation
  const mfaSetupMutation = useMutation({
    mutationFn: authApi.setupMFA,
    onSuccess: () => {
      toast.success('MFA setup initiated');
    },
  });

  // MFA verify mutation
  const mfaVerifyMutation = useMutation({
    mutationFn: (token: string) => authApi.verifyMFA(token),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      toast.success('MFA verified successfully');
      router.push('/dashboard');
    },
    onError: () => {
      toast.error('Invalid MFA token');
    },
  });

  return {
    user: user || currentUser,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    setupMFA: mfaSetupMutation.mutate,
    verifyMFA: mfaVerifyMutation.mutate,
    isLoggingIn: loginMutation.isPending,
  };
}
