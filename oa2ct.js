const express = require('express');
// const crypto = require('crypto');
const axios = require('axios');

const app = express();

// store tokens in memory for simplicity
let authCodes = {};
let tokens = {};

app.get('/auth', (req, res) => {
  // generate a random state and store it for later
  const state = crypto.randomBytes(16).toString('hex');
  authCodes[state] = null;

  // redirect to the Azure AD OAuth server
  res.redirect(
    `https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize?client_id={client_id}&response_type=code&redirect_uri=http://localhost:3000/callback&response_mode=query&scope=openid%20offline_access&state=${state}`
  );
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // check the state matches what we stored earlier
  if (!(state in authCodes)) {
    return res.status(400).send('Invalid state parameter');
  }

  try {
    // exchange the authorization code for an access token
    const response = await axios.post(`https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token`, {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'http://localhost:3000/callback',
      client_id: '{client_id}',
      client_secret: '{client_secret}',
    });

    tokens[state] = response.data.access_token;

    res.send('Authenticated successfully');
  } catch (error) {
    res.status(500).send('Error during token request: ' + error.message);
  }
});

app.get('/resource', (req, res) => {
  const token = req.headers.authorization.replace('Bearer ', '');

  // check the token is valid
  if (!Object.values(tokens).includes(token)) {
    return res.status(401).send('Invalid token');
  }

  // normally here you'd call out to the resource server
  res.send('Protected resource');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
