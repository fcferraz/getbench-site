import { Resend } from 'resend';
import { rateLimit } from '../../lib/rateLimit.js';

const CONTACT_TO = 'buskai.net@gmail.com';
const CONTACT_FROM = 'Buskai Contato <noreply@buskai.net>';

export async function POST({ request }) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const { name, email, subject, message } = body;

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return json({ error: 'Todos os campos são obrigatórios' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'E-mail inválido' }, 400);
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanSubject = subject.trim();
  const cleanMessage = message.trim();

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY não configurada');
    return json({ error: 'Serviço de e-mail indisponível' }, 500);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: CONTACT_FROM,
    to: CONTACT_TO,
    replyTo: cleanEmail,
    subject: `Novo contato de ${cleanName}`,
    text: `Nome: ${cleanName}\nE-mail: ${cleanEmail}\nAssunto: ${cleanSubject}\n\nMensagem:\n${cleanMessage}`,
    html: `
      <div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">
        <p><strong>Nome:</strong> ${escapeHtml(cleanName)}</p>
        <p><strong>E-mail:</strong> <a href="mailto:${escapeHtml(cleanEmail)}">${escapeHtml(cleanEmail)}</a></p>
        <p><strong>Assunto:</strong> ${escapeHtml(cleanSubject)}</p>
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0;" />
        <p style="white-space:pre-wrap;">${escapeHtml(cleanMessage)}</p>
      </div>
    `,
  });

  if (error) {
    console.error('Resend contact error:', error);
    return json({ error: 'Erro ao enviar mensagem' }, 500);
  }

  // Registro no Airtable (best-effort, não bloqueia a resposta)
  if (process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_API_KEY) {
    try {
      await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/tblDBDppZjrC0hLAS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            records: [
              {
                fields: {
                  Name: cleanName,
                  Email: cleanEmail,
                  Subject: cleanSubject,
                  Message: cleanMessage,
                  Status: 'Novo',
                },
              },
            ],
          }),
        }
      );
    } catch (err) {
      console.error('Airtable contact log error (ignorado):', err);
    }
  }

  return json({ ok: true });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
