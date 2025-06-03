
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendWelcomeEmail(user) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'Bienvenue sur Benome!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Bienvenue sur Benome, ${user.first_name}!</h2>
          <p>Votre compte a été créé avec succès. Vous pouvez maintenant:</p>
          <ul>
            <li>Publier des annonces immobilières</li>
            <li>Vendre vos véhicules</li>
            <li>Proposer vos services</li>
            <li>Acheter et vendre des produits</li>
          </ul>
          <p>Merci de nous faire confiance!</p>
          <p>L'équipe Benome</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe - Benome',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Réinitialisation de mot de passe</h2>
          <p>Bonjour ${user.first_name},</p>
          <p>Vous avez demandé une réinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe:</p>
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Réinitialiser le mot de passe
          </a>
          <p>Ce lien expire dans 1 heure.</p>
          <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }
  }

  async sendListingApprovalEmail(user, listing) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'Votre annonce a été approuvée - Benome',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Félicitations!</h2>
          <p>Bonjour ${user.first_name},</p>
          <p>Votre annonce "${listing.title}" a été approuvée et est maintenant visible sur Benome.</p>
          <a href="${process.env.FRONTEND_URL}/listings/${listing.id}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Voir mon annonce
          </a>
          <p>Bonne vente!</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send listing approval email:', error);
    }
  }

  async sendNewMessageEmail(recipient, sender, message) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: recipient.email,
      subject: `Nouveau message de ${sender.first_name} - Benome`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Nouveau message</h2>
          <p>Bonjour ${recipient.first_name},</p>
          <p>Vous avez reçu un nouveau message de <strong>${sender.first_name} ${sender.last_name}</strong>:</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p>"${message.content.substring(0, 200)}${message.content.length > 200 ? '...' : ''}"</p>
          </div>
          <a href="${process.env.FRONTEND_URL}/messages" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Répondre au message
          </a>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send new message email:', error);
    }
  }
}

module.exports = new EmailService();
