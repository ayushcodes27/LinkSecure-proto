/**
 * Test Email Service
 * 
 * This script tests the email service to ensure Gmail SMTP is properly configured.
 * Run with: node scripts/test-email-service.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');

  // Check environment variables
  console.log('📋 Checking environment variables:');
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.log('\nPlease set the following in your .env file:');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=your-email@gmail.com');
    console.log('SMTP_PASS=your-app-password');
    process.exit(1);
  }

  console.log('✅ All required environment variables present\n');

  // Display configuration (without password)
  console.log('📧 Email Configuration:');
  console.log(`  Host: ${process.env.SMTP_HOST}`);
  console.log(`  Port: ${process.env.SMTP_PORT}`);
  console.log(`  User: ${process.env.SMTP_USER}`);
  console.log(`  Pass: ${'*'.repeat(16)}\n`);

  // Create transporter
  console.log('🔌 Creating SMTP transport...');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify connection
  console.log('🔍 Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');
  } catch (error) {
    console.error('❌ SMTP connection failed:');
    console.error(error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure 2-Step Verification is enabled in Gmail');
    console.log('2. Generate an App Password at https://myaccount.google.com/apppasswords');
    console.log('3. Use the 16-character App Password (no spaces) in SMTP_PASS');
    console.log('4. Check if your Gmail account has "Less secure app access" turned OFF');
    process.exit(1);
  }

  // Send test email
  const testEmail = process.env.SMTP_USER; // Send to self
  console.log(`📨 Sending test email to ${testEmail}...`);

  const mailOptions = {
    from: process.env.EMAIL_FROM || `LinkSecure <${process.env.SMTP_USER}>`,
    to: testEmail,
    subject: '✅ LinkSecure Email Service Test',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#1f2937">Email Service Test Successful! 🎉</h2>
        <p>This is a test email from LinkSecure to verify that your Gmail SMTP configuration is working correctly.</p>
        
        <div style="background:#f3f4f6;border-radius:8px;padding:15px;margin:20px 0">
          <h3 style="margin-top:0">Configuration Details:</h3>
          <ul style="color:#6b7280">
            <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
            <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
            <li><strong>From:</strong> ${process.env.SMTP_USER}</li>
          </ul>
        </div>

        <p>If you received this email, your email service is configured correctly and ready to send:</p>
        <ul>
          <li>✉️ Welcome emails</li>
          <li>✉️ Email verification links</li>
          <li>✉️ Two-factor authentication codes</li>
          <li>✉️ File sharing notifications</li>
          <li>✉️ Access granted notifications</li>
          <li>✉️ Password reset emails</li>
        </ul>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="font-size:12px;color:#9ca3af">
          This is an automated test email from LinkSecure.<br/>
          Timestamp: ${new Date().toISOString()}
        </p>
      </div>
    `,
    text: `
Email Service Test Successful!

This is a test email from LinkSecure to verify that your Gmail SMTP configuration is working correctly.

Configuration Details:
- SMTP Host: ${process.env.SMTP_HOST}
- SMTP Port: ${process.env.SMTP_PORT}
- From: ${process.env.SMTP_USER}

If you received this email, your email service is configured correctly.

Timestamp: ${new Date().toISOString()}
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log(`  Message ID: ${info.messageId}`);
    console.log(`  Response: ${info.response}\n`);
    
    console.log('🎉 Email service is working correctly!');
    console.log(`📬 Check your inbox at ${testEmail} for the test email.\n`);
    
    console.log('Next steps:');
    console.log('1. ✅ Email service is configured correctly');
    console.log('2. 🚀 You can now start your server and test user registration');
    console.log('3. 📧 Users will receive verification emails upon registration');
    console.log('4. 🔐 2FA codes will be sent when enabled\n');
  } catch (error) {
    console.error('❌ Failed to send test email:');
    console.error(error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your Gmail account for security alerts');
    console.log('2. Verify the App Password is correct');
    console.log('3. Ensure your network allows SMTP connections');
    console.log('4. Try generating a new App Password');
    process.exit(1);
  }
}

// Run the test
testEmailService().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
