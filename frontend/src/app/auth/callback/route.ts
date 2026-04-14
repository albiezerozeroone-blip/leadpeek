import { NextResponse } from "next/server";
import { createBrowserClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Use the forwarded host (from nginx) or fall back to public domain
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "datapeak.invm.be";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const publicUrl = `${proto}://${host}`;

  return NextResponse.redirect(new URL("/", publicUrl));
}
