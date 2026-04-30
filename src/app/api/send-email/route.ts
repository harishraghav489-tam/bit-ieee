import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await transporter.sendMail({
      from: `"IEEE BIT Hub" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Email send error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
