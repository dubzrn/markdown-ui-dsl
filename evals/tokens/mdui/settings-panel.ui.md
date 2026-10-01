---
dsl: 2.0
lang: en
title: User Settings
---

# User Settings

|[ Profile ]| Security | Notifications |

::: CARD :::
## Profile
Update your personal information and avatar.

[ text: e.g., Alex Johnson ]{: label="Display name" required maxlength=60 }
[ text: https://example.com/avatar.png ]{: label="Avatar URL" type=url }

=== ROW ===
[ Save changes ](#save-profile){: primary }
[ Reset ](#reset-profile)
--- END ---
--- END ---

::: CARD :::
## Security
Manage sign-in protection and account security.

[off] Two-factor authentication (2FA)
Require a verification code when signing in.

::: CALLOUT info :::
**Tip** After enabling 2FA, you may be asked to set up an authenticator app or backup codes.
--- END ---
--- END ---

::: CARD :::
## Notifications
Choose what you want to be notified about.

[on] Email notifications
Receive updates and account messages by email.
[off] Product updates
Get notified about new features and improvements.
[on] Security alerts
Important alerts about sign-ins and security changes.
--- END ---
