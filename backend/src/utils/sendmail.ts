import { config } from '../libs/config';
import appAssert from './appAssert';
import sgMail from '@sendgrid/mail';
import { INTERNAL_SERVER_ERROR } from '../libs/http';

sgMail.setApiKey(config.SMTP_PASS);

type Params = {
  to: string;
  subject: string;
  text?: string;
  html: string;
};

export const sendMail = async ({ to, subject, text, html }: Params) => {
  const msg = {
    to,
    from: {
      name: 'ISE Expense Tracker',
      email: config.EMAIL_SENDER,
    },
    subject,
    text,
    html,
  };

  const [response] = await sgMail.send(msg);
  const messageId =
    (response.headers &&
      (response.headers['x-message-id'] as string | undefined)) ??
    null;
  appAssert(response.statusCode, INTERNAL_SERVER_ERROR, 'Failed to send email');

  console.log('✅ Email sent successfully via SendGrid:', response.statusCode);
  return {
    statusCode: response.statusCode,
    messageId,
  };
};
