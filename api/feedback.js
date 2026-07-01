const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

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
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #ece7de;color:#6b665f;font-size:13px;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(label)}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #ece7de;color:#111827;font-size:15px;">${escapeHtml(clean(value))}</td>
    </tr>
  `).join('');

  const paragraph = (label, value) => `
    <div style="margin-top:22px;">
      <p style="margin:0 0 8px;color:#6b665f;font-size:12px;text-transform:uppercase;letter-spacing:.12em;">${escapeHtml(label)}</p>
      <div style="white-space:pre-wrap;background:#fff8ef;border:1px solid #ece7de;border-radius:10px;padding:14px;color:#111827;line-height:1.6;">${escapeHtml(clean(value))}</div>
    </div>
  `;

  return `
    <div style="margin:0;padding:28px;background:#f7efe4;font-family:Inter,Arial,sans-serif;color:#111827;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #ece7de;border-radius:14px;overflow:hidden;">
        <div style="padding:28px;background:#07080c;color:#fff6e8;">
          <p style="margin:0 0 8px;color:#63e6be;font-size:12px;text-transform:uppercase;letter-spacing:.18em;">Shaurya Sharma</p>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:34px;font-weight:400;">${escapeHtml(heading)}</h1>
          <p style="margin:10px 0 0;color:rgba(255,246,232,.72);">Web Design, Full Stack, AI and Video Making feedback response.</p>
        </div>
        <div style="padding:22px;">
          <table style="width:100%;border-collapse:collapse;border:1px solid #ece7de;border-radius:10px;overflow:hidden;">
            ${rowHtml}
          </table>
          ${paragraph('What they liked most', data.liked)}
          ${paragraph('What could be improved', data.improve)}
          ${paragraph('Other thoughts', data.other)}
        </div>
      </div>
    </div>
  `;
}

async function saveFeedbackToSupabase(data) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { error } = await supabase.from('feedback_responses').insert({
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
  });

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
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
};
