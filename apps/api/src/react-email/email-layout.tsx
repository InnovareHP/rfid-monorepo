import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

const appName = process.env.APP_NAME ?? "Dashboard";

type EmailLayoutProps = {
  preview: string;
  children: React.ReactNode;
};

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>

      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>{appName}</Text>

          {children}

          <Text style={footer}>
            &copy; {new Date().getFullYear()} {appName}. All rights reserved.
          </Text>
          <Text style={footer}>
            <Link
              href={`${process.env.WEBSITE_URL}/report`}
              style={reportLink}
            >
              Report suspicious activity
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default EmailLayout;

// === Shared Styles ===

export const emailStyles = {
  heading: {
    fontSize: "24px",
    fontWeight: "700",
    marginBottom: "16px",
    textAlign: "center",
    color: "#18181b",
  } as React.CSSProperties,

  paragraph: {
    fontSize: "16px",
    lineHeight: "24px",
    margin: "8px 0",
    color: "#414b57",
  } as React.CSSProperties,

  button: {
    backgroundColor: "#18181b",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: 600,
    textDecoration: "none",
  } as React.CSSProperties,
};

// === Internal Styles ===

const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif",
  padding: "0",
  margin: "0",
  fontWeight: 500,
};

const container: React.CSSProperties = {
  maxWidth: "520px",
  margin: "0 auto",
  padding: "32px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
};

const brand: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: "900",
  marginBottom: "24px",
  textAlign: "center",
  color: "#18181b",
  letterSpacing: "0.5px",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center",
  marginTop: "24px",
  marginBottom: "0",
};

const reportLink: React.CSSProperties = {
  color: "#9ca3af",
  textDecoration: "underline",
};
