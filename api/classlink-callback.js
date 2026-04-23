export default async function handler(req, res) {
    const { code } = req.query;
  
    if (!code) {
      return res.redirect("/?error=no_code");
    }
  
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
  
      const observer = encodeURIComponent(`${user.FirstName} ${user.LastName}`);
      const campus = encodeURIComponent(user.Building || "");
  
      // Redirect to form with pre-fill params
      res.redirect(`/?observer=${observer}&campus=${campus}`);
  
    } catch (err) {
      console.error("ClassLink callback error:", err);
      res.redirect("/?error=auth_failed");
    }
  }