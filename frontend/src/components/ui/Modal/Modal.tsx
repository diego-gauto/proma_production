import { ReactNode } from "react";
import { Button } from "../Button/Button";
import styles from "./Modal.module.css";

type ModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className={styles.backdrop} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true">
        <header className={styles.header}>
          <h2>{title}</h2>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}
