import { MouseEventHandler, ReactElement } from 'react';
import styles from './sidebar-action-button.module.scss'

interface Props {
  handleClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactElement;
}

const SidebarActionButton = ({ handleClick, children }: Props) => (
  <button
    className={styles['sidebar-action-button']}
    onClick={handleClick}
  >
    {children}
  </button>
);

export default SidebarActionButton;
