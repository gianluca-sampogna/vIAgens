import styles from './styles.module.css'
import Link from 'next/link';

const Header =() => {
  return (
    <header className={styles.header}>
      <section className={styles.content}>
        <nav className={styles.nav}>
          <Link href="/">
            <h1 className={styles.logo}>
              v<span>IA</span>gens
            </h1>
          </Link>
          {/* <Link href="/dashboard" className={styles.link}>
            Meu Painel
          </Link> */}
        </nav>

        <button className={styles.loginButton}>Acessar</button>
      </section>
    </header>
  );
}

export {Header}
