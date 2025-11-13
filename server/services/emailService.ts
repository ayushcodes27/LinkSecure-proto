import nodemailer, { Transporter } from "nodemailer";

type BasicEmailParams = {
	to: string;
	subject: string;
	html: string;
	text?: string;
};

function createTransport(): Transporter {
	const host = process.env.SMTP_HOST || "smtp.gmail.com";
	const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;

	if (!user || !pass) {
		throw new Error("SMTP_USER and SMTP_PASS must be configured in environment variables");
	}

	return nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: { user, pass },
	});
}

let sharedTransport: Transporter | null = null;
function getTransport(): Transporter {
	if (!sharedTransport) sharedTransport = createTransport();
	return sharedTransport;
}

async function sendEmail({ to, subject, html, text }: BasicEmailParams): Promise<void> {
	const from = process.env.EMAIL_FROM || `LinkSecure <no-reply@linksecure>`;
	const transporter = getTransport();
	await transporter.sendMail({ from, to, subject, html, text: text || html.replace(/<[^>]+>/g, " ") });
}

function buildFooter(unsubscribeUrl?: string): string {
	const safeUnsub = unsubscribeUrl
		? `<p style="font-size:12px;color:#6b7280">Unsubscribe: <a href="${unsubscribeUrl}">Manage preferences</a></p>`
		: "";
	return `
	  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
	  <p style="font-size:12px;color:#6b7280;margin:0">© ${new Date().getFullYear()} LinkSecure</p>
	  ${safeUnsub}
	`;
}

export async function sendWelcomeEmail(params: { to: string; firstName?: string; unsubscribeUrl?: string }): Promise<void> {
	const { to, firstName, unsubscribeUrl } = params;
	const subject = "Welcome to LinkSecure";
	const greeting = firstName ? `Hi ${firstName},` : "Welcome,";
	const html = `
	  <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6">
	    <h2 style="margin:0 0 12px 0">${greeting}</h2>
	    <p>Thanks for joining LinkSecure. You're all set to securely share and track your files.</p>
	    <p>Get started by uploading a file and generating a secure link.</p>
	    ${buildFooter(unsubscribeUrl)}
	  </div>
	`;
	await sendEmail({ to, subject, html });
}

export async function sendFileSharedNotification(params: {
	to: string;
	ownerName?: string;
	fileName?: string;
	accessLevel?: "view" | "edit" | "admin";
	openUrl?: string;
	unsubscribeUrl?: string;
}): Promise<void> {
	const { to, ownerName, fileName, accessLevel, openUrl, unsubscribeUrl } = params;
	const subject = `A file was shared with you${fileName ? `: ${fileName}` : ""}`;
	const html = `
	  <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6">
	    <p>${ownerName ? ownerName : "Someone"} shared ${fileName ? `<strong>${fileName}</strong>` : "a file"} with you.</p>
	    ${accessLevel ? `<p>Access level: <strong>${accessLevel}</strong></p>` : ""}
	    ${openUrl ? `<p><a href="${openUrl}" style="background:#1f2937;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">Open file</a></p>` : ""}
	    ${buildFooter(unsubscribeUrl)}
	  </div>
	`;
	await sendEmail({ to, subject, html });
}

export async function sendAccessGrantedNotification(params: {
	to: string;
	grantedByName?: string;
	fileName?: string;
	accessLevel: "view" | "edit" | "admin";
	openUrl?: string;
	unsubscribeUrl?: string;
}): Promise<void> {
	const { to, grantedByName, fileName, accessLevel, openUrl, unsubscribeUrl } = params;
	const subject = `Access granted: ${accessLevel}${fileName ? ` • ${fileName}` : ""}`;
	const html = `
	  <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6">
	    <p>${grantedByName ? grantedByName : "A team member"} granted you <strong>${accessLevel}</strong> access${fileName ? ` to <strong>${fileName}</strong>` : ""}.</p>
	    ${openUrl ? `<p><a href="${openUrl}" style="background:#1f2937;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">Open file</a></p>` : ""}
	    ${buildFooter(unsubscribeUrl)}
	  </div>
	`;
	await sendEmail({ to, subject, html });
}

