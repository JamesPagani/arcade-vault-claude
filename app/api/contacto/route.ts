import { Resend } from "resend";
import { validateContactFields } from "@/components/contact-validation";

interface ContactRequest {
  name: string;
  email: string;
  message: string;
}

type ContactResponse = { ok: true } | { ok: false; error: string };

export async function POST(request: Request) {
  let body: Partial<ContactRequest>;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Solicitud inválida." } satisfies ContactResponse,
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!validateContactFields({ name, email, message })) {
    return Response.json(
      { ok: false, error: "Datos inválidos. Revisa los campos e intenta de nuevo." } satisfies ContactResponse,
      { status: 400 }
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL;

  if (!resendApiKey || !contactEmail) {
    return Response.json(
      { ok: false, error: "El servicio de contacto no está disponible en este momento." } satisfies ContactResponse,
      { status: 500 }
    );
  }

  try {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: contactEmail,
      subject: `Nuevo mensaje de contacto de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`,
    });

    if (error) {
      return Response.json(
        { ok: false, error: "No se pudo enviar el mensaje. Intenta de nuevo." } satisfies ContactResponse,
        { status: 502 }
      );
    }

    return Response.json({ ok: true } satisfies ContactResponse);
  } catch {
    return Response.json(
      { ok: false, error: "No se pudo enviar el mensaje. Intenta de nuevo." } satisfies ContactResponse,
      { status: 502 }
    );
  }
}
