import { SelectHTMLAttributes } from "react";
import styles from "./Select.module.css";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: { label: string; value: string }[];
};

export function Select({ label, id, options, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <label className={styles.field} htmlFor={selectId}>
      <span>{label}</span>
      <select id={selectId} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
