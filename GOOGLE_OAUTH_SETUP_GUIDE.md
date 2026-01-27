# Google OAuth Setup Guide for Maysar Auth Service

## 🎯 Purpose
This guide provides step-by-step instructions to configure Google OAuth 2.0 for the Maysar Auth Service, enabling secure social login functionality.

## 📍 Our Exact Configuration

### Service Details
- **Service Name**: Maysar Auth Service
- **Service Port**: 3001
- **Callback Route**: `/auth/google/callback`
- **Full Callback URL**: `http://localhost:3001/auth/google/callback`

### Required Scopes
- `https://www.googleapis.com/auth/userinfo.email` - Access to user's email
- `https://www.googleapis.com/auth/userinfo.profile` - Access to user's profile

## 🔑 Step-by-Step Setup Instructions

### ✅ Step 1: Configure OAuth Consent Screen

**Navigate to**: Google Cloud Console → APIs & Services → OAuth consent screen

1. **User Type**: Select **External**
2. **App Information**:
   - App name: **Maysar**
   - User support email: [your-email@example.com]
   - Developer contact email: [your-email@example.com]
3. **Scopes**: Add the following scopes:
   - ✅ `https://www.googleapis.com/auth/userinfo.email`
   - ✅ `https://www.googleapis.com/auth/userinfo.profile`
4. Click **Save and Continue** → **Continue** → **Back to Dashboard**

> **⚠️ Note**: For development, you do NOT need app verification.

### 🔐 Step 2: Create OAuth Client ID

**Navigate to**: Google Cloud Console → APIs & Services → Credentials

1. Click **Create Credentials** → **OAuth client ID**
2. **Application type**: Web application
3. **Name**: Maysar Auth
4. **Authorized redirect URIs**: Add exactly:
   ```
   http://localhost:3001/auth/google/callback
   ```
5. Click **Create**

### 📋 Step 3: Configure Environment Variables

Copy the generated credentials and add them to your `auth-service/.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
GOOGLE_SCOPES=https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile
```

## 🏗️ Architecture Integration

### Service Integration Points

1. **Auth Service** (`auth-service/`)
   - Uses Google OAuth for social login
   - Integrates with User Service for user management
   - Provides JWT tokens for authenticated users

2. **API Gateway** (`api-gateway/`)
   - Delegates authentication to Auth Service
   - Validates JWT tokens from Auth Service
   - Routes Google OAuth requests to Auth Service

### Key Files Involved

- `auth-service/src/config/google-oauth.config.ts` - Configuration management
- `auth-service/src/services/google-oauth.service.ts` - OAuth service implementation
- `auth-service/src/api/routes/google-oauth.routes.ts` - Route definitions
- `auth-service/src/api/controllers/google-oauth.controller.ts` - Controller logic

## 🧪 Testing the Setup

### Manual Testing

1. **Start Auth Service**:
   ```bash
   cd auth-service
   npm run dev
   ```

2. **Test OAuth Flow**:
   - Navigate to: `http://localhost:3001/auth/google`
   - Should redirect to Google's OAuth consent screen
   - After authorization, should redirect back to callback URL
   - Should receive JWT token and user information

3. **Verify Integration**:
   - Test with API Gateway delegation
   - Verify JWT token validation
   - Check user creation/update in User Service

### Automated Testing

Run the Google OAuth tests:
```bash
cd auth-service
npm test -- --testPathPattern=google-oauth
```

## 🔒 Security Considerations

### Development vs Production

**Development**:
- Use `localhost:3001` callback URL
- No app verification required
- Use test credentials

**Production**:
- Use actual domain callback URL
- App verification required by Google
- Use production credentials
- Enable additional security features

### Best Practices

1. **Environment Variables**: Never commit credentials to version control
2. **HTTPS**: Use HTTPS in production for callback URLs
3. **Scope Minimization**: Only request necessary scopes
4. **Token Security**: Implement proper JWT token handling
5. **Error Handling**: Graceful handling of OAuth failures

## 🚨 Common Issues & Solutions

### Issue: "Redirect URI mismatch"
**Solution**: Ensure callback URL exactly matches Google Console configuration

### Issue: "Invalid client"
**Solution**: Verify CLIENT_ID and CLIENT_SECRET are correctly copied

### Issue: "Access denied"
**Solution**: Check that OAuth consent screen is configured and published

### Issue: "Scope not authorized"
**Solution**: Verify required scopes are added in Google Console

## 📊 Monitoring & Maintenance

### Key Metrics to Monitor

1. **OAuth Success Rate**: Track successful vs failed authentications
2. **Token Expiration**: Monitor JWT token lifecycle
3. **User Creation**: Track new user registrations via OAuth
4. **Error Rates**: Monitor OAuth-related errors

### Maintenance Tasks

1. **Credential Rotation**: Regularly update client secrets
2. **Scope Review**: Periodically review required scopes
3. **Callback URL Updates**: Update when service URLs change
4. **Google API Updates**: Stay updated with Google OAuth changes

## 🔗 Related Documentation

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Maysar Auth Service Architecture](AUTH_SERVICE_ARCHITECTURE.md)
- [API Gateway Authentication Delegation](API_GATEWAY_DOCUMENTATION.md)
- [Testing Constitution](testing-constitution.md)

## 📞 Support

For issues with Google OAuth setup:
1. Check Google Cloud Console logs
2. Verify environment variable configuration
3. Test OAuth flow manually
4. Review error logs in Auth Service
5. Consult Google OAuth troubleshooting guide

---

**Last Updated**: January 2026  
**Service**: Maysar Auth Service  
**Version**: 1.0.0