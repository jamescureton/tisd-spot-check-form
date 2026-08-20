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

    // Log all fields so we can confirm exact field names for this district.
    // Check Vercel -> your project -> Logs after signing in once.
    console.log("ClassLink user fields:", JSON.stringify(user));

    const observer = encodeURIComponent(`${user.FirstName || ""} ${user.LastName || ""}`.trim());
    const localId = encodeURIComponent(String(user.SourcedId || ""));

    const rawEmail =
      user.Email ||
      user.DistrictEmail ||
      user.LoginId ||
      user.Username ||
      "";
    const email = encodeURIComponent(rawEmail);

    // ---- CAMPUS ----
    // /v2/my/info returns "Building" (the campus NAME) and "BuildingId" (a small
    // internal ClassLink number, NOT the 9-digit CDC). The form matches on the
    // name against the Campus column in the campus_teachers tab.
    const campusName = String(user.Building || "").trim();

    // If this district's payload happens to carry real org/CDC values, forward
    // them too — the form accepts either and prefers CDCs when present.
    // Normalizes an array of objects, an array of strings, or a plain string
    // into a simple comma-separated list.
    const rawOrgs =
      user.orgSourcedIds ||
      user.OrgSourcedIds ||
      user.orgs ||
      user.Orgs ||
      user.OrgId ||
      "";

    let orgs = "";
    if (Array.isArray(rawOrgs)) {
      orgs = rawOrgs
        .map(o => (typeof o === "string" || typeof o === "number" ? String(o) : (o?.sourcedId || o?.SourcedId || o?.id || "")))
        .filter(Boolean)
        .join(",");
    } else if (rawOrgs) {
      orgs = String(rawOrgs).trim();
    }

    console.log("ClassLink campus resolution:", { campusName, buildingId: user.BuildingId, orgs });

    // Redirect to /sso-landing — that page writes to sessionStorage then
    // redirects cleanly to "/" so nothing sensitive stays in the URL.
    const params = new URLSearchParams();
    params.set("observer", decodeURIComponent(observer));
    params.set("localId", decodeURIComponent(localId));
    params.set("email", decodeURIComponent(email));
    if (campusName) params.set("campus", campusName);
    if (orgs) params.set("orgs", orgs);

    res.redirect(`/sso-landing?${params.toString()}`);
  } catch (err) {
    console.error("ClassLink callback error:", err);
    res.redirect("/?error=auth_failed");
  }
}