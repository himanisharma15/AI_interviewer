import nodemailer from 'nodemailer'

const mailTransport = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  })
}

export async function sendInterviewInvitation({ recipient, company, jobRole, candidateName, round }) {
  const transport = mailTransport()
  if (!transport) {
    const error = 'Email delivery is not configured. Add SMTP settings to the server environment.'
    console.warn(`Interview invitation skipped: ${error}`)
    return { sent: false, configured: false, error }
  }

  const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(round.scheduledAt))
  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: recipient,
    subject: `Interview Scheduled – ${jobRole}`,
    text: `You have been invited to observe an interview for the ${jobRole} position at ${company}.\n\nCandidate: ${candidateName}\nRole: ${jobRole}\nInterview: ${round.type} Round\nDate and time: ${date}\n\nPlease log in to IntervueAI to observe the interview and provide feedback.\n\n${loginUrl}`,
    html: `<p>You have been invited to observe an interview for the <strong>${jobRole}</strong> position at ${company}.</p><p><strong>Candidate:</strong> ${candidateName}<br /><strong>Role:</strong> ${jobRole}<br /><strong>Interview:</strong> ${round.type} Round<br /><strong>Date and time:</strong> ${date}</p><p>Please log in to IntervueAI to observe the interview and provide feedback.</p><p><a href="${loginUrl}">Login to IntervueAI</a></p>`,
  })
  return { sent: true, configured: true, error: '' }
}

export async function sendWorkspaceInvitation({ recipient, company, jobRole, candidateName, interviewType }) {
  const transport = mailTransport()
  if (!transport) {
    const error = 'Email delivery is not configured. Add SMTP settings to the server environment.'
    console.warn(`Workspace invitation skipped: ${error}`)
    return { sent: false, configured: false, error }
  }

  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`
  const subject = `Interview invitation – ${jobRole}`
  const text = `${candidateName} invited you to collaborate on a ${interviewType} interview for ${jobRole} at ${company}.\n\nLog in to IntervueAI to accept the invitation and manage the interview:\n${loginUrl}`
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: recipient,
    subject,
    text,
    html: `<p><strong>${candidateName}</strong> invited you to collaborate on a <strong>${interviewType}</strong> interview for <strong>${jobRole}</strong> at ${company}.</p><p><a href="${loginUrl}">Login to IntervueAI</a></p>`,
  })
  return { sent: true, configured: true, error: '' }
}

export async function sendPasswordResetCode({ recipient, name, otp }) {
  const transport = mailTransport()
  if (!transport) {
    const error = 'Email delivery is not configured. Add SMTP settings to the server environment.'
    console.warn(`Password reset email skipped: ${error}`)
    return { sent: false, configured: false, error }
  }

  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: recipient,
    subject: 'Your IntervueAI password reset code',
    text: `Hi ${name},\n\nYour IntervueAI password reset code is ${otp}. It expires in 10 minutes.\n\nDo not share this code with anyone.`,
    html: `<p>Hi <strong>${name}</strong>,</p><p>Your IntervueAI password reset code is <strong>${otp}</strong>. It expires in 10 minutes.</p><p>Do not share this code with anyone.</p>`,
  })

  return { sent: true, configured: true, error: '' }
}
