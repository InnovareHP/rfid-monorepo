import { Column, Link, Row, Section, Text } from "@react-email/components";
import * as React from "react";
import { brand } from "./email-layout";

export type DetailRow = {
  label: string;
  value: string;
};

type EmailDetailTableProps = {
  rows: DetailRow[];
};

// Label left, value right — the key/value block every notification email uses.
export const EmailDetailTable = ({ rows }: EmailDetailTableProps) => (
  <Section style={table}>
    {rows.map((row, index) => (
      <Row key={row.label} style={index === 0 ? undefined : rowBorder}>
        <Column style={labelCell}>
          <Text style={labelText}>{row.label}</Text>
        </Column>
        <Column style={valueCell}>
          <Text style={valueText}>{row.value}</Text>
        </Column>
      </Row>
    ))}
  </Section>
);

type EmailCtaProps = {
  href: string;
  label: string;
};

export const EmailCta = ({ href, label }: EmailCtaProps) => (
  <Section style={ctaWrapper}>
    <Link href={href} style={ctaButton}>
      {label}
    </Link>
  </Section>
);

const table: React.CSSProperties = {
  backgroundColor: brand.surface,
  border: `1px solid ${brand.border}`,
  borderRadius: "10px",
  padding: "4px 20px",
  margin: "0 0 28px",
};

const rowBorder: React.CSSProperties = {
  borderTop: `1px solid ${brand.border}`,
};

const labelCell: React.CSSProperties = {
  padding: "12px 0",
  verticalAlign: "middle",
};

const valueCell: React.CSSProperties = {
  padding: "12px 0",
  textAlign: "right",
  verticalAlign: "middle",
};

const labelText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "20px",
  color: brand.muted,
  margin: "0",
};

const valueText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: 600,
  color: brand.navy,
  margin: "0",
  textAlign: "right",
};

const ctaWrapper: React.CSSProperties = {
  textAlign: "center",
  margin: "0 0 8px",
};

const ctaButton: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: brand.navy,
  color: brand.white,
  padding: "10px 22px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
};
