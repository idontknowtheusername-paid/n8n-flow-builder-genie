
import { AuthProvider } from '@/hooks/useAuth';
import ApiTest from '@/components/ApiTest';
import LoginForm from '@/components/LoginForm';

const Index = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Benome Marketplace</h1>
            <p className="text-xl text-gray-600 mb-8">
              Test de connexion avec l'API Backend
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-8">
            <ApiTest />
            <LoginForm />
          </div>
        </div>
      </div>
    </AuthProvider>
  );
};

export default Index;
