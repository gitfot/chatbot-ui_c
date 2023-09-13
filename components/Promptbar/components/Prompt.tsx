import {
	IconBulbFilled,
	IconCheck,
	IconTrash,
	IconX,
} from '@tabler/icons-react';
import {
	DragEvent,
	MouseEventHandler,
	useContext,
	useEffect,
	useState,
} from 'react';

import {Prompt} from '@/types/prompt';

import SidebarActionButton from '@/components/Buttons/SidebarActionButton';

import PromptbarContext from '../PromptBar.context';
import {PromptModal} from './PromptModal';
import styles from './prompt.module.scss'

interface Props {
	prompt: Prompt;
}

export const PromptComponent = ({prompt}: Props) => {
	const {
		dispatch: promptDispatch,
		handleUpdatePrompt,
		handleDeletePrompt,
	} = useContext(PromptbarContext);

	const [showModal, setShowModal] = useState<boolean>(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState('');

	const handleUpdate = (prompt: Prompt) => {
		handleUpdatePrompt(prompt);
		promptDispatch({field: 'searchTerm', value: ''});
	};

	const handleDelete: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.stopPropagation();

		if (isDeleting) {
			handleDeletePrompt(prompt);
			promptDispatch({field: 'searchTerm', value: ''});
		}

		setIsDeleting(false);
	};

	const handleCancelDelete: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.stopPropagation();
		setIsDeleting(false);
	};

	const handleOpenDeleteModal: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.stopPropagation();
		setIsDeleting(true);
	};

	const handleDragStart = (e: DragEvent<HTMLButtonElement>, prompt: Prompt) => {
		if (e.dataTransfer) {
			e.dataTransfer.setData('prompt', JSON.stringify(prompt));
		}
	};

	useEffect(() => {
		if (isRenaming) {
			setIsDeleting(false);
		} else if (isDeleting) {
			setIsRenaming(false);
		}
	}, [isRenaming, isDeleting]);

	return (
		<div className={styles['container']}>
			<button
				className={styles['prompt-item']}
				draggable="true"
				onClick={(e) => {
					e.stopPropagation();
					setShowModal(true);
				}}
				onDragStart={(e) => handleDragStart(e, prompt)}
				onMouseLeave={() => {
					setIsDeleting(false);
					setIsRenaming(false);
					setRenameValue('');
				}}
			>
				<IconBulbFilled size={18}/>

				<div
					className={styles['prompt-name']}>
					{prompt.name}
				</div>
			</button>

			{(isDeleting || isRenaming) && (
				<div className="absolute right-1 z-10 flex text-gray-300">
					<SidebarActionButton handleClick={handleDelete}>
						<IconCheck size={18}/>
					</SidebarActionButton>

					<SidebarActionButton handleClick={handleCancelDelete}>
						<IconX size={18}/>
					</SidebarActionButton>
				</div>
			)}

			{!isDeleting && !isRenaming && (
				<div className="absolute right-1 z-10 flex text-gray-300">
					<SidebarActionButton handleClick={handleOpenDeleteModal}>
						<IconTrash size={18}/>
					</SidebarActionButton>
				</div>
			)}

			{showModal && (
				<PromptModal
					prompt={prompt}
					onClose={() => setShowModal(false)}
					onUpdatePrompt={handleUpdate}
				/>
			)}
		</div>
	);
};
