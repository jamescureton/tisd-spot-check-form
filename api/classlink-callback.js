export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) return res.redirect("/?error=no_code");

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://launchpad.classlink.com/oauth2/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.CLASSLINK_CLIENT_ID,
        client_secret: process.env.CLASSLINK_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: "https://www.tylerisdspotobservation.com/auth/callback"
      })
    });
    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;

    // Get user info from ClassLink
    const userRes = await fetch("https://nodeapi.classlink.com/v2/my/info", {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const user = await userRes.json();

    // Log all fields so we can confirm the exact Email field name for this district
    console.log("ClassLink user fields:", JSON.stringify(user));

    const observer = encodeURIComponent(`${user.FirstName} ${user.LastName}`);

    // Try the most common ClassLink field names for Local ID
    const localId = encodeURIComponent(String(user.SourcedId || ""));

    // Try the most common ClassLink field names for email — falls back through
    // alternates in case this district's SIS populates a different field.
    // Check the Vercel function logs (the console.log above) to see which
    // field actually has the value, then adjust this list if needed.
    const rawEmail =
      user.Email ||
      user.DistrictEmail ||
      user.LoginId ||
      user.Username ||
      "";
    const email = encodeURIComponent(rawEmail);

    // Redirect to /sso-landing — this page writes to sessionStorage then
    // redirects cleanly to "/" so no sensitive data appears in the URL
    res.redirect(`/sso-landing?observer=${observer}&localId=${localId}&email=${email}`);

  } catch (err) {
    console.error("ClassLink callback error:", err);
    res.redirect("/?error=auth_failed");
  }
}