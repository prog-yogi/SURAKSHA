const { SignJWT } = require('jose');
const crypto = require('crypto');

async function testSubmit() {
  try {
    const secret = new TextEncoder().encode("super_secret_jwt_key_suraksha_123456789");
    const token = await new SignJWT({
      sub: "test-user-123",
      role: "TOURIST",
      email: "test@example.com",
      name: "Test User"
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(secret);

    console.log("Generated token:", token.substring(0, 20) + "...");

    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const body = `--${boundary}\r
Content-Disposition: form-data; name="complainantName"\r
\r
Test Complainant\r
--${boundary}\r
Content-Disposition: form-data; name="incidentType"\r
\r
THEFT\r
--${boundary}\r
Content-Disposition: form-data; name="incidentDate"\r
\r
2026-04-04\r
--${boundary}\r
Content-Disposition: form-data; name="incidentTime"\r
\r
12:00\r
--${boundary}\r
Content-Disposition: form-data; name="location"\r
\r
Test Location\r
--${boundary}\r
Content-Disposition: form-data; name="description"\r
\r
This is a test description with more than 20 characters.\r
--${boundary}\r
Content-Disposition: form-data; name="evidence"; filename="test.jpg"\r
Content-Type: image/jpeg\r
\r
${Buffer.from('dummy image content').toString('binary')}\r
--${boundary}--`;

    const res = await fetch("http://127.0.0.1:3000/api/user/fir", {
      method: "POST",
      headers: {
        "Cookie": `session_token=${token}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      },
      body: Buffer.from(body, 'binary')
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    const fs = require('fs');
    if (fs.existsSync('api_error.log')) {
      console.log("api_error.log exists. Contents:");
      console.log(fs.readFileSync('api_error.log', 'utf8'));
    } else {
      console.log("api_error.log does not exist.");
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testSubmit();
