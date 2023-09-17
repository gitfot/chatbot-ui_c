import {IconFolderPlus, IconMistOff, IconPlus} from '@tabler/icons-react';
import {ReactNode, useContext} from 'react';
import {useTranslation} from 'react-i18next';

import {
	CloseSidebarButton,
	OpenSidebarButton,
} from './components/OpenCloseButton';

import Search from '../Search';
import styles from './sidebar.module.scss'
import HomeContext from "@/pages/api/home/home.context";
import {FolderInterface} from "@/types/folder";

interface Props<T> {
	isOpen: boolean;
	addItemButtonTitle: string;
	side: 'left' | 'right';
	items: T[];
	folders: FolderInterface[];
	itemComponent: ReactNode;
	folderComponent: ReactNode;
	footerComponent?: ReactNode;
	searchTerm: string;
	handleSearchTerm: (searchTerm: string) => void;
	toggleOpen: () => void;
	handleCreateItem: () => void;
	handleCreateFolder: () => void;
	handleDrop: (e: any) => void;
}

const Sidebar = <T, >({
	                      isOpen,
	                      addItemButtonTitle,
	                      side,
	                      items,
	                      itemComponent,
	                      folderComponent,
	                      folders,
	                      footerComponent,
	                      handleSearchTerm,
	                      toggleOpen,
	                      handleCreateItem,
	                      handleCreateFolder,
	                      handleDrop,
                      }: Props<T>) => {
	const {t} = useTranslation('promptbar');

	const allowDrop = (e: any) => {
		e.preventDefault();
	};

	const highlightDrop = (e: any) => {
		e.target.style.background = '#343541';
	};

	const removeHighlight = (e: any) => {
		e.target.style.background = 'none';
	};

	return isOpen ? (
		<div>
			<div
				className={`${styles['container']} ${side}-0`}
			>
				<div className={styles['chat-manage']}>
					<button
						className={styles['create-item']}
						onClick={() => {
							handleCreateItem();
							handleSearchTerm('');
						}}
					>
						<IconPlus size={16}/>
						{addItemButtonTitle}
					</button>

					<button
						className={styles['create-folder']}
						onClick={handleCreateFolder}
					>
						<IconFolderPlus size={16}/>
					</button>
				</div>

				<div className={styles['chat-list-container']}>
					{folders?.length > 0 && (
						<div className={styles['chat-folder']}>
							{folderComponent}
						</div>)
					}

					{items?.length > 0 ? (
						<div
							className="pt-2"
							onDrop={handleDrop}
							onDragOver={allowDrop}
							onDragEnter={highlightDrop}
							onDragLeave={removeHighlight}
						>
							{itemComponent}
						</div>
					) : (
						<div className={styles['no-data']}>
							<IconMistOff className={styles['no-data-icon']}/>
							<span className={styles['no-data-text']}>
                {t('No data.')}
              </span>
						</div>
					)}
				</div>
				{footerComponent}
			</div>

			<CloseSidebarButton onClick={toggleOpen} side={side}/>
		</div>
	) : (
		<OpenSidebarButton onClick={toggleOpen} side={side}/>
	);
};

export default Sidebar;
