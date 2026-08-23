const { authenticateUser } = require("./auth.service");

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      ok: false,
      message: "Username and password are required."
    });
  }

  try {
    const result = await authenticateUser(username, password);

    if (!result.ok) {
      return res.status(401).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Unable to validate your account right now.",
      error: error.message
    });
  }
}

module.exports = {
  login
};
