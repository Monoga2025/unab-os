const TOKEN_URL = "https://tema.unab.edu.co/login/token.php";
const REST_URL = "https://tema.unab.edu.co/webservice/rest/server.php";

async function testTema() {
  const username = "dmonoga";
  const password = process.env.TEST_PASSWORD;

  console.log(`Connecting to TEMA for user ${username}...`);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ username, password, service: "moodle_mobile_app" }),
  });

  console.log(`HTTP Status: ${response.status}`);
  const data = await response.json();
  console.log("Token Response:", data);

  if (data.token) {
    const site = await fetch(REST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ wstoken: data.token, wsfunction: "core_webservice_get_site_info", moodlewsrestformat: "json" }),
    });
    console.log("Site Info:", await site.json());
  }
}

testTema().catch(console.error);
