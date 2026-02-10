interface InvitationEmailProps {
  invitation: {
    email: string;
    organizationName: string;
    inviterName: string;
    inviteLink: string;
    rejectLink?: string;
  };
}

export const InvitationEmail = ({ invitation }: InvitationEmailProps) => {
  return (
    <html>
      <body style={{ fontFamily: "Arial, sans-serif", color: "#333" }}>
        <h2>You&apos;re invited to join {invitation.organizationName}!</h2>
        <p>
          Hi {invitation.email},<br />
          {invitation.inviterName} has invited you to join{" "}
          <strong>{invitation.organizationName}</strong>.
        </p>

        <p>Click below to accept or reject this invitation:</p>

        <div style={{ marginTop: "12px" }}>
          <a
            href={invitation.inviteLink}
            style={{
              display: "inline-block",
              padding: "10px 16px",
              backgroundColor: "#2563eb",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "6px",
              marginRight: "12px",
            }}
          >
            Accept Invitation
          </a>

          {invitation.rejectLink && (
            <a
              href={invitation.rejectLink}
              style={{
                display: "inline-block",
                padding: "10px 16px",
                backgroundColor: "#dc2626",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "6px",
              }}
            >
              Reject Invitation
            </a>
          )}
        </div>

        <p style={{ marginTop: "20px", fontSize: "14px", color: "#555" }}>
          If you did not expect this invitation, you can safely ignore this
          email.
        </p>

        <hr style={{ margin: "24px 0" }} />
        {/* <p style={{ fontSize: "12px", color: "#999" }}>
          Referral Dashboard ·{" "}
          <a href="https://referraldashboard.com">referraldashboard.com</a>
        </p> */}
      </body>
    </html>
  );
};

export default InvitationEmail;
