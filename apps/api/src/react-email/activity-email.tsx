import {
  Body,
  Container,
  Head,
  Html,
  Section,
  Text,
} from "@react-email/components";

type ActivityEmailProps = {
  recipientName: string;
  body: string;
};

export const ActivityEmail = ({ recipientName, body }: ActivityEmailProps) => {
  return (
    <Html>
      <Head />
      <Body
        style={{
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#f7f7f7",
          margin: 0,
          padding: 0,
        }}
      >
        <Section style={{ padding: "20px 0" }}>
          <Container
            style={{
              backgroundColor: "#ffffff",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 0 5px rgba(0,0,0,0.1)",
            }}
          >
            <Text
              style={{ fontSize: "16px", lineHeight: "24px", color: "#333333" }}
            >
              Hi {recipientName},
            </Text>

            <Text
              style={{
                fontSize: "16px",
                lineHeight: "24px",
                color: "#333333",
                margin: "16px 0",
              }}
            >
              {body}
            </Text>

            <Text
              style={{
                fontSize: "16px",
                lineHeight: "24px",
                color: "#333333",
                marginTop: "24px",
              }}
            >
              Best regards,
              <br />
            </Text>
          </Container>
        </Section>
      </Body>
    </Html>
  );
};

export default ActivityEmail;
