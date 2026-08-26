"use client";

import styles from './styles.module.css'
import Link from 'next/link';
import { useSession, signOut, signIn } from 'next-auth/react';

const Header = () => {
  const { data: session, status } = useSession();

  const handleGoogleLogin = () => {
      signIn("google", { callbackUrl: "/dashboard" });
    };
  

  return (
    <header className={styles.header}>
      <section className={styles.content}>
        <nav className={styles.nav}>
          <Link href="/">
            <h1 className={styles.logo}>
              v<span>IA</span>gens
            </h1>
          </Link>
          {session?.user && (
            <Link href="/dashboard" className={styles.link}>
              Meu Painel
            </Link>
          )}
        </nav>

        {status === "loading" ? (
          <button className={styles.loginButton}>Acessar</button>
        ) : session ? (
          <button onClick={() => signOut()} className={styles.loginButton}>
            Olá, {session.user?.name?.split(" ")[0]} (Sair)
          </button>
        ) : (
          // <Link href="/login">
            <button className={styles.loginButton} onClick={handleGoogleLogin}>Acessar</button>
          // </Link>
        )}
      </section>
    </header>
  );
}

export { Header }

