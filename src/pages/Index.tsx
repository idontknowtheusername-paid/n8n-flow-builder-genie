
import { AuthProvider } from '@/hooks/useAuth';
import { useAuth } from '@/hooks/useAuth';
import ApiTest from '@/components/ApiTest';
import LoginForm from '@/components/LoginForm';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { Link } from 'react-router-dom';

const IndexContent = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Benome Marketplace</h1>
          <p className="text-xl text-gray-600 mb-8">
            Test de connexion avec l'API Backend
          </p>
          
          {isAuthenticated && user && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 inline-block">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-green-600" />
                <span className="text-green-700">
                  Connecté en tant que <strong>{user.firstName} {user.lastName}</strong>
                </span>
                <Link to="/profile">
                  <Button size="sm" variant="outline">
                    Voir le profil
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
        
        <div className="max-w-4xl mx-auto space-y-8">
          <ApiTest />
          {!isAuthenticated && <LoginForm />}
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <IndexContent />
    </AuthProvider>
  );
};

export default Index;
