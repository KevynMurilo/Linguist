import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import Onboarding from './Onboarding';

const Index = () => {
  const navigate = useNavigate();
  const { user, aiConfig } = useAppStore();

  useEffect(() => {
    // If user is logged in and has AI configured, redirect to dashboard
    if (user && aiConfig) {
      navigate('/dashboard');
    }
  }, [user, aiConfig, navigate]);

  return <Onboarding />;
};

export default Index;
