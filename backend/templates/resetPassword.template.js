export const resetPasswordTemplate = (name, resetLink) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <title>Reset Your Password</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 40px;">

        <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 8px;">

            <h2>Hello ${name},</h2>

            <p>
                We received a request to reset the password for your account.
            </p>

            <p>
                Click the button below to create a new password.
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a
                    href="${resetLink}"
                    style="
                        background-color: #2563eb;
                        color: white;
                        padding: 14px 24px;
                        text-decoration: none;
                        border-radius: 6px;
                        font-size: 16px;
                    "
                >
                    Reset Password
                </a>
            </div>

            <p>
                This link will expire in <strong>15 minutes</strong>.
            </p>

            <p>
                If you did not request a password reset, you can safely ignore this email.
            </p>

            <hr>

            <p style="font-size: 12px; color: gray;">
                This is an automated email. Please do not reply.
            </p>

        </div>

    </body>
    </html>
    `;
};