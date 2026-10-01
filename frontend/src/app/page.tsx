import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.eyebrow}>Proma Production</p>
        <h1>Sistema de seguimiento de produccion textil</h1>
        <p className={styles.summary}>
          Esqueleto frontend listo para conectar con el backend local en la
          siguiente fase.
        </p>
      </main>
    </div>
  );
}
