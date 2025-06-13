
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const ApiTest = () => {
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [healthData, setHealthData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [isTestingEndpoints, setIsTestingEndpoints] = useState(false);
  const { toast } = useToast();

  const testHealthCheck = async () => {
    try {
      setApiStatus('loading');
      const response = await apiService.healthCheck();
      setHealthData(response);
      setApiStatus('success');
      toast({
        title: "API Connectée",
        description: "Le backend est accessible et fonctionne correctement.",
      });
    } catch (error) {
      console.error('Health check failed:', error);
      setApiStatus('error');
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter au backend. Vérifiez que le serveur est démarré.",
        variant: "destructive",
      });
    }
  };

  const testEndpoints = async () => {
    setIsTestingEndpoints(true);
    
    try {
      // Test categories endpoint
      console.log('Testing categories endpoint...');
      const categoriesResponse = await apiService.getCategories();
      setCategories(categoriesResponse.categories || []);
      
      // Test listings endpoint
      console.log('Testing listings endpoint...');
      const listingsResponse = await apiService.getListings({ limit: 5 });
      setListings(listingsResponse.listings || []);
      
      toast({
        title: "Tests réussis",
        description: "Tous les endpoints testés fonctionnent correctement.",
      });
    } catch (error) {
      console.error('Endpoints test failed:', error);
      toast({
        title: "Erreur des endpoints",
        description: "Certains endpoints ne fonctionnent pas correctement.",
        variant: "destructive",
      });
    } finally {
      setIsTestingEndpoints(false);
    }
  };

  useEffect(() => {
    testHealthCheck();
  }, []);

  const getStatusIcon = () => {
    switch (apiStatus) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (apiStatus) {
      case 'loading':
        return <Badge variant="secondary">Test en cours...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">Connecté</Badge>;
      case 'error':
        return <Badge variant="destructive">Déconnecté</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Statut de l'API Backend
          </CardTitle>
          <CardDescription>
            Vérification de la connexion avec le serveur backend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Statut de connexion:</span>
            {getStatusBadge()}
          </div>
          
          {healthData && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Informations du serveur:</h4>
              <ul className="space-y-1 text-sm">
                <li><strong>Status:</strong> {healthData.status}</li>
                <li><strong>Environment:</strong> {healthData.environment}</li>
                <li><strong>Version:</strong> {healthData.version}</li>
                <li><strong>Timestamp:</strong> {new Date(healthData.timestamp).toLocaleString()}</li>
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={testHealthCheck} disabled={apiStatus === 'loading'}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retester la connexion
            </Button>
            
            <Button 
              onClick={testEndpoints} 
              disabled={apiStatus !== 'success' || isTestingEndpoints}
              variant="outline"
            >
              {isTestingEndpoints && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tester les endpoints
            </Button>
          </div>
        </CardContent>
      </Card>

      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Catégories (API Test)</CardTitle>
            <CardDescription>
              Liste des catégories récupérées depuis l'API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categories.map((category) => (
                <Badge key={category.id} variant="outline">
                  {category.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {listings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Annonces (API Test)</CardTitle>
            <CardDescription>
              Premières annonces récupérées depuis l'API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {listings.map((listing) => (
                <div key={listing.id} className="border rounded-lg p-3">
                  <h4 className="font-semibold">{listing.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {listing.description}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <Badge variant="secondary">{listing.category}</Badge>
                    <span className="font-bold text-green-600">
                      {listing.price} {listing.currency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ApiTest;
