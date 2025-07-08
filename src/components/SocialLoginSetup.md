# Setting Up Social Login in Supabase

To enable social login for your Choose Your Hard application, you need to configure the OAuth providers in your Supabase dashboard.

## Step 1: Access Authentication Settings

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** in the left sidebar
4. Click on **Providers**

## Step 2: Configure OAuth Providers

### For GitHub:

1. Toggle GitHub to **Enabled**
2. You'll need to create a GitHub OAuth app:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Fill in the details:
     - **Application name**: Choose Your Hard
     - **Homepage URL**: Your site URL (e.g., https://chooseyourhard.co.uk)
     - **Authorization callback URL**: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
       (You can find this URL in the Supabase dashboard)
3. Copy the **Client ID** and **Client Secret** from GitHub
4. Paste them into the corresponding fields in Supabase
5. Save changes

### For Google:

1. Toggle Google to **Enabled**
2. You'll need to create a Google OAuth app:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Set up the consent screen if prompted
   - For application type, select "Web application"
   - Add authorized redirect URIs: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client Secret** from Google
4. Paste them into the corresponding fields in Supabase
5. Save changes

### For Apple:

1. Toggle Apple to **Enabled**
2. You'll need an Apple Developer account and to set up Sign in with Apple:
   - Go to [Apple Developer Portal](https://developer.apple.com/)
   - Navigate to "Certificates, Identifiers & Profiles"
   - Register a new identifier with "Sign in with Apple" capability
   - Configure the service with your domain and redirect URL: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
3. Copy the required credentials from Apple
4. Paste them into the corresponding fields in Supabase
5. Save changes

## Step 3: Configure Redirect URLs

In each provider's settings in Supabase:

1. Add your site URL to the **Redirect URLs** field:
   - For development: `http://localhost:8080/dashboard`
   - For production: `https://chooseyourhard.co.uk/dashboard`

## Step 4: Update Site URL

In your Supabase project settings:

1. Go to **Authentication** > **URL Configuration**
2. Set the **Site URL** to your production URL (e.g., `https://chooseyourhard.co.uk`)
3. Add additional redirect URLs if needed

## Troubleshooting

If you're experiencing issues with social login:

1. Check browser console for specific error messages
2. Verify that your OAuth credentials are correct
3. Ensure redirect URLs are properly configured
4. Check that your Supabase project's Site URL is set correctly
5. Verify that the OAuth provider's app is properly configured and approved

For more detailed instructions, refer to the [Supabase Authentication documentation](https://supabase.com/docs/guides/auth).