export async function sendDownloadNotification(params: {
	to: string;
	fileName?: string;
	downloaderName?: string;
	downloadedAt?: Date;
	unsubscribeUrl?: string;
}): Promise<void> {
	const { to, fileName, downloaderName, downloadedAt, unsubscribeUrl } = params;
	const subject = `Your file was downloaded${fileName ? `: ${fileName}` : ""}`;
	const ts = downloadedAt ? downloadedAt.toLocaleString() : undefined;
	const html = `
	  <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6">
	    <p>${downloaderName ? `<strong>${downloaderName}</strong>` : "Someone"} downloaded${fileName ? ` <strong>${fileName}</strong>` : " your file"}${ts ? ` at ${ts}` : ""}.</p>
	    ${buildFooter(unsubscribeUrl)}
	  </div>
	`;
	await sendEmail({ to, subject, html });
}

export async function sendPasswordResetEmail(params: {
	to: string;
	firstName?: string;
	resetUrl: string;
	unsubscribeUrl?: string;
}): Promise<void> {
	const { to, firstName, resetUrl, unsubscribeUrl } = params;
	const subject = "Reset your LinkSecure password";
	const greeting = firstName ? `Hi ${firstName},` : "Hello,";
	const html = `
	  <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6">
	    <p>${greeting}</p>
	    <p>We received a request to reset your password. Click the button below to continue.</p>
	    <p><a href="${resetUrl}" style="background:#1f2937;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">Reset password</a></p>
	    <p style="font-size:12px;color:#6b7280">If you didn’t request this, you can safely ignore this email.</p>
	    ${buildFooter(unsubscribeUrl)}
	  </div>
	`;
	await sendEmail({ to, subject, html });
}

export async function sendEmailVerification(params: {
	to: string;
	firstName?: string;
	verificationUrl: string;
	unsubscribeUrl?: string;
}): Promise<void> {
	const { to, firstName, verificationUrl, unsubscribeUrl } = params;
	const subject = "Verify your LinkSecure email address";
	const greeting = firstName ? `Hi ${firstName},` : "Hello,";
	const html = `
	  <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6">
	    <h2 style="margin:0 0 12px 0">${greeting}</h2>
	    <p>Thanks for signing up for LinkSecure! To complete your registration and secure your account, please verify your email address.</p>
	    <p><a href="${verificationUrl}" style="background:#1f2937;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Verify Email Address</a></p>
	    <p style="font-size:14px;color:#6b7280;margin-top:20px">This link will expire in 24 hours. If you didn't create an account with LinkSecure, you can safely ignore this email.</p>
	    <p style="font-size:12px;color:#9ca3af;margin-top:16px">If the button doesn't work, copy and paste this link into your browser:<br/>
	    <span style="color:#3b82f6">${verificationUrl}</span></p>
	    ${buildFooter(unsubscribeUrl)}
	  </div>
	`;
	await sendEmail({ to, subject, html });
}

export async function send2FACode(params: {
	to: string;
	firstName?: string;
	code: string;
	unsubscribeUrl?: string;
}): Promise<void> {
	const { to, firstName, code, unsubscribeUrl } = params;
	const subject = "Your LinkSecure verification code";
	const greeting = firstName ? `Hi ${firstName},` : "Hello,";
	const html = `
	  <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6">
	    <h2 style="margin:0 0 12px 0">${greeting}</h2>
	    <p>Your two-factor authentication code for LinkSecure is:</p>
	    <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
	      <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1f2937">${code}</span>
	    </div>
	    <p style="font-size:14px;color:#6b7280">This code will expire in 10 minutes. If you didn't request this code, please ignore this email and ensure your account is secure.</p>
	    <p style="font-size:14px;color:#dc2626;margin-top:16px"><strong>Never share this code with anyone.</strong> LinkSecure will never ask for your verification code.</p>
	    ${buildFooter(unsubscribeUrl)}
	  </div>
	`;
	await sendEmail({ to, subject, html });
}

export type EmailService = {
	sendWelcomeEmail: typeof sendWelcomeEmail;
	sendFileSharedNotification: typeof sendFileSharedNotification;
	sendAccessGrantedNotification: typeof sendAccessGrantedNotification;
	sendDownloadNotification: typeof sendDownloadNotification;
	sendPasswordResetEmail: typeof sendPasswordResetEmail;
	sendEmailVerification: typeof sendEmailVerification;
	send2FACode: typeof send2FACode;
};

export default {
	sendWelcomeEmail,
	sendFileSharedNotification,
	sendAccessGrantedNotification,
	sendDownloadNotification,
	sendPasswordResetEmail,
	sendEmailVerification,
	send2FACode,
} as EmailService;


