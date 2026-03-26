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

    // Invia la mail tramite Resend con il template HTML avanzato
    const { data, error } = await resend.emails.send({
      from: 'StudentUP <noreply@studentup.org>',
      to: [to],
      subject: subject || "Nuova Notifica",
      html: `
        <div style="background-color: #eff6ff; padding: 50px 20px; font-family: 'Arial', sans-serif; text-align: center;">
          <div
            style="background-color: #ffffff; max-width: 500px; margin: 0 auto; padding: 40px 30px; border: 4px solid #111827; border-radius: 24px; box-shadow: 8px 8px 0px 0px #111827; text-align: center;"
          >
            <h1
              style="font-size: 38px; font-weight: 900; font-style: italic; text-transform: uppercase; margin-top: 0; margin-bottom: 10px; color: #111827; letter-spacing: -1px;"
            >
              STUDENT<span style="color: #e11d48;">UP</span>
            </h1>

            <div
              style="display: inline-block; background-color: #fde047; border: 2px solid #111827; padding: 6px 16px; border-radius: 8px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 30px;"
            >
              ${projectName || 'Aggiornamento'} ✨
            </div>

            <h2 style="font-size: 24px; font-weight: 900; color: #111827; text-transform: uppercase; margin-bottom: 15px;">
              ${subject || 'Nuova Notifica'}
            </h2>

            <p style="font-size: 16px; color: #374151; font-weight: bold; line-height: 1.6; margin-bottom: 35px;">
              ${message}
            </p>

            <a
              href="https://studentup.org/dashboard"
              style="background-color: #e11d48; color: #ffffff; padding: 18px 32px; text-decoration: none; font-weight: 900; font-size: 18px; border: 4px solid #111827; border-radius: 12px; display: inline-block; text-transform: uppercase; letter-spacing: 2px; box-shadow: 4px 4px 0px 0px #111827;"
            >
              VAI AL PROGETTO 🚀
            </a>
          </div>

          <div style="margin-top: 30px; font-size: 12px; font-weight: bold; color: #6b7280;">
            <p>Questo è un messaggio automatico da StudentUP, non rispondere a questa mail.</p>
          </div>
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