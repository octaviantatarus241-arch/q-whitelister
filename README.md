# Q Whitelister

A modern Lua whitelist system with Discord bot + web dashboard.

## Features

- **Discord Bot**
  - `/setup` – Link a project to the server
  - `/whitelist @user [days]` – Whitelist a user
  - `/unwhitelist @user`
  - `/mass-whitelist role:@Role [days]`
  - `/force-resethwid @user`
  - Multi-language (auto-detects Discord locale)

- **Web Dashboard**
  - Login with Discord OAuth
  - Create projects
  - Generate single or mass keys
  - View / delete keys
  - HWID + Discord ID binding

- **Public API**
  - `POST /api/check-key` – Validate key + HWID (for your scripts)

## Setup

### 1. Create a Discord Application

1. Go to https://discord.com/developers/applications
2. Create a new application
3. In **Bot** tab → Reset Token → copy the token
4. In **OAuth2** → copy Client ID and Client Secret
5. Add redirect: `http://localhost:3000/auth/discord/callback`
6. Enable **Server Members Intent** in Bot settings

### 2. Install & Configure

```bash
cd q-whitelister
cp .env.example .env
# Edit .env with your values
npm install
```

### 3. MongoDB

Make sure MongoDB is running locally, or use MongoDB Atlas and put the connection string in `.env`.

### 4. Start

```bash
npm start
```

- Website: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard.html (after login)

### 5. Invite the Bot

Use this URL (replace CLIENT_ID):

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=268435456&scope=bot%20applications.commands
```

## How to use

1. Login on the website → create a **Project**
2. Copy the Project ID
3. In your Discord server run:
   ```
   /setup project_id:PASTE_ID manager_role:@Admin buyer_role:@Buyer
   ```
4. Use `/whitelist @user` or generate keys from the dashboard

## Script Integration Example

```lua
-- Put this at the top of your script
local key = "YOUR_KEY_HERE"
local hwid = game:GetService("RbxAnalyticsService"):GetClientId() -- example

local response = request({
    Url = "http://your-server.com/api/check-key",
    Method = "POST",
    Headers = { ["Content-Type"] = "application/json" },
    Body = game:GetService("HttpService"):JSONEncode({
        key = key,
        hwid = hwid
    })
})

local data = game:GetService("HttpService"):JSONDecode(response.Body)

if data.code ~= "KEY_VALID" then
    return print("Invalid key:", data.message)
end

print("Welcome! Key is valid.")
-- rest of your script
```

## Notes

- This is a **starting point**. You can extend it with:
  - Better obfuscation / loader
  - Webhooks / logs
  - More languages
  - Sellix / Stripe integration
  - Panel message with buttons

## License

MIT – do whatever you want with it.
