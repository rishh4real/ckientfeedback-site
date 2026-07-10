const nodemailer = require('nodemailer');

const REQUIRED_FIELDS = ['name', 'email', 'serviceType'];

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function isEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clean(value, fallback = '-') {
  const trimmed = String(value || '').trim();
  return trimmed || fallback;
}

function normalizeSupabaseUrl(value = '') {
  const trimmed = String(value || '').trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes('.supabase.co')) return `https://${trimmed}`;
  return `https://${trimmed}.supabase.co`;
}

function feedbackText(data) {
  const ratings = data.ratings || {};
  return `CLIENT FEEDBACK - SHAURYA SHARMA

ABOUT THE CLIENT
Name: ${clean(data.name)}
Email: ${clean(data.email)}
Phone: ${clean(data.phone)}
Project / Company: ${clean(data.company)}
Service: ${clean(data.serviceType)}

RATINGS OUT OF 5
Overall Satisfaction: ${clean(ratings.overall, 'Not rated')}/5
Communication: ${clean(ratings.communication, 'Not rated')}/5
Design Quality: ${clean(ratings.design, 'Not rated')}/5
Turnaround Speed: ${clean(ratings.speed, 'Not rated')}/5

LOOKING AHEAD
Would hire again: ${clean(data.again, 'Not answered')}
Would refer: ${clean(data.refer, 'Not answered')}

IN THEIR OWN WORDS
What they liked:
${clean(data.liked)}

What could be improved:
${clean(data.improve)}

Other thoughts:
${clean(data.other)}
`;
}

function feedbackHtml(data, heading = 'New Client Feedback') {
  const ratings = data.ratings || {};
  const rows = [
    ['Client Name', data.name],
    ['Email', data.email],
    ['Phone', data.phone],
    ['Project / Company', data.company],
    ['Service', data.serviceType],
    ['Overall Satisfaction', `${clean(ratings.overall, 'Not rated')}/5`],
    ['Communication', `${clean(ratings.communication, 'Not rated')}/5`],
    ['Design Quality', `${clean(ratings.design, 'Not rated')}/5`],
    ['Turnaround Speed', `${clean(ratings.speed, 'Not rated')}/5`],
    ['Would hire again', clean(data.again, 'Not answered')],
    ['Would refer', clean(data.refer, 'Not answered')]
  ];

  const rowHtml = rows.map(([label, value]) => `
    <div style="padding:14px 0;border-bottom:1px solid #2a2a2a;">
      <div style="margin:0 0 6px;color:#ff4f8b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;line-height:1.35;">${escapeHtml(label)}</div>
      <div style="margin:0;color:#fff6e8;font-size:16px;line-height:1.5;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(clean(value))}</div>
    </div>
  `).join('');

  const paragraph = (label, value) => `
    <div style="margin-top:20px;">
      <p style="margin:0 0 8px;color:#ff4f8b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;line-height:1.35;">${escapeHtml(label)}</p>
      <div style="white-space:pre-wrap;background:#151515;border:1px solid #2a2a2a;border-radius:8px;padding:14px;color:#fff6e8;font-size:15px;line-height:1.6;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(clean(value))}</div>
    </div>
  `;

  return `
    <div style="margin:0;padding:0;background:#ff4f8b;font-family:Arial,Helvetica,sans-serif;color:#fff6e8;width:100%;">
      <div style="width:100%;max-width:560px;margin:0 auto;background:#050505;border:0;box-sizing:border-box;">
        <div style="padding:24px 18px 22px;background:#050505;color:#fff6e8;border-bottom:1px solid #2a2a2a;box-sizing:border-box;">
          <p style="margin:0 0 8px;color:#ff4f8b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;line-height:1.4;">Shaurya Sharma</p>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;line-height:1.08;font-weight:400;color:#fff6e8;">${escapeHtml(heading)}</h1>
          <p style="margin:12px 0 0;color:#d8d0c5;font-size:14px;line-height:1.5;">Web Design, Full Stack, AI, Video Making, WhatsApp Catalog and Email Marketing feedback response.</p>
        </div>
        <div style="padding:18px;box-sizing:border-box;">
          <div style="border-top:1px solid #2a2a2a;">
            ${rowHtml}
          </div>
          ${paragraph('What they liked most', data.liked)}
          ${paragraph('What could be improved', data.improve)}
          ${paragraph('Other thoughts', data.other)}
        </div>
      </div>
    </div>
  `;
}

async function saveFeedbackToSupabase(data) {
  const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.');
  }

  let response;
  try {
    response = await fetch(`${supabaseUrl}/rest/v1/feedback_responses`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        name: clean(data.name, ''),
        email: clean(data.email, ''),
        phone: clean(data.phone, ''),
        company: clean(data.company, ''),
        service_type: clean(data.serviceType, ''),
        ratings: data.ratings || {},
        again: clean(data.again, ''),
        refer: clean(data.refer, ''),
        liked: clean(data.liked, ''),
        improve: clean(data.improve, ''),
        other: clean(data.other, '')
      })
    });
  } catch (error) {
    throw new Error(`Supabase connection failed for ${supabaseUrl}: ${error.message}`);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase insert failed: ${message || response.statusText}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed.' });
  }

  try {
    const data = normalizeBody(req.body);
    const missing = REQUIRED_FIELDS.filter((field) => !clean(data[field], ''));

    if (missing.length > 0 || !isEmail(data.email)) {
      return res.status(400).json({ error: 'Please enter your name, valid email, and service type.' });
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const to = process.env.FEEDBACK_TO || 'rishh4work@gmail.com';
    const fromName = process.env.FEEDBACK_FROM_NAME || 'Shaurya Feedback Form';

    if (!smtpUser || !smtpPass) {
      return res.status(500).json({
        error: 'Email backend is not configured yet. Add SMTP_USER and SMTP_PASS in Vercel environment variables.'
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const subject = `Client Feedback from ${clean(data.name)} - ${clean(data.serviceType)}`;
    const text = feedbackText(data);

    await saveFeedbackToSupabase(data);

    await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to,
      replyTo: data.email,
      subject,
      text,
      html: feedbackHtml(data)
    });

    await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to: data.email,
      subject: 'Copy of your feedback for Shaurya Sharma',
      text: `Thank you for sharing your feedback. Here is a copy of your response.\n\n${text}`,
      html: feedbackHtml(data, 'Your Feedback Copy')
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Unable to send feedback right now.'
    });
  }
};
