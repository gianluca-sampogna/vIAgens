"use client";

import styles from './styles.module.css';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';

const Header = () => {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={styles.header}>
      <section className={styles.content}>
        <nav className={styles.nav}>
          <Link href="/">
            <h1 className={styles.logo}>
              v<span>IA</span>gens
            </h1>
          </Link>
        </nav>

        <div className={styles.actions}>
          {/* Botão de Alternância de Tema (Sol / Lua) */}
          <button
            onClick={toggleTheme}
            className={styles.themeButton}
            title={theme === "light" ? "Alternar para Modo Escuro" : "Alternar para Modo Claro"}
            aria-label="Alternar Tema"
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {status === "loading" ? (
            <button className={styles.loginButton}>Acessar</button>
          ) : session ? (
            <Link href="/perfil">
              <button className={styles.loginButton}>
                Olá, {session.user?.name?.split(" ")[0] ?? "Usuário"}
              </button>
            </Link>
          ) : (
            <Link href="/login">
              <button className={styles.loginButton}>Acessar</button>
            </Link>
          )}
        </div>
      </section>
    </header>
  );
}

export { Header };
