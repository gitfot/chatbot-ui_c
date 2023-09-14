import {
	IconCheck,
	IconMessage,
	IconPencil,
	IconTrash,
	IconX,
} from '@tabler/icons-react';
import {
	DragEvent,
	KeyboardEvent,
	MouseEventHandler,
	useContext,
	useEffect,
	useState,
} from 'react';

import {Conversation as ConversationType} from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import SidebarActionButton from '@/components/Buttons/SidebarActionButton';
import ChatbarContext from '@/components/Chatbar/Chatbar.context';
import styles from './conversation.module.scss'

interface Props {
	conversation: ConversationType;
}

/**
 * 聊天框组件
 * @param conversation
 * @constructor
 */
export const Conversation = ({conversation}: Props) => {
	const {
		state: {selectedConversation, messageIsStreaming},
		handleSelectConversation,
		handleUpdateConversation,
	} = useContext(HomeContext);

	const {handleDeleteConversation} = useContext(ChatbarContext);

	const [isDeleting, setIsDeleting] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState('');

	const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			selectedConversation && handleRename(selectedConversation);
		}
	};

	/**
	 * 处理拖拽事件
	 * @param e
	 * @param conversation
	 */
	const handleDragStart = (
		e: DragEvent<HTMLButtonElement>,
		conversation: ConversationType,
	) => {
		if (e.dataTransfer) {
			e.dataTransfer.setData('conversation', JSON.stringify(conversation));
		}
	};

	const handleRename = (conversation: ConversationType) => {
		if (renameValue.trim().length > 0) {
			handleUpdateConversation(conversation, {
				key: 'name',
				value: renameValue,
			});
			setRenameValue('');
			setIsRenaming(false);
		}
	};

	const handleConfirm: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.stopPropagation();
		if (isDeleting) {
			handleDeleteConversation(conversation);
		} else if (isRenaming) {
			handleRename(conversation);
		}
		setIsDeleting(false);
		setIsRenaming(false);
	};

	const handleCancel: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.stopPropagation();
		setIsDeleting(false);
		setIsRenaming(false);
	};

	const handleOpenRenameModal: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.stopPropagation();
		setIsRenaming(true);
		selectedConversation && setRenameValue(selectedConversation.name);
	};
	const handleOpenDeleteModal: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.stopPropagation();
		setIsDeleting(true);
	};

	useEffect(() => {
		if (isRenaming) {
			setIsDeleting(false);
		} else if (isDeleting) {
			setIsRenaming(false);
		}
	}, [isRenaming, isDeleting]);

	return (
		<div className={styles['conversation-container']}>
			{isRenaming && selectedConversation?.id === conversation.id ? (
				<div className={styles['rename-item']}>
					<IconMessage size={18}/>
					<input
						className={styles['rename-item-input']}
						type="text"
						value={renameValue}
						onChange={(e) => setRenameValue(e.target.value)}
						onKeyDown={handleEnterDown}
						autoFocus
					/>
				</div>
			) : (

				<button
					className={`${styles['normal-item']} ${selectedConversation?.id === conversation.id ?
						styles['item-selected'] : ''}
						${messageIsStreaming ? styles['item-disabled'] : ''}
					`}

					onClick={() => handleSelectConversation(conversation)}
					disabled={messageIsStreaming}
					draggable="true"
					onDragStart={(e) => handleDragStart(e, conversation)}
				>
					<IconMessage size={18}/>
					<div
						className={`${styles['item-message']} ${
							selectedConversation?.id === conversation.id ? 'pr-12' : 'pr-1'
						}`}
					>
						{conversation.name}
					</div>
				</button>
			)}

			{(isDeleting || isRenaming) &&
				selectedConversation?.id === conversation.id && (
					<div className={styles['sidebar-button-container']}>
						<SidebarActionButton handleClick={handleConfirm}>
							<IconCheck size={18}/>
						</SidebarActionButton>
						<SidebarActionButton handleClick={handleCancel}>
							<IconX size={18}/>
						</SidebarActionButton>
					</div>
				)
			}

			{selectedConversation?.id === conversation.id &&
				!isDeleting &&
				!isRenaming && (
					<div className={styles['sidebar-button-container']}>
						<SidebarActionButton handleClick={handleOpenRenameModal}>
							<IconPencil size={18}/>
						</SidebarActionButton>
						<SidebarActionButton handleClick={handleOpenDeleteModal}>
							<IconTrash size={18}/>
						</SidebarActionButton>
					</div>
				)
			}
		</div>
	);
};
