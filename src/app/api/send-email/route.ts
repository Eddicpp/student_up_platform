import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inizializza Resend usando la chiave salvata nelle variabili d'ambiente
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // Legge i dati inviati dal frontend
    const body = await request.json();
    const { to, subject, message, projectName } = body;

    // Controllo di sicurezza per la chiave
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Chiave API non configurata" }, { status: 500 });
    }

    // Invia la mail tramite Resend
    const { data, error } = await resend.emails.send({
      from: 'StudentUP <onboarding@resend.dev>', // Finché non verifichi il dominio, usa questa
      to: [to],
      subject: subject,
      html: `
        <div style="font-family: sans-serif; border: 4px solid #000; padding: 20px; background-color: #fff;">
          <h1 style="text-transform: uppercase;">${projectName}</h1>
          <p style="font-size: 16px; font-weight: bold;">${message}</p>
          <hr style="border: 2px solid #000;" />
          <p style="font-size: 12px;">Messaggio inviato automaticamente da StudentUP.</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}