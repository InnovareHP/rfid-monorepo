import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

type ResetPasswordEmail = {
  magicLink: string;
  name?: string;
};

export const ResetPasswordEmail = ({
  magicLink,
  name = "there",
}: ResetPasswordEmail) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your RFID account</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brand}>RFID.</Heading>

          <Heading style={title}>Reset your password!</Heading>

          <Text style={paragraph}>Hi {name},</Text>

          <Text style={paragraph}>
            Click the button below to securely reset your password.
          </Text>

          <Section style={{ textAlign: "start", margin: "24px 0" }}>
            <Button href={magicLink} style={button}>
              Reset My Password
            </Button>
          </Section>

          <Text style={paragraph}>
            This magic link will expire in 10 minutes
          </Text>

          <Text style={paragraph}>
            Best regards, <br />
            The RFID Team
          </Text>

          <Text style={{ ...reportLink, marginTop: "24px" }}>
            Not you?{" "}
            <Link href={`${process.env.WEBSITE_URL}/report`} style={reportLink}>
              Report a suspicious login
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ResetPasswordEmail;

// === Styles ===
const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif",
  padding: "0",
  margin: "0",
  borderRadius: "8px",
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
  fontSize: "32px",
  fontWeight: "900",
  marginBottom: "16px",
  textAlign: "center",
  color: "#1a1a1a",
  letterSpacing: "0.5px",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif",
};

const title: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: "700",
  marginBottom: "16px",
  textAlign: "center",
};

const paragraph: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "24px",
  margin: "8px 0",
  color: "#414b57",
};

const button: React.CSSProperties = {
  backgroundColor: "#414b57",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "6px",
  fontSize: "16px",
  fontWeight: 600,
  textDecoration: "none",
};

const reportLink: React.CSSProperties = {
  color: "#374151",
  fontWeight: 700,
};
