/**
 * NETLIFY SERVER FUNCTION: auth-status
 *
 * Secure endpoint to verify Firebase Authentication backend configuration
 * status without leaking secrets to the client.
 */

exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const hasApiKey = Boolean(process.env.FIREBASE_WEB_API_KEY);
  const hasServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY));
  const hasGasUrl = Boolean(process.env.GOOGLE_APPS_SCRIPT_URL);
  const isConfigured = hasApiKey || hasServiceAccount;

  const missing = [];
  if (!hasApiKey && !hasServiceAccount) {
    missing.push('FIREBASE_WEB_API_KEY (or FIREBASE_SERVICE_ACCOUNT)');
  }
  if (!hasGasUrl) {
    missing.push('GOOGLE_APPS_SCRIPT_URL');
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      configured: isConfigured,
      provider: 'Firebase Authentication',
      authMethod: 'Staff ID + Password Mapping',
      staffDomain: process.env.FIREBASE_STAFF_DOMAIN || 'mms.internal',
      hasApiKey,
      hasServiceAccount,
      hasGasUrl,
      missing,
      message: isConfigured
        ? 'Firebase Authentication backend is properly configured.'
        : 'Firebase Authentication setup is required. Configure environment variables in Netlify.'
    })
  };
};
