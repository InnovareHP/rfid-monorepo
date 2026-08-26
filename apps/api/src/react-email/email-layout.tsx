import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { appConfig } from "../config/app-config";

export const BRAND_NAME = appConfig.APP_NAME;

const logoUrl =
  appConfig.EMAIL_LOGO_URL ??
  `${appConfig.WEBSITE_URL}/branding/email-logo.png`;

const responsiveCss = `
  @media only screen and (max-width: 600px) {
    .gutter { padding-left: 24px !important; padding-right: 24px !important; }
  }
`;

type EmailLayoutProps = {
  preview: string;
  badge?: string;
  children: React.ReactNode;
};

export const EmailLayout = ({ preview, badge, children }: EmailLayoutProps) => {
  return (
    <Html lang="en">
      <Head>
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      </Head>
      <Preview>{preview}</Preview>

      <Body style={main}>
        <Container style={outer}>
          <Section style={card}>
            <Section style={header} className="gutter">
              <Row>
                <Column>
                  <Img src={logoUrl} alt={BRAND_NAME} style={logo} />
                </Column>
                {badge ? (
                  <Column style={badgeCell}>
                    <span style={badgePill}>{badge}</span>
                  </Column>
                ) : null}
              </Row>
            </Section>

            <Section style={content} className="gutter">
              {children}
            </Section>

            <Hr style={divider} />

            <Section style={footer} className="gutter">
              <Text style={footerText}>Sent by {BRAND_NAME}.</Text>
              <Text style={footerText}>
                <Link href={appConfig.SUPPORT_URL} style={footerLink}>
                  Visit support
                </Link>
              </Text>
              <Text style={footerText}>
                <Link href="mailto:info@innovarehp.com" style={footerLink}>
                  Report suspicious activity
                </Link>
              </Text>
              <Text style={copyright}>
                &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights
                reserved.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EmailLayout;

// === Brand tokens ===

export const brand = {
  navy: "#0b2545",
  blue: "#155dfc",
  sky: "#5cc3f0",
  deep: "#123a8a",
  text: "#334155",
  muted: "#64748b",
  border: "#e4e9f2",
  surface: "#f4f7fb",
  white: "#ffffff",
};

// === Shared styles used by every template ===

export const emailStyles = {
  eyebrow: {
    fontSize: "12px",
    lineHeight: "18px",
    fontWeight: 700,
    letterSpacing: "1.2px",
    textTransform: "uppercase",
    color: brand.blue,
    margin: "0 0 8px",
  } as React.CSSProperties,

  heading: {
    fontSize: "24px",
    lineHeight: "32px",
    fontWeight: 700,
    letterSpacing: "-0.4px",
    color: brand.navy,
    margin: "0 0 16px",
  } as React.CSSProperties,

  paragraph: {
    fontSize: "16px",
    lineHeight: "26px",
    color: brand.text,
    margin: "0 0 16px",
  } as React.CSSProperties,

  muted: {
    fontSize: "14px",
    lineHeight: "22px",
    color: brand.muted,
    margin: "0 0 16px",
  } as React.CSSProperties,

  link: {
    color: brand.blue,
    fontWeight: 600,
    textDecoration: "underline",
  } as React.CSSProperties,

  buttonWrapper: {
    margin: "28px 0",
  } as React.CSSProperties,

  button: {
    display: "inline-block",
    backgroundColor: brand.blue,
    color: brand.white,
    padding: "14px 28px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 600,
    textDecoration: "none",
  } as React.CSSProperties,

  detailBox: {
    backgroundColor: brand.surface,
    border: `1px solid ${brand.border}`,
    borderRadius: "10px",
    padding: "20px 24px",
    margin: "0 0 24px",
  } as React.CSSProperties,

  detailText: {
    fontSize: "15px",
    lineHeight: "26px",
    color: brand.text,
    margin: "0",
  } as React.CSSProperties,

  codeBox: {
    backgroundColor: brand.surface,
    border: `1px solid ${brand.border}`,
    borderRadius: "10px",
    padding: "28px 16px",
    margin: "0 0 24px",
    textAlign: "center",
  } as React.CSSProperties,

  codeText: {
    fontSize: "34px",
    lineHeight: "42px",
    fontWeight: 700,
    letterSpacing: "8px",
    color: brand.navy,
    margin: "0",
    textAlign: "center",
  } as React.CSSProperties,
};

// === Internal styles ===

const main: React.CSSProperties = {
  backgroundColor: brand.surface,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: "0",
  padding: "0",
};

const outer: React.CSSProperties = {
  width: "100%",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "32px 12px",
};

const card: React.CSSProperties = {
  backgroundColor: brand.white,
  border: `1px solid ${brand.border}`,
  borderRadius: "14px",
  overflow: "hidden",
};

const header: React.CSSProperties = {
  padding: "28px 40px",
  backgroundColor: brand.deep,
  backgroundImage: `linear-gradient(100deg, ${brand.navy} 0%, ${brand.blue} 60%, ${brand.sky} 100%)`,
};

const logo: React.CSSProperties = {
  width: "160px",
  height: "auto",
  display: "block",
};

const badgeCell: React.CSSProperties = {
  textAlign: "right",
  verticalAlign: "middle",
};

// Outlook drops rgba, so the pill falls back to a flat tint of the header.
const badgePill: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#4d8ae8",
  border: "1px solid #ffffff59",
  borderRadius: "999px",
  color: brand.white,
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.6px",
  padding: "8px 18px",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const content: React.CSSProperties = {
  padding: "16px 40px 32px",
};

const divider: React.CSSProperties = {
  borderColor: brand.border,
  margin: "0",
};

const footer: React.CSSProperties = {
  padding: "24px 40px 28px",
};

const footerText: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: brand.muted,
  margin: "0 0 4px",
};

const footerLink: React.CSSProperties = {
  color: brand.muted,
  textDecoration: "underline",
};

const copyright: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#94a3b8",
  margin: "12px 0 0",
};
