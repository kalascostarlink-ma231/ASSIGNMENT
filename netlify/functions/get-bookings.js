'use strict';

// Netlify serverless function: returns booking submissions to logged-in admins only.
// Requires two environment variables set in Netlify Site settings -> Environment variables:
//   NETLIFY_API_TOKEN  - a Personal Access Token (User settings -> Applications -> New access token)
//   NETLIFY_SITE_ID    - this site's Site ID (Site settings -> General -> Site details)
const https = require('https');

// Performs a GET request against the Netlify API and parses the JSON response.
function httpsGetJson(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Netlify API responded ${res.statusCode}: ${body}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

exports.handler = async (event, context) => {
  // Only requests carrying a valid Netlify Identity session reach this point authenticated.
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Please log in to view bookings.' }) };
  }

  const { NETLIFY_API_TOKEN, NETLIFY_SITE_ID } = process.env;
  if (!NETLIFY_API_TOKEN || !NETLIFY_SITE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server is missing NETLIFY_API_TOKEN or NETLIFY_SITE_ID.' }),
    };
  }

  try {
    const forms = await httpsGetJson(
      `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/forms`,
      NETLIFY_API_TOKEN
    );
    const bookingForm = forms.find((f) => f.name === 'booking');
    if (!bookingForm) {
      return { statusCode: 200, body: JSON.stringify({ bookings: [] }) };
    }

    const submissions = await httpsGetJson(
      `https://api.netlify.com/api/v1/forms/${bookingForm.id}/submissions`,
      NETLIFY_API_TOKEN
    );

    const bookings = submissions.map((s) => ({
      id: s.id,
      submittedAt: s.created_at,
      reference: s.data.reference,
      fullName: s.data.fullName,
      phone: s.data.phone,
      email: s.data.email,
      date: s.data.bookingDate,
      startTime: s.data.timeSlot,
      // Semicolon-separated "9:00 AM-10:30 AM Service Name ($price)" entries — a customer can
      // book more than one service back-to-back, so this may list several.
      services: s.data.services,
      notes: s.data.notes,
    }));

    return { statusCode: 200, body: JSON.stringify({ bookings }) };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
