export async function POST({ request }) {
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

  const res = await fetch(
    `https://api.airtable.com/v0/${import.meta.env.AIRTABLE_BASE_ID}/Contacts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              Name: name.trim(),
              Email: email.trim().toLowerCase(),
              Subject: subject.trim(),
              Message: message.trim(),
              Status: 'Novo',
            },
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Airtable contact error:', err);
    return json({ error: 'Erro ao salvar mensagem' }, 500);
  }

  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
