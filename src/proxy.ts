import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = [
  { path: "/", quandoAutenticado: "redirect" },
  { path: "/login", quandoAutenticado: "redirect" },
] as const; //opção redirect ou next

// Rota para onde o usuário é enviado se tentar acessar uma página privada sem estar logado
const REDIRECT_QUANDO_NAO_AUTENTICADA = "/";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicRoute = publicRoutes.find((route) => route.path === path);

  // =========================================================================
  // 1. VERIFICAÇÃO ATUAL: Login Social com Google (NextAuth Session)
  // =========================================================================
  const sessionToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const authToken = !!sessionToken;

  // =========================================================================
  // 2. ESQUELETO FUTURO: Quando você tiver rotas para validar JWT do Backend
  // =========================================================================
  // const backendToken = sessionToken?.backendToken || request.cookies.get("token")?.value;
  // if (backendToken) {
  //   // TODO: Validar se o token JWT não está expirado ou chamar rota do backend
  // }

  // Caso 1: Não está autenticado e está acessando rota pública -> Permite
  if (!authToken && publicRoute) {
    return NextResponse.next();
  }

  // Caso 2: Não está autenticado e tenta acessar rota privada (ex: /dashboard) -> Redireciona para login/home
  if (!authToken && !publicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = REDIRECT_QUANDO_NAO_AUTENTICADA;
    return NextResponse.redirect(redirectUrl);
  }

  // Caso 3: Já está autenticado e tenta acessar rota pública que exige redirect (ex: /, /login) -> Redireciona para /dashboard
  if (authToken && publicRoute && publicRoute.quandoAutenticado === "redirect") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  // Caso 4: Está autenticado e está acessando rota privada -> Permite
  if (authToken && !publicRoute) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}