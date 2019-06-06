import { getEnvConfig } from './EnvironmentData';
import winston from 'winston';
const WinstonCloudWatch = require('winston-cloudwatch');
const nodemailer = require('nodemailer');

let ERROR_STASHES: string[] = [];

setInterval(() => {
  if (ERROR_STASHES.length > 0) {
    const envConfig = getEnvConfigs();
    if (envConfig) {
      sendEmail(envConfig.mailerAccount, envConfig.mailerPassword, envConfig.mailerReceiver, ERROR_STASHES);
      ERROR_STASHES = [];
    }
  }
}, 60000);

const enumerateErrorFormat = winston.format(info => {
  if (info instanceof Error) {
    return Object.assign(
      {
        message: info.message,
        stack: info.stack,
      },
      info
    );
  }
  return info;
});

export function getLogger(name: string, isCloudWatch: boolean = false) {
  const has = winston.loggers.has(name);
  if (!has) {
    const transports: any[] = [];
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(info => {
            const { timestamp, level, message, ...extra } = info;

            return `${timestamp} [${level}]: ${message} ${
              Object.keys(extra).length ? JSON.stringify(extra, null, 2) : ''
            }`;
          })
        ),
      })
    );

    winston.loggers.add(name, {
      level: 'debug',
      format: winston.format.combine(enumerateErrorFormat()),
      transports,
    });
  }

  // return winston.loggers.get(name);
  return {
    debug(msg: any) {
      return winston.loggers.get(name).debug(msg);
    },
    info(msg: any) {
      return winston.loggers.get(name).debug(msg);
    },
    warn(msg: any) {
      ERROR_STASHES.push(`[WARN] ${msg}<br><br>`);
      return winston.loggers.get(name).warn(msg);
    },
    error(msg: any) {
      // Setup error
      ERROR_STASHES.push(`[ERROR] ${msg}<br><br>`);

      // const credentials = s3.config.credentials;
      const env = process.env.NODE_ENV || 'development';

      if (env === 'production' || isCloudWatch) {
        const logger = winston.loggers.get(name);
        logger.transports.push(
          new WinstonCloudWatch({
            logGroupName: 'exchange-wallet',
            logStreamName: name,
            awsRegion: 'ap-southeast-1',
            jsonMessage: true,
          })
        );
      }
      return winston.loggers.get(name).error(msg);
    },
  };
}

async function sendEmail(mailAccount: string, mailPassword: string, mailReceiver: string, message: string[]) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: mailAccount,
      pass: mailPassword,
    },
  });

  const mailOptions = {
    from: mailAccount,
    to: mailReceiver,
    subject: 'Exchange wallet: Error Notifier',
    html: `${message}`,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Message sent: %s', info.messageId);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
}

function getEnvConfigs() {
  if (getEnvConfig('MAILER_ACCOUNT') && getEnvConfig('MAILER_PASSWORD') && getEnvConfig('MAILER_RECEIVER')) {
    return {
      mailerAccount: getEnvConfig('MAILER_ACCOUNT'),
      mailerPassword: getEnvConfig('MAILER_PASSWORD'),
      mailerReceiver: getEnvConfig('MAILER_RECEIVER'),
    };
  }
  return null;
}
