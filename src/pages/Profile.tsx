
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Shield, Calendar } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';

const Profile = () => {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
            <div className="flex gap-2">
              <Link to="/">
                <Button variant="outline">Retour à l'accueil</Button>
              </Link>
              <Button onClick={logout} variant="destructive">
                Se déconnecter
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Informations personnelles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations personnelles
                </CardTitle>
                <CardDescription>
                  Vos informations de base
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Prénom</label>
                  <p className="text-lg">{user.firstName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nom</label>
                  <p className="text-lg">{user.lastName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{user.email}</span>
                </div>
                {user.phone_number && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{user.phone_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rôles et permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Rôles et statut
                </CardTitle>
                <CardDescription>
                  Vos autorisations sur la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Rôles</label>
                  <div className="flex flex-wrap gap-2">
                    {user.roles && user.roles.length > 0 ? (
                      user.roles.map((role: string) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">Utilisateur</Badge>
                    )}
                  </div>
                </div>
                
                {user.kyc_status && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Statut KYC</label>
                    <div className="mt-1">
                      <Badge 
                        variant={
                          user.kyc_status === 'VERIFIED' ? 'default' : 
                          user.kyc_status === 'PENDING' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {user.kyc_status}
                      </Badge>
                    </div>
                  </div>
                )}

                {user.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Membre depuis le {formatDate(user.created_at)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Préférences */}
            {(user.preferred_language || user.currency) && (
              <Card>
                <CardHeader>
                  <CardTitle>Préférences</CardTitle>
                  <CardDescription>
                    Vos paramètres personnalisés
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user.preferred_language && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Langue préférée</label>
                      <p className="text-lg">{user.preferred_language === 'fr' ? 'Français' : 'English'}</p>
                    </div>
                  )}
                  {user.currency && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Devise</label>
                      <p className="text-lg">{user.currency}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Adresse */}
            {user.address && (
              <Card>
                <CardHeader>
                  <CardTitle>Adresse</CardTitle>
                  <CardDescription>
                    Votre adresse enregistrée
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap">
                    {typeof user.address === 'string' ? user.address : JSON.stringify(user.address, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions supplémentaires */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Gérer votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline">
                  Modifier le profil
                </Button>
                <Button variant="outline">
                  Changer le mot de passe
                </Button>
                {(!user.kyc_status || user.kyc_status === 'NOT_VERIFIED') && (
                  <Button variant="outline">
                    Vérifier l'identité (KYC)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
