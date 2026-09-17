"use client";

import styles from './styles.module.css'
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

const Header = () => {
  const { data: session, status } = useSession();

  return (
    <header className={styles.header}>
      <section className={styles.content}>
        <nav className={styles.nav}>
          <Link href="/">
            <h1 className={styles.logo}>
              v<span>IA</span>gens
            </h1>
          </Link>
          {/* {session?.user && (
            <Link href="/dashboard" className={styles.link}>
              Meu Painel
            </Link>
          )} */}
        </nav>

        {status === "loading" ? (
          <button className={styles.loginButton}>Acessar</button>
        ) : session ? (
          <Link href="/perfil">
            <button className={styles.loginButton}>
              Olá, {session.user?.name?.split(" ")[0] ?? "Usuário"}
            </button>
          </Link>
        ) : (
          // Leva para a tela de login, que oferece e-mail/senha e Google.
          // Antes este botao disparava o fluxo do Google direto, o que deixava
          // o cadastro por senha sem nenhum caminho de entrada.
          <Link href="/login">
            <button className={styles.loginButton}>Acessar</button>
          </Link>
        )}
      </section>
    </header>
  );
}

export { Header }

