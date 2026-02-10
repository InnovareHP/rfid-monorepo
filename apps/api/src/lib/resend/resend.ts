import { render } from "@react-email/render";
import { Resend } from "resend";
import { appConfig } from "../../config/app-config";

export const resend = new Resend(appConfig.RESEND_API_KEY);

export const sendEmail = async (sendEmailDto: {
  to: string;
  subject: string;
  html: React.ReactNode;
  from: string;
}) => {
  const { to, subject, html, from } = sendEmailDto;

  const htmlRendered = await render(html);

  await resend.emails.send({
    from: from,
    to: to,
    subject: subject,
    html: htmlRendered,
  });

  return {
    message: "Email sent successfully",
  };
};